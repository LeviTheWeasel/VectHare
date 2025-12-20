/**
 * Temporal Decay Tests
 * Tests for the temporal weighting system including:
 * - Exponential and linear decay
 * - Exponential and linear nostalgia boost
 * - Score application functions
 * - Settings validation
 * - Statistics calculation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    applyTemporalDecay,
    applyNostalgiaBoost,
    applyDecayToResults,
    applyNostalgiaToResults,
    applySceneAwareDecay,
    getDefaultDecaySettings,
    validateDecaySettings,
    projectDecayCurve,
    getDecayStats,
    getNostalgiaStats
} from '../core/temporal-decay.js';

// Mock the collection-metadata module
vi.mock('../core/collection-metadata.js', () => ({
    isChunkTemporallyBlind: vi.fn((hash) => {
        // Mock: hashes starting with 'blind_' are temporally blind
        return typeof hash === 'string' && hash.startsWith('blind_');
    }),
    getCollectionDecaySettings: vi.fn(() => ({
        enabled: true,
        type: 'decay',
        mode: 'exponential',
        halfLife: 50,
        minRelevance: 0.3
    }))
}));

// =============================================================================
// EXPONENTIAL DECAY TESTS
// =============================================================================

describe('Exponential Decay', () => {
    const exponentialSettings = {
        enabled: true,
        mode: 'exponential',
        halfLife: 50,
        minRelevance: 0.3
    };

    describe('basic decay calculation', () => {
        it('should return original score when decay is disabled', () => {
            const disabledSettings = { enabled: false };
            expect(applyTemporalDecay(1.0, 100, disabledSettings)).toBe(1.0);
        });

        it('should return original score when age is 0', () => {
            expect(applyTemporalDecay(1.0, 0, exponentialSettings)).toBe(1.0);
        });

        it('should decay to 50% at half-life', () => {
            const result = applyTemporalDecay(1.0, 50, exponentialSettings);
            // At half-life (50), multiplier should be 0.5, but capped at minRelevance (0.3)
            expect(result).toBeCloseTo(0.5, 2);
        });

        it('should decay to 25% at twice half-life', () => {
            const result = applyTemporalDecay(1.0, 100, exponentialSettings);
            // At 100 messages (2 half-lives), should be 0.25, but capped at 0.3
            expect(result).toBeCloseTo(0.3, 2);
        });

        it('should never decay below minRelevance', () => {
            const result = applyTemporalDecay(1.0, 1000, exponentialSettings);
            expect(result).toBeGreaterThanOrEqual(0.3);
        });
    });

    describe('score scaling', () => {
        it('should scale decay proportionally to original score', () => {
            const lowScore = applyTemporalDecay(0.5, 50, exponentialSettings);
            const highScore = applyTemporalDecay(1.0, 50, exponentialSettings);
            expect(highScore).toBe(lowScore * 2);
        });
    });
});

// =============================================================================
// LINEAR DECAY TESTS
// =============================================================================

describe('Linear Decay', () => {
    const linearSettings = {
        enabled: true,
        mode: 'linear',
        linearRate: 0.01,
        minRelevance: 0.3
    };

    it('should decay linearly with age', () => {
        const result = applyTemporalDecay(1.0, 50, linearSettings);
        // At 50 messages with rate 0.01: 1 - (50 * 0.01) = 0.5
        expect(result).toBeCloseTo(0.5, 2);
    });

    it('should reach zero decay at 1/rate messages', () => {
        const result = applyTemporalDecay(1.0, 100, linearSettings);
        // At 100 messages: 1 - (100 * 0.01) = 0, but capped at 0.3
        expect(result).toBeCloseTo(0.3, 2);
    });

    it('should never decay below minRelevance', () => {
        const result = applyTemporalDecay(1.0, 200, linearSettings);
        expect(result).toBeGreaterThanOrEqual(0.3);
    });
});

// =============================================================================
// EXPONENTIAL NOSTALGIA TESTS
// =============================================================================

describe('Exponential Nostalgia', () => {
    const nostalgiaSettings = {
        enabled: true,
        mode: 'exponential',
        halfLife: 50,
        maxBoost: 1.5
    };

    it('should return original score when nostalgia is disabled', () => {
        const disabledSettings = { enabled: false };
        expect(applyNostalgiaBoost(1.0, 100, disabledSettings)).toBe(1.0);
    });

    it('should return original score when age is 0', () => {
        expect(applyNostalgiaBoost(1.0, 0, nostalgiaSettings)).toBe(1.0);
    });

    it('should reach halfway to maxBoost at half-life', () => {
        const result = applyNostalgiaBoost(1.0, 50, nostalgiaSettings);
        // At half-life, should be halfway between 1.0 and 1.5 = 1.25
        expect(result).toBeCloseTo(1.25, 2);
    });

    it('should approach maxBoost asymptotically', () => {
        const result = applyNostalgiaBoost(1.0, 500, nostalgiaSettings);
        // At very high age, should be close to maxBoost
        expect(result).toBeCloseTo(1.5, 1);
    });

    it('should never exceed maxBoost', () => {
        const result = applyNostalgiaBoost(1.0, 10000, nostalgiaSettings);
        expect(result).toBeLessThanOrEqual(1.5);
    });
});

// =============================================================================
// LINEAR NOSTALGIA TESTS
// =============================================================================

describe('Linear Nostalgia', () => {
    const linearNostalgiaSettings = {
        enabled: true,
        mode: 'linear',
        linearRate: 0.005,
        maxBoost: 1.5
    };

    it('should boost linearly with age', () => {
        const result = applyNostalgiaBoost(1.0, 50, linearNostalgiaSettings);
        // At 50 messages with rate 0.005: 1 + (50 * 0.005) = 1.25
        expect(result).toBeCloseTo(1.25, 2);
    });

    it('should cap at maxBoost', () => {
        const result = applyNostalgiaBoost(1.0, 200, linearNostalgiaSettings);
        // At 200 messages: 1 + (200 * 0.005) = 2.0, but capped at 1.5
        expect(result).toBe(1.5);
    });
});

// =============================================================================
// APPLY DECAY TO RESULTS TESTS
// =============================================================================

describe('applyDecayToResults', () => {
    const decaySettings = {
        enabled: true,
        mode: 'exponential',
        halfLife: 50,
        minRelevance: 0.3
    };

    const mockChunks = [
        {
            text: 'Chunk 1',
            score: 1.0,
            hash: 'hash_1',
            metadata: { source: 'chat', messageId: 90 }
        },
        {
            text: 'Chunk 2',
            score: 0.8,
            hash: 'hash_2',
            metadata: { source: 'chat', messageId: 50 }
        },
        {
            text: 'Chunk 3',
            score: 0.9,
            hash: 'blind_3',  // Temporally blind
            metadata: { source: 'chat', messageId: 30 }
        },
        {
            text: 'Chunk 4 (non-chat)',
            score: 0.7,
            metadata: { source: 'lorebook' }
        }
    ];

    it('should return unchanged chunks when disabled', () => {
        const disabledSettings = { enabled: false };
        const result = applyDecayToResults(mockChunks, 100, disabledSettings);
        expect(result).toEqual(mockChunks);
    });

    it('should apply decay only to chat chunks', () => {
        const result = applyDecayToResults(mockChunks, 100, decaySettings);

        // Chat chunks should have decayApplied flag
        expect(result[0].decayApplied).toBe(true);
        expect(result[1].decayApplied).toBe(true);

        // Non-chat chunk should be unchanged
        expect(result[3].decayApplied).toBeUndefined();
        expect(result[3].score).toBe(0.7);
    });

    it('should skip temporally blind chunks', () => {
        const result = applyDecayToResults(mockChunks, 100, decaySettings);

        // Blind chunk should not have decay applied
        expect(result[2].temporallyBlind).toBe(true);
        expect(result[2].decayApplied).toBe(false);
        expect(result[2].score).toBe(0.9); // Original score
    });

    it('should calculate correct message age', () => {
        const result = applyDecayToResults(mockChunks, 100, decaySettings);

        // Chunk at messageId 90, current 100 -> age = 10
        expect(result[0].messageAge).toBe(10);

        // Chunk at messageId 50, current 100 -> age = 50
        expect(result[1].messageAge).toBe(50);
    });

    it('should preserve original score', () => {
        const result = applyDecayToResults(mockChunks, 100, decaySettings);

        expect(result[0].originalScore).toBe(1.0);
        expect(result[1].originalScore).toBe(0.8);
    });

    it('should handle chunks with messageId of 0', () => {
        const chunksWithZeroId = [{
            text: 'First message',
            score: 1.0,
            metadata: { source: 'chat', messageId: 0 }
        }];

        const result = applyDecayToResults(chunksWithZeroId, 50, decaySettings);
        expect(result[0].decayApplied).toBe(true);
        expect(result[0].messageAge).toBe(50);
    });
});

// =============================================================================
// APPLY NOSTALGIA TO RESULTS TESTS
// =============================================================================

describe('applyNostalgiaToResults', () => {
    const nostalgiaSettings = {
        enabled: true,
        mode: 'exponential',
        halfLife: 50,
        maxBoost: 1.5
    };

    const mockChunks = [
        {
            text: 'Recent chunk',
            score: 0.8,
            hash: 'hash_1',
            metadata: { source: 'chat', messageId: 95 }
        },
        {
            text: 'Old chunk',
            score: 0.6,
            hash: 'hash_2',
            metadata: { source: 'chat', messageId: 20 }
        }
    ];

    it('should boost older chunks more', () => {
        const result = applyNostalgiaToResults(mockChunks, 100, nostalgiaSettings);

        // Old chunk (age 80) should have higher boost than recent chunk (age 5)
        const recentBoost = result[0].score / result[0].originalScore;
        const oldBoost = result[1].score / result[1].originalScore;

        expect(oldBoost).toBeGreaterThan(recentBoost);
    });

    it('should set nostalgiaApplied flag', () => {
        const result = applyNostalgiaToResults(mockChunks, 100, nostalgiaSettings);

        expect(result[0].nostalgiaApplied).toBe(true);
        expect(result[1].nostalgiaApplied).toBe(true);
    });
});

// =============================================================================
// SCENE-AWARE DECAY TESTS
// =============================================================================

describe('applySceneAwareDecay', () => {
    const decaySettings = {
        enabled: true,
        mode: 'exponential',
        halfLife: 50,
        minRelevance: 0.3
    };

    const scenes = [
        { start: 0, end: 30 },    // Scene 1: messages 0-30
        { start: 31, end: 60 },   // Scene 2: messages 31-60
        { start: 61, end: null }  // Scene 3: messages 61+
    ];

    const mockChunks = [
        {
            text: 'Same scene chunk',
            score: 1.0,
            metadata: { source: 'chat', messageId: 70 }
        },
        {
            text: 'Different scene chunk',
            score: 0.9,
            metadata: { source: 'chat', messageId: 40 }
        }
    ];

    it('should apply scene-aware decay flag', () => {
        const result = applySceneAwareDecay(mockChunks, 80, scenes, decaySettings);

        expect(result[0].sceneAwareDecay).toBe(true);
        expect(result[1].sceneAwareDecay).toBe(true);
    });

    it('should calculate effective age based on scenes', () => {
        const result = applySceneAwareDecay(mockChunks, 80, scenes, decaySettings);

        // Same scene (both in scene 3): age = 80 - 70 = 10
        expect(result[0].effectiveAge).toBe(10);

        // Different scene: age calculated from scene boundary
        expect(result[1].effectiveAge).toBeDefined();
    });
});

// =============================================================================
// SETTINGS TESTS
// =============================================================================

describe('getDefaultDecaySettings', () => {
    it('should return disabled by default', () => {
        const defaults = getDefaultDecaySettings();
        expect(defaults.enabled).toBe(false);
    });

    it('should have exponential mode by default', () => {
        const defaults = getDefaultDecaySettings();
        expect(defaults.mode).toBe('exponential');
    });

    it('should have reasonable half-life default', () => {
        const defaults = getDefaultDecaySettings();
        expect(defaults.halfLife).toBe(50);
    });

    it('should have decay type by default', () => {
        const defaults = getDefaultDecaySettings();
        expect(defaults.type).toBe('decay');
    });
});

describe('validateDecaySettings', () => {
    it('should pass valid decay settings', () => {
        const settings = {
            enabled: true,
            type: 'decay',
            mode: 'exponential',
            halfLife: 50,
            minRelevance: 0.5
        };
        const result = validateDecaySettings(settings);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('should pass valid nostalgia settings', () => {
        const settings = {
            enabled: true,
            type: 'nostalgia',
            mode: 'exponential',
            halfLife: 50,
            maxBoost: 1.5
        };
        const result = validateDecaySettings(settings);
        expect(result.valid).toBe(true);
    });

    it('should fail invalid mode', () => {
        const settings = {
            enabled: true,
            mode: 'invalid'
        };
        const result = validateDecaySettings(settings);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Mode must be "exponential" or "linear"');
    });

    it('should fail negative half-life', () => {
        const settings = {
            enabled: true,
            mode: 'exponential',
            halfLife: -10
        };
        const result = validateDecaySettings(settings);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Half-life must be greater than 0');
    });

    it('should fail invalid linear rate', () => {
        const settings = {
            enabled: true,
            mode: 'linear',
            linearRate: 1.5
        };
        const result = validateDecaySettings(settings);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Linear rate must be between 0 and 1');
    });

    it('should fail minRelevance outside 0-1', () => {
        const settings = {
            enabled: true,
            type: 'decay',
            mode: 'exponential',
            halfLife: 50,
            minRelevance: 1.5
        };
        const result = validateDecaySettings(settings);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Minimum relevance must be between 0 and 1');
    });

    it('should fail maxBoost outside 1-3', () => {
        const settings = {
            enabled: true,
            type: 'nostalgia',
            mode: 'exponential',
            halfLife: 50,
            maxBoost: 5.0
        };
        const result = validateDecaySettings(settings);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Max boost must be between 1.0 and 3.0');
    });

    it('should pass disabled settings without validation', () => {
        const settings = {
            enabled: false,
            mode: 'invalid',
            halfLife: -100
        };
        const result = validateDecaySettings(settings);
        expect(result.valid).toBe(true);
    });
});

// =============================================================================
// UTILITY FUNCTION TESTS
// =============================================================================

describe('projectDecayCurve', () => {
    const decaySettings = {
        enabled: true,
        mode: 'exponential',
        halfLife: 50,
        minRelevance: 0.3
    };

    it('should project scores at specified ages', () => {
        const curve = projectDecayCurve(1.0, decaySettings);

        expect(curve).toBeInstanceOf(Array);
        expect(curve.length).toBeGreaterThan(0);

        curve.forEach(point => {
            expect(point).toHaveProperty('age');
            expect(point).toHaveProperty('score');
        });
    });

    it('should use custom ages when provided', () => {
        const ages = [0, 25, 50, 75, 100];
        const curve = projectDecayCurve(1.0, decaySettings, ages);

        expect(curve.length).toBe(5);
        expect(curve[0].age).toBe(0);
        expect(curve[4].age).toBe(100);
    });

    it('should show decay progression', () => {
        const curve = projectDecayCurve(1.0, decaySettings, [0, 50, 100]);

        // Score should decrease with age (until hitting floor)
        expect(curve[0].score).toBeGreaterThan(curve[1].score);
        expect(curve[1].score).toBeGreaterThanOrEqual(curve[2].score);
    });
});

describe('getDecayStats', () => {
    it('should return zero stats for empty array', () => {
        const stats = getDecayStats([]);
        expect(stats.affected).toBe(0);
        expect(stats.avgReduction).toBe(0);
        expect(stats.maxReduction).toBe(0);
    });

    it('should calculate stats for decayed chunks', () => {
        const chunks = [
            { score: 0.5, originalScore: 1.0, decayApplied: true, messageAge: 50 },
            { score: 0.75, originalScore: 1.0, decayApplied: true, messageAge: 25 }
        ];

        const stats = getDecayStats(chunks);

        expect(stats.affected).toBe(2);
        expect(stats.avgReduction).toBe(37.5); // Average of 50% and 25%
        expect(stats.maxReduction).toBe(50);
        expect(stats.avgAge).toBe(37.5);
    });

    it('should only count chunks with decay applied', () => {
        const chunks = [
            { score: 0.5, originalScore: 1.0, decayApplied: true, messageAge: 50 },
            { score: 1.0, originalScore: 1.0 } // Not decayed
        ];

        const stats = getDecayStats(chunks);
        expect(stats.affected).toBe(1);
    });
});

describe('getNostalgiaStats', () => {
    it('should return zero stats for empty array', () => {
        const stats = getNostalgiaStats([]);
        expect(stats.affected).toBe(0);
        expect(stats.avgBoost).toBe(0);
        expect(stats.maxBoost).toBe(0);
    });

    it('should calculate stats for boosted chunks', () => {
        const chunks = [
            { score: 1.5, originalScore: 1.0, nostalgiaApplied: true, messageAge: 100 },
            { score: 1.25, originalScore: 1.0, nostalgiaApplied: true, messageAge: 50 }
        ];

        const stats = getNostalgiaStats(chunks);

        expect(stats.affected).toBe(2);
        expect(stats.avgBoost).toBe(37.5); // Average of 50% and 25% boost
        expect(stats.maxBoost).toBe(50);
        expect(stats.avgAge).toBe(75);
    });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('Edge Cases', () => {
    it('should handle zero score', () => {
        const settings = {
            enabled: true,
            mode: 'exponential',
            halfLife: 50,
            minRelevance: 0.3
        };

        const result = applyTemporalDecay(0, 50, settings);
        expect(result).toBe(0);
    });

    it('should handle very large age', () => {
        const settings = {
            enabled: true,
            mode: 'exponential',
            halfLife: 50,
            minRelevance: 0.1
        };

        const result = applyTemporalDecay(1.0, 100000, settings);
        expect(result).toBeGreaterThanOrEqual(0.1);
        expect(result).toBeLessThanOrEqual(1.0);
    });

    it('should handle string messageId (parse correctly)', () => {
        const chunks = [{
            score: 1.0,
            metadata: { source: 'chat', messageId: '50' }
        }];

        const settings = {
            enabled: true,
            mode: 'exponential',
            halfLife: 50,
            minRelevance: 0.3
        };

        const result = applyDecayToResults(chunks, '100', settings);
        expect(result[0].messageAge).toBe(50);
    });

    it('should handle missing metadata gracefully', () => {
        const chunks = [
            { score: 1.0 },
            { score: 0.9, metadata: {} },
            { score: 0.8, metadata: { source: 'chat' } }
        ];

        const settings = {
            enabled: true,
            mode: 'exponential',
            halfLife: 50,
            minRelevance: 0.3
        };

        // Should not throw
        const result = applyDecayToResults(chunks, 100, settings);
        expect(result.length).toBe(3);

        // None should have decay applied due to missing messageId
        expect(result[0].decayApplied).toBeUndefined();
        expect(result[1].decayApplied).toBeUndefined();
        expect(result[2].decayApplied).toBeUndefined();
    });
});
