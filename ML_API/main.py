from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from ml_logic import get_hybrid_spam_status, calculate_priority
from sentence_transformers import SentenceTransformer

app = FastAPI(title="Web Crawler ML API", description="API for URL spam detection and priority calculation")

# Load the similarity model once
sim_model = SentenceTransformer('all-MiniLM-L6-v2')

class URLCheckRequest(BaseModel):
    url: str
    link_density: float
    has_urgency_words: bool
    is_error_page: bool
    grammar_quality_score: float
    suspicious_patterns: int

class PriorityRequest(BaseModel):
    seed_text: str
    current_text: str

@app.post("/check_spam")
def check_spam(request: URLCheckRequest):
    try:
        llm_spam_json = {
            "link_density": request.link_density,
            "has_urgency_words": request.has_urgency_words,
            "is_error_page": request.is_error_page,
            "grammar_quality_score": request.grammar_quality_score,
            "suspicious_patterns": request.suspicious_patterns
        }
        status, score = get_hybrid_spam_status(request.url, llm_spam_json)
        return {"status": status, "score": score}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/calculate_priority")
def calculate_priority_endpoint(request: PriorityRequest):
    try:
        seed_vector = sim_model.encode(request.seed_text, convert_to_tensor=True)
        priority = calculate_priority(seed_vector, request.current_text)
        return {"priority": priority}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))