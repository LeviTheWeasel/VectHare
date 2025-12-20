/**
 * Vector Distance Tests
 * Tests for distance/similarity algorithms:
 * - Cosine similarity/distance
 * - Jaccard similarity/distance
 * - Hamming distance
 * - DocumentSearch high-level API
 * - Utility functions
 */

import { describe, it, expect } from 'vitest';
import {
    Jaccard,
    Hamming,
    Cosine,
    DocumentSearch,
    Utils
} from '../utils/vector-distance.js';

// =============================================================================
// COSINE SIMILARITY TESTS
// =============================================================================

describe('Cosine', () => {
    describe('similarity', () => {
        it('should return 1 for identical vectors', () => {
            const vec = [1, 2, 3, 4, 5];
            expect(Cosine.similarity(vec, vec)).toBeCloseTo(1.0, 5);
        });

        it('should return 0 for orthogonal vectors', () => {
            const vecA = [1, 0, 0];
            const vecB = [0, 1, 0];
            expect(Cosine.similarity(vecA, vecB)).toBeCloseTo(0.0, 5);
        });

        it('should return -1 for opposite vectors', () => {
            const vecA = [1, 0, 0];
            const vecB = [-1, 0, 0];
            expect(Cosine.similarity(vecA, vecB)).toBeCloseTo(-1.0, 5);
        });

        it('should handle zero vectors', () => {
            const zero = [0, 0, 0];
            const nonZero = [1, 2, 3];
            expect(Cosine.similarity(zero, nonZero)).toBe(0);
            expect(Cosine.similarity(zero, zero)).toBe(0);
        });

        it('should throw on vectors of different lengths', () => {
            expect(() => Cosine.similarity([1, 2], [1, 2, 3])).toThrow();
        });

        it('should be symmetric', () => {
            const vecA = [1, 2, 3];
            const vecB = [4, 5, 6];
            expect(Cosine.similarity(vecA, vecB)).toBeCloseTo(Cosine.similarity(vecB, vecA), 10);
        });

        it('should be magnitude-independent', () => {
            const vecA = [1, 2, 3];
            const vecB = [2, 4, 6]; // Same direction, different magnitude
            expect(Cosine.similarity(vecA, vecB)).toBeCloseTo(1.0, 5);
        });
    });

    describe('distance', () => {
        it('should return 0 for identical vectors', () => {
            const vec = [1, 2, 3];
            expect(Cosine.distance(vec, vec)).toBeCloseTo(0.0, 5);
        });

        it('should return 1 for orthogonal vectors', () => {
            const vecA = [1, 0];
            const vecB = [0, 1];
            expect(Cosine.distance(vecA, vecB)).toBeCloseTo(1.0, 5);
        });

        it('should return 2 for opposite vectors', () => {
            const vecA = [1, 0];
            const vecB = [-1, 0];
            expect(Cosine.distance(vecA, vecB)).toBeCloseTo(2.0, 5);
        });
    });

    describe('angularDistance', () => {
        it('should return 0 for identical vectors', () => {
            const vec = [1, 2, 3];
            expect(Cosine.angularDistance(vec, vec)).toBeCloseTo(0, 5);
        });

        it('should return π/2 for orthogonal vectors', () => {
            const vecA = [1, 0];
            const vecB = [0, 1];
            expect(Cosine.angularDistance(vecA, vecB)).toBeCloseTo(Math.PI / 2, 5);
        });

        it('should return π for opposite vectors', () => {
            const vecA = [1, 0];
            const vecB = [-1, 0];
            expect(Cosine.angularDistance(vecA, vecB)).toBeCloseTo(Math.PI, 5);
        });
    });

    describe('kNearest', () => {
        it('should find k nearest neighbors', () => {
            const query = [1, 0, 0];
            const vectors = [
                [1, 0, 0],      // Identical
                [0.9, 0.1, 0],  // Very similar
                [0, 1, 0],      // Orthogonal
                [-1, 0, 0]      // Opposite
            ];

            const result = Cosine.kNearest(query, vectors, 2);

            expect(result.length).toBe(2);
            expect(result[0].index).toBe(0); // Identical is closest
            expect(result[1].index).toBe(1); // Second closest
        });

        it('should include distance and similarity', () => {
            const result = Cosine.kNearest([1, 0], [[1, 0]], 1);
            expect(result[0]).toHaveProperty('distance');
            expect(result[0]).toHaveProperty('similarity');
        });
    });

    describe('batchSimilarity', () => {
        it('should calculate similarity for multiple vectors efficiently', () => {
            const query = [1, 0, 0];
            const vectors = [
                [1, 0, 0],
                [0, 1, 0],
                [-1, 0, 0]
            ];

            const similarities = Cosine.batchSimilarity(query, vectors);

            expect(similarities.length).toBe(3);
            expect(similarities[0]).toBeCloseTo(1.0, 5);
            expect(similarities[1]).toBeCloseTo(0.0, 5);
            expect(similarities[2]).toBeCloseTo(-1.0, 5);
        });

        it('should handle zero query vector', () => {
            const similarities = Cosine.batchSimilarity([0, 0], [[1, 0], [0, 1]]);
            expect(similarities).toEqual([0, 0]);
        });
    });

    describe('pairwiseDistance', () => {
        it('should compute all pairwise distances', () => {
            const matrixA = [[1, 0], [0, 1]];
            const matrixB = [[1, 0], [0, 1], [-1, 0]];

            const distances = Cosine.pairwiseDistance(matrixA, matrixB);

            expect(distances.length).toBe(2);
            expect(distances[0].length).toBe(3);

            // [1,0] to [1,0] = 0
            expect(distances[0][0]).toBeCloseTo(0, 5);
            // [1,0] to [0,1] = 1
            expect(distances[0][1]).toBeCloseTo(1, 5);
            // [1,0] to [-1,0] = 2
            expect(distances[0][2]).toBeCloseTo(2, 5);
        });
    });

    describe('pairwiseSimilarity', () => {
        it('should compute all pairwise similarities', () => {
            const matrixA = [[1, 0], [0, 1]];
            const matrixB = [[1, 0], [0, 1]];

            const similarities = Cosine.pairwiseSimilarity(matrixA, matrixB);

            expect(similarities[0][0]).toBeCloseTo(1, 5); // [1,0] to [1,0]
            expect(similarities[0][1]).toBeCloseTo(0, 5); // [1,0] to [0,1]
            expect(similarities[1][0]).toBeCloseTo(0, 5); // [0,1] to [1,0]
            expect(similarities[1][1]).toBeCloseTo(1, 5); // [0,1] to [0,1]
        });
    });
});

// =============================================================================
// JACCARD DISTANCE TESTS
// =============================================================================

describe('Jaccard', () => {
    describe('similarity', () => {
        it('should return 1 for identical binary vectors', () => {
            const vec = [1, 1, 0, 0, 1];
            expect(Jaccard.similarity(vec, vec)).toBeCloseTo(1.0, 5);
        });

        it('should return 0 for completely different sets', () => {
            const vecA = [1, 1, 0, 0];
            const vecB = [0, 0, 1, 1];
            expect(Jaccard.similarity(vecA, vecB)).toBeCloseTo(0.0, 5);
        });

        it('should calculate correct overlap', () => {
            const vecA = [1, 1, 1, 0];  // {0, 1, 2}
            const vecB = [1, 1, 0, 1];  // {0, 1, 3}
            // Intersection: {0, 1}, Union: {0, 1, 2, 3}
            // Similarity = 2/4 = 0.5
            expect(Jaccard.similarity(vecA, vecB)).toBeCloseTo(0.5, 5);
        });

        it('should return 1 for two empty sets (all zeros)', () => {
            const vecA = [0, 0, 0];
            const vecB = [0, 0, 0];
            expect(Jaccard.similarity(vecA, vecB)).toBe(1);
        });

        it('should throw on vectors of different lengths', () => {
            expect(() => Jaccard.similarity([1, 0], [1, 0, 1])).toThrow();
        });

        it('should apply threshold for continuous values', () => {
            const vecA = [0.8, 0.3, 0.9];  // With threshold 0.5: [1, 0, 1]
            const vecB = [0.6, 0.7, 0.2];  // With threshold 0.5: [1, 1, 0]
            // Intersection: {0}, Union: {0, 1, 2}
            // Similarity = 1/3
            expect(Jaccard.similarity(vecA, vecB, 0.5)).toBeCloseTo(1 / 3, 5);
        });
    });

    describe('distance', () => {
        it('should return 0 for identical vectors', () => {
            const vec = [1, 1, 0, 0];
            expect(Jaccard.distance(vec, vec)).toBeCloseTo(0.0, 5);
        });

        it('should return 1 for completely different sets', () => {
            const vecA = [1, 1, 0, 0];
            const vecB = [0, 0, 1, 1];
            expect(Jaccard.distance(vecA, vecB)).toBeCloseTo(1.0, 5);
        });

        it('should be 1 - similarity', () => {
            const vecA = [1, 1, 1, 0];
            const vecB = [1, 1, 0, 1];
            const similarity = Jaccard.similarity(vecA, vecB);
            const distance = Jaccard.distance(vecA, vecB);
            expect(distance).toBeCloseTo(1 - similarity, 10);
        });
    });

    describe('kNearest', () => {
        it('should find nearest binary vectors', () => {
            const query = [1, 1, 0, 0];
            const vectors = [
                [1, 1, 0, 0],  // Identical
                [1, 1, 0, 1],  // 1 bit different
                [0, 0, 1, 1],  // Completely different
            ];

            const result = Jaccard.kNearest(query, vectors, 2);

            expect(result.length).toBe(2);
            expect(result[0].index).toBe(0);
            expect(result[0].distance).toBeCloseTo(0, 5);
        });
    });

    describe('pairwiseDistance', () => {
        it('should compute all pairwise Jaccard distances', () => {
            const matrixA = [[1, 1, 0], [0, 1, 1]];
            const matrixB = [[1, 1, 0], [1, 0, 0]];

            const distances = Jaccard.pairwiseDistance(matrixA, matrixB);

            expect(distances.length).toBe(2);
            expect(distances[0].length).toBe(2);
            expect(distances[0][0]).toBeCloseTo(0, 5); // [1,1,0] to [1,1,0]
        });
    });
});

// =============================================================================
// HAMMING DISTANCE TESTS
// =============================================================================

describe('Hamming', () => {
    describe('distance', () => {
        it('should return 0 for identical vectors', () => {
            const vec = [1, 2, 3, 4];
            expect(Hamming.distance(vec, vec)).toBe(0);
        });

        it('should count position differences', () => {
            const vecA = [1, 2, 3, 4];
            const vecB = [1, 0, 3, 0];  // 2 differences at positions 1 and 3
            expect(Hamming.distance(vecA, vecB)).toBe(2);
        });

        it('should count all positions for completely different vectors', () => {
            const vecA = [1, 1, 1, 1];
            const vecB = [0, 0, 0, 0];
            expect(Hamming.distance(vecA, vecB)).toBe(4);
        });

        it('should throw on vectors of different lengths', () => {
            expect(() => Hamming.distance([1, 2], [1, 2, 3])).toThrow();
        });

        it('should use tolerance for floating point comparison', () => {
            const vecA = [1.0, 2.0];
            const vecB = [1.0000000001, 2.0];  // Within tolerance
            expect(Hamming.distance(vecA, vecB)).toBe(0);
        });

        it('should respect custom tolerance', () => {
            const vecA = [1.0, 2.0];
            const vecB = [1.1, 2.0];
            // Default tolerance (1e-10) should count this as different
            expect(Hamming.distance(vecA, vecB)).toBe(1);
            // Large tolerance should count as same
            expect(Hamming.distance(vecA, vecB, 0.2)).toBe(0);
        });
    });

    describe('normalizedDistance', () => {
        it('should return 0 for identical vectors', () => {
            const vec = [1, 2, 3, 4];
            expect(Hamming.normalizedDistance(vec, vec)).toBe(0);
        });

        it('should return value between 0 and 1', () => {
            const vecA = [1, 2, 3, 4];
            const vecB = [1, 0, 3, 0];
            const normalized = Hamming.normalizedDistance(vecA, vecB);
            expect(normalized).toBeGreaterThanOrEqual(0);
            expect(normalized).toBeLessThanOrEqual(1);
        });

        it('should return 1 for completely different vectors', () => {
            const vecA = [1, 1, 1, 1];
            const vecB = [0, 0, 0, 0];
            expect(Hamming.normalizedDistance(vecA, vecB)).toBe(1);
        });

        it('should return 0 for empty vectors', () => {
            expect(Hamming.normalizedDistance([], [])).toBe(0);
        });

        it('should normalize by vector length', () => {
            const vecA = [1, 2, 3, 4];
            const vecB = [1, 0, 3, 0];  // 2 differences out of 4
            expect(Hamming.normalizedDistance(vecA, vecB)).toBeCloseTo(0.5, 5);
        });
    });

    describe('kNearest', () => {
        it('should find nearest by Hamming distance', () => {
            const query = [1, 1, 1, 1];
            const vectors = [
                [1, 1, 1, 1],  // Distance 0
                [1, 1, 1, 0],  // Distance 1
                [0, 0, 0, 0],  // Distance 4
            ];

            const result = Hamming.kNearest(query, vectors, 2);

            expect(result.length).toBe(2);
            expect(result[0].index).toBe(0);
            expect(result[0].distance).toBe(0);
            expect(result[1].index).toBe(1);
            expect(result[1].distance).toBe(1);
        });

        it('should support normalized distance option', () => {
            const query = [1, 1, 1, 1];
            const vectors = [[0, 0, 0, 0]];

            const raw = Hamming.kNearest(query, vectors, 1, false);
            const normalized = Hamming.kNearest(query, vectors, 1, true);

            expect(raw[0].distance).toBe(4);
            expect(normalized[0].distance).toBe(1);
        });
    });

    describe('pairwiseDistance', () => {
        it('should compute pairwise Hamming distances', () => {
            const matrixA = [[1, 1], [0, 0]];
            const matrixB = [[1, 1], [1, 0]];

            const distances = Hamming.pairwiseDistance(matrixA, matrixB);

            expect(distances[0][0]).toBe(0); // [1,1] to [1,1]
            expect(distances[0][1]).toBe(1); // [1,1] to [1,0]
            expect(distances[1][0]).toBe(2); // [0,0] to [1,1]
            expect(distances[1][1]).toBe(1); // [0,0] to [1,0]
        });

        it('should support normalized option', () => {
            const matrixA = [[1, 1]];
            const matrixB = [[0, 0]];

            const raw = Hamming.pairwiseDistance(matrixA, matrixB, false);
            const normalized = Hamming.pairwiseDistance(matrixA, matrixB, true);

            expect(raw[0][0]).toBe(2);
            expect(normalized[0][0]).toBe(1);
        });
    });
});

// =============================================================================
// DOCUMENT SEARCH TESTS
// =============================================================================

describe('DocumentSearch', () => {
    const testDocuments = [
        { documentText: 'First document about cats', embeddingArray: [1, 0, 0] },
        { documentText: 'Second document about dogs', embeddingArray: [0, 1, 0] },
        { documentText: 'Third document similar to first', embeddingArray: [0.9, 0.1, 0] }
    ];

    describe('search with cosine', () => {
        it('should return ranked results', () => {
            const result = DocumentSearch.search({
                message: [1, 0, 0],
                documents: testDocuments,
                algorithm: 'cosine'
            });

            expect(result.results.length).toBe(3);
            expect(result.algorithm).toBe('cosine');
        });

        it('should rank most similar first', () => {
            const result = DocumentSearch.search({
                message: [1, 0, 0],
                documents: testDocuments,
                algorithm: 'cosine'
            });

            // First doc should be most similar
            expect(result.results[0].resultText).toBe('First document about cats');
            expect(result.results[0].score).toBeCloseTo(1.0, 5);
        });

        it('should respect top_k parameter', () => {
            const result = DocumentSearch.search({
                message: [1, 0, 0],
                documents: testDocuments,
                algorithm: 'cosine',
                top_k: 2
            });

            expect(result.results.length).toBe(2);
            expect(result.returnedDocuments).toBe(2);
            expect(result.totalDocuments).toBe(3);
        });
    });

    describe('search with jaccard', () => {
        const binaryDocs = [
            { documentText: 'Doc A', embeddingArray: [1, 1, 0, 0] },
            { documentText: 'Doc B', embeddingArray: [1, 0, 0, 1] },
            { documentText: 'Doc C', embeddingArray: [0, 0, 1, 1] }
        ];

        it('should work with binary vectors', () => {
            const result = DocumentSearch.search({
                message: [1, 1, 0, 0],
                documents: binaryDocs,
                algorithm: 'jaccard'
            });

            expect(result.algorithm).toBe('jaccard');
            expect(result.results[0].resultText).toBe('Doc A');
            expect(result.results[0].score).toBeCloseTo(1.0, 5);
        });

        it('should show warning for continuous vectors', () => {
            const result = DocumentSearch.search({
                message: [0.5, 0.3, 0.8],
                documents: testDocuments,
                algorithm: 'jaccard'
            });

            expect(result.warning).toBeDefined();
            expect(result.warning).toContain('Jaccard');
        });

        it('should suppress warnings when requested', () => {
            const result = DocumentSearch.search({
                message: [0.5, 0.3, 0.8],
                documents: testDocuments,
                algorithm: 'jaccard',
                suppressWarnings: true
            });

            expect(result.warning).toBeNull();
        });
    });

    describe('search with hamming', () => {
        const quantizedDocs = [
            { documentText: 'Doc A', embeddingArray: [1, 2, 3] },
            { documentText: 'Doc B', embeddingArray: [1, 2, 4] },
            { documentText: 'Doc C', embeddingArray: [4, 5, 6] }
        ];

        it('should work with quantized vectors', () => {
            const result = DocumentSearch.search({
                message: [1, 2, 3],
                documents: quantizedDocs,
                algorithm: 'hamming'
            });

            expect(result.algorithm).toBe('hamming');
            expect(result.results[0].resultText).toBe('Doc A');
        });

        it('should convert distance to score (higher is better)', () => {
            const result = DocumentSearch.search({
                message: [1, 2, 3],
                documents: quantizedDocs,
                algorithm: 'hamming',
                normalized: true
            });

            // Identical should have score 1
            expect(result.results[0].score).toBeCloseTo(1.0, 5);
            // Different should have lower score
            expect(result.results[0].score).toBeGreaterThan(result.results[2].score);
        });
    });

    describe('validation', () => {
        it('should throw on empty message', () => {
            expect(() => DocumentSearch.search({
                message: [],
                documents: testDocuments,
                algorithm: 'cosine'
            })).toThrow();
        });

        it('should throw on empty documents', () => {
            expect(() => DocumentSearch.search({
                message: [1, 0, 0],
                documents: [],
                algorithm: 'cosine'
            })).toThrow();
        });

        it('should throw on invalid algorithm', () => {
            expect(() => DocumentSearch.search({
                message: [1, 0, 0],
                documents: testDocuments,
                algorithm: 'invalid'
            })).toThrow();
        });

        it('should throw on mismatched embedding lengths', () => {
            const badDocs = [
                { documentText: 'Doc', embeddingArray: [1, 2] } // Length 2, not 3
            ];

            expect(() => DocumentSearch.search({
                message: [1, 0, 0],
                documents: badDocs,
                algorithm: 'cosine'
            })).toThrow();
        });

        it('should throw on missing documentText', () => {
            const badDocs = [{ embeddingArray: [1, 0, 0] }];

            expect(() => DocumentSearch.search({
                message: [1, 0, 0],
                documents: badDocs,
                algorithm: 'cosine'
            })).toThrow();
        });

        it('should throw on missing embeddingArray', () => {
            const badDocs = [{ documentText: 'Doc' }];

            expect(() => DocumentSearch.search({
                message: [1, 0, 0],
                documents: badDocs,
                algorithm: 'cosine'
            })).toThrow();
        });
    });
});

// =============================================================================
// UTILITY FUNCTIONS TESTS
// =============================================================================

describe('Utils', () => {
    describe('isValidVector', () => {
        it('should return true for valid vectors', () => {
            expect(Utils.isValidVector([1, 2, 3])).toBe(true);
            expect(Utils.isValidVector([0])).toBe(true);
            expect(Utils.isValidVector([-1, 0, 1])).toBe(true);
        });

        it('should return false for invalid inputs', () => {
            expect(Utils.isValidVector([])).toBe(false);
            expect(Utils.isValidVector(null)).toBe(false);
            expect(Utils.isValidVector(undefined)).toBe(false);
            expect(Utils.isValidVector('string')).toBe(false);
            expect(Utils.isValidVector([1, 'a', 3])).toBe(false);
            expect(Utils.isValidVector([1, NaN, 3])).toBe(false);
        });
    });

    describe('isValidMatrix', () => {
        it('should return true for valid matrices', () => {
            expect(Utils.isValidMatrix([[1, 2], [3, 4]])).toBe(true);
            expect(Utils.isValidMatrix([[1]])).toBe(true);
        });

        it('should return false for invalid inputs', () => {
            expect(Utils.isValidMatrix([])).toBe(false);
            expect(Utils.isValidMatrix([[]])).toBe(false);
            expect(Utils.isValidMatrix([[1, 2], [3]])).toBe(false); // Ragged
            expect(Utils.isValidMatrix(null)).toBe(false);
        });
    });

    describe('normalize', () => {
        it('should return unit vector', () => {
            const normalized = Utils.normalize([3, 4]); // 3-4-5 triangle
            expect(normalized[0]).toBeCloseTo(0.6, 5);
            expect(normalized[1]).toBeCloseTo(0.8, 5);

            // Check magnitude is 1
            const magnitude = Math.sqrt(normalized[0] ** 2 + normalized[1] ** 2);
            expect(magnitude).toBeCloseTo(1.0, 5);
        });

        it('should handle zero vector', () => {
            const normalized = Utils.normalize([0, 0, 0]);
            expect(normalized).toEqual([0, 0, 0]);
        });

        it('should handle unit vectors', () => {
            const normalized = Utils.normalize([1, 0, 0]);
            expect(normalized).toEqual([1, 0, 0]);
        });
    });

    describe('topK', () => {
        it('should find top k values descending', () => {
            const arr = [5, 3, 8, 1, 9, 2];
            const result = Utils.topK(arr, 3);

            expect(result.length).toBe(3);
            expect(result[0].value).toBe(9);
            expect(result[0].index).toBe(4);
            expect(result[1].value).toBe(8);
            expect(result[2].value).toBe(5);
        });

        it('should find top k values ascending', () => {
            const arr = [5, 3, 8, 1, 9, 2];
            const result = Utils.topK(arr, 3, false);

            expect(result[0].value).toBe(1);
            expect(result[1].value).toBe(2);
            expect(result[2].value).toBe(3);
        });

        it('should handle k larger than array', () => {
            const arr = [1, 2];
            const result = Utils.topK(arr, 5);

            expect(result.length).toBe(2);
        });
    });
});

// =============================================================================
// EDGE CASES AND NUMERICAL STABILITY
// =============================================================================

describe('Edge Cases', () => {
    it('should handle very large vectors', () => {
        const size = 1000;
        const vecA = Array(size).fill(0).map(() => Math.random());
        const vecB = Array(size).fill(0).map(() => Math.random());

        // Should not throw or produce NaN
        const similarity = Cosine.similarity(vecA, vecB);
        expect(isNaN(similarity)).toBe(false);
        expect(similarity).toBeGreaterThanOrEqual(-1);
        expect(similarity).toBeLessThanOrEqual(1);
    });

    it('should handle very small values', () => {
        const vecA = [1e-10, 1e-10, 1e-10];
        const vecB = [1e-10, 1e-10, 1e-10];

        const similarity = Cosine.similarity(vecA, vecB);
        expect(isNaN(similarity)).toBe(false);
    });

    it('should handle very large values', () => {
        const vecA = [1e10, 1e10, 1e10];
        const vecB = [1e10, 1e10, 1e10];

        const similarity = Cosine.similarity(vecA, vecB);
        expect(similarity).toBeCloseTo(1.0, 5);
    });

    it('should handle negative values in cosine similarity', () => {
        const vecA = [-1, -2, -3];
        const vecB = [-1, -2, -3];

        expect(Cosine.similarity(vecA, vecB)).toBeCloseTo(1.0, 5);
    });

    it('should handle mixed positive and negative values', () => {
        const vecA = [1, -1, 1];
        const vecB = [-1, 1, -1];

        expect(Cosine.similarity(vecA, vecB)).toBeCloseTo(-1.0, 5);
    });
});
