"""TCP stream bridge for FFmpeg RTP stream interception and reinjection."""

from __future__ import annotations

import socketserver
import threading
from typing import Optional

from app.pipeline import TranslationOrchestrator


def create_v2s_handler(orchestrator: TranslationOrchestrator):
    class VoiceToSignStreamHandler(socketserver.BaseRequestHandler):
        """Receives raw PCM audio from FFmpeg over TCP and writes raw RGB24 avatar frames back."""

        def handle(self) -> None:
            self.request.settimeout(2.0)
            chunks: list[bytes] = []
            while True:
                try:
                    data = self.request.recv(4096)
                    if not data:
                        break
                    chunks.append(data)
                    # Process ~0.5s of 16kHz mono s16le PCM (16000 bytes) per burst
                    if sum(len(c) for c in chunks) >= 16000:
                        break
                except Exception:
                    break

            raw_audio = b"".join(chunks)
            result = orchestrator.voice_to_sign(
                audio_bytes=raw_audio,
                encode_video=False,
                fps=8,
            )
            raw_video = result.get("raw_stream", b"")
            if raw_video:
                try:
                    self.request.sendall(raw_video)
                except Exception:
                    pass

    return VoiceToSignStreamHandler


def create_s2v_handler(orchestrator: TranslationOrchestrator):
    class SignToVoiceStreamHandler(socketserver.BaseRequestHandler):
        """Receives raw RGB24 video frames from FFmpeg over TCP and writes raw s16le PCM audio back."""

        def handle(self) -> None:
            self.request.settimeout(2.0)
            frame_size = 256 * 256 * 3
            chunks: list[bytes] = []
            while True:
                try:
                    data = self.request.recv(65536)
                    if not data:
                        break
                    chunks.append(data)
                    if sum(len(c) for c in chunks) >= frame_size * 3:
                        break
                except Exception:
                    break

            raw_bytes = b"".join(chunks)
            frames = [
                raw_bytes[i : i + frame_size]
                for i in range(0, len(raw_bytes) - frame_size + 1, frame_size)
            ]
            result = orchestrator.sign_to_voice(video_frames_rgb=frames[:8])
            raw_pcm = result.get("raw_pcm", b"")
            if raw_pcm:
                try:
                    self.request.sendall(raw_pcm)
                except Exception:
                    pass

    return SignToVoiceStreamHandler


class _ThreadedTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True


def start_tcp_stream_bridges(
    orchestrator: TranslationOrchestrator,
    host: str = "0.0.0.0",
    v2s_port: int = 9001,
    s2v_port: int = 9002,
) -> tuple[_ThreadedTCPServer, _ThreadedTCPServer]:
    v2s_server = _ThreadedTCPServer((host, v2s_port), create_v2s_handler(orchestrator))
    s2v_server = _ThreadedTCPServer((host, s2v_port), create_s2v_handler(orchestrator))

    threading.Thread(target=v2s_server.serve_forever, daemon=True).start()
    threading.Thread(target=s2v_server.serve_forever, daemon=True).start()
    return v2s_server, s2v_server
