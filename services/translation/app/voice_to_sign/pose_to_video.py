"""Pose-to-Video avatar frame renderer and FFmpeg encoder."""

from __future__ import annotations

import base64
import shutil
import subprocess
from typing import Any


class PoseToVideoRenderer:
    """Renders 2D skeletal sign-language avatar frames into raw RGB24 and MP4/WebM video."""

    def __init__(self, width: int = 256, height: int = 256):
        self.width = width
        self.height = height
        self.ffmpeg_bin = shutil.which("ffmpeg")

    def render_sequence(
        self,
        pose_frames: list[dict[str, Any]],
        fps: int = 12,
        encode_video: bool = True,
    ) -> dict[str, Any]:
        raw_rgb_frames: list[bytes] = []
        for frame in pose_frames:
            raw_rgb_frames.append(self._render_single_rgb_frame(frame))

        raw_stream = b"".join(raw_rgb_frames)
        mp4_b64: str | None = None

        if encode_video and self.ffmpeg_bin and raw_stream:
            mp4_bytes = self._encode_mp4(raw_stream, fps)
            if mp4_bytes:
                mp4_b64 = base64.b64encode(mp4_bytes).decode("ascii")

        return {
            "width": self.width,
            "height": self.height,
            "fps": fps,
            "frame_count": len(raw_rgb_frames),
            "raw_rgb_bytes_length": len(raw_stream),
            "video_mp4_base64": mp4_b64,
            "raw_stream": raw_stream,
        }

    def _render_single_rgb_frame(self, frame: dict[str, Any]) -> bytes:
        w, h = self.width, self.height
        # Background #0B1F24 -> (11, 31, 36)
        buf = bytearray([11, 31, 36] * (w * h))

        # Torso & head coordinates (normalized)
        head = (0.50, 0.24)
        neck = (0.50, 0.34)
        r_shoulder = (0.62, 0.38)
        l_shoulder = (0.38, 0.38)
        hip_center = (0.50, 0.72)

        rw = frame["right_wrist"]
        lw = frame["left_wrist"]
        r_wrist = (float(rw[0]), float(rw[1]))
        l_wrist = (float(lw[0]), float(lw[1]))

        r_elbow = ((r_shoulder[0] + r_wrist[0]) * 0.5 + 0.05, (r_shoulder[1] + r_wrist[1]) * 0.5 + 0.06)
        l_elbow = ((l_shoulder[0] + l_wrist[0]) * 0.5 - 0.05, (l_shoulder[1] + l_wrist[1]) * 0.5 + 0.06)

        # Draw torso skeleton (#14B8A6 teal)
        self._draw_line(buf, w, h, l_shoulder, r_shoulder, (20, 184, 166), thickness=3)
        self._draw_line(buf, w, h, neck, hip_center, (20, 184, 166), thickness=3)
        self._draw_line(buf, w, h, l_shoulder, hip_center, (15, 118, 110), thickness=2)
        self._draw_line(buf, w, h, r_shoulder, hip_center, (15, 118, 110), thickness=2)

        # Arms (#34D399 emerald / #22D3EE cyan)
        self._draw_line(buf, w, h, r_shoulder, r_elbow, (52, 211, 153), thickness=3)
        self._draw_line(buf, w, h, r_elbow, r_wrist, (34, 211, 238), thickness=3)
        self._draw_line(buf, w, h, l_shoulder, l_elbow, (52, 211, 153), thickness=3)
        self._draw_line(buf, w, h, l_elbow, l_wrist, (34, 211, 238), thickness=3)

        # Head circle + wrist hand circles
        self._draw_circle(buf, w, h, head, radius=18, color=(45, 212, 191))
        r_hand_radius = int(6 + 5 * float(frame.get("right_open", 0.5)))
        l_hand_radius = int(6 + 5 * float(frame.get("left_open", 0.5)))
        self._draw_circle(buf, w, h, r_wrist, radius=r_hand_radius, color=(34, 211, 238))
        self._draw_circle(buf, w, h, l_wrist, radius=l_hand_radius, color=(52, 211, 153))

        # Draw 5 finger rays on active hands
        for finger in range(5):
            spread = (finger - 2) * 0.025 * (0.4 + float(frame.get("right_open", 0.5)))
            tip = (r_wrist[0] + spread, r_wrist[1] - 0.055 * (0.3 + float(frame.get("right_open", 0.5))))
            self._draw_line(buf, w, h, r_wrist, tip, (167, 243, 208), thickness=1)

        return bytes(buf)

    def _encode_mp4(self, raw_rgb: bytes, fps: int) -> bytes | None:
        if not self.ffmpeg_bin:
            return None
        cmd = [
            self.ffmpeg_bin,
            "-y",
            "-f", "rawvideo",
            "-pix_fmt", "rgb24",
            "-s", f"{self.width}x{self.height}",
            "-r", str(fps),
            "-i", "pipe:0",
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-pix_fmt", "yuv420p",
            "-movflags", "frag_keyframe+empty_moov",
            "-f", "mp4",
            "pipe:1",
        ]
        try:
            proc = subprocess.run(
                cmd,
                input=raw_rgb,
                capture_output=True,
                timeout=15,
                check=False,
            )
            if proc.returncode == 0 and proc.stdout:
                return proc.stdout
        except Exception:
            pass
        return None

    @staticmethod
    def _set_px(buf: bytearray, w: int, h: int, x: int, y: int, color: tuple[int, int, int]) -> None:
        if 0 <= x < w and 0 <= y < h:
            idx = (y * w + x) * 3
            buf[idx] = color[0]
            buf[idx + 1] = color[1]
            buf[idx + 2] = color[2]

    def _draw_circle(
        self,
        buf: bytearray,
        w: int,
        h: int,
        center_norm: tuple[float, float],
        radius: int,
        color: tuple[int, int, int],
    ) -> None:
        cx = int(center_norm[0] * w)
        cy = int(center_norm[1] * h)
        r2 = radius * radius
        for dy in range(-radius, radius + 1):
            for dx in range(-radius, radius + 1):
                if dx * dx + dy * dy <= r2:
                    self._set_px(buf, w, h, cx + dx, cy + dy, color)

    def _draw_line(
        self,
        buf: bytearray,
        w: int,
        h: int,
        p0: tuple[float, float],
        p1: tuple[float, float],
        color: tuple[int, int, int],
        thickness: int = 2,
    ) -> None:
        x0, y0 = int(p0[0] * w), int(p0[1] * h)
        x1, y1 = int(p1[0] * w), int(p1[1] * h)
        steps = max(abs(x1 - x0), abs(y1 - y0), 1)
        half = thickness // 2
        for i in range(steps + 1):
            t = i / steps
            x = int(round(x0 + (x1 - x0) * t))
            y = int(round(y0 + (y1 - y0) * t))
            for dy in range(-half, half + 1):
                for dx in range(-half, half + 1):
                    self._set_px(buf, w, h, x + dx, y + dy, color)
