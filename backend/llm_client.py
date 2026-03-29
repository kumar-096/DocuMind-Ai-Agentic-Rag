from __future__ import annotations

from typing import Optional
from google.genai import Client
import time

from settings import get_settings


class LlmClient:    

    def __init__(self) -> None:
        settings = get_settings()

        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY missing")

        self.client = Client(api_key=settings.gemini_api_key)

        # 🔥 Always use cheapest model
        self.model = "gemini-2.5-flash"
        print("USING MODEL:", self.model)
    def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.7,
        model: Optional[str] = None,
    ) -> str:

        # ✅ DO NOT MODIFY PROMPT (RAG already built it)
        prompt = user_prompt

        try:
            time.sleep(2)  # rate control

            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config={
                    "temperature": 0.7,
                    "max_output_tokens": 3000,   
                    "top_p": 0.95,               
                }
            )

            return response.text.strip() if response.text else "No response"

        except Exception as e:
            print("🔥 FULL LLM ERROR:", repr(e))
            return "⚠️ Demo mode: LLM unavailable"