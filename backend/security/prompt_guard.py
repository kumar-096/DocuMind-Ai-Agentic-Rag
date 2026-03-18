BANNED_PATTERNS = [
    "ignore previous instructions",
    "reveal system prompt",
    "show hidden instructions",
]

def sanitize_context(text: str) -> str:

    cleaned = text

    lower = cleaned.lower()

    for pattern in BANNED_PATTERNS:
        if pattern in lower:
            cleaned = cleaned.replace(pattern, "")

    return cleaned