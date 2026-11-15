"""Text-to-Gloss translation stage for Voice-to-Sign pipeline."""

from __future__ import annotations

import re
from typing import Iterable


SYNONYM_MAP = {
    "HI": "HELLO",
    "HEY": "HELLO",
    "GREETINGS": "HELLO",
    "BYE": "GOODBYE",
    "THANKS": "THANK_YOU",
    "THANK": "THANK_YOU",
    "THX": "THANK_YOU",
    "OKAY": "OK",
    "ALRIGHT": "OK",
    "SURE": "YES",
    "YEAH": "YES",
    "NOPE": "NO",
    "NOT": "NO",
    "ASSIST": "HELP",
    "AID": "HELP",
    "URGENT": "EMERGENCY",
    "PHYSICIAN": "DOCTOR",
    "NURSE": "DOCTOR",
    "CLINIC": "HOSPITAL",
    "HURT": "PAIN",
    "ACHE": "PAIN",
    "PILL": "MEDICINE",
    "MEDS": "MEDICINE",
    "EAT": "FOOD",
    "HUNGRY": "FOOD",
    "DRINK": "WATER",
    "THIRSTY": "WATER",
    "I": "ME",
    "MY": "ME",
    "MYSELF": "ME",
    "YOUR": "YOU",
    "YOURSELF": "YOU",
    "APOLOGIZE": "SORRY",
    "EXCUSE": "SORRY",
    "GREAT": "GOOD",
    "FINE": "GOOD",
    "WELL": "GOOD",
    "TALK": "SPEAK",
    "VOICE": "SPEAK",
    "PHONE": "CALL",
    "VIDEO": "CALL",
    "KNOW": "UNDERSTAND",
}

STOP_WORDS = {
    "A", "AN", "THE", "IS", "ARE", "AM", "WAS", "WERE", "BE", "BEEN",
    "TO", "OF", "IN", "ON", "AT", "FOR", "WITH", "AND", "OR", "DO", "DOES", "DID",
    "CAN", "COULD", "WOULD", "WILL", "SHALL", "IT", "THIS", "THAT", "THERE",
}

WH_WORDS = {"WHAT", "WHERE", "HOW"}


class TextToGlossConverter:
    """Converts natural English text into ordered sign-language gloss tokens."""

    def __init__(self, vocabulary_glosses: Iterable[str]):
        self.vocab = set(vocabulary_glosses)

    def convert(self, text: str, sign_language: str = "ASL") -> dict:
        clean = (text or "").strip()
        is_question = "?" in clean
        tokens = re.findall(r"[A-Za-z]+", clean.upper())

        glosses: list[str] = []
        i = 0
        while i < len(tokens):
            # Handle multi-word phrases like "THANK YOU"
            if i + 1 < len(tokens) and tokens[i] == "THANK" and tokens[i + 1] == "YOU":
                glosses.append("THANK_YOU")
                i += 2
                continue
            if i + 1 < len(tokens) and tokens[i] == "GOOD" and tokens[i + 1] == "MORNING":
                glosses.extend(["GOOD", "MORNING"])
                i += 2
                continue

            word = tokens[i]
            if word in STOP_WORDS:
                i += 1
                continue

            mapped = SYNONYM_MAP.get(word, word)
            if mapped in self.vocab:
                glosses.append(mapped)
            else:
                # Preserve out-of-vocab word tagged as fingerspelling token
                glosses.append(f"FS:{word}")
            i += 1

        if not glosses:
            glosses = ["HELLO"]

        # ASL/ISL WH-question reordering: move WH words toward clause end
        if is_question or any(g in WH_WORDS for g in glosses):
            non_wh = [g for g in glosses if g not in WH_WORDS]
            wh = [g for g in glosses if g in WH_WORDS]
            glosses = non_wh + wh

        non_manual = {
            "eyebrows": "down" if is_question else ("up" if "HELLO" in glosses or "GOOD" in glosses else "neutral"),
            "mouth": "smile" if any(g in {"HELLO", "THANK_YOU", "GOOD"} for g in glosses) else ("open" if is_question else "idle"),
            "headTilt": "forward" if is_question else "none",
        }

        return {
            "sign_language": sign_language,
            "source_text": clean,
            "glosses": glosses,
            "gloss_string": " ".join(glosses),
            "non_manual_markers": non_manual,
        }
