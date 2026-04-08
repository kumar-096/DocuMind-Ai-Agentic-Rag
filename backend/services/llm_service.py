import asyncio
import time


from settings import get_settings
from llm_client import LlmClient


# Load settings
settings = get_settings()

# Validate API key early (fail fast)
if not settings.gemini_api_key:
    raise RuntimeError("GEMINI_API_KEY missing")



# Single LLM instance (avoid duplicate logic)
llm = LlmClient()


# ----------------------------------------
# SAFE GENERATE (RETRY + QUOTA HANDLING)
# ----------------------------------------
def safe_generate(prompt: str, temperature: float) -> str:
    MAX_RETRIES = 1

    for attempt in range(MAX_RETRIES):
        try:
            return llm.generate(
                system_prompt="You are a helpful assistant.",
                user_prompt=prompt,
                temperature=temperature,
            )

        except Exception as e:
            error_text = str(e)
            print("LLM ERROR RAW:", error_text)

            # Proper detection
            if any(x in error_text.lower() for x in [
                "rate", "quota", "exceeded", "resource_exhausted"
            ]):
                wait_time = 10 + attempt * 5
                print(f"Rate limit detected. Retrying in {wait_time}s...")
                time.sleep(wait_time)
                continue

            # REAL ERROR RETURN
            return f"LLM failure: {error_text}"

    return "⚠️ API quota exhausted or rate limited."


# ----------------------------------------
# STREAMING (CHUNK-BASED)
# ----------------------------------------
async def llm_stream_async(prompt: str, temperature: float):
    for token in llm.stream_generate(prompt, temperature):
        yield token
        await asyncio.sleep(0)