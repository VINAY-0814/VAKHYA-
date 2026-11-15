"""HTTP + TCP server entrypoint for VAKHYA Python AI translation microservices."""

from __future__ import annotations

import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

from app.pipeline import TranslationOrchestrator
from app.stream_bridge import start_tcp_stream_bridges

orchestrator = TranslationOrchestrator()


def sanitize_result(result: dict[str, Any]) -> dict[str, Any]:
    cleaned = dict(result)
    cleaned.pop("raw_stream", None)
    cleaned.pop("raw_pcm", None)
    return cleaned


def run_fastapi_server(host: str, port: int) -> None:
    from fastapi import FastAPI, HTTPException
    from pydantic import BaseModel
    import uvicorn

    app = FastAPI(title="VAKHYA Translation Microservices", version="1.0.0")

    class VoiceToSignReq(BaseModel):
        text: str | None = None
        audio_base64: str | None = None
        sign_language: str = "ASL"
        fps: int = 12
        encode_video: bool = True

    class SignToVoiceReq(BaseModel):
        pose_sequence: list[dict[str, Any]] | None = None
        video_base64: str | None = None
        gloss_hint: str | None = None
        pitch: float = 1.0
        speed: float = 1.0

    @app.get("/health")
    def health():
        return {"status": "ok", "service": "vakhya-translation", "vocab_size": len(orchestrator.list_vocabulary())}

    @app.get("/vocabulary")
    def vocabulary():
        return {"vocabulary": orchestrator.list_vocabulary()}

    @app.get("/metrics")
    def metrics():
        return {"recent": orchestrator.metrics_history[-20:]}

    @app.post("/translate/voice-to-sign")
    def voice_to_sign(req: VoiceToSignReq):
        if not req.text and not req.audio_base64:
            raise HTTPException(status_code=400, detail="Either text or audio_base64 is required")
        res = orchestrator.voice_to_sign(
            text=req.text,
            audio_base64=req.audio_base64,
            sign_language=req.sign_language,
            fps=req.fps,
            encode_video=req.encode_video,
        )
        return sanitize_result(res)

    @app.post("/translate/sign-to-voice")
    def sign_to_voice(req: SignToVoiceReq):
        res = orchestrator.sign_to_voice(
            pose_sequence=req.pose_sequence,
            video_base64=req.video_base64,
            gloss_hint=req.gloss_hint,
            pitch=req.pitch,
            speed=req.speed,
        )
        return sanitize_result(res)

    uvicorn.run(app, host=host, port=port, log_level="info")


class StdlibTranslationHandler(BaseHTTPRequestHandler):
    def _send_json(self, code: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        if self.path == "/health":
            self._send_json(200, {"status": "ok", "service": "vakhya-translation", "vocab_size": len(orchestrator.list_vocabulary())})
        elif self.path == "/vocabulary":
            self._send_json(200, {"vocabulary": orchestrator.list_vocabulary()})
        elif self.path == "/metrics":
            self._send_json(200, {"recent": orchestrator.metrics_history[-20:]})
        else:
            self._send_json(404, {"error": "Not found"})

    def do_POST(self) -> None:
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length > 0 else b"{}"
        try:
            body = json.loads(raw.decode("utf-8"))
        except Exception:
            self._send_json(400, {"error": "Invalid JSON body"})
            return

        if self.path == "/translate/voice-to-sign":
            if not body.get("text") and not body.get("audio_base64"):
                self._send_json(400, {"error": "Either text or audio_base64 is required"})
                return
            res = orchestrator.voice_to_sign(
                text=body.get("text"),
                audio_base64=body.get("audio_base64"),
                sign_language=body.get("sign_language", "ASL"),
                fps=int(body.get("fps", 12)),
                encode_video=bool(body.get("encode_video", True)),
            )
            self._send_json(200, sanitize_result(res))
        elif self.path == "/translate/sign-to-voice":
            res = orchestrator.sign_to_voice(
                pose_sequence=body.get("pose_sequence"),
                video_base64=body.get("video_base64"),
                gloss_hint=body.get("gloss_hint"),
                pitch=float(body.get("pitch", 1.0)),
                speed=float(body.get("speed", 1.0)),
            )
            self._send_json(200, sanitize_result(res))
        else:
            self._send_json(404, {"error": "Not found"})

    def log_message(self, format: str, *args: Any) -> None:
        return


def main() -> None:
    host = os.environ.get("TRANSLATION_HOST", "0.0.0.0")
    http_port = int(os.environ.get("TRANSLATION_HTTP_PORT", "8000"))
    v2s_port = int(os.environ.get("V2S_TCP_PORT", "9001"))
    s2v_port = int(os.environ.get("S2V_TCP_PORT", "9002"))

    start_tcp_stream_bridges(orchestrator, host=host, v2s_port=v2s_port, s2v_port=s2v_port)

    try:
        import fastapi  # noqa: F401
        import uvicorn  # noqa: F401
        run_fastapi_server(host, http_port)
    except ImportError:
        server = ThreadingHTTPServer((host, http_port), StdlibTranslationHandler)
        print(f"[VAKHYA Translation] Stdlib HTTP server listening on http://{host}:{http_port}")
        server.serve_forever()


if __name__ == "__main__":
    main()
