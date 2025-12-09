# YAKE Keyword Extraction Integration

## Overview

VectHare now supports advanced keyword extraction using **YAKE** (Yet Another Keyword Extractor), a statistical unsupervised approach for automatic keyword extraction.

## Features

- **Hybrid Extraction**: Combines frequency-based and YAKE methods
- **Language Support**: Multi-language keyword extraction (default: English)
- **Configurable**: Adjustable parameters for precision vs. recall
- **Fallback**: Automatically falls back to frequency-based extraction if YAKE server is unavailable

## Installation

### 1. Install Python Dependencies

```bash
pip install yake-keyword-extractor flask flask-cors
```

Or using a virtual environment:

```bash
# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate  # Windows

# Install dependencies
pip install yake-keyword-extractor flask flask-cors
```

### 2. Start YAKE Server

```bash
# Default (port 5555)
python yake_server.py

# Custom port
python yake_server.py --port 8888

# Custom host (allow external connections)
python yake_server.py --host 0.0.0.0 --port 5555
```

The server will start on `http://localhost:5555` by default.

## Configuration

Settings are available in VectHare's `defaultSettings`:

```javascript
{
    yake_enabled: true,                        // Enable/disable YAKE
    yake_server_url: 'http://localhost:5555',  // YAKE server URL
    yake_max_keywords: 10,                     // Maximum keywords to extract
    yake_language: 'en',                       // Language code (en, es, fr, etc.)
    yake_dedup_threshold: 0.9,                 // Deduplication threshold (0-1)
    yake_window_size: 1,                       // N-gram window size (1-3)
}
```

## Usage

### Extract Keywords with YAKE

```javascript
import { extractYakeKeywords } from './core/keyword-learner.js';

const text = "Your text here...";
const keywords = await extractYakeKeywords(text, {
    language: 'en',
    maxKeywords: 10,
});

console.log(keywords);
// [
//   { word: "keyword1", score: 0.023 },
//   { word: "keyword2", score: 0.045 },
//   ...
// ]
```

### Hybrid Extraction (Frequency + YAKE)

```javascript
import { extractKeywordsHybrid } from './core/keyword-learner.js';

const keywords = await extractKeywordsHybrid(text, {
    threshold: 3,        // Frequency threshold
    maxKeywords: 10,     // Maximum total keywords
    useYake: true,       // Enable YAKE
});

console.log(keywords);
// [
//   { word: "keyword1", source: "yake", score: 0.023 },
//   { word: "keyword2", source: "frequency", count: 5 },
//   ...
// ]
```

### Check YAKE Server Health

```javascript
import { checkYakeHealth } from './core/keyword-learner.js';

const isHealthy = await checkYakeHealth();
console.log('YAKE server available:', isHealthy);
```

## API Endpoints

### Health Check

```bash
GET http://localhost:5555/health
```

Response:
```json
{
    "status": "healthy",
    "service": "YAKE Keyword Extraction Server",
    "version": "1.0.0"
}
```

### Extract Keywords

```bash
POST http://localhost:5555/extract
Content-Type: application/json

{
    "text": "Your text here...",
    "language": "en",
    "maxKeywords": 10,
    "deduplicationThreshold": 0.9,
    "windowSize": 1,
    "topN": 10
}
```

Response:
```json
{
    "keywords": [
        {"text": "keyword1", "score": 0.023},
        {"text": "keyword2", "score": 0.045}
    ],
    "count": 2
}
```

## YAKE Parameters

### Language (`language`)
- ISO 639-1 language code
- Default: `"en"`
- Supported: `en`, `es`, `fr`, `de`, `pt`, `it`, `ru`, `zh`, etc.

### Max Keywords (`maxKeywords`)
- Maximum number of keywords to return
- Default: `10`
- Range: 1-50

### Deduplication Threshold (`deduplicationThreshold`)
- Controls how similar keywords are merged
- Default: `0.9`
- Range: 0.0-1.0 (higher = less aggressive deduplication)

### Window Size (`windowSize`)
- N-gram size for keyword extraction
- Default: `1` (single words)
- Values:
  - `1`: Single words
  - `2`: Bigrams (2-word phrases)
  - `3`: Trigrams (3-word phrases)

### Top N (`topN`)
- Number of candidates to consider before filtering
- Default: `10`
- Range: 1-100

## YAKE Score

YAKE uses **inverse scoring**: lower scores indicate more relevant keywords.

- Score < 0.05: Highly relevant
- Score 0.05-0.15: Relevant
- Score 0.15-0.30: Moderately relevant
- Score > 0.30: Less relevant

## Comparison: Frequency vs. YAKE

### Frequency-Based Extraction
- **Pros**: Fast, simple, no dependencies
- **Cons**: Misses semantic importance, sensitive to document length
- **Best for**: Short texts, known domain vocabulary

### YAKE Extraction
- **Pros**: Semantically aware, language-independent, handles diverse texts
- **Cons**: Requires server, slower, more complex
- **Best for**: Long documents, diverse content, multi-language support

### Hybrid Approach (Recommended)
Combines both methods to get the best of both worlds:
1. Extracts keywords using both methods
2. Deduplicates across sources
3. Prioritizes YAKE results (generally more accurate)
4. Falls back to frequency if YAKE unavailable

## Troubleshooting

### Server Not Starting
```bash
# Check if port is already in use
lsof -i :5555

# Try different port
python yake_server.py --port 5556
```

### Connection Refused
- Ensure server is running
- Check `yake_server_url` in settings
- Verify firewall settings

### No Keywords Returned
- Check text length (YAKE needs ~100+ chars for good results)
- Try adjusting `windowSize` (2-3 for longer phrases)
- Lower `deduplicationThreshold` for more keywords

### Import Error
```bash
# Reinstall dependencies
pip install --force-reinstall yake-keyword-extractor flask flask-cors
```

## Performance

- **Frequency extraction**: ~1ms per document
- **YAKE extraction**: ~50-200ms per document (depending on text length)
- **Network latency**: ~5-20ms (local server)

For bulk operations, consider:
1. Batch multiple texts in a single request
2. Use frequency-based for real-time operations
3. Use YAKE for offline/batch processing

## References

- **YAKE Paper**: [Automatic Keyword Extraction using YAKE](https://www.sciencedirect.com/science/article/pii/S0020025519308588)
- **GitHub**: [LIAAD/yake](https://github.com/LIAAD/yake)
- **Documentation**: [YAKE Documentation](https://github.com/LIAAD/yake/wiki)
