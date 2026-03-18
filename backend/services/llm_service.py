from google import genai
import asyncio
from settings import get_settings

settings = get_settings()

if not settings.gemini_api_key:
    raise RuntimeError("GEMINI_API_KEY is missing")

client = genai.Client(api_key=settings.gemini_api_key)


def generate_full(prompt: str) -> str:
    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=prompt
    )

    if response and response.text:
        return response.text

    return "No response generated."


async def llm_stream_async(prompt: str):
    # ✅ Step 1: get full response
    full_text = await asyncio.to_thread(generate_full, prompt)

    # ✅ Step 2: simulate streaming
    words = full_text.split()

    for word in words:
        yield word + " "
        await asyncio.sleep(0.02)  # smooth typing effect