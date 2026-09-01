import requests
import json
import os

BASE_URL = "http://localhost:8000"

def test_health():
    print("Testing /api/health...")
    r = requests.get(f"{BASE_URL}/api/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "healthy"
    assert data["words_count"] == 120
    assert data["alphabets_count"] == 26
    print("✓ Health check passed.")

def test_dictionary():
    print("Testing /api/dictionary...")
    r = requests.get(f"{BASE_URL}/api/dictionary")
    assert r.status_code == 200
    data = r.json()
    assert len(data["words"]) == 120
    assert len(data["alphabets"]) == 26
    assert "weather" in data["categories"]

    # Test filtering
    r_cat = requests.get(f"{BASE_URL}/api/dictionary?category=weather")
    assert r_cat.status_code == 200
    cat_data = r_cat.json()
    assert len(cat_data["words"]) > 0
    for w in cat_data["words"]:
        assert w["category"] == "weather"
    
    # Test search
    r_search = requests.get(f"{BASE_URL}/api/dictionary?search=rain")
    assert r_search.status_code == 200
    s_data = r_search.json()
    assert len(s_data["words"]) >= 3
    print("✓ Dictionary check passed.")

def test_translation():
    print("Testing /api/translate/text-to-sign...")
    test_cases = [
        ("Good morning everyone", 2), # "good morning" -> "morning", "everyone"
        ("heavy rain and blizzard", 2), # multi-word "heavy rain", "blizzard"
        ("clear skies next week", 2), # multi-word "clear skies", "next week"
        ("I am sleeping today", 3), # "i", "sleep" (stemmed from sleeping), "today"
        ("It is raining sunny and windy", 4), # "it", "pouring rain", "sun", "windy"
        ("You will see 5 clouds", 2), # "yourself" (you), "cloudy" (clouds), 5 spelled
        ("XYZ 123", 0) # fingerspelling X, Y, Z and numbers
    ]
    for text, expected_min_words in test_cases:
        r = requests.post(f"{BASE_URL}/api/translate/text-to-sign", json={"text": text, "fingerspell_unknown": True})
        assert r.status_code == 200
        data = r.json()
        assert len(data["tokens"]) > 0
        assert data["summary"]["words_matched"] >= expected_min_words, f"Failed on '{text}': got {data['summary']['words_matched']} expected >={expected_min_words}"
    print("✓ Translation check passed.")

def test_assets_integrity():
    print("Testing asset loading over HTTP...")
    r = requests.get(f"{BASE_URL}/api/dictionary")
    data = r.json()
    
    # Verify all alphabets
    for a in data["alphabets"]:
        res = requests.head(f"{BASE_URL}{a['path']}")
        assert res.status_code == 200, f"Missing alphabet asset {a['path']}"
    
    # Verify all words
    for w in data["words"]:
        res = requests.head(f"{BASE_URL}{w['path']}")
        assert res.status_code == 200, f"Missing word asset {w['path']}"
    print("✓ All 146 media assets successfully verified (HTTP 200).")

def test_frontend_serving():
    print("Testing static assets serving...")
    r_index = requests.get(f"{BASE_URL}/")
    assert r_index.status_code == 200
    assert "OmniSign AI" in r_index.text

    r_css = requests.get(f"{BASE_URL}/static/style.css")
    assert r_css.status_code == 200

    r_js = requests.get(f"{BASE_URL}/static/app.js")
    assert r_js.status_code == 200
    print("✓ Static frontend files verified.")

if __name__ == "__main__":
    print("Starting OmniSign AI Verification Suite...\n")
    test_health()
    test_dictionary()
    test_translation()
    test_assets_integrity()
    test_frontend_serving()
    print("\n🎉 ALL TESTS PASSED SUCCESSFULLY!")
