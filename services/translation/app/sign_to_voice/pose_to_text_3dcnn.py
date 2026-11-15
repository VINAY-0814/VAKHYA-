"""Multimodal Spatiotemporal Sign-to-Text Classifier with Unknown Rejection & Handedness Invariance."""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

try:
    import tensorflow as tf  # type: ignore
except ImportError:
    tf = None

# Calibrated rejection thresholds to eliminate false forced predictions (NAME/HOSPITAL/FAMILY/EMERGENCY collapse)
MAX_MATCH_DISTANCE = 0.52
MIN_RECOGNITION_CONFIDENCE = 0.52


def build_3dcnn_model(num_classes: int, time_steps: int = 12, feature_dim: int = 21):
    """Constructs the TensorFlow 3D-CNN spatiotemporal pose-to-text architecture (optional TF backend)."""
    if tf is None:
        return None
    inputs = tf.keras.Input(shape=(time_steps, feature_dim, 1, 1), name="pose_volume")
    x = tf.keras.layers.Conv3D(32, kernel_size=(3, 3, 1), activation="relu", padding="same")(inputs)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.MaxPool3D(pool_size=(2, 1, 1))(x)
    x = tf.keras.layers.Conv3D(64, kernel_size=(3, 3, 1), activation="relu", padding="same")(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.GlobalAveragePooling3D()(x)
    x = tf.keras.layers.Dense(64, activation="relu")(x)
    outputs = tf.keras.layers.Dense(num_classes, activation="softmax", name="gloss_logits")(x)
    return tf.keras.Model(inputs=inputs, outputs=outputs, name="vakhya_pose_3dcnn")


def _lerp(a: float, b: float, alpha: float) -> float:
    return a + (b - a) * alpha


def _mirror_sequence(frames: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Horizontally mirrors a left-hand gesture into canonical right-hand space for handedness invariance."""
    mirrored: list[dict[str, Any]] = []
    for f in frames:
        rw = f.get("right_wrist", [0.68, 0.60, 0.05])
        lw = f.get("left_wrist", [0.35, 0.72, 0.0])
        mirrored.append({
            **f,
            "right_wrist": [round(1.0 - float(lw[0]), 4), float(lw[1]), float(lw[2]) if len(lw) > 2 else 0.0],
            "left_wrist": [round(1.0 - float(rw[0]), 4), float(rw[1]), float(rw[2]) if len(rw) > 2 else 0.0],
            "right_open": float(f.get("left_open", 0.5)),
            "left_open": float(f.get("right_open", 0.3)),
            "elbow_angle": float(f.get("left_elbow_angle", f.get("elbow_angle", 70.0))),
            "left_elbow_angle": float(f.get("elbow_angle", 70.0)),
            "right_fingers": f.get("left_fingers"),
            "left_fingers": f.get("right_fingers"),
            "right_active": bool(f.get("left_active", False)),
            "left_active": bool(f.get("right_active", False)),
        })
    return mirrored


class PoseToText3DCNN:
    """Spatiotemporal multimodal trajectory & handshape classifier with calibrated unknown rejection."""

    def __init__(self, vocab_path: str | Path, time_steps: int = 12):
        with open(vocab_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.signs: dict[str, dict[str, Any]] = data.get("signs", {})
        self.time_steps = time_steps
        self.class_names = sorted(self.signs.keys())
        self._tf_model = build_3dcnn_model(len(self.class_names), time_steps=time_steps) if tf is not None else None
        self._reference_specs = {
            gloss: self._compile_descriptor(
                spec["keyframes"],
                handedness=spec.get("handedness", "two_hand"),
                non_manual=spec.get("non_manual", {}),
            )
            for gloss, spec in self.signs.items()
            if spec.get("keyframes")
        }

    def predict(self, keypoints: list[dict[str, Any]], gloss_hint: str | None = None) -> dict[str, Any]:
        if gloss_hint and gloss_hint.upper() in self.signs:
            g = gloss_hint.upper()
            spec = self.signs[g]
            return {
                "gloss": g,
                "text": spec.get("english", g.title()),
                "confidence": 0.97,
                "recognized": True,
                "is_unknown": False,
                "status": "recognized",
                "model": "vakhya-multimodal-kinematic-v2",
                "non_manual": spec.get("non_manual", {}),
            }

        if not keypoints:
            return {
                "gloss": "IDLE",
                "text": "",
                "confidence": 0.0,
                "recognized": False,
                "is_unknown": False,
                "status": "idle",
                "model": "vakhya-multimodal-kinematic-v2",
                "non_manual": {},
            }

        q_desc = self._compile_descriptor(keypoints)
        if not q_desc["right_active"] and not q_desc["left_active"]:
            return {
                "gloss": "IDLE",
                "text": "",
                "confidence": 0.0,
                "recognized": False,
                "is_unknown": False,
                "status": "idle",
                "model": "vakhya-multimodal-kinematic-v2",
                "non_manual": {},
            }

        # Prepare mirrored descriptor if left-hand-only signer is performing a one-handed sign
        is_left_only = q_desc["left_active"] and not q_desc["right_active"]
        q_mirrored_desc = self._compile_descriptor(_mirror_sequence(keypoints)) if is_left_only else None

        ranked: list[tuple[str, float]] = []
        for gloss, ref_desc in self._reference_specs.items():
            d_direct = self._descriptor_distance(q_desc, ref_desc)
            if q_mirrored_desc is not None and ref_desc["handedness"] == "one_hand":
                d_mir = self._descriptor_distance(q_mirrored_desc, ref_desc)
                dist = min(d_direct, d_mir)
            else:
                dist = d_direct
            ranked.append((gloss, dist))

        ranked.sort(key=lambda item: item[1])
        best_gloss, best_dist = ranked[0]
        second_dist = ranked[1][1] if len(ranked) > 1 else best_dist + 0.5

        sim = math.exp(-best_dist * 1.15)
        margin = max(0.0, second_dist - best_dist)
        margin_factor = min(1.0, margin / 0.16)
        confidence = round(min(0.99, sim * (0.72 + 0.28 * margin_factor)), 3)

        # Reject out-of-distribution, resting stationary, or low-confidence gestures cleanly
        if best_dist > MAX_MATCH_DISTANCE or confidence < MIN_RECOGNITION_CONFIDENCE:
            return {
                "gloss": "UNKNOWN",
                "text": "",
                "confidence": confidence,
                "recognized": False,
                "is_unknown": True,
                "status": "unknown",
                "model": "vakhya-multimodal-kinematic-v2",
                "non_manual": {},
                "best_dist": round(best_dist, 4),
                "top_candidates": [{"gloss": g, "distance": round(d, 4)} for g, d in ranked[:3]],
            }

        spec = self.signs[best_gloss]
        return {
            "gloss": best_gloss,
            "text": spec.get("english", best_gloss.title()),
            "confidence": confidence,
            "recognized": True,
            "is_unknown": False,
            "status": "recognized",
            "model": "vakhya-multimodal-kinematic-v2",
            "non_manual": spec.get("non_manual", {}),
            "best_dist": round(best_dist, 4),
            "top_candidates": [{"gloss": g, "distance": round(d, 4)} for g, d in ranked[:3]],
        }

    def _compile_descriptor(
        self,
        frames: list[dict[str, Any]],
        handedness: str | None = None,
        non_manual: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        resampled = self._resample_sequence(frames, self.time_steps)
        has_fingers = any(bool(f.get("has_fingers")) or isinstance(f.get("right_fingers"), list) for f in frames)

        r_active_count = sum(1 for f in resampled if f["right_active"])
        l_active_count = sum(1 for f in resampled if f["left_active"])
        r_active = r_active_count >= max(1, self.time_steps // 4)
        l_active = l_active_count >= max(1, self.time_steps // 4)

        if handedness is None:
            inferred_handedness = "two_hand" if (r_active and l_active) else "one_hand"
        else:
            inferred_handedness = handedness

        # Compute right & left displacement vectors and path lengths
        r_start, r_end = resampled[0]["rw"], resampled[-1]["rw"]
        l_start, l_end = resampled[0]["lw"], resampled[-1]["lw"]
        r_disp = [r_end[0] - r_start[0], r_end[1] - r_start[1], r_end[2] - r_start[2]]
        l_disp = [l_end[0] - l_start[0], l_end[1] - l_start[1], l_end[2] - l_start[2]]

        r_path = sum(
            math.sqrt(
                (resampled[i]["rw"][0] - resampled[i - 1]["rw"][0]) ** 2
                + (resampled[i]["rw"][1] - resampled[i - 1]["rw"][1]) ** 2
            )
            for i in range(1, len(resampled))
        )
        l_path = sum(
            math.sqrt(
                (resampled[i]["lw"][0] - resampled[i - 1]["lw"][0]) ** 2
                + (resampled[i]["lw"][1] - resampled[i - 1]["lw"][1]) ** 2
            )
            for i in range(1, len(resampled))
        )

        # Inter-hand distance trajectory
        two_hand_dists = [
            math.hypot(f["rw"][0] - f["lw"][0], f["rw"][1] - f["lw"][1])
            for f in resampled
        ]

        return {
            "frames": resampled,
            "has_fingers": has_fingers,
            "right_active": r_active,
            "left_active": l_active,
            "handedness": inferred_handedness,
            "r_disp": r_disp,
            "l_disp": l_disp,
            "r_path": r_path,
            "l_path": l_path,
            "two_hand_dists": two_hand_dists,
            "non_manual": non_manual or {},
        }

    @staticmethod
    def _resample_sequence(frames: list[dict[str, Any]], steps: int) -> list[dict[str, Any]]:
        if not frames:
            return []
        resampled: list[dict[str, Any]] = []
        n = len(frames)
        for i in range(steps):
            pos = (i / max(1, steps - 1)) * max(0, n - 1)
            lo = int(math.floor(pos))
            hi = min(n - 1, lo + 1)
            alpha = pos - lo
            f0, f1 = frames[lo], frames[hi]

            rw0 = f0.get("right_wrist", [0.68, 0.60, 0.05])
            rw1 = f1.get("right_wrist", rw0)
            lw0 = f0.get("left_wrist", [0.35, 0.72, 0.0])
            lw1 = f1.get("left_wrist", lw0)

            r_open0 = float(f0.get("right_open", 0.5))
            r_open1 = float(f1.get("right_open", r_open0))
            l_open0 = float(f0.get("left_open", 0.3))
            l_open1 = float(f1.get("left_open", l_open0))

            rf0 = f0.get("right_fingers") or [r_open0] * 5
            rf1 = f1.get("right_fingers") or [r_open1] * 5
            lf0 = f0.get("left_fingers") or [l_open0] * 5
            lf1 = f1.get("left_fingers") or [l_open1] * 5

            r_act0 = f0.get("right_active", True)
            r_act1 = f1.get("right_active", r_act0)
            l_act0 = f0.get("left_active", False)
            l_act1 = f1.get("left_active", l_act0)

            resampled.append({
                "rw": [
                    _lerp(float(rw0[0]), float(rw1[0]), alpha),
                    _lerp(float(rw0[1]), float(rw1[1]), alpha),
                    _lerp(float(rw0[2]) if len(rw0) > 2 else 0.0, float(rw1[2]) if len(rw1) > 2 else 0.0, alpha),
                ],
                "lw": [
                    _lerp(float(lw0[0]), float(lw1[0]), alpha),
                    _lerp(float(lw0[1]), float(lw1[1]), alpha),
                    _lerp(float(lw0[2]) if len(lw0) > 2 else 0.0, float(lw1[2]) if len(lw1) > 2 else 0.0, alpha),
                ],
                "r_open": _lerp(r_open0, r_open1, alpha),
                "l_open": _lerp(l_open0, l_open1, alpha),
                "elbow": _lerp(float(f0.get("elbow_angle", 70.0)), float(f1.get("elbow_angle", 70.0)), alpha) / 180.0,
                "r_fingers": [_lerp(float(rf0[k]), float(rf1[k]), alpha) for k in range(5)],
                "l_fingers": [_lerp(float(lf0[k]), float(lf1[k]), alpha) for k in range(5)],
                "right_active": (r_act0 if alpha < 0.5 else r_act1),
                "left_active": (l_act0 if alpha < 0.5 else l_act1),
            })
        return resampled

    @staticmethod
    def _descriptor_distance(q: dict[str, Any], r: dict[str, Any]) -> float:
        q_frames = q["frames"]
        r_frames = r["frames"]
        n = max(1, len(q_frames))

        # 1. Strong handedness mismatch penalty (one-hand vs two-hand signs should not collapse!)
        handedness_penalty = 0.0
        if q["handedness"] != r["handedness"]:
            handedness_penalty = 0.48

        pos_err = 0.0
        open_err = 0.0
        finger_err = 0.0
        vel_err = 0.0

        use_left_pos = r["handedness"] == "two_hand" or q["handedness"] == "two_hand"
        use_fingers = q["has_fingers"] and r["has_fingers"]

        for i in range(n):
            qf, rf = q_frames[i], r_frames[i]

            # Spatial right wrist (x, y, z)
            drw = math.sqrt(
                (qf["rw"][0] - rf["rw"][0]) ** 2 * 1.4
                + (qf["rw"][1] - rf["rw"][1]) ** 2 * 1.4
                + (qf["rw"][2] - rf["rw"][2]) ** 2 * 0.65
            )
            frame_pos = drw

            if use_left_pos:
                dlw = math.sqrt(
                    (qf["lw"][0] - rf["lw"][0]) ** 2 * 1.35
                    + (qf["lw"][1] - rf["lw"][1]) ** 2 * 1.35
                    + (qf["lw"][2] - rf["lw"][2]) ** 2 * 0.60
                )
                frame_pos = 0.52 * drw + 0.48 * dlw

            pos_err += frame_pos

            # Openness + elbow
            d_open = abs(qf["r_open"] - rf["r_open"]) * 0.5 + abs(qf["elbow"] - rf["elbow"]) * 0.25
            if use_left_pos:
                d_open += abs(qf["l_open"] - rf["l_open"]) * 0.4
            open_err += d_open

            # 5-finger articulation vector L1
            if use_fingers:
                rf_diff = sum(abs(qf["r_fingers"][k] - rf["r_fingers"][k]) for k in range(5)) / 5.0
                if r["handedness"] == "two_hand":
                    lf_diff = sum(abs(qf["l_fingers"][k] - rf["l_fingers"][k]) for k in range(5)) / 5.0
                    finger_err += 0.55 * rf_diff + 0.45 * lf_diff
                else:
                    finger_err += rf_diff

            # Step-by-step velocity correlation
            if i > 0:
                pq, pr = q_frames[i - 1], r_frames[i - 1]
                qvx, qvy = qf["rw"][0] - pq["rw"][0], qf["rw"][1] - pq["rw"][1]
                rvx, rvy = rf["rw"][0] - pr["rw"][0], rf["rw"][1] - pr["rw"][1]
                vel_err += math.hypot(qvx - rvx, qvy - rvy) * 1.8

        pos_err /= n
        open_err /= n
        finger_err = (finger_err / n) if use_fingers else 0.0
        vel_err /= max(1, n - 1)

        # Trajectory path length & endpoint delta mismatch (prevents static posture matching dynamic motion!)
        path_err = abs(q["r_path"] - r["r_path"]) * 0.55
        if r["handedness"] == "two_hand":
            path_err += abs(q["l_path"] - r["l_path"]) * 0.45

        total_disp_err = math.hypot(q["r_disp"][0] - r["r_disp"][0], q["r_disp"][1] - r["r_disp"][1]) * 0.55

        # Inter-hand distance consistency for two-hand signs
        interhand_err = 0.0
        if r["handedness"] == "two_hand":
            interhand_err = (
                sum(abs(a - b) for a, b in zip(q["two_hand_dists"], r["two_hand_dists"])) / n
            ) * 0.65

        finger_weight = 0.68 if use_fingers else 0.0
        pos_weight = 1.05 if use_fingers else 1.25
        open_weight = 0.35 if use_fingers else 0.70

        return (
            handedness_penalty
            + pos_err * pos_weight
            + open_err * open_weight
            + finger_err * finger_weight
            + vel_err * 0.90
            + path_err * 0.45
            + total_disp_err * 0.45
            + interhand_err
        )
