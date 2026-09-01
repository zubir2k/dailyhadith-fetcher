import requests
import os
import hashlib
import json

API_ENDPOINT = os.getenv("API_ENDPOINT")
API_KEY = os.getenv("API_KEY")
CF_WORKER_URL = os.getenv("CF_WORKER_URL")

if not API_ENDPOINT or not API_KEY:
    print("❌ Missing API_ENDPOINT or API_KEY in environment.")
    exit(1)

headers = {
    "x-api-key": API_KEY
}

response = requests.get(API_ENDPOINT, headers=headers)
if response.status_code != 200:
    print(f"❌ Failed to fetch API: {response.status_code} - {response.text}")
    exit(1)

# Validate structure first
try:
    data = response.json()
    if "hadith" not in data or not data["hadith"]:
        print("❌ Invalid response: missing 'hadith' key.")
        exit(1)
except Exception as e:
    print(f"❌ Failed to parse JSON: {e}")
    exit(1)

# --- Translation helper ---
def translate(text):
    try:
        tr_response = requests.post(
            CF_WORKER_URL,
            json={"text": text, "targetLang": "ms"},
            timeout=30,
        )
        if tr_response.status_code == 200:
            return tr_response.json().get("translated", "")
    except Exception as e:
        print(f"⚠️ Translation error: {e}")
    return ""

# --- Translation step ---
if CF_WORKER_URL:
    en_entry = next((h for h in data["hadith"] if h["lang"] == "en"), None)
    ar_entry = next((h for h in data["hadith"] if h["lang"] == "ar"), None)

    if en_entry:
        print("🔄 Translating hadith body...")
        translated_body = translate(en_entry["body"])

        print("🔄 Translating chapter title...")
        translated_title = translate(en_entry.get("chapterTitle", ""))

        if translated_body:
            ms_entry = {
                "lang": "ms",
                "chapterNumber": en_entry.get("chapterNumber", ""),
                "chapterTitle": translated_title or en_entry.get("chapterTitle", ""),
                "urn": ar_entry.get("urn", 0) if ar_entry else en_entry.get("urn", 0),
                "body": f"<p>{translated_body}</p>",
                "grades": []
            }

            # Remove existing ms entry if any, then append fresh
            data["hadith"] = [h for h in data["hadith"] if h["lang"] != "ms"]
            data["hadith"].append(ms_entry)
            print("✅ Malay translation added.")
        else:
            print("⚠️ Body translation returned empty, skipping ms entry.")
    else:
        print("⚠️ No English entry found, skipping translation.")
else:
    print("⚠️ CF_WORKER_URL not set, skipping translation.")

# --- Save ---
json_string = json.dumps(data, ensure_ascii=False, indent=2)
file_path = "dailyhadith.json"

if os.path.exists(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        current = f.read()
    if hashlib.md5(current.encode()).hexdigest() == hashlib.md5(json_string.encode()).hexdigest():
        print("✅ Hadith content unchanged. No update needed.")
        exit(0)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(json_string)
print("✅ New hadith written to dailyhadith.json")
