"""Evaluation & calibration harness verifying per-class ISL accuracy, left-hand invariance, and unknown rejection."""

from __future__ import annotations

import json
import random
from pathlib import Path
from typing import Any

from app.pipeline import TranslationOrchestrator
from app.sign_to_voice.pose_to_text_3dcnn import _mirror_sequence


def perturb_keyframes(keyframes: list[dict[str, Any]], rng: random.Random, scale: float = 0.025) -> list[dict[str, Any]]:
    out = []
    for f in keyframes:
        rw = f["right_wrist"]
        lw = f["left_wrist"]
        out.append({
            **f,
            "right_wrist": [
                round(rw[0] + rng.uniform(-scale, scale), 4),
                round(rw[1] + rng.uniform(-scale, scale), 4),
                round(rw[2] + rng.uniform(-scale * 0.5, scale * 0.5), 4),
            ],
            "left_wrist": [
                round(lw[0] + rng.uniform(-scale, scale), 4),
                round(lw[1] + rng.uniform(-scale, scale), 4),
                round(lw[2] + rng.uniform(-scale * 0.5, scale * 0.5), 4),
            ],
            "right_open": max(0.0, min(1.0, float(f.get("right_open", 0.5)) + rng.uniform(-0.08, 0.08))),
            "left_open": max(0.0, min(1.0, float(f.get("left_open", 0.3)) + rng.uniform(-0.08, 0.08))),
        })
    return out


def main() -> int:
    orch = TranslationOrchestrator()
    vocab_path = Path(__file__).resolve().parent.parent / "data" / "gloss_pose_vocab.json"
    with open(vocab_path, "r", encoding="utf-8") as f:
        signs = json.load(f)["signs"]

    rng = random.Random(42)
    exact_hits = 0
    noisy_hits = 0
    noisy_total = 0
    left_hand_hits = 0
    left_hand_total = 0
    failures: list[str] = []

    for gloss, spec in sorted(signs.items()):
        kf = spec["keyframes"]
        res = orch.sign_to_voice(pose_sequence=kf)
        if res["recognized"] and res["recognized_gloss"] == gloss:
            exact_hits += 1
        else:
            failures.append(f"EXACT FAIL {gloss}: got {res['recognized_gloss']} (conf={res['confidence']})")

        for _ in range(5):
            noisy_total += 1
            noisy_kf = perturb_keyframes(kf, rng, scale=0.025)
            n_res = orch.sign_to_voice(pose_sequence=noisy_kf)
            if n_res["recognized"] and n_res["recognized_gloss"] == gloss:
                noisy_hits += 1
            else:
                failures.append(
                    f"NOISY FAIL {gloss}: got {n_res['recognized_gloss']} (conf={n_res['confidence']})"
                )

        if spec.get("handedness") == "one_hand":
            left_hand_total += 1
            mirrored = _mirror_sequence(kf)
            l_res = orch.sign_to_voice(pose_sequence=mirrored)
            if l_res["recognized"] and l_res["recognized_gloss"] == gloss:
                left_hand_hits += 1
            else:
                failures.append(
                    f"LEFT-HAND FAIL {gloss}: got {l_res['recognized_gloss']} (conf={l_res['confidence']})"
                )

    # Out-of-distribution & idle/neutral tests (MUST return UNKNOWN or IDLE, NEVER NAME/HOSPITAL/FAMILY/EMERGENCY!)
    ood_cases = {
        "neutral_resting_center": [
            {"t": 0.0, "right_wrist": [0.68, 0.60, 0.05], "left_wrist": [0.35, 0.72, 0.0], "right_open": 0.5, "left_open": 0.3, "right_active": False, "left_active": False},
            {"t": 1.0, "right_wrist": [0.68, 0.60, 0.05], "left_wrist": [0.35, 0.72, 0.0], "right_open": 0.5, "left_open": 0.3, "right_active": False, "left_active": False},
        ],
        "arbitrary_untrained_corner_pose": [
            {"t": 0.0, "right_wrist": [0.92, 0.85, 0.40], "left_wrist": [0.10, 0.15, 0.40], "right_open": 0.5, "left_open": 0.5, "right_fingers": [1, 0, 1, 0, 1], "left_fingers": [0, 1, 0, 1, 0], "right_active": True, "left_active": True},
            {"t": 1.0, "right_wrist": [0.92, 0.85, 0.40], "left_wrist": [0.10, 0.15, 0.40], "right_open": 0.5, "left_open": 0.5, "right_fingers": [1, 0, 1, 0, 1], "left_fingers": [0, 1, 0, 1, 0], "right_active": True, "left_active": True},
        ],
        "center_stationary_ambiguous_pose": [
            {"t": 0.0, "right_wrist": [0.50, 0.50, 0.10], "left_wrist": [0.50, 0.50, 0.10], "right_open": 0.5, "left_open": 0.5, "right_fingers": [1, 0, 1, 1, 0], "left_fingers": [1, 0, 1, 1, 0], "right_active": True, "left_active": True},
            {"t": 1.0, "right_wrist": [0.50, 0.50, 0.10], "left_wrist": [0.50, 0.50, 0.10], "right_open": 0.5, "left_open": 0.5, "right_fingers": [1, 0, 1, 1, 0], "left_fingers": [1, 0, 1, 1, 0], "right_active": True, "left_active": True},
        ],
    }

    ood_rejected = 0
    for name, seq in ood_cases.items():
        res = orch.sign_to_voice(pose_sequence=seq)
        if not res["recognized"] and res["recognized_gloss"] in ("UNKNOWN", "IDLE"):
            ood_rejected += 1
        else:
            failures.append(
                f"OOD FALSE POSITIVE {name}: predicted {res['recognized_gloss']} (conf={res['confidence']})"
            )

    print(f"Exact prototype accuracy : {exact_hits}/{len(signs)}")
    print(f"Noisy perturbation acc   : {noisy_hits}/{noisy_total}")
    print(f"Left-hand mirror accuracy: {left_hand_hits}/{left_hand_total}")
    print(f"OOD / Idle rejection     : {ood_rejected}/{len(ood_cases)}")
    if failures:
        print("FAILURES:")
        for err in failures[:20]:
            print(" -", err)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
