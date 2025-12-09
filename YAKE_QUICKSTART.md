# YAKE Keyword Extraction - Quick Start

Welcome to the YAKE integration for VectHare! This guide will get you up and running in 5 minutes.

## TL;DR

```bash
# 1. Start the YAKE server
./start_yake.sh

# 2. Use in JavaScript
import { extractYakeKeywords } from './core/keyword-learner.js';
const keywords = await extractYakeKeywords("Your text here");
```

## Installation (One-Time Setup)

### Option 1: Automated Setup (Recommended)

**Linux/Mac:**
```bash
./start_yake.sh
```

**Windows:**
```cmd
start_yake.bat
```

This will:
- Check for Python 3.8+
- Create a virtual environment
- Install dependencies
- Start the YAKE server

### Option 2: Manual Setup

```bash
# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Start server
python yake_server.py
```

## Verify Installation

Open another terminal:

```bash
# Check server is running
curl http://localhost:5555/health

# Should return:
# {"status": "healthy", "service": "YAKE Keyword Extraction Server", "version": "1.0.0"}
```

## Usage Examples

### 1. Using the Main Function (Respects UI Settings)

```javascript
import { extractKeywords } from './core/keyword-learner.js';

const text = "Your text here...";
const keywords = await extractKeywords(text);
// Automatically uses method selected in UI: frequency, yake, or hybrid
```

### 2. Basic YAKE Extraction

```javascript
import { extractYakeKeywords } from './core/keyword-learner.js';

const text = `
Artificial intelligence has revolutionized natural language processing.
Machine learning algorithms can understand context and semantic meaning.
`;

const keywords = await extractYakeKeywords(text);
console.log(keywords);
// [
//   { word: "artificial intelligence", score: 0.023 },
//   { word: "natural language processing", score: 0.045 },
//   { word: "machine learning", score: 0.067 },
//   ...
// ]
```

### 2. Hybrid Extraction (Best Results)

```javascript
import { extractKeywordsHybrid } from './core/keyword-learner.js';

const keywords = await extractKeywordsHybrid(text, {
    threshold: 3,       // Min frequency
    maxKeywords: 10,    // Total keywords
    useYake: true,      // Enable YAKE
});

// Returns keywords from both methods
console.log(keywords);
// [
//   { word: "intelligence", source: "yake", score: 0.023 },
//   { word: "processing", source: "frequency", count: 5 },
//   ...
// ]
```

### 3. Multi-Language Support

```javascript
const spanishText = "La inteligencia artificial ha transformado el mundo.";

const keywords = await extractYakeKeywords(spanishText, {
    language: 'es',  // Spanish
    maxKeywords: 5,
});
```

### 4. Extract Phrases (Bigrams)

```javascript
const keywords = await extractYakeKeywords(text, {
    windowSize: 2,  // 2-word phrases
    maxKeywords: 10,
});

// Returns phrases like "artificial intelligence", "machine learning"
```

## Configuration

Settings in `index.js` (or override in function calls):

```javascript
{
    keyword_extraction_method: 'frequency',    // 'frequency', 'yake', or 'hybrid'
    yake_enabled: true,                        // Enable YAKE
    yake_server_url: 'http://localhost:5555',  // Server URL
    yake_max_keywords: 10,                     // Max keywords
    yake_language: 'en',                       // Language
    yake_dedup_threshold: 0.9,                 // Dedup (0-1)
    yake_window_size: 1,                       // N-gram size
}
```

### UI Configuration

In VectHare settings panel under "Vectorization Options":

- **Frequency-based**: Fast word frequency counting (default)
- **YAKE**: Advanced statistical extraction (requires server)
- **Hybrid (Both)**: Combines both methods for best results

The main `extractKeywords()` function will automatically use your selected method.

## Common Issues

### "Connection Refused"
**Problem:** YAKE server not running  
**Solution:** Run `./start_yake.sh` in a separate terminal

### "Module not found"
**Problem:** Dependencies not installed  
**Solution:** Run `pip install -r requirements.txt`

### "Poor keyword quality"
**Problem:** Text too short or wrong language  
**Solution:** 
- Use 100+ character texts
- Set correct `language` parameter
- Try `windowSize: 2` for phrases

### "Port already in use"
**Problem:** Port 5555 taken  
**Solution:** 
```bash
export YAKE_PORT=5556
./start_yake.sh
```

## Next Steps

- 📖 Read **[YAKE_INTEGRATION.md](./YAKE_INTEGRATION.md)** for full documentation
- 🧪 Try **[examples/yake-examples.js](./examples/yake-examples.js)** for advanced usage
- 📊 Check **[YAKE_IMPLEMENTATION.md](./YAKE_IMPLEMENTATION.md)** for technical details

## Quick Reference

### Server Commands
```bash
# Start server
./start_yake.sh

# Custom port
YAKE_PORT=5556 ./start_yake.sh

# Stop server
Ctrl+C
```

### API Endpoints
```bash
# Health check
GET http://localhost:5555/health

# Extract keywords
POST http://localhost:5555/extract
Content-Type: application/json
{
    "text": "Your text here",
    "maxKeywords": 10,
    "language": "en"
}
```

### JavaScript Functions

```javascript
// Main extraction (respects UI setting)
await extractKeywords(text, options)

// Extract with YAKE
await extractYakeKeywords(text, options)

// Check server status
await checkYakeHealth(serverUrl)

// Hybrid extraction
await extractKeywordsHybrid(text, options)

// Frequency-based (no YAKE needed)
getSuggestedKeywordsForEntry(text, threshold)
```

## Performance Tips

- ⚡ Use frequency-based for real-time operations
- 🎯 Use YAKE for accurate offline processing
- 🔄 Use hybrid for best of both worlds
- 💾 Cache YAKE results for repeated texts

## Support

**Documentation:**
- [YAKE_INTEGRATION.md](./YAKE_INTEGRATION.md) - Complete guide
- [YAKE_IMPLEMENTATION.md](./YAKE_IMPLEMENTATION.md) - Technical details
- [examples/yake-examples.js](./examples/yake-examples.js) - Code examples

**External Resources:**
- [YAKE Paper](https://www.sciencedirect.com/science/article/pii/S0020025519308588)
- [YAKE GitHub](https://github.com/LIAAD/yake)

## License

YAKE is available under Apache License 2.0.  
See [YAKE repository](https://github.com/LIAAD/yake) for details.

---

**Happy keyword extracting! 🎯**
