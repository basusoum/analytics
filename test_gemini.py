import os, traceback
from dotenv import load_dotenv
load_dotenv()

key = os.getenv("GOOGLE_API_KEY", "")
model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
print(f"Key: {len(key)} chars, starts: {key[:8]}...")
print(f"Model: {model}")

try:
    from google import genai
    from google.genai import types
    client = genai.Client(api_key=key)
    r = client.models.generate_content(
        model=model,
        contents="Say hello in one word. Return ONLY a JSON array like: [{\"text\":\"Hello\"}]",
        config=types.GenerateContentConfig(temperature=0.3, max_output_tokens=100),
    )
    print(f"SUCCESS: {r.text}")
except Exception as e:
    print(f"ERROR: {type(e).__name__}: {e}")
    traceback.print_exc()
