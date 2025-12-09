#!/usr/bin/env python3
"""
YAKE Keyword Extraction Server for VectHare
============================================
Provides a simple HTTP API for YAKE-based keyword extraction.

Endpoints:
- POST /extract - Extract keywords using YAKE algorithm

Installation:
    pip install yake flask flask-cors

Usage:
    python yake_server.py

Default port: 5555
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import yake

app = Flask(__name__)
CORS(app)  # Allow CORS for SillyTavern frontend

# Default YAKE parameters
DEFAULT_LANGUAGE = "en"
DEFAULT_MAX_KEYWORDS = 10
DEFAULT_DEDUPLICATION_THRESHOLD = 0.9
DEFAULT_DEDUPLICATION_ALGO = "seqm"  # sequence matcher
DEFAULT_WINDOW_SIZE = 1
DEFAULT_TOP_N = 10


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'YAKE Keyword Extraction Server',
        'version': '1.0.0'
    })


@app.route('/extract', methods=['POST'])
def extract_keywords():
    """
    Extract keywords from text using YAKE algorithm.

    Request JSON:
    {
        "text": "Text to analyze",
        "language": "en",  // optional, default: "en"
        "maxKeywords": 10,  // optional, default: 10
        "deduplicationThreshold": 0.9,  // optional, default: 0.9
        "windowSize": 1,  // optional, default: 1
        "topN": 10  // optional, default: 10
    }

    Response JSON:
    {
        "keywords": [
            {"text": "keyword1", "score": 0.123},
            {"text": "keyword2", "score": 0.456}
        ],
        "count": 2
    }
    """
    try:
        data = request.json

        if not data or 'text' not in data:
            return jsonify({
                'error': 'Missing required field: text'
            }), 400

        text = data['text']

        if not text or not isinstance(text, str):
            return jsonify({
                'error': 'Invalid text field: must be non-empty string'
            }), 400

        # Extract parameters with defaults
        language = data.get('language', DEFAULT_LANGUAGE)
        max_keywords = data.get('maxKeywords', DEFAULT_MAX_KEYWORDS)
        dedup_threshold = data.get('deduplicationThreshold', DEFAULT_DEDUPLICATION_THRESHOLD)
        dedup_algo = data.get('deduplicationAlgo', DEFAULT_DEDUPLICATION_ALGO)
        window_size = data.get('windowSize', DEFAULT_WINDOW_SIZE)
        top_n = data.get('topN', DEFAULT_TOP_N)

        # Initialize YAKE keyword extractor
        kw_extractor = yake.KeywordExtractor(
            lan=language,
            n=window_size,  # n-gram size
            dedupLim=dedup_threshold,
            dedupFunc=dedup_algo,
            top=top_n,
            features=None
        )

        # Extract keywords
        # YAKE returns list of (keyword, score) tuples
        # Lower score = more relevant (YAKE uses inverse ranking)
        raw_keywords = kw_extractor.extract_keywords(text)

        # Format results
        keywords = [
            {
                'text': kw,
                'score': float(score)
            }
            for kw, score in raw_keywords[:max_keywords]
        ]

        return jsonify({
            'keywords': keywords,
            'count': len(keywords)
        })

    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='YAKE Keyword Extraction Server')
    parser.add_argument('--port', type=int, default=5555, help='Port to run server on (default: 5555)')
    parser.add_argument('--host', type=str, default='127.0.0.1', help='Host to bind to (default: 127.0.0.1)')

    args = parser.parse_args()

    print(f"Starting YAKE server on {args.host}:{args.port}")
    print("Endpoints:")
    print(f"  - GET  http://{args.host}:{args.port}/health")
    print(f"  - POST http://{args.host}:{args.port}/extract")

    app.run(host=args.host, port=args.port, debug=False)
