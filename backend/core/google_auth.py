from google.oauth2 import id_token
from google.auth.transport import requests

from settings import get_settings

settings = get_settings()


def verify_google_token(token: str):

    try:
        idinfo = id_token.verify_oauth2_token(
            token,
            requests.Request(),
            settings.google_client_id  # MUST MATCH FRONTEND
        )

        # 🔥 EXTRA SAFETY (audience check)
        if idinfo["aud"] != settings.google_client_id:
            return None

        return {
            "email": idinfo.get("email"),
            "name": idinfo.get("name"),
        }

    except Exception as e:
        print("GOOGLE VERIFY ERROR:", str(e))  # 🔥 DEBUG
        return None