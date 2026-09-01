import os
import re
import io
import json
from typing import Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response, JSONResponse
from starlette.responses import Response as StarletteResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from gtts import gTTS

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DIR = os.path.join(BASE_DIR, "assets")
STATIC_DIR = os.path.join(BASE_DIR, "static")
INDEX_PATH = os.path.join(BASE_DIR, "server", "dataset_index.json")

app = FastAPI(
    title="Two-Way Sign Language & Voice Translator API",
    description="Intelligent bidirectional sign language & speech translation service",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load dataset index
with open(INDEX_PATH, "r") as f:
    DATASET = json.load(f)

# Sort words by length descending for greedy phrase matching
WORD_ENTRIES = sorted(DATASET["words"], key=lambda x: len(x["word"].split()), reverse=True)
WORD_LOOKUP = {w["word"]: w for w in DATASET["words"]}
ALPHABET_LOOKUP = {a["letter"]: a for a in DATASET["alphabets"]}

# Intelligent sign synonyms and morphological inflections
SYNONYMS = {
    # Greetings & Common Expressions
    "good morning": "morning",
    "good afternoon": "afternoon",
    "good evening": "evening",
    "good night": "night",
    
    # Weather & Nature
    "freezing": "cold",
    "chilly": "cool",
    "warm": "hot",
    "hotter": "hot",
    "colder": "cold",
    "cooler": "cool",
    "sunshine": "sun",
    "sunny": "sun",
    "cloud": "cloudy",
    "clouds": "cloudy",
    "wind": "windy",
    "winds": "windy",
    "rainfall": "heavy rain",
    "raining": "pouring rain",
    "rains": "pouring rain",
    "rained": "pouring rain",
    "rainy": "scattered rain",
    "snowing": "snow",
    "snows": "snow",
    "snowy": "scattered snow",
    "storm": "dust storm",
    "storms": "dust storm",
    "stormy": "dust storm",
    "thunderstorm": "thunder",
    "lightning storm": "lightning",
    "dew": "morning dew",
    "smoggy": "smog",
    "humid": "humid",
    "humidity": "humid",
    
    # Time & Calendar
    "hours": "hour",
    "seconds": "second",
    "days": "day",
    "daily": "day",
    "tonight": "night",
    "nights": "night",
    "mornings": "morning",
    "evenings": "evening",
    "afternoons": "afternoon",
    "everyday": "everyday",
    "every day": "everyday",
    "yearly": "annually",
    "annual": "annually",
    "every year": "annually",
    "monthly": "monthly",
    "every month": "monthly",
    "every week": "every week",
    "weekly": "every week",
    "weekends": "weekend",
    "mondays": "every monday",
    "tuesdays": "every tuesday",
    "wednesdays": "every wednesday",
    "thursdays": "every thursday",
    "fridays": "every friday",
    "sundays": "sunday",
    
    # Actions & States
    "sleeping": "sleep",
    "sleeps": "sleep",
    "slept": "sleep",
    "asleep": "sleep",
    "slipping": "slippery walking",
    "slippery walk": "slippery walking",
    
    # Pronouns & People
    "you": "yourself",
    "your": "yourself",
    "yours": "yourself",
    "he": "he",
    "his": "him",
    "him": "him",
    "she": "her",
    "her": "her",
    "hers": "herself",
    "they": "their",
    "them": "them",
    "theirs": "their",
    "we": "we",
    "us": "us",
    "our": "our",
    "ours": "ourselves",
    "everybody": "everyone",
    "anybody": "anyone",
    "somebody": "somebody",
    "someone": "someone",
    "what's": "what",
    "how are you": "yourself",
    "clear skies": "clear skies"
}

class TranslateRequest(BaseModel):
    text: str
    fingerspell_unknown: bool = True

class TTSRequest(BaseModel):
    text: str
    lang: str = "en"

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "words_count": len(DATASET["words"]),
        "alphabets_count": len(DATASET["alphabets"])
    }

@app.get("/api/dictionary")
def get_dictionary(
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search query")
):
    words = DATASET["words"]
    if category and category.lower() != "all":
        words = [w for w in words if w.get("category", "").lower() == category.lower()]
    if search:
        q = search.lower().strip()
        words = [w for w in words if q in w["word"].lower()]
    
    categories = sorted(list(set(w.get("category", "general") for w in DATASET["words"])))
    return {
        "categories": ["all"] + categories,
        "words": words,
        "alphabets": DATASET["alphabets"],
        "total_words": len(words),
        "total_alphabets": len(DATASET["alphabets"])
    }

NUMBER_WORDS = {
    "0": "zero", "1": "one", "2": "two", "3": "three", "4": "four",
    "5": "five", "6": "six", "7": "seven", "8": "eight", "9": "nine"
}

def resolve_token_to_word(token: str) -> Optional[dict]:
    """Resolves a token to a dictionary word entry via synonyms, stemming, and inflections."""
    token = token.lower().strip()
    if not token:
        return None
    
    # 1. Direct synonym mapping
    if token in SYNONYMS:
        mapped = SYNONYMS[token]
        if mapped in WORD_LOOKUP:
            return WORD_LOOKUP[mapped]
    
    # 2. Direct dictionary lookup
    if token in WORD_LOOKUP:
        return WORD_LOOKUP[token]
    
    # 3. Stemming & Morphological variations
    candidates = []
    if token.endswith("'s"):
        candidates.append(token[:-2])
    if token.endswith("s'"):
        candidates.append(token[:-2])
    if len(token) > 4 and token.endswith("ing"):
        candidates.extend([token[:-3], token[:-3] + "e", token[:-4]])
    if len(token) > 3 and token.endswith("ed"):
        candidates.extend([token[:-2], token[:-1], token[:-2] + "e"])
    if len(token) > 3 and token.endswith("es"):
        candidates.extend([token[:-2], token[:-1]])
    if len(token) > 2 and token.endswith("s") and not token.endswith("ss") and token not in ("is", "us", "as"):
        candidates.append(token[:-1])
    if len(token) > 3 and token.endswith("ly"):
        candidates.extend([token[:-2], token[:-2] + "e"])
    if len(token) > 3 and token.endswith("er"):
        candidates.extend([token[:-2], token[:-1]])
    if len(token) > 4 and token.endswith("est"):
        candidates.extend([token[:-3], token[:-2]])

    for c in candidates:
        if c in SYNONYMS and SYNONYMS[c] in WORD_LOOKUP:
            return WORD_LOOKUP[SYNONYMS[c]]
        if c in WORD_LOOKUP:
            return WORD_LOOKUP[c]
            
    return None

@app.post("/api/translate/text-to-sign")
def translate_text_to_sign(payload: TranslateRequest):
    raw_text = payload.text.strip()
    if not raw_text:
        return {"tokens": [], "original_text": "", "summary": {"total_items": 0, "words_matched": 0, "letters_fingerspelled": 0}}
    
    # Normalize text
    clean_text = re.sub(r'[^a-zA-Z0-9\s]', ' ', raw_text).lower()
    tokens = clean_text.split()
    
    result_sequence = []
    i = 0
    matched_word_count = 0
    fingerspelled_letter_count = 0
    
    while i < len(tokens):
        matched = False
        # Try multi-word phrases (longest first, up to 4 words)
        for length in (4, 3, 2):
            if i + length <= len(tokens):
                phrase = " ".join(tokens[i:i+length])
                phrase_mapped = SYNONYMS.get(phrase, phrase)
                if phrase_mapped in WORD_LOOKUP:
                    w = WORD_LOOKUP[phrase_mapped]
                    result_sequence.append({
                        "type": "word",
                        "text": phrase,
                        "canonical_word": w["word"],
                        "media_url": w["path"],
                        "category": w.get("category", "general"),
                        "duration_ms": 1400
                    })
                    matched_word_count += 1
                    i += length
                    matched = True
                    break
        if matched:
            continue
        
        # Try single word / lemmatized word
        curr_token = tokens[i]
        word_entry = resolve_token_to_word(curr_token)
        
        if word_entry:
            result_sequence.append({
                "type": "word",
                "text": curr_token,
                "canonical_word": word_entry["word"],
                "media_url": word_entry["path"],
                "category": word_entry.get("category", "general"),
                "duration_ms": 1300
            })
            matched_word_count += 1
            i += 1
        else:
            # Fallback to fingerspelling letter by letter
            if payload.fingerspell_unknown:
                for char in curr_token:
                    upper_char = char.upper()
                    if upper_char in ALPHABET_LOOKUP:
                        a = ALPHABET_LOOKUP[upper_char]
                        result_sequence.append({
                            "type": "letter",
                            "letter": upper_char,
                            "parent_word": curr_token,
                            "media_url": a["path"],
                            "duration_ms": 900
                        })
                        fingerspelled_letter_count += 1
                    elif char in NUMBER_WORDS:
                        num_word = NUMBER_WORDS[char]
                        for nc in num_word.upper():
                            if nc in ALPHABET_LOOKUP:
                                a = ALPHABET_LOOKUP[nc]
                                result_sequence.append({
                                    "type": "letter",
                                    "letter": nc,
                                    "parent_word": curr_token,
                                    "media_url": a["path"],
                                    "duration_ms": 800
                                })
                                fingerspelled_letter_count += 1
                # Tiny pause token between words
                result_sequence.append({
                    "type": "pause",
                    "text": " ",
                    "duration_ms": 400
                })
            i += 1
    
    return {
        "original_text": raw_text,
        "tokens": result_sequence,
        "summary": {
            "total_items": len(result_sequence),
            "words_matched": matched_word_count,
            "letters_fingerspelled": fingerspelled_letter_count
        }
    }

@app.post("/api/tts")
def text_to_speech(payload: TTSRequest):
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Empty text provided")
    
    try:
        tts = gTTS(text=text, lang=payload.lang or "en", slow=False)
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        fp.seek(0)
        return Response(content=fp.read(), media_type="audio/mpeg")
    except Exception as e:
        return JSONResponse(
            status_code=200,
            content={"fallback_client": True, "message": str(e), "text": text}
        )


# Serve Service Worker with correct scope header (must come before static mount)
@app.get("/static/sw.js")
def serve_sw():
    sw_path = os.path.join(STATIC_DIR, "sw.js")
    with open(sw_path, "r") as f:
        content = f.read()
    return StarletteResponse(
        content=content,
        media_type="application/javascript",
        headers={"Service-Worker-Allowed": "/", "Cache-Control": "no-cache"}
    )

# Mount static asset folders
app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/")
def serve_index():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
