"""Sign-Language-to-Pose keypoint extraction stage."""

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


class PoseExtractor:
    """Extracts skeletal pose & hand keypoints from RGB frames or validates landmark sequences."""

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
        # 1. If caller already supplied normalized pose keypoints (e.g. from mobile MediaPipe or test), normalize them
        if pose_sequence and len(pose_sequence) > 0:
            normalized = []
            for idx, frame in enumerate(pose_sequence):
                rw = frame.get("right_wrist", [0.65, 0.4, 0.1])
                lw = frame.get("left_wrist", [0.35, 0.7, 0.0])
                normalized.append({
                    "t": float(frame.get("t", idx / max(1, len(pose_sequence) - 1))),
                    "right_wrist": [float(rw[0]), float(rw[1]), float(rw[2]) if len(rw) > 2 else 0.0],
                    "left_wrist": [float(lw[0]), float(lw[1]), float(lw[2]) if len(lw) > 2 else 0.0],
                    "right_open": float(frame.get("right_open", 0.8)),
                    "left_open": float(frame.get("left_open", 0.3)),
                    "elbow_angle": float(frame.get("elbow_angle", 70.0)),
                })
            return {
                "frame_count": len(normalized),
                "source": "client-landmarks",
                "keypoints": normalized,
            }

        # 2. Extract from raw RGB24 frames (MediaPipe Holistic if installed, else pure-Python brightness/centroid tracker)
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

        # 3. Extract from base64-encoded raw RGB or image payload
        if video_base64:
            payload = video_base64.split(",", 1)[-1]
            decoded = base64.b64decode(payload)
            frame_size = width * height * 3
            if len(decoded) >= frame_size and frame_size > 0:
                chunks = [decoded[i : i + frame_size] for i in range(0, len(decoded) - frame_size + 1, frame_size)]
                return self.extract(video_frames_rgb=chunks[:24], width=width, height=height)

        # Default neutral pose fallback
        return {
            "frame_count": 3,
            "source": "fallback-neutral",
            "keypoints": [
                {"t": 0.0, "right_wrist": [0.68, 0.34, 0.05], "left_wrist": [0.35, 0.72, 0.0], "right_open": 1.0, "left_open": 0.4, "elbow_angle": 45.0},
                {"t": 0.5, "right_wrist": [0.76, 0.24, 0.12], "left_wrist": [0.35, 0.72, 0.0], "right_open": 1.0, "left_open": 0.4, "elbow_angle": 75.0},
                {"t": 1.0, "right_wrist": [0.84, 0.28, 0.15], "left_wrist": [0.35, 0.72, 0.0], "right_open": 1.0, "left_open": 0.4, "elbow_angle": 90.0},
            ],
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
                    }
            except Exception:
                pass

        # Pure-Python spatial centroid over high-luminance pixels (left/right half)
        stride = max(1, (width * height) // 1024)
        rx_sum = ry_sum = r_cnt = 0.0
        lx_sum = ly_sum = l_cnt = 0.0
        expected = width * height * 3
        if len(frame_bytes) >= expected:
            for p in range(0, width * height, stride):
                off = p * 3
                r, g, b = frame_bytes[off], frame_bytes[off + 1], frame_bytes[off + 2]
                lum = r + g + b
                if lum > 220:
                    x = (p % width) / width
                    y = (p // width) / height
                    if x >= 0.5:
                        rx_sum += x
                        ry_sum += y
                        r_cnt += 1
                    else:
                        lx_sum += x
                        ly_sum += y
                        l_cnt += 1

        rw = [round(rx_sum / r_cnt, 4), round(ry_sum / r_cnt, 4), 0.12] if r_cnt else [0.68, 0.34, 0.1]
        lw = [round(lx_sum / l_cnt, 4), round(ly_sum / l_cnt, 4), 0.05] if l_cnt else [0.35, 0.72, 0.0]
        return {
            "t": round(idx / max(1, total - 1), 3),
            "right_wrist": rw,
            "left_wrist": lw,
            "right_open": min(1.0, r_cnt / 40.0) if r_cnt else 0.5,
            "left_open": min(1.0, l_cnt / 40.0) if l_cnt else 0.3,
            "elbow_angle": 70.0,
        }
