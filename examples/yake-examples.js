/**
 * YAKE Keyword Extraction - Example Usage
 * ========================================
 * Demonstrates how to use YAKE integration in VectHare
 */

import { 
    extractYakeKeywords, 
    checkYakeHealth, 
    extractKeywordsHybrid,
    getSuggestedKeywordsForEntry 
} from './core/keyword-learner.js';

// Example text
const exampleText = `
Artificial intelligence (AI) has revolutionized the field of natural language processing.
Machine learning algorithms can now understand context, sentiment, and semantic meaning
in human language. Deep learning models like transformers have enabled breakthroughs
in tasks such as machine translation, text summarization, and question answering.
The attention mechanism allows models to focus on relevant parts of the input sequence.
`;

/**
 * Example 1: Check YAKE server health
 */
async function example1_healthCheck() {
    console.log('\n=== Example 1: Health Check ===');
    
    const isHealthy = await checkYakeHealth();
    console.log('YAKE server available:', isHealthy);
    
    if (!isHealthy) {
        console.log('Start YAKE server with: python yake_server.py');
    }
}

/**
 * Example 2: Extract keywords using YAKE
 */
async function example2_yakeExtraction() {
    console.log('\n=== Example 2: YAKE Extraction ===');
    
    try {
        const keywords = await extractYakeKeywords(exampleText, {
            language: 'en',
            maxKeywords: 10,
            windowSize: 1,  // Single words
        });
        
        console.log('YAKE Keywords:');
        keywords.forEach((kw, idx) => {
            console.log(`  ${idx + 1}. ${kw.word} (score: ${kw.score.toFixed(4)})`);
        });
    } catch (error) {
        console.error('YAKE extraction failed:', error.message);
    }
}

/**
 * Example 3: Extract bigrams (2-word phrases)
 */
async function example3_bigrams() {
    console.log('\n=== Example 3: YAKE Bigrams ===');
    
    try {
        const keywords = await extractYakeKeywords(exampleText, {
            language: 'en',
            maxKeywords: 10,
            windowSize: 2,  // 2-word phrases
        });
        
        console.log('YAKE Bigrams:');
        keywords.forEach((kw, idx) => {
            console.log(`  ${idx + 1}. ${kw.word} (score: ${kw.score.toFixed(4)})`);
        });
    } catch (error) {
        console.error('YAKE extraction failed:', error.message);
    }
}

/**
 * Example 4: Frequency-based extraction (fallback)
 */
function example4_frequencyBased() {
    console.log('\n=== Example 4: Frequency-Based Extraction ===');
    
    const keywords = getSuggestedKeywordsForEntry(exampleText, 2);
    
    console.log('Frequency Keywords:');
    keywords.forEach((kw, idx) => {
        console.log(`  ${idx + 1}. ${kw.word} (count: ${kw.count})`);
    });
}

/**
 * Example 5: Hybrid extraction (YAKE + Frequency)
 */
async function example5_hybridExtraction() {
    console.log('\n=== Example 5: Hybrid Extraction ===');
    
    try {
        const keywords = await extractKeywordsHybrid(exampleText, {
            threshold: 2,        // Frequency threshold
            maxKeywords: 15,     // Total keywords
            useYake: true,       // Enable YAKE
            yakeOptions: {
                language: 'en',
                windowSize: 1,
            },
        });
        
        console.log('Hybrid Keywords:');
        keywords.forEach((kw, idx) => {
            if (kw.source === 'yake') {
                console.log(`  ${idx + 1}. ${kw.word} [YAKE] (score: ${kw.score.toFixed(4)})`);
            } else {
                console.log(`  ${idx + 1}. ${kw.word} [FREQ] (count: ${kw.count})`);
            }
        });
    } catch (error) {
        console.error('Hybrid extraction failed:', error.message);
    }
}

/**
 * Example 6: Multi-language extraction
 */
async function example6_multiLanguage() {
    console.log('\n=== Example 6: Multi-Language (Spanish) ===');
    
    const spanishText = `
    La inteligencia artificial ha transformado el procesamiento del lenguaje natural.
    Los modelos de aprendizaje profundo pueden entender el contexto y el significado semántico.
    Los transformers han revolucionado la traducción automática y el análisis de sentimientos.
    `;
    
    try {
        const keywords = await extractYakeKeywords(spanishText, {
            language: 'es',  // Spanish
            maxKeywords: 10,
        });
        
        console.log('Spanish Keywords:');
        keywords.forEach((kw, idx) => {
            console.log(`  ${idx + 1}. ${kw.word} (score: ${kw.score.toFixed(4)})`);
        });
    } catch (error) {
        console.error('Spanish extraction failed:', error.message);
    }
}

/**
 * Example 7: Compare YAKE scores
 */
async function example7_scoreComparison() {
    console.log('\n=== Example 7: YAKE Score Analysis ===');
    
    try {
        const keywords = await extractYakeKeywords(exampleText, {
            maxKeywords: 20,
        });
        
        // Group by relevance
        const highlyRelevant = keywords.filter(kw => kw.score < 0.05);
        const relevant = keywords.filter(kw => kw.score >= 0.05 && kw.score < 0.15);
        const moderate = keywords.filter(kw => kw.score >= 0.15 && kw.score < 0.30);
        const lessRelevant = keywords.filter(kw => kw.score >= 0.30);
        
        console.log(`Highly Relevant (< 0.05): ${highlyRelevant.length}`);
        highlyRelevant.forEach(kw => console.log(`  - ${kw.word} (${kw.score.toFixed(4)})`));
        
        console.log(`\nRelevant (0.05-0.15): ${relevant.length}`);
        relevant.forEach(kw => console.log(`  - ${kw.word} (${kw.score.toFixed(4)})`));
        
        console.log(`\nModerately Relevant (0.15-0.30): ${moderate.length}`);
        moderate.forEach(kw => console.log(`  - ${kw.word} (${kw.score.toFixed(4)})`));
        
        console.log(`\nLess Relevant (> 0.30): ${lessRelevant.length}`);
    } catch (error) {
        console.error('Score analysis failed:', error.message);
    }
}

/**
 * Run all examples
 */
async function runAllExamples() {
    console.log('YAKE Keyword Extraction - Examples\n');
    console.log('Text:', exampleText.trim());
    
    await example1_healthCheck();
    await example2_yakeExtraction();
    await example3_bigrams();
    example4_frequencyBased();
    await example5_hybridExtraction();
    await example6_multiLanguage();
    await example7_scoreComparison();
    
    console.log('\n=== All examples completed ===');
}

// Export for use in console or other modules
export {
    example1_healthCheck,
    example2_yakeExtraction,
    example3_bigrams,
    example4_frequencyBased,
    example5_hybridExtraction,
    example6_multiLanguage,
    example7_scoreComparison,
    runAllExamples,
};

// Auto-run if executed directly (not imported)
if (typeof window !== 'undefined') {
    // Browser environment - attach to window
    window.yakeExamples = {
        example1_healthCheck,
        example2_yakeExtraction,
        example3_bigrams,
        example4_frequencyBased,
        example5_hybridExtraction,
        example6_multiLanguage,
        example7_scoreComparison,
        runAllExamples,
    };
    
    console.log('YAKE examples loaded. Run examples with:');
    console.log('  yakeExamples.runAllExamples()');
    console.log('  yakeExamples.example2_yakeExtraction()');
    console.log('  ... etc');
}
