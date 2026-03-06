"""
Prototype intent-based sign gesture extraction.
This is an accessibility helper and not a certified sign language system.
"""


def detect_intent(text: str) -> str:
    text = (text or "").lower()

    if any(word in text for word in ["learn", "study", "education"]):
        return "learn"
    if any(word in text for word in ["help", "support"]):
        return "help"
    if any(word in text for word in ["start", "begin"]):
        return "start"
    if any(word in text for word in ["end", "finish", "complete"]):
        return "complete"
    if any(word in text for word in ["yes", "correct"]):
        return "yes"
    if any(word in text for word in ["no", "not"]):
        return "no"

    return "idle"
