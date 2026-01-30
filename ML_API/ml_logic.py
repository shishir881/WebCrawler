import tensorflow as tf
from tensorflow.keras.models import load_model
import pickle
import numpy as np
from sentence_transformers import SentenceTransformer, util
from utils import get_enhanced_features
import warnings
# 1. Models Load garne
# Keras model load garda .h5 or .keras use huncha
model = load_model('models/url_malicious_model.keras')
with open('models/scaler.pkl', 'rb') as f:
    scaler = pickle.load(f)
sim_model = SentenceTransformer('all-MiniLM-L6-v2')

def get_hybrid_spam_status(url, llm_spam_json):
    # A. Neural Network Prediction (URL structure bata)
    # Convert URL to numbers
    features = get_enhanced_features(url)
    features = np.array(features).reshape(1, -1)
    # Translate numbers using the Scaler
    scaled_features = scaler.transform(features)
    
    # Get final answer
    prediction = model.predict(scaled_features, verbose=0) # Probability between 0 and 1
    
    # B. Heuristic Rules (LLM features bata)
    safety_score = float(prediction[0][0]) if prediction.ndim > 1 else float(prediction[0])
    print(f"NN Prediction Score: {safety_score}")
    if llm_spam_json['is_error_page']:
        return "Spam", 0.0
    
    if llm_spam_json['link_density'] > 0.7:
        safety_score -= 0.3
    
    if llm_spam_json['has_urgency_words']:
        safety_score -= 0.2
    
    if llm_spam_json['suspicious_patterns'] > 0:
        safety_score -= (0.1 * llm_spam_json['suspicious_patterns'])
        
    status = "Safe" if safety_score > 0.5 else "Spam"
    return status, safety_score

def calculate_priority(seed_vector, current_text):
    current_vector = sim_model.encode(current_text, convert_to_tensor=True)
    score = util.cos_sim(seed_vector, current_vector)
    return float(score[0][0])

data = get_hybrid_spam_status("https://sportshard.com/",
                              {
    "link_density": 0.133,
    "has_urgency_words": False,
    "is_error_page": False,
    "grammar_quality_score": 0.8,
    "suspicious_patterns": 2
  })
print(data)  # ("Spam", 0.0)