import re
import math
from collections import Counter
from urllib.parse import urlparse

def calculate_entropy(text):
    if not text: return 0
    probs = [n_x / len(text) for n_x in Counter(text).values()]
    return -sum(p * math.log(p, 2) for p in probs)

def get_enhanced_features(url):
    parsed = urlparse(url)
    features = []
    # Structural Features
    features.append(len(url))
    features.append(len(parsed.netloc))
    features.append(len(parsed.path))
    features.append(url.count('.'))
    features.append(url.count('-'))
    features.append(url.count('@'))
    features.append(url.count('?'))
    features.append(url.count('/'))
    features.append(sum(c.isdigit() for c in url))

    # Security Signals
    features.append(1 if re.search(r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', url) else 0) # IP usage
    features.append(calculate_entropy(url)) # Randomness signal

    # Keyword/Phishing signals
    suspicious = ['login', 'update', 'banking', 'secure', 'account', 'verify', 'signin']
    features.append(sum(1 for word in suspicious if word in url.lower()))
    return features
