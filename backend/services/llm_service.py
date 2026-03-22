import asyncio
import time
import google.generativeai as genai

from settings import get_settings
from llm_client import LlmClient


# Load settings
settings = get_settings()

# Validate API key early (fail fast)
if not settings.gemini_api_key:
    raise RuntimeError("GEMINI_API_KEY missing")

# Configure Gemini once
genai.configure(api_key=settings.gemini_api_key)

# Single LLM instance (avoid duplicate logic)
llm = LlmClient()


# ----------------------------------------
# SAFE GENERATE (RETRY + QUOTA HANDLING)
# ----------------------------------------
def safe_generate(prompt: str, temperature: float) -> str:
    MAX_RETRIES = 3

    for attempt in range(MAX_RETRIES):
        try:
            return llm.generate(
                system_prompt="You are a helpful assistant.",
                user_prompt=prompt,
                temperature=temperature,
            )

        except Exception as e:
            error_text = str(e)

            # Handle quota errors
            if "RESOURCE_EXHAUSTED" in error_text:
                wait_time = 12 + attempt * 5
                print(f"Quota hit. Retrying in {wait_time}s...")
                time.sleep(wait_time)
                continue

            return f"LLM error: {error_text}"

    return "⚠️ Rate limit exceeded. Please try again later."


# ----------------------------------------
# STREAMING (CHUNK-BASED)
# ----------------------------------------
async def llm_stream_async(prompt: str, temperature: float):

    # Run blocking LLM call in background thread
    full_text = await asyncio.to_thread(safe_generate, prompt, temperature)

    if not full_text:
        yield "No response generated."
        return

    # Chunk size controls streaming speed
    chunk_size = 50

    for i in range(0, len(full_text), chunk_size):
        yield full_text[i:i + chunk_size]
        await asyncio.sleep(0.01)