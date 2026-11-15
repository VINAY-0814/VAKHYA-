"""Gloss-to-Pose lookup & temporal interpolation stage."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


class GlossToPoseMapper:
    """Maps gloss tokens to interpolated 3D skeletal pose sequences."""

    def __init__(self, vocab_path: str | Path):
        with open(vocab_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.metadata = data.get("metadata", {})
        self.signs: dict[str, dict[str, Any]] = data.get("signs", {})

    def list_vocabulary(self) -> list[dict[str, Any]]:
        return [
            {
                "gloss": gloss,
                "english": spec.get("english", gloss.title()),
                "category": spec.get("category", "general"),
                "duration_ms": spec.get("duration_ms", 800),
                "non_manual": spec.get("non_manual", {}),
            }
            for gloss, spec in self.signs.items()
        ]

    def map_glosses(self, glosses: list[str], fps: int = 12) -> dict[str, Any]:
        pose_frames: list[dict[str, Any]] = []
        matched_glosses: list[str] = []
        unknown_glosses: list[str] = []

        for gloss in glosses:
            clean_gloss = gloss.replace("FS:", "").upper()
            if clean_gloss in self.signs:
                spec = self.signs[clean_gloss]
                matched_glosses.append(clean_gloss)
                keyframes = spec["keyframes"]
                duration_ms = int(spec.get("duration_ms", 800))
                non_manual = spec.get("non_manual", {"eyebrows": "neutral", "mouth": "idle", "headTilt": "none"})
            else:
                unknown_glosses.append(clean_gloss)
                # Demonstrative fingerspelling / neutral signing pose fallback
                keyframes = [
                    {"t": 0.0, "right_wrist": [0.64, 0.42, 0.14], "left_wrist": [0.35, 0.72, 0.0], "right_open": 0.6, "left_open": 0.3, "elbow_angle": 70},
                    {"t": 0.5, "right_wrist": [0.70, 0.40, 0.16], "left_wrist": [0.35, 0.72, 0.0], "right_open": 0.8, "left_open": 0.3, "elbow_angle": 75},
                    {"t": 1.0, "right_wrist": [0.64, 0.42, 0.14], "left_wrist": [0.35, 0.72, 0.0], "right_open": 0.5, "left_open": 0.3, "elbow_angle": 70},
                ]
                duration_ms = 650
                non_manual = {"eyebrows": "neutral", "mouth": "idle", "headTilt": "none"}

            num_frames = max(4, int(round((duration_ms / 1000.0) * fps)))
            interpolated = self._interpolate_keyframes(keyframes, num_frames, clean_gloss, non_manual)
            pose_frames.extend(interpolated)

        return {
            "fps": fps,
            "total_frames": len(pose_frames),
            "matched_glosses": matched_glosses,
            "unknown_glosses": unknown_glosses,
            "frames": pose_frames,
        }

    @staticmethod
    def _interpolate_keyframes(
        keyframes: list[dict[str, Any]],
        num_frames: int,
        gloss: str,
        non_manual: dict[str, str],
    ) -> list[dict[str, Any]]:
        frames: list[dict[str, Any]] = []
        for idx in range(num_frames):
            t = idx / max(1, num_frames - 1)
            # Find surrounding keyframes
            k0 = keyframes[0]
            k1 = keyframes[-1]
            for j in range(len(keyframes) - 1):
                if keyframes[j]["t"] <= t <= keyframes[j + 1]["t"]:
                    k0 = keyframes[j]
                    k1 = keyframes[j + 1]
                    break
            span = max(1e-6, k1["t"] - k0["t"])
            alpha = max(0.0, min(1.0, (t - k0["t"]) / span))

            rw = [round(k0["right_wrist"][c] + (k1["right_wrist"][c] - k0["right_wrist"][c]) * alpha, 4) for c in range(3)]
            lw = [round(k0["left_wrist"][c] + (k1["left_wrist"][c] - k0["left_wrist"][c]) * alpha, 4) for c in range(3)]
            ro = round(k0["right_open"] + (k1["right_open"] - k0["right_open"]) * alpha, 3)
            lo = round(k0["left_open"] + (k1["left_open"] - k0["left_open"]) * alpha, 3)
            ea = round(k0["elbow_angle"] + (k1["elbow_angle"] - k0["elbow_angle"]) * alpha, 2)

            frames.append({
                "gloss": gloss,
                "t": round(t, 3),
                "right_wrist": rw,
                "left_wrist": lw,
                "right_open": ro,
                "left_open": lo,
                "elbow_angle": ea,
                "non_manual": non_manual,
            })
        return frames
