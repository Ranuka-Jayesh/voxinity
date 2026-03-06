import re
import os
from typing import Any

from deep_translator import GoogleTranslator

from backend.services.sign_avatar import detect_intent
from backend.utils.logger import get_logger

logger = get_logger("translator")

NLLB_MODEL_NAME = "facebook/nllb-200-distilled-600M"
LANGUAGE_MAP = {
    "en": "eng_Latn",
    "ja": "jpn_Jpan",
    "ko": "kor_Hang",
    "si": "sin_Sinh",
    "ta": "tam_Taml",
}
SUPPORTED_SOURCE_CODES = set(LANGUAGE_MAP.keys())
SINHALA_GLOSSARY = {
    "machine learning": "යන්ත්‍ර ඉගෙනුම",
    "artificial intelligence": "කෘත්‍රිම බුද්ධිය",
    "data structure": "දත්ත ව්‍යුහය",
    "computer science": "පරිගණක විද්‍යාව",
    "database": "දත්ත සමුදාය",
    "algorithm": "ඇල්ගොරිතම",
    "api": "API",
}

_nllb_tokenizer: Any = None
_nllb_model: Any = None
_torch: Any = None
_nllb_device: str = "cpu"
FILLER_ONLY_PATTERN = re.compile(r"^(um+|uh+|hmm+|mm+|erm+|ah+|eh+)[.!?]?$", re.IGNORECASE)
_QUALITY_MODE = os.environ.get("DUB_TRANSLATION_QUALITY_MODE", "").lower() in {"1", "true", "yes"}


def clean_text(text: str) -> str:
    cleaned = text.strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    cleaned = re.sub(r"\s+([,.!?;:])", r"\1", cleaned)
    return cleaned


def postprocess_translation(text: str, target_language: str) -> str:
    output = text
    if target_language == "si":
        for source_term, glossary_term in SINHALA_GLOSSARY.items():
            output = re.sub(
                re.escape(source_term),
                glossary_term,
                output,
                flags=re.IGNORECASE,
            )
        output = _normalize_sinhala_number_phrases(output)
    return output


def _normalize_sinhala_number_phrases(text: str) -> str:
    """
    Fix common MT artifacts in Sinhala where number-word phrases get duplicated
    (e.g. "විස්සයි විස්සක්"). Keep this conservative and phrase-scoped.
    """
    output = text
    replacements = {
        "විස්සයි විස්සක්": "තත්පර විස්සක්",
        "විනාඩියක් විනාඩියක්": "විනාඩියක්",
        "තත්පරයක් තත්පරයක්": "තත්පරයක්",
    }
    for source, target in replacements.items():
        output = output.replace(source, target)
    output = re.sub(r"\s+", " ", output).strip()
    return output


def compress_for_dubbing(text: str, max_words: int = 22) -> str:
    compact = clean_text(text)
    # Prefer the first full sentence/clause for timing-constrained dubbing.
    sentence_split = re.split(r"(?<=[.!?])\s+", compact)
    if sentence_split and sentence_split[0]:
        compact = sentence_split[0]
    words = compact.split()
    if len(words) > max_words:
        compact = " ".join(words[:max_words]).rstrip(",;:- ")
    return compact


def compress_for_dubbing_quality(text: str, max_words: int = 30) -> str:
    """
    Quality mode keeps more context and avoids aggressive first-sentence truncation.
    """
    compact = clean_text(text)
    words = compact.split()
    if len(words) > max_words:
        compact = " ".join(words[:max_words]).rstrip(",;:- ")
    return compact


def _detect_source_language(segments: list[dict]) -> str:
    sample = " ".join((segment.get("text") or "") for segment in segments[:5])
    if re.search(r"[\u3040-\u30ff]", sample):
        return "ja"
    if re.search(r"[\uac00-\ud7af]", sample):
        return "ko"
    return "en"


def _load_nllb_components() -> tuple[Any, Any, Any, str]:
    global _nllb_tokenizer, _nllb_model, _torch, _nllb_device
    if _nllb_tokenizer is not None and _nllb_model is not None and _torch is not None:
        return _nllb_tokenizer, _nllb_model, _torch, _nllb_device

    logger.info("Loading NLLB translation model...")
    import torch  # type: ignore
    from transformers import AutoModelForSeq2SeqLM, AutoTokenizer  # type: ignore

    tokenizer = AutoTokenizer.from_pretrained(NLLB_MODEL_NAME)
    model = AutoModelForSeq2SeqLM.from_pretrained(NLLB_MODEL_NAME)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model.to(device)
    model.eval()

    _nllb_tokenizer = tokenizer
    _nllb_model = model
    _torch = torch
    _nllb_device = device
    return tokenizer, model, torch, device


def _nllb_forced_bos_token_id(tokenizer: Any, target_lang_code: str) -> int:
    """Resolve target-language BOS for NLLB (transformers 4.x vs 5.x tokenizer APIs)."""
    mapping = getattr(tokenizer, "lang_code_to_id", None)
    if isinstance(mapping, dict) and target_lang_code in mapping:
        return int(mapping[target_lang_code])
    tid = tokenizer.convert_tokens_to_ids(target_lang_code)
    unk = getattr(tokenizer, "unk_token_id", None)
    if isinstance(tid, int) and tid != unk:
        return int(tid)
    encoded = tokenizer.encode(target_lang_code, add_special_tokens=False)
    if len(encoded) == 1:
        return int(encoded[0])
    raise ValueError(
        f"Cannot resolve NLLB forced BOS id for {target_lang_code!r}; "
        "check LANGUAGE_MAP codes match the model."
    )


def _translate_with_nllb(
    text: str, source_lang_code: str, target_lang_code: str
) -> str:
    tokenizer, model, torch, device = _load_nllb_components()
    tokenizer.src_lang = source_lang_code
    inputs = tokenizer(text, return_tensors="pt", truncation=True)
    inputs = {key: value.to(device) for key, value in inputs.items()}
    forced_bos_id = _nllb_forced_bos_token_id(tokenizer, target_lang_code)

    with torch.no_grad():
        generated_tokens = model.generate(
            **inputs,
            forced_bos_token_id=forced_bos_id,
            max_length=256,
        )
    return tokenizer.batch_decode(generated_tokens, skip_special_tokens=True)[0].strip()


def translate_segments(
    segments: list[dict],
    target_language: str,
    source_language: str = "auto",
    translation_provider: str = "nllb",
) -> list[dict]:
    logger.info("Translating...")
    logger.info("Translation quality mode: %s", "on" if _QUALITY_MODE else "off")
    translated: list[dict] = []

    source_lang = (
        _detect_source_language(segments)
        if source_language == "auto"
        else source_language
    )
    source_lang_code = LANGUAGE_MAP.get(source_lang, LANGUAGE_MAP["en"])
    target_lang_code = LANGUAGE_MAP.get(target_language, LANGUAGE_MAP["en"])
    basic_source = source_lang if source_lang in SUPPORTED_SOURCE_CODES else "auto"
    try:
        basic_translator = GoogleTranslator(source=basic_source, target=target_language)
    except Exception as exc:
        logger.warning(
            "Basic translator init failed for source=%s target=%s: %s. Falling back to source=auto.",
            basic_source,
            target_language,
            str(exc),
        )
        basic_translator = GoogleTranslator(source="auto", target=target_language)

    for segment in segments:
        original_text = segment.get("text", "")
        cleaned_text = clean_text(original_text)
        if FILLER_ONLY_PATTERN.match(cleaned_text):
            logger.info("Skipping filler-only segment: %s", cleaned_text)
            translated.append(
                {
                    "start": segment["start"],
                    "end": segment["end"],
                    "text": original_text,
                    "translated_text": "",
                    "gesture": "idle",
                }
            )
            continue
        if not cleaned_text:
            translated.append(
                {
                    "start": segment["start"],
                    "end": segment["end"],
                    "text": original_text,
                    "translated_text": "",
                    "gesture": "idle",
                }
            )
            continue

        if source_lang == target_language:
            translated.append(
                {
                    "start": segment["start"],
                    "end": segment["end"],
                    "text": original_text,
                    "translated_text": original_text,
                    "gesture": detect_intent(original_text),
                }
            )
            logger.debug(
                "Same-language segment: %s | %s",
                source_lang,
                cleaned_text[:80],
            )
            continue

        translated_text: str
        try:
            translated_text = _translate_with_nllb(
                cleaned_text, source_lang_code, target_lang_code
            )
        except Exception as exc:
            logger.warning(
                "NLLB failed, falling back to basic translator... source=%s target=%s reason=%s",
                source_lang,
                target_language,
                str(exc),
            )
            translated_text = basic_translator.translate(cleaned_text)

        translated_text = postprocess_translation(translated_text, target_language)
        if _QUALITY_MODE:
            translated_text = compress_for_dubbing_quality(translated_text)
        else:
            translated_text = compress_for_dubbing(translated_text)
        logger.debug(
            "Translated segment (%s→%s): %s",
            source_lang,
            target_language,
            translated_text[:120],
        )
        translated.append(
            {
                "start": segment["start"],
                "end": segment["end"],
                "text": original_text,
                "translated_text": translated_text,
                "gesture": detect_intent(translated_text),
            }
        )
    return translated
