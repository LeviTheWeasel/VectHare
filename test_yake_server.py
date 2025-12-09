#!/usr/bin/env python3
"""
YAKE Server Test Script
=======================
Tests the YAKE server to ensure it's working correctly.

Usage:
    python test_yake_server.py [--url URL]
"""

import sys
import json
import argparse
from urllib import request, error

DEFAULT_URL = "http://localhost:5555"

def test_health(base_url):
    """Test health endpoint"""
    print("Testing health endpoint...")
    try:
        req = request.Request(f"{base_url}/health", method='GET')
        with request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read())
            if data.get('status') == 'healthy':
                print("✓ Health check passed")
                print(f"  Service: {data.get('service')}")
                print(f"  Version: {data.get('version')}")
                return True
            else:
                print("✗ Health check failed - unexpected response")
                return False
    except error.URLError as e:
        print(f"✗ Health check failed - {e.reason}")
        return False
    except Exception as e:
        print(f"✗ Health check failed - {str(e)}")
        return False

def test_extraction(base_url):
    """Test keyword extraction"""
    print("\nTesting keyword extraction...")
    
    test_text = """
    Artificial intelligence has revolutionized natural language processing.
    Machine learning algorithms can now understand context, sentiment, and semantic meaning.
    Deep learning models like transformers have enabled breakthrough capabilities.
    """
    
    try:
        payload = {
            "text": test_text,
            "language": "en",
            "maxKeywords": 5
        }
        
        req = request.Request(
            f"{base_url}/extract",
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        
        with request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read())
            keywords = data.get('keywords', [])
            
            if len(keywords) > 0:
                print("✓ Extraction successful")
                print(f"  Extracted {len(keywords)} keywords:")
                for i, kw in enumerate(keywords[:5], 1):
                    print(f"    {i}. {kw['text']} (score: {kw['score']:.4f})")
                return True
            else:
                print("✗ Extraction failed - no keywords returned")
                return False
                
    except error.URLError as e:
        print(f"✗ Extraction failed - {e.reason}")
        return False
    except Exception as e:
        print(f"✗ Extraction failed - {str(e)}")
        return False

def test_error_handling(base_url):
    """Test error handling"""
    print("\nTesting error handling...")
    
    try:
        # Test with missing text field
        payload = {"language": "en"}
        
        req = request.Request(
            f"{base_url}/extract",
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        
        try:
            with request.urlopen(req, timeout=5) as response:
                print("✗ Error handling failed - should have returned error")
                return False
        except error.HTTPError as e:
            if e.code == 400:
                error_data = json.loads(e.read())
                if 'error' in error_data:
                    print("✓ Error handling works correctly")
                    print(f"  Error message: {error_data['error']}")
                    return True
            print(f"✗ Error handling failed - unexpected response code {e.code}")
            return False
            
    except Exception as e:
        print(f"✗ Error handling test failed - {str(e)}")
        return False

def test_multilanguage(base_url):
    """Test multi-language support"""
    print("\nTesting multi-language support...")
    
    test_cases = [
        ("en", "Machine learning revolutionizes artificial intelligence systems"),
        ("es", "La inteligencia artificial transforma el procesamiento del lenguaje"),
        ("fr", "L'intelligence artificielle révolutionne le traitement du langage"),
    ]
    
    passed = 0
    for lang, text in test_cases:
        try:
            payload = {
                "text": text,
                "language": lang,
                "maxKeywords": 3
            }
            
            req = request.Request(
                f"{base_url}/extract",
                data=json.dumps(payload).encode('utf-8'),
                headers={'Content-Type': 'application/json'},
                method='POST'
            )
            
            with request.urlopen(req, timeout=10) as response:
                data = json.loads(response.read())
                keywords = data.get('keywords', [])
                if len(keywords) > 0:
                    print(f"  ✓ {lang.upper()}: {', '.join([kw['text'] for kw in keywords[:3]])}")
                    passed += 1
                else:
                    print(f"  ✗ {lang.upper()}: No keywords returned")
                    
        except Exception as e:
            print(f"  ✗ {lang.upper()}: {str(e)}")
    
    if passed == len(test_cases):
        print("✓ Multi-language support working")
        return True
    else:
        print(f"✗ Multi-language support partially working ({passed}/{len(test_cases)})")
        return False

def main():
    parser = argparse.ArgumentParser(description='Test YAKE server')
    parser.add_argument('--url', default=DEFAULT_URL, help=f'Server URL (default: {DEFAULT_URL})')
    args = parser.parse_args()
    
    print("=" * 60)
    print("YAKE Server Test Suite")
    print("=" * 60)
    print(f"Testing server at: {args.url}")
    print()
    
    results = []
    
    # Run tests
    results.append(("Health Check", test_health(args.url)))
    
    if results[0][1]:  # Only continue if health check passed
        results.append(("Keyword Extraction", test_extraction(args.url)))
        results.append(("Error Handling", test_error_handling(args.url)))
        results.append(("Multi-Language", test_multilanguage(args.url)))
    else:
        print("\n⚠ Skipping remaining tests due to health check failure")
        print("\nMake sure the YAKE server is running:")
        print("  ./start_yake.sh")
        print("  or")
        print("  python yake_server.py")
        sys.exit(1)
    
    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {name}")
    
    print()
    print(f"Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! YAKE server is working correctly.")
        sys.exit(0)
    else:
        print(f"\n⚠ {total - passed} test(s) failed. Please check the output above.")
        sys.exit(1)

if __name__ == '__main__':
    main()
