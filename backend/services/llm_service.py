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
):
    max_retries = 3

    for attempt in range(max_retries):
        try:
            for chunk in llm.stream_generate(prompt, temperature):
                if not chunk:
                    continue

                words = chunk.split(" ")

                for i, word in enumerate(words):
                    token = word if i == len(words) - 1 else word + " "
                    yield token
                    await asyncio.sleep(0.01)

            return

        except Exception as e:
            error_text = str(e).lower()
            print("STREAM ERROR:", error_text)

            transient = [
                "503",
                "unavailable",
                "high demand",
                "quota",
                "rate",
            ]

            if any(x in error_text for x in transient):
                if attempt < max_retries - 1:
                    wait_time = 2 + attempt * 3
                    print(f"Retrying stream in {wait_time}s...")
                    await asyncio.sleep(wait_time)
                    continue

            raise