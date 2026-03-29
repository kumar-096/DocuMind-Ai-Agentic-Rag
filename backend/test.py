
from google.genai import Client

client = Client(api_key="AIzaSyA5WT6UJHi1VFjneS-QL_2pphuEzD9yx4U")

response = client.models.generate_content(
    model="gemini-2.0-flash",
    contents="Hello"
)

print(response.text)