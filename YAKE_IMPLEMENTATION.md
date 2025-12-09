# YAKE Integration - Implementation Summary

## What Was Added

This update adds **YAKE (Yet Another Keyword Extractor)** support to VectHare's keyword learning system, enabling advanced statistical keyword extraction alongside the existing frequency-based method.

## Files Created

### 1. Python Backend
- **`yake_server.py`** - Flask server providing YAKE keyword extraction API
  - Endpoints: `/health` (GET), `/extract` (POST)
  - Configurable parameters: language, max keywords, deduplication, window size
  - Default port: 5555

### 2. Documentation
- **`YAKE_INTEGRATION.md`** - Comprehensive guide covering:
  - Installation instructions
  - API documentation
  - Configuration options
  - Usage examples
  - Troubleshooting guide
  - Performance considerations

- **`requirements.txt`** - Python dependencies:
  - `yake-keyword-extractor==0.4.8`
  - `flask==3.0.0`
  - `flask-cors==4.0.0`

### 3. Startup Scripts
- **`start_yake.sh`** (Linux/Mac) - Automated setup and startup
  - Creates virtual environment
  - Installs dependencies
  - Starts YAKE server
  
- **`start_yake.bat`** (Windows) - Windows equivalent

### 4. Examples
- **`examples/yake-examples.js`** - 7 complete usage examples:
  1. Health check
  2. YAKE extraction (single words)
  3. Bigram extraction (2-word phrases)
  4. Frequency-based extraction
  5. Hybrid extraction (YAKE + frequency)
  6. Multi-language extraction
  7. Score analysis

## Files Modified

### 1. `core/keyword-learner.js`
**New exports:**
- `extractYakeKeywords(text, options)` - Extract using YAKE algorithm
- `checkYakeHealth(serverUrl)` - Check YAKE server availability
- `extractKeywordsHybrid(text, options)` - Combine YAKE + frequency methods
- `getYakeSettings()` - Get YAKE configuration from extension settings

**Key features:**
- Automatic fallback to frequency-based if YAKE unavailable
- Settings integration (reads from `extension_settings.vecthare`)
- Error handling and logging
- Score-based ranking for YAKE results

### 2. `index.js`
**New settings in `defaultSettings`:**
```javascript
{
    yake_enabled: true,                        // Enable/disable YAKE
    yake_server_url: 'http://localhost:5555',  // Server endpoint
    yake_max_keywords: 10,                     // Max keywords to extract
    yake_language: 'en',                       // Language (ISO 639-1)
    yake_dedup_threshold: 0.9,                 // Deduplication (0-1)
    yake_window_size: 1,                       // N-gram size (1-3)
}
```

## Architecture

### Data Flow
```
User Text
    ↓
JavaScript (keyword-learner.js)
    ↓
HTTP Request → localhost:5555/extract
    ↓
Python YAKE Server (yake_server.py)
    ↓
YAKE Algorithm Processing
    ↓
HTTP Response (JSON)
    ↓
JavaScript Processing
    ↓
Keywords Array
```

### Extraction Methods

#### 1. Frequency-Based (Existing)
```javascript
const keywords = getSuggestedKeywordsForEntry(text, threshold);
// Returns: [{ word: "keyword", count: 5 }, ...]
```

**Pros:** Fast, simple, no dependencies  
**Cons:** Misses semantic importance

#### 2. YAKE (New)
```javascript
const keywords = await extractYakeKeywords(text);
// Returns: [{ word: "keyword", score: 0.023 }, ...]
```

**Pros:** Semantically aware, multi-language, accurate  
**Cons:** Requires server, slower

#### 3. Hybrid (New)
```javascript
const keywords = await extractKeywordsHybrid(text);
// Returns: [
//   { word: "keyword1", source: "yake", score: 0.023 },
//   { word: "keyword2", source: "frequency", count: 5 }
// ]
```

**Pros:** Best of both worlds, automatic fallback  
**Cons:** Most complex

## Usage Examples

### Quick Start
```bash
# 1. Start YAKE server
cd /path/to/VectHare
./start_yake.sh

# 2. Use in JavaScript
import { extractYakeKeywords } from './core/keyword-learner.js';

const text = "Your text here...";
const keywords = await extractYakeKeywords(text);
console.log(keywords);
```

### Hybrid Extraction (Recommended)
```javascript
import { extractKeywordsHybrid } from './core/keyword-learner.js';

const keywords = await extractKeywordsHybrid(text, {
    threshold: 3,        // Frequency threshold
    maxKeywords: 10,     // Total keywords
    useYake: true,       // Enable YAKE
});

// Output includes both methods
keywords.forEach(kw => {
    if (kw.source === 'yake') {
        console.log(`${kw.word} [YAKE score: ${kw.score}]`);
    } else {
        console.log(`${kw.word} [Freq count: ${kw.count}]`);
    }
});
```

### Health Check
```javascript
import { checkYakeHealth } from './core/keyword-learner.js';

const isAvailable = await checkYakeHealth();
if (!isAvailable) {
    console.log('YAKE server not running. Start with: ./start_yake.sh');
}
```

## Configuration

### Extension Settings
Settings are stored in `extension_settings.vecthare`:

```javascript
{
    yake_enabled: true,                       // Toggle YAKE on/off
    yake_server_url: 'http://localhost:5555', // Server address
    yake_max_keywords: 10,                    // Max keywords
    yake_language: 'en',                      // Language code
    yake_dedup_threshold: 0.9,                // Dedup threshold
    yake_window_size: 1,                      // N-gram size
}
```

### Runtime Options
All functions accept options that override settings:

```javascript
// Override settings for specific call
await extractYakeKeywords(text, {
    language: 'es',           // Spanish
    maxKeywords: 15,          // More keywords
    windowSize: 2,            // Bigrams
    serverUrl: 'http://...',  // Custom server
});
```

## Testing

### Manual Testing
```javascript
// Load examples in browser console
import * as examples from './examples/yake-examples.js';

// Run all examples
await examples.runAllExamples();

// Or individual examples
await examples.example2_yakeExtraction();
await examples.example5_hybridExtraction();
```

### Server Testing
```bash
# Test health endpoint
curl http://localhost:5555/health

# Test extraction
curl -X POST http://localhost:5555/extract \
  -H "Content-Type: application/json" \
  -d '{"text": "Your text here", "maxKeywords": 5}'
```

## Performance

### Benchmarks (approximate)
- **Frequency extraction:** ~1ms per document
- **YAKE extraction:** ~50-200ms per document
- **Hybrid extraction:** ~50-200ms (dominated by YAKE)
- **Network latency:** ~5-20ms (localhost)

### Optimization Tips
1. Use frequency-based for real-time operations
2. Use YAKE for batch processing
3. Cache YAKE results for repeated queries
4. Adjust `yake_max_keywords` based on needs

## Deployment

### Development
```bash
# Start server in development mode
./start_yake.sh
```

### Production
```bash
# Run as background service
nohup python yake_server.py --host 0.0.0.0 --port 5555 > yake.log 2>&1 &

# Or use systemd/supervisor for proper service management
```

### Docker (Optional)
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY yake_server.py .
EXPOSE 5555
CMD ["python", "yake_server.py", "--host", "0.0.0.0"]
```

## Troubleshooting

### Server Won't Start
```bash
# Check port availability
lsof -i :5555

# Use different port
./start_yake.sh
export YAKE_PORT=5556
```

### Connection Refused
- Verify server is running: `curl http://localhost:5555/health`
- Check `yake_server_url` setting matches server address
- Check firewall settings

### Poor Extraction Quality
- Increase text length (YAKE needs ~100+ chars)
- Adjust `windowSize` (2-3 for phrases)
- Lower `dedupThreshold` for more keywords
- Try different `language` setting

## Future Enhancements

Possible improvements:
1. **UI Integration** - Add YAKE settings panel to VectHare UI
2. **Batch Processing** - Process multiple texts in single request
3. **Caching** - Cache YAKE results for repeated texts
4. **Model Selection** - Support custom YAKE models/parameters
5. **Async Processing** - Queue system for large batches
6. **Alternative Backends** - Support other keyword extraction algorithms

## Dependencies

### JavaScript
- Existing VectHare modules
- Fetch API (native)

### Python
- `yake-keyword-extractor` (0.4.8) - YAKE algorithm implementation
- `flask` (3.0.0) - Web server framework
- `flask-cors` (4.0.0) - CORS support for browser requests

### System Requirements
- Python 3.8 or higher
- ~50MB disk space (Python + dependencies)
- Minimal CPU/RAM (YAKE is lightweight)

## References

- **YAKE Paper:** [Campos et al. 2020](https://www.sciencedirect.com/science/article/pii/S0020025519308588)
- **YAKE GitHub:** [LIAAD/yake](https://github.com/LIAAD/yake)
- **VectHare Documentation:** See main README.md

## Changelog

### v2.0.0 - YAKE Integration
- Added YAKE keyword extraction support
- Created Python server backend
- Implemented hybrid extraction method
- Added comprehensive documentation
- Created startup scripts for easy deployment
- Added 7 usage examples
