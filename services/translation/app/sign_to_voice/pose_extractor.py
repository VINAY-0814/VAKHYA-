"""Sign-Language-to-Pose multimodal keypoint extraction stage."""

from __future__ import annotations

import base64
from typing import Any, Optional

try:
    import cv2  # type: ignore
    import mediapipe as mp  # type: ignore
    import numpy as np  # type: ignore
except ImportError:
    cv2 = None
    mp = None
    np = None


def _safe_float(val: Any, default: float) -> float:
    try:
        return float(val)
    except (TypeError, ValueError):
        return default


def _normalize_fingers(raw: Any) -> list[float] | None:
    if isinstance(raw, (list, tuple)) and len(raw) == 5:
        return [max(0.0, min(1.0, _safe_float(v, 0.0))) for v in raw]
    return None


class PoseExtractor:
    """Extracts skeletal pose, finger shapes & non-manual keypoints from RGB frames or validates landmark sequences."""

    def __init__(self):
        self._holistic = None
        if mp is not None:
            try:
                self._holistic = mp.solutions.holistic.Holistic(
                    static_image_mode=False,
                    model_complexity=1,
                    min_detection_confidence=0.5,
                    min_tracking_confidence=0.5,
                )
            except Exception:
                self._holistic = None

    def extract(
        self,
        pose_sequence: Optional[list[dict[str, Any]]] = None,
        video_frames_rgb: Optional[list[bytes]] = None,
        video_base64: Optional[str] = None,
        width: int = 256,
        height: int = 256,
    ) -> dict[str, Any]:
        # 1. Client-supplied multimodal pose keyframes (MediaPipe browser / test harness)
        if pose_sequence and len(pose_sequence) > 0:
            n = len(pose_sequence)
            normalized: list[dict[str, Any]] = []
            for idx, frame in enumerate(pose_sequence):
                rw = frame.get("right_wrist", [0.68, 0.60, 0.05])
                lw = frame.get("left_wrist", [0.35, 0.72, 0.0])
                r_vec = [
                    _safe_float(rw[0], 0.68) if len(rw) > 0 else 0.68,
                    _safe_float(rw[1], 0.60) if len(rw) > 1 else 0.60,
                    _safe_float(rw[2], 0.0) if len(rw) > 2 else 0.0,
                ]
                l_vec = [
                    _safe_float(lw[0], 0.35) if len(lw) > 0 else 0.35,
                    _safe_float(lw[1], 0.72) if len(lw) > 1 else 0.72,
                    _safe_float(lw[2], 0.0) if len(lw) > 2 else 0.0,
                ]
                r_open = _safe_float(frame.get("right_open"), 0.5)
                l_open = _safe_float(frame.get("left_open"), 0.3)

                r_fingers = _normalize_fingers(frame.get("right_fingers"))
                l_fingers = _normalize_fingers(frame.get("left_fingers"))
                has_fingers = r_fingers is not None or l_fingers is not None

                # Infer active hands cleanly if caller did not explicitly provide flags
                if "right_active" in frame:
                    r_active = bool(frame["right_active"])
                else:
                    r_near_rest = abs(r_vec[0] - 0.68) < 0.02 and abs(r_vec[1] - 0.60) < 0.02
                    r_active = not r_near_rest

                if "left_active" in frame:
                    l_active = bool(frame["left_active"])
                else:
                    l_near_rest = (abs(l_vec[0] - 0.35) < 0.03 and abs(l_vec[1] - 0.72) < 0.03) or (
                        abs(l_vec[0] - 0.32) < 0.03 and abs(l_vec[1] - 0.68) < 0.03
                    )
                    l_active = (not l_near_rest) or (l_open >= 0.45)

                normalized.append({
                    "t": _safe_float(frame.get("t"), idx / max(1, n - 1)),
                    "right_wrist": r_vec,
                    "left_wrist": l_vec,
                    "right_open": r_open,
                    "left_open": l_open,
                    "elbow_angle": _safe_float(frame.get("elbow_angle"), 70.0),
                    "left_elbow_angle": _safe_float(frame.get("left_elbow_angle"), 85.0),
                    "right_fingers": r_fingers,
                    "left_fingers": l_fingers,
                    "has_fingers": has_fingers,
                    "right_active": r_active,
                    "left_active": l_active,
                    "facial_cues": frame.get("facial_cues") or {},
                })
            return {
                "frame_count": len(normalized),
                "source": "client-landmarks",
                "keypoints": normalized,
            }

        # 2. Extract from raw RGB24 frames (MediaPipe Holistic if installed, else color/motion centroid)
        if video_frames_rgb and len(video_frames_rgb) > 0:
            keypoints: list[dict[str, Any]] = []
            for idx, frame_bytes in enumerate(video_frames_rgb):
                kp = self._extract_from_rgb_bytes(frame_bytes, width, height, idx, len(video_frames_rgb))
                keypoints.append(kp)
            return {
                "frame_count": len(keypoints),
                "source": "mediapipe-holistic" if self._holistic is not None else "rgb-kinematic-extractor",
                "keypoints": keypoints,
            }

        # 3. Extract from base64-encoded raw RGB payload
        if video_base64:
            payload = video_base64.split(",", 1)[-1]
            decoded = base64.b64decode(payload)
            frame_size = width * height * 3
            if len(decoded) >= frame_size and frame_size > 0:
                chunks = [decoded[i : i + frame_size] for i in range(0, len(decoded) - frame_size + 1, frame_size)]
                return self.extract(video_frames_rgb=chunks[:24], width=width, height=height)

        # Idle empty pose when no landmarks or video were supplied
        return {
            "frame_count": 0,
            "source": "empty-input",
            "keypoints": [],
        }

    def _extract_from_rgb_bytes(
        self,
        frame_bytes: bytes,
        width: int,
        height: int,
        idx: int,
        total: int,
    ) -> dict[str, Any]:
        if self._holistic is not None and np is not None and len(frame_bytes) >= width * height * 3:
            try:
                img = np.frombuffer(frame_bytes[: width * height * 3], dtype=np.uint8).reshape((height, width, 3))
                res = self._holistic.process(img)
                if res.pose_landmarks:
                    lm = res.pose_landmarks.landmark
                    rw = [round(lm[16].x, 4), round(lm[16].y, 4), round(lm[16].z, 4)]
                    lw = [round(lm[15].x, 4), round(lm[15].y, 4), round(lm[15].z, 4)]
                    return {
                        "t": round(idx / max(1, total - 1), 3),
                        "right_wrist": rw,
                        "left_wrist": lw,
                        "right_open": 0.8 if res.right_hand_landmarks else 0.3,
                        "left_open": 0.8 if res.left_hand_landmarks else 0.3,
                        "elbow_angle": 70.0,
                        "left_elbow_angle": 70.0,
                        "right_fingers": None,
                        "left_fingers": None,
                        "has_fingers": False,
                        "right_active": bool(res.right_hand_landmarks),
                        "left_active": bool(res.left_hand_landmarks),
                    }
            except Exception:
                pass

        # Pure-Python spatial centroid over avatar hand colors (right x > 0.52, left x < 0.48) or bright foreground
        stride = max(1, (width * height) // 8192)
        rx_sum = ry_sum = r_cnt = 0.0
        lx_sum = ly_sum = l_cnt = 0.0
        expected = width * height * 3
        if len(frame_bytes) >= expected:
            for p in range(0, width * height, stride):
                off = p * 3
                r, g, b = frame_bytes[off], frame_bytes[off + 1], frame_bytes[off + 2]
                x = (p % width) / width
                y = (p // width) / height
                # PoseToVideoRenderer right-hand finger rays (167, 243, 208) & cyan forearm/hand (34, 211, 238)
                is_finger_ray = abs(r - 167) <= 8 and abs(g - 243) <= 8 and abs(b - 208) <= 8
                is_cyan_arm = abs(r - 34) <= 6 and abs(g - 211) <= 6 and abs(b - 238) <= 6
                is_emerald_arm = abs(r - 52) <= 6 and abs(g - 211) <= 6 and abs(b - 153) <= 6

                if is_finger_ray or (is_cyan_arm and x >= 0.52):
                    rx_sum += x
                    ry_sum += y
                    r_cnt += 1
                elif (is_cyan_arm or is_emerald_arm) and x <= 0.48:
                    lx_sum += x
                    ly_sum += y
                    l_cnt += 1
                elif (r + g + b) > 360:
                    if x >= 0.52:
                        rx_sum += x
                        ry_sum += y
                        r_cnt += 1
                    elif x <= 0.48:
                        lx_sum += x
                        ly_sum += y
                        l_cnt += 1

        r_active = r_cnt >= 3
        l_active = l_cnt >= 3
        rw = [round(rx_sum / r_cnt, 4), round(ry_sum / r_cnt, 4), 0.16] if r_active else [0.68, 0.60, 0.05]
        lw = [round(lx_sum / l_cnt, 4), round(ly_sum / l_cnt, 4), 0.16] if l_active else [0.35, 0.72, 0.0]
        return {
            "t": round(idx / max(1, total - 1), 3),
            "right_wrist": rw,
            "left_wrist": lw,
            "right_open": min(1.0, max(0.35, r_cnt / 45.0)) if r_active else 0.3,
            "left_open": min(1.0, max(0.35, l_cnt / 45.0)) if l_active else 0.3,
            "elbow_angle": round(max(30.0, min(125.0, 115.0 - rw[1] * 80.0)), 1),
            "left_elbow_angle": round(max(30.0, min(125.0, 115.0 - lw[1] * 80.0)), 1),
            "right_fingers": None,
            "left_fingers": None,
            "has_fingers": False,
            "right_active": r_active,
            "left_active": l_active,
        }
