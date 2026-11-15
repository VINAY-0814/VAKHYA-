"""End-to-end tests for VAKHYA bidirectional translation pipelines and TCP stream bridges."""

import base64
import json
import socket
import threading
import unittest
from http.server import ThreadingHTTPServer
from urllib.request import Request, urlopen

from app.pipeline import TranslationOrchestrator
from app.server import StdlibTranslationHandler
from app.stream_bridge import start_tcp_stream_bridges


class TestTranslationPipeline(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.orchestrator = TranslationOrchestrator()

    def test_vocabulary_is_loaded_and_demonstrative(self) -> None:
        vocab = self.orchestrator.list_vocabulary()
        glosses = {item["gloss"] for item in vocab}
        self.assertGreaterEqual(len(vocab), 25)
        self.assertTrue({"HELLO", "HELP", "EMERGENCY", "DOCTOR", "THANK_YOU"}.issubset(glosses))

    def test_voice_to_sign_text_and_avatar_video_generation(self) -> None:
        res = self.orchestrator.voice_to_sign(
            text="Please help, where is the doctor?",
            sign_language="ASL",
            fps=8,
            encode_video=True,
        )
        self.assertEqual(res["direction"], "voice_to_sign")
        self.assertIn("HELP", res["glosses"])
        self.assertIn("DOCTOR", res["glosses"])
        self.assertEqual(res["glosses"][-1], "WHERE")  # WH-question reordering
        self.assertGreater(len(res["pose_frames"]), 10)
        self.assertGreater(res["video"]["raw_rgb_bytes_length"], 0)
        # FFmpeg should produce a real MP4 payload
        self.assertIsNotNone(res["video"]["video_mp4_base64"])
        mp4_bytes = base64.b64decode(res["video"]["video_mp4_base64"])
        self.assertIn(b"ftyp", mp4_bytes[:32])

    def test_voice_to_sign_from_pcm_audio(self) -> None:
        # 0.5s silent/low-energy PCM audio
        pcm = b"\x10\x00" * 8000
        res = self.orchestrator.voice_to_sign(audio_bytes=pcm, encode_video=False, fps=6)
        self.assertTrue(len(res["recognized_text"]) > 0)
        self.assertGreater(res["video"]["frame_count"], 0)

    def test_sign_to_voice_from_pose_keypoints(self) -> None:
        # Use DOCTOR keyframes to verify 3D-CNN pose-to-text classification + TTS WAV synthesis
        doctor_frames = self.orchestrator.gloss_to_pose.signs["DOCTOR"]["keyframes"]
        res = self.orchestrator.sign_to_voice(pose_sequence=doctor_frames)
        self.assertEqual(res["direction"], "sign_to_voice")
        self.assertEqual(res["recognized_gloss"], "DOCTOR")
        self.assertEqual(res["text"], "Doctor")
        self.assertGreaterEqual(res["confidence"], 0.6)
        wav_bytes = base64.b64decode(res["audio"]["audio_wav_base64"])
        self.assertEqual(wav_bytes[:4], b"RIFF")
        self.assertGreater(len(res["raw_pcm"]), 1000)

    def test_sign_to_voice_from_rgb_video_frames(self) -> None:
        v2s = self.orchestrator.voice_to_sign(text="Emergency", encode_video=False, fps=6)
        frame_size = 256 * 256 * 3
        raw = v2s["raw_stream"]
        frames = [raw[i : i + frame_size] for i in range(0, len(raw), frame_size)]
        s2v = self.orchestrator.sign_to_voice(video_frames_rgb=frames[:4])
        self.assertEqual(s2v["frame_count"], 4)
        self.assertTrue(len(s2v["text"]) > 0)
        self.assertGreater(s2v["audio"]["pcm_bytes_length"], 0)

    def test_http_endpoints_and_tcp_stream_bridge(self) -> None:
        http_server = ThreadingHTTPServer(("127.0.0.1", 0), StdlibTranslationHandler)
        http_port = http_server.server_address[1]
        threading.Thread(target=http_server.serve_forever, daemon=True).start()

        v2s_srv, s2v_srv = start_tcp_stream_bridges(
            self.orchestrator, host="127.0.0.1", v2s_port=0, s2v_port=0
        )
        v2s_port = v2s_srv.server_address[1]
        s2v_port = s2v_srv.server_address[1]

        try:
            with urlopen(f"http://127.0.0.1:{http_port}/health") as resp:
                self.assertEqual(resp.status, 200)
                health = json.loads(resp.read().decode("utf-8"))
                self.assertEqual(health["status"], "ok")

            req = Request(
                f"http://127.0.0.1:{http_port}/translate/voice-to-sign",
                data=json.dumps({"text": "Thank you", "encode_video": False}).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urlopen(req) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                self.assertIn("THANK_YOU", data["glosses"])

            # Test Voice-to-Sign TCP bridge
            with socket.create_connection(("127.0.0.1", v2s_port), timeout=5) as sock:
                sock.sendall(b"\x01\x00" * 8000)
                sock.shutdown(socket.SHUT_WR)
                out_video = sock.recv(65536)
                self.assertGreater(len(out_video), 1000)

            # Test Sign-to-Voice TCP bridge
            frame = bytes([12, 34, 56] * (256 * 256))
            with socket.create_connection(("127.0.0.1", s2v_port), timeout=5) as sock:
                sock.sendall(frame * 3)
                sock.shutdown(socket.SHUT_WR)
                out_audio = sock.recv(65536)
                self.assertGreater(len(out_audio), 500)
        finally:
            http_server.shutdown()
            http_server.server_close()
            v2s_srv.shutdown()
            v2s_srv.server_close()
            s2v_srv.shutdown()
            s2v_srv.server_close()


if __name__ == "__main__":
    unittest.main()
