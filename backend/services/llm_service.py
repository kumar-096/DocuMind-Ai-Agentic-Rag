from google import genai
import asyncio
import time
from settings import get_settings

settings = get_settings()

client = genai.Client(api_key=settings.gemini_api_key)


# 🔥 SAFE GENERATE (WITH RETRY + QUOTA HANDLING)
def safe_generate(prompt: str, temperature: float):

    MAX_RETRIES = 3

    for attempt in range(MAX_RETRIES):
        try:
            response = client.models.generate_content(
                model=settings.gemini_model,
                contents=prompt,
                config={"temperature": float(temperature)},
            )

            if response and getattr(response, "text", None):
                return response.text

            if response and hasattr(response, "candidates"):
                parts = response.candidates[0].content.parts
                if parts:
                    return parts[0].text

            return ""

        except Exception as e:

            error_text = str(e)

            # 🔥 HANDLE QUOTA
            if "RESOURCE_EXHAUSTED" in error_text:
                wait_time = 12 + attempt * 5
                print(f"Quota hit. Retrying in {wait_time}s...")
                time.sleep(wait_time)
                continue

            # 🔥 OTHER ERRORS → BREAK
            return f"LLM error: {error_text}"

    return "⚠️ Rate limit exceeded. Please try again later."


# 🔥 STREAM FUNCTION
async def llm_stream_async(prompt: str, temperature: float):

    full_text = await asyncio.to_thread(safe_generate, prompt, temperature)

    if not full_text:
        yield "No response generated."
        return

    # 🔥 SMART STREAMING (WORD + NATURAL DELAY)
    words = full_text.split(" ")

    for word in words:

        yield word + " "

        # dynamic delay
        delay = 0.01

        if word.endswith(".") or word.endswith(","):
            delay = 0.06
        elif len(word) > 6:
            delay = 0.02

        await asyncio.sleep(delay)