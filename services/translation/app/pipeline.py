"""Unified bidirectional translation pipelines with stage latency metrics."""

from __future__ import annotations

import time
from pathlib import Path
from typing import Any, Optional

from app.sign_to_voice.pose_extractor import PoseExtractor
from app.sign_to_voice.pose_to_text_3dcnn import PoseToText3DCNN
from app.sign_to_voice.tts import TextToSpeechEngine
from app.voice_to_sign.gloss_to_pose import GlossToPoseMapper
from app.voice_to_sign.pose_to_video import PoseToVideoRenderer
from app.voice_to_sign.stt import SpeechToTextEngine
from app.voice_to_sign.text_to_gloss import TextToGlossConverter

DEFAULT_VOCAB_PATH = Path(__file__).resolve().parent.parent / "data" / "gloss_pose_vocab.json"


class TranslationOrchestrator:
    """Executes Voice-to-Sign and Sign-to-Voice pipelines end-to-end."""

    def __init__(self, vocab_path: str | Path = DEFAULT_VOCAB_PATH):
        self.vocab_path = Path(vocab_path)
        self.stt = SpeechToTextEngine()
        self.gloss_to_pose = GlossToPoseMapper(self.vocab_path)
        self.text_to_gloss = TextToGlossConverter(self.gloss_to_pose.signs.keys())
        self.pose_to_video = PoseToVideoRenderer(width=256, height=256)

        self.pose_extractor = PoseExtractor()
        self.pose_to_text = PoseToText3DCNN(self.vocab_path)
        self.tts = TextToSpeechEngine(sample_rate=16000)

        self.metrics_history: list[dict[str, Any]] = []

    def list_vocabulary(self) -> list[dict[str, Any]]:
        return self.gloss_to_pose.list_vocabulary()

    def voice_to_sign(
        self,
        text: Optional[str] = None,
        audio_bytes: Optional[bytes] = None,
        audio_base64: Optional[str] = None,
        sign_language: str = "ASL",
        fps: int = 12,
        encode_video: bool = True,
    ) -> dict[str, Any]:
        t0 = time.perf_counter()

        # Stage 1: Speech-to-Text
        stt_start = time.perf_counter()
        stt_res = self.stt.transcribe(audio_bytes=audio_bytes, audio_base64=audio_base64, hint_text=text)
        stt_s = time.perf_counter() - stt_start

        # Stage 2: Text-to-Gloss
        pre_start = time.perf_counter()
        gloss_res = self.text_to_gloss.convert(stt_res["text"], sign_language=sign_language)
        pre_s = time.perf_counter() - pre_start

        # Stage 3: Gloss-to-Pose lookup & interpolation
        inf_start = time.perf_counter()
        pose_res = self.gloss_to_pose.map_glosses(gloss_res["glosses"], fps=fps)
        inf_s = time.perf_counter() - inf_start

        # Stage 4: Pose-to-Video avatar rendering & encoding
        enc_start = time.perf_counter()
        video_res = self.pose_to_video.render_sequence(
            pose_res["frames"], fps=fps, encode_video=encode_video
        )
        enc_s = time.perf_counter() - enc_start

        total_s = time.perf_counter() - t0
        latency = {
            "stt_s": round(stt_s, 4),
            "pre_processing_s": round(pre_s, 4),
            "model_inference_s": round(inf_s, 4),
            "video_encoding_s": round(enc_s, 4),
            "total_s": round(total_s, 4),
        }
        self._record_metric("voice_to_sign", latency)

        return {
            "direction": "voice_to_sign",
            "sign_language": sign_language,
            "recognized_text": stt_res["text"],
            "stt_confidence": stt_res["confidence"],
            "glosses": gloss_res["glosses"],
            "gloss_string": gloss_res["gloss_string"],
            "non_manual_markers": gloss_res["non_manual_markers"],
            "matched_glosses": pose_res["matched_glosses"],
            "unknown_glosses": pose_res["unknown_glosses"],
            "pose_frames": pose_res["frames"],
            "video": {
                "width": video_res["width"],
                "height": video_res["height"],
                "fps": video_res["fps"],
                "frame_count": video_res["frame_count"],
                "raw_rgb_bytes_length": video_res["raw_rgb_bytes_length"],
                "video_mp4_base64": video_res["video_mp4_base64"],
            },
            "raw_stream": video_res["raw_stream"],
            "latency": latency,
        }

    def sign_to_voice(
        self,
        pose_sequence: Optional[list[dict[str, Any]]] = None,
        video_frames_rgb: Optional[list[bytes]] = None,
        video_base64: Optional[str] = None,
        gloss_hint: Optional[str] = None,
        pitch: float = 1.0,
        speed: float = 1.0,
    ) -> dict[str, Any]:
        t0 = time.perf_counter()

        # Stage 1: Sign-Language-to-Pose extraction
        pre_start = time.perf_counter()
        pose_res = self.pose_extractor.extract(
            pose_sequence=pose_sequence,
            video_frames_rgb=video_frames_rgb,
            video_base64=video_base64,
        )
        pre_s = time.perf_counter() - pre_start

        # Stage 2: Spatiotemporal Pose-to-Text inference (with calibrated unknown/idle rejection)
        inf_start = time.perf_counter()
        pred_res = self.pose_to_text.predict(pose_res["keypoints"], gloss_hint=gloss_hint)
        inf_s = time.perf_counter() - inf_start

        # Stage 3: Text-to-Speech synthesis (only synthesize speech when a sign is actually recognized)
        tts_start = time.perf_counter()
        if pred_res.get("recognized", True) and pred_res.get("text"):
            tts_res = self.tts.synthesize(pred_res["text"], pitch=pitch, speed=speed)
            raw_pcm = tts_res["raw_pcm"]
            audio_payload = {
                "sample_rate": tts_res["sample_rate"],
                "audio_wav_base64": tts_res["audio_wav_base64"],
                "pcm_bytes_length": len(raw_pcm),
                "engine": tts_res["engine"],
            }
        else:
            raw_pcm = b"\x00" * 1600
            audio_payload = {
                "sample_rate": 16000,
                "audio_wav_base64": None,
                "pcm_bytes_length": len(raw_pcm),
                "engine": "silent-unrecognized",
            }
        tts_s = time.perf_counter() - tts_start

        total_s = time.perf_counter() - t0
        latency = {
            "pre_processing_s": round(pre_s, 4),
            "model_inference_s": round(inf_s, 4),
            "tts_s": round(tts_s, 4),
            "total_s": round(total_s, 4),
        }
        self._record_metric("sign_to_voice", latency)

        return {
            "direction": "sign_to_voice",
            "source": pose_res["source"],
            "frame_count": pose_res["frame_count"],
            "recognized": pred_res.get("recognized", True),
            "is_unknown": pred_res.get("is_unknown", False),
            "status": pred_res.get("status", "recognized"),
            "recognized_gloss": pred_res["gloss"],
            "text": pred_res["text"],
            "confidence": pred_res["confidence"],
            "model": pred_res["model"],
            "non_manual_markers": pred_res["non_manual"],
            "top_candidates": pred_res.get("top_candidates", []),
            "audio": audio_payload,
            "raw_pcm": raw_pcm,
            "latency": latency,
        }

    def _record_metric(self, direction: str, latency: dict[str, Any]) -> None:
        self.metrics_history.append({"direction": direction, **latency})
        if len(self.metrics_history) > 100:
            self.metrics_history.pop(0)
