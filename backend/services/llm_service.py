import asyncio
import time
from typing import AsyncGenerator

from settings import get_settings
from llm_client import LlmClient


settings = get_settings()

if not settings.gemini_api_key:
    raise RuntimeError("GEMINI_API_KEY missing")


llm = LlmClient()


def safe_generate(prompt: str, temperature: float) -> str:
    max_retries = 2

    for attempt in range(max_retries):
        try:
            return llm.generate(
                system_prompt="You are a helpful assistant.",
                user_prompt=prompt,
                temperature=temperature,
            )

        except Exception as e:
            error_text = str(e)
            print("LLM ERROR RAW:", error_text)

            if any(
                x in error_text.lower()
                for x in ["rate", "quota", "exceeded", "resource_exhausted"]
            ):
                wait_time = 5 + attempt * 3
                print(f"Rate limit detected. Retrying in {wait_time}s...")
                time.sleep(wait_time)
                continue

            raise

    raise RuntimeError("API quota exhausted or rate limited.")


async def llm_stream_async(
    prompt: str,
    temperature: float
) -> AsyncGenerator[str, None]:
    """
    Converts Gemini large stream chunks into word-level chunks
    for smoother frontend typing UX.
    """
    for chunk in llm.stream_generate(prompt, temperature):
        if not chunk:
            continue

        words = chunk.split(" ")

        for i, word in enumerate(words):
            token = word if i == len(words) - 1 else word + " "

            yield token

            # smooth typing feel
            await asyncio.sleep(0.01)