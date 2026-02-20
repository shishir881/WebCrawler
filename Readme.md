# FastAPI ML Integration Guide

This document explains **how your FastAPI ML service should integrate with the Node.js WebCrawler**. The crawler is already functional up to LLM-based structuring. Your job is to plug in an ML model that **filters and ranks structured pages**.

---

##  Big Picture Architecture

```
[ Web Pages ]
      ↓
[ Node.js Crawler ]
      ↓
[ LLM Structuring (Groq / LLaMA) ]
      ↓   (JSON payload)
[ FastAPI ML Service  ← YOU ARE HERE ]
      ↓
[ Ranked / Filtered JSON Output ]
```

The crawler **will call your FastAPI endpoint**, send structured page data, and expects back a ranked / filtered response.

---

## 🚦 Current Status

* ✅ Web crawling: DONE
* ✅ LLM structuring: DONE
* ❌ ML filtering via FastAPI: **NOT READY YET (your task)**

Until your service is ready, the crawler fails at Stage 3.

---

##  Environment Variables (Important)

The Node.js crawler expects these variables:

```env
USE_FASTAPI=true
FAST_API_URL=http://127.0.0.1:8000/filter
```

* `USE_FASTAPI` → Enables FastAPI filtering stage
* `FAST_API_URL` → Endpoint your FastAPI app exposes

Your service **must match this URL and contract**.

---

##  Request Payload (What You Receive)

The crawler sends **an array of structured pages**.

### Example Request

```json
{
  "pages": [
    {
      "url": "https://www.geeksforgeeks.org/...",
      "priority_features": {
        "page_summary": "Intro to ML",
        "primary_topic": "Machine Learning",
        "key_entities": ["ML", "AI", "Python"],
        "content_depth": 1,
        "is_actionable": true
      },
      "spam_features": {
        "link_density": 0,
        "has_urgency_words": false,
        "is_error_page": false,
        "grammar_quality_score": 1,
        "suspicious_patterns": 0
      }
    }
  ]
}
```

You **do not crawl**. You **do not call LLMs**. You only process this JSON.

---

##  Expected Response (What You Return)

You should return **filtered and ranked pages**.

### Minimum Required Format

```json
{
  "results": [
    {
      "url": "https://www.geeksforgeeks.org/...",
      "score": 0.92,
      "label": "high_quality"
    }
  ]
}
```

### Rules

* `score` → float between `0 and 1`
* `label` → your model’s classification (free to design)
* Order matters: **highest score first**

---

##  Model Freedom (Up to You)

You may use:

* Logistic regression
* XGBoost
* Neural network
* Rule-based scoring (initially acceptable)

Suggested features to use:

* `content_depth`
* `is_actionable`
* `is_error_page`
* `link_density`
* `grammar_quality_score`

---

##  FastAPI Skeleton (Minimal)

```python
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List

app = FastAPI()

class Page(BaseModel):
    url: str
    priority_features: dict
    spam_features: dict

class RequestBody(BaseModel):
    pages: List[Page]

@app.post("/filter")
def filter_pages(data: RequestBody):
    # TODO: apply ML logic
    return {"results": []}
```

---

##  Local Testing

Run your service:

```bash
uvicorn main:app --reload
```

Test manually:

```bash
curl -X POST http://127.0.0.1:8000/filter \
  -H "Content-Type: application/json" \
  -d @sample.json
```

---

##  Common Failure Modes

*  Wrong endpoint path
*  Different response JSON shape
*  Server not running when crawler starts
*  Score not numeric

If anything breaks, the crawler **fails hard**.

---

##  Goal

Your service should:

✔ Accept structured pages
✔ Score & rank them
✔ Return clean JSON
✔ Be fast (<100ms per request)

Once this works, the crawler becomes a **full ML-powered web intelligence pipeline**.

---

If anything here is unclear, **do not change the Node.js side** — adapt FastAPI to this contract.

---

 Running the Node.js Crawler (For ML/FastAPI Teammate)

Even if you are only working on the FastAPI ML service, you should be able to **run the Node.js crawler locally** to test end-to-end integration.

### Prerequisites

Make sure you have:

* **Node.js v18+** (recommended LTS)
* **npm** (comes with Node)
* **Python 3.9+** (for FastAPI later)
* Git

Check versions:

```bash
node -v
npm -v
python --version
```

---

### 1️ Clone the Repository

```bash
git clone <repo-url>
cd WebCrawler
```

---

### 2️ Install Node Dependencies

```bash
npm install
```

This installs:

* HTTP client
* HTML parser
* Groq client
* CLI utilities

---

### 3️ Environment Variables

Create a `.env` file in the project root:

```env
GROQ_API_KEY=your_groq_api_key_here
USE_FASTAPI=true
FASTAPI_URL=http://localhost:8000/filter
```

If FastAPI is **not running yet**, you can temporarily disable it:

```env
USE_FASTAPI=false
```

---

### 4️ Run the Crawler

```bash
npm start
```

You will see a CLI menu:

```text
1. Start crawling with custom URL
2. Use default settings
3. Exit
```

Choose **option 2** to quickly test.

---

### 5 What Should Happen

Pipeline stages:

1. **Web Crawling** – fetches pages and extracts text
2. **LLM Structuring (Groq)** – converts raw text → structured JSON
3. **FastAPI ML Filtering** (optional) – ranks & filters pages

Final output:

```text
filtered_results.json
```

---

### 6 FastAPI Integration Test (When Ready)

Once your FastAPI service is running:

```bash
uvicorn app:app --reload
```

Ensure:

```env
USE_FASTAPI=true
FASTAPI_URL=http://localhost:8000/filter
```

Node.js will POST structured pages to FastAPI and save the filtered response.

---

### 🔧 Common Issues

**Error: `USE_FASTAPI is not defined`**

* You forgot to set it in `.env`
* Or `dotenv.config()` is missing in `src/index.js`

**Crawler runs but no ML filtering**

* Set `USE_FASTAPI=true`
* Confirm FastAPI endpoint `/filter` exists

---

## Important Rule **Do NOT change the JSON contract** without syncing with the Node side.

Node.js = data producer
FastAPI = decision & ranking layer

---

You are now fully set up to develop and test the ML filtering service 🚀
