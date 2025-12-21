/**
 * Utility Functions Tests
 * Tests for async utilities and data structures
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AsyncUtils from '../utils/async-utils.js';
import {
    LRUCache,
    Queue,
    PriorityQueue,
    CircularBuffer,
    Trie,
    BloomFilter,
    BiMap,
    SetOps
} from '../utils/data-structures.js';

// =============================================================================
// ASYNC UTILS TESTS
// =============================================================================

describe('AsyncUtils', () => {
    describe('sleep', () => {
        it('should resolve after specified time', async () => {
            const start = Date.now();
            await AsyncUtils.sleep(50);
            const elapsed = Date.now() - start;
            expect(elapsed).toBeGreaterThanOrEqual(45); // Allow small variance
        });

        it('should return a promise', () => {
            const result = AsyncUtils.sleep(0);
            expect(result).toBeInstanceOf(Promise);
        });
    });

    describe('retry', () => {
        it('should return result on first success', async () => {
            const fn = vi.fn().mockResolvedValue('success');
            const result = await AsyncUtils.retry(fn);
            expect(result).toBe('success');
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('should retry on failure', async () => {
            const fn = vi.fn()
                .mockRejectedValueOnce(new Error('fail'))
                .mockRejectedValueOnce(new Error('fail'))
                .mockResolvedValue('success');

            const result = await AsyncUtils.retry(fn, {
                maxAttempts: 3,
                delay: 10
            });

            expect(result).toBe('success');
            expect(fn).toHaveBeenCalledTimes(3);
        });

        it('should throw after max attempts', async () => {
            const fn = vi.fn().mockRejectedValue(new Error('always fails'));

            await expect(AsyncUtils.retry(fn, {
                maxAttempts: 2,
                delay: 10
            })).rejects.toThrow('always fails');

            expect(fn).toHaveBeenCalledTimes(2);
        });

        it('should call onRetry callback', async () => {
            const onRetry = vi.fn();
            const fn = vi.fn()
                .mockRejectedValueOnce(new Error('fail'))
                .mockResolvedValue('success');

            await AsyncUtils.retry(fn, {
                maxAttempts: 3,
                delay: 10,
                onRetry
            });

            expect(onRetry).toHaveBeenCalledTimes(1);
            expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
        });

        it('should respect shouldRetry callback', async () => {
            const fn = vi.fn().mockRejectedValue(new Error('no retry'));
            const shouldRetry = vi.fn().mockReturnValue(false);

            await expect(AsyncUtils.retry(fn, {
                maxAttempts: 3,
                delay: 10,
                shouldRetry
            })).rejects.toThrow('no retry');

            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('should apply exponential backoff', async () => {
            const fn = vi.fn()
                .mockRejectedValueOnce(new Error('fail'))
                .mockResolvedValue('success');

            const start = Date.now();
            await AsyncUtils.retry(fn, {
                maxAttempts: 2,
                delay: 50,
                backoffFactor: 2
            });
            const elapsed = Date.now() - start;

            // First retry should wait 50ms
            expect(elapsed).toBeGreaterThanOrEqual(40);
        });
    });

    describe('timeout', () => {
        it('should resolve if promise completes in time', async () => {
            const promise = Promise.resolve('done');
            const result = await AsyncUtils.timeout(promise, 100);
            expect(result).toBe('done');
        });

        it('should reject if promise exceeds timeout', async () => {
            const promise = AsyncUtils.sleep(200).then(() => 'done');

            await expect(AsyncUtils.timeout(promise, 50))
                .rejects.toThrow('Operation timed out');
        });

        it('should use custom error message', async () => {
            const promise = AsyncUtils.sleep(200);

            await expect(AsyncUtils.timeout(promise, 50, 'Custom timeout'))
                .rejects.toThrow('Custom timeout');
        });
    });

    describe('sequential', () => {
        it('should execute functions in order', async () => {
            const order = [];
            const fns = [
                async (val) => { order.push(1); return val + 1; },
                async (val) => { order.push(2); return val + 2; },
                async (val) => { order.push(3); return val + 3; }
            ];

            const result = await AsyncUtils.sequential(fns, 0);

            expect(result).toBe(6);
            expect(order).toEqual([1, 2, 3]);
        });

        it('should pass result to next function', async () => {
            const fns = [
                async (val) => val * 2,
                async (val) => val + 10
            ];

            const result = await AsyncUtils.sequential(fns, 5);
            expect(result).toBe(20); // (5 * 2) + 10
        });
    });

    describe('parallel', () => {
        it('should execute functions concurrently', async () => {
            const fns = [
                async () => 1,
                async () => 2,
                async () => 3
            ];

            const results = await AsyncUtils.parallel(fns);
            expect(results).toEqual([1, 2, 3]);
        });

        it('should respect concurrency limit', async () => {
            let concurrent = 0;
            let maxConcurrent = 0;

            const fns = Array(10).fill(null).map(() => async () => {
                concurrent++;
                maxConcurrent = Math.max(maxConcurrent, concurrent);
                await AsyncUtils.sleep(20);
                concurrent--;
                return 1;
            });

            await AsyncUtils.parallel(fns, 3);

            expect(maxConcurrent).toBeLessThanOrEqual(3);
        });
    });

    describe('rateLimiter', () => {
        afterEach(() => {
            vi.useRealTimers();
        });

        it('should allow calls up to limit', async () => {
            const limiter = AsyncUtils.rateLimiter(3, 1000);
            const fn = vi.fn().mockResolvedValue('ok');

            await limiter.execute(fn);
            await limiter.execute(fn);
            await limiter.execute(fn);

            expect(fn).toHaveBeenCalledTimes(3);

            limiter.destroy();
        });

        it('should have destroy method', () => {
            const limiter = AsyncUtils.rateLimiter(3, 1000);
            expect(typeof limiter.destroy).toBe('function');
            limiter.destroy();
        });
    });

    describe('batch', () => {
        it('should process items in batches', async () => {
            const items = [1, 2, 3, 4, 5];
            const processor = vi.fn().mockImplementation(batch => batch.map(x => x * 2));

            const results = await AsyncUtils.batch(items, processor, {
                batchSize: 2
            });

            expect(results).toEqual([2, 4, 6, 8, 10]);
            expect(processor).toHaveBeenCalledTimes(3); // 2 + 2 + 1
        });

        it('should call onProgress callback', async () => {
            const items = [1, 2, 3, 4];
            const onProgress = vi.fn();
            const processor = batch => batch.map(x => x * 2);

            await AsyncUtils.batch(items, processor, {
                batchSize: 2,
                onProgress
            });

            expect(onProgress).toHaveBeenCalledWith(2, 4);
            expect(onProgress).toHaveBeenCalledWith(4, 4);
        });
    });

    describe('memoize', () => {
        it('should cache results', async () => {
            const fn = vi.fn().mockResolvedValue('result');
            const memoized = AsyncUtils.memoize(fn);

            await memoized('arg1');
            await memoized('arg1');

            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('should cache different arguments separately', async () => {
            const fn = vi.fn().mockImplementation(async (x) => x * 2);
            const memoized = AsyncUtils.memoize(fn);

            const result1 = await memoized(5);
            const result2 = await memoized(10);
            const result3 = await memoized(5);

            expect(result1).toBe(10);
            expect(result2).toBe(20);
            expect(result3).toBe(10);
            expect(fn).toHaveBeenCalledTimes(2);
        });

        it('should respect TTL', async () => {
            const fn = vi.fn().mockResolvedValue('result');
            const memoized = AsyncUtils.memoize(fn, { ttl: 50 });

            await memoized('arg');
            await AsyncUtils.sleep(60);
            await memoized('arg');

            expect(fn).toHaveBeenCalledTimes(2);
        });
    });

    describe('poll', () => {
        it('should poll until condition is met', async () => {
            let counter = 0;
            const fn = vi.fn().mockImplementation(() => ++counter);
            const condition = (result) => result >= 3;

            const result = await AsyncUtils.poll(fn, condition, {
                interval: 10,
                maxAttempts: 10
            });

            expect(result).toBe(3);
            expect(fn).toHaveBeenCalledTimes(3);
        });

        it('should throw after max attempts', async () => {
            const fn = vi.fn().mockResolvedValue('never');
            const condition = () => false;

            await expect(AsyncUtils.poll(fn, condition, {
                interval: 10,
                maxAttempts: 3
            })).rejects.toThrow('Polling max attempts exceeded');
        });
    });

    describe('map', () => {
        it('should map array with async function', async () => {
            const result = await AsyncUtils.map([1, 2, 3], async (x) => x * 2);
            expect(result).toEqual([2, 4, 6]);
        });

        it('should preserve order with concurrency limit', async () => {
            const result = await AsyncUtils.map(
                [100, 50, 10],
                async (ms) => {
                    await AsyncUtils.sleep(ms);
                    return ms;
                },
                2
            );

            // Results should be in original order despite different delays
            expect(result).toEqual([100, 50, 10]);
        });
    });

    describe('filter', () => {
        it('should filter with async predicate', async () => {
            const result = await AsyncUtils.filter(
                [1, 2, 3, 4, 5],
                async (x) => x % 2 === 0
            );
            expect(result).toEqual([2, 4]);
        });
    });

    describe('reduce', () => {
        it('should reduce with async reducer', async () => {
            const result = await AsyncUtils.reduce(
                [1, 2, 3, 4],
                async (acc, val) => acc + val,
                0
            );
            expect(result).toBe(10);
        });
    });

    describe('allSettled', () => {
        it('should separate fulfilled and rejected', async () => {
            const promises = [
                Promise.resolve('a'),
                Promise.reject(new Error('b')),
                Promise.resolve('c')
            ];

            const { results, errors } = await AsyncUtils.allSettled(promises);

            expect(results).toEqual([
                { index: 0, value: 'a' },
                { index: 2, value: 'c' }
            ]);
            expect(errors).toHaveLength(1);
            expect(errors[0].index).toBe(1);
        });
    });
});

// =============================================================================
// LRU CACHE TESTS
// =============================================================================

describe('LRUCache', () => {
    let cache;

    beforeEach(() => {
        cache = new LRUCache(3);
    });

    describe('basic operations', () => {
        it('should set and get values', () => {
            cache.set('a', 1);
            expect(cache.get('a')).toBe(1);
        });

        it('should return undefined for missing keys', () => {
            expect(cache.get('missing')).toBeUndefined();
        });

        it('should check if key exists', () => {
            cache.set('a', 1);
            expect(cache.has('a')).toBe(true);
            expect(cache.has('b')).toBe(false);
        });

        it('should delete keys', () => {
            cache.set('a', 1);
            expect(cache.delete('a')).toBe(true);
            expect(cache.has('a')).toBe(false);
        });

        it('should clear all items', () => {
            cache.set('a', 1);
            cache.set('b', 2);
            cache.clear();
            expect(cache.size).toBe(0);
        });
    });

    describe('LRU eviction', () => {
        it('should evict least recently used item when at capacity', () => {
            cache.set('a', 1);
            cache.set('b', 2);
            cache.set('c', 3);
            cache.set('d', 4); // Should evict 'a'

            expect(cache.has('a')).toBe(false);
            expect(cache.has('b')).toBe(true);
            expect(cache.has('c')).toBe(true);
            expect(cache.has('d')).toBe(true);
        });

        it('should update LRU order on get', () => {
            cache.set('a', 1);
            cache.set('b', 2);
            cache.set('c', 3);
            cache.get('a'); // Access 'a', making it most recent
            cache.set('d', 4); // Should evict 'b' (not 'a')

            expect(cache.has('a')).toBe(true);
            expect(cache.has('b')).toBe(false);
        });

        it('should update LRU order on set of existing key', () => {
            cache.set('a', 1);
            cache.set('b', 2);
            cache.set('c', 3);
            cache.set('a', 10); // Update 'a', making it most recent
            cache.set('d', 4); // Should evict 'b'

            expect(cache.has('a')).toBe(true);
            expect(cache.get('a')).toBe(10);
            expect(cache.has('b')).toBe(false);
        });
    });

    describe('utility methods', () => {
        it('should return correct size', () => {
            expect(cache.size).toBe(0);
            cache.set('a', 1);
            expect(cache.size).toBe(1);
            cache.set('b', 2);
            expect(cache.size).toBe(2);
        });

        it('should return all keys', () => {
            cache.set('a', 1);
            cache.set('b', 2);
            expect(cache.keys()).toContain('a');
            expect(cache.keys()).toContain('b');
        });

        it('should return all values', () => {
            cache.set('a', 1);
            cache.set('b', 2);
            expect(cache.values()).toContain(1);
            expect(cache.values()).toContain(2);
        });
    });
});

// =============================================================================
// QUEUE TESTS
// =============================================================================

describe('Queue', () => {
    let queue;

    beforeEach(() => {
        queue = new Queue();
    });

    it('should enqueue and dequeue in FIFO order', () => {
        queue.enqueue(1);
        queue.enqueue(2);
        queue.enqueue(3);

        expect(queue.dequeue()).toBe(1);
        expect(queue.dequeue()).toBe(2);
        expect(queue.dequeue()).toBe(3);
    });

    it('should return undefined when dequeuing empty queue', () => {
        expect(queue.dequeue()).toBeUndefined();
    });

    it('should peek without removing', () => {
        queue.enqueue(1);
        queue.enqueue(2);

        expect(queue.peek()).toBe(1);
        expect(queue.peek()).toBe(1);
        expect(queue.size).toBe(2);
    });

    it('should report isEmpty correctly', () => {
        expect(queue.isEmpty()).toBe(true);
        queue.enqueue(1);
        expect(queue.isEmpty()).toBe(false);
    });

    it('should enqueue many items', () => {
        queue.enqueueMany([1, 2, 3]);
        expect(queue.size).toBe(3);
        expect(queue.toArray()).toEqual([1, 2, 3]);
    });

    it('should clear all items', () => {
        queue.enqueue(1);
        queue.enqueue(2);
        queue.clear();
        expect(queue.isEmpty()).toBe(true);
    });
});

// =============================================================================
// PRIORITY QUEUE TESTS
// =============================================================================

describe('PriorityQueue', () => {
    it('should dequeue in priority order (ascending)', () => {
        const pq = new PriorityQueue();
        pq.enqueue(3);
        pq.enqueue(1);
        pq.enqueue(2);

        expect(pq.dequeue()).toBe(1);
        expect(pq.dequeue()).toBe(2);
        expect(pq.dequeue()).toBe(3);
    });

    it('should use custom comparator', () => {
        const pq = new PriorityQueue((a, b) => b - a); // Descending
        pq.enqueue(1);
        pq.enqueue(3);
        pq.enqueue(2);

        expect(pq.dequeue()).toBe(3);
        expect(pq.dequeue()).toBe(2);
        expect(pq.dequeue()).toBe(1);
    });

    it('should peek highest priority', () => {
        const pq = new PriorityQueue();
        pq.enqueue(3);
        pq.enqueue(1);

        expect(pq.peek()).toBe(1);
        expect(pq.size).toBe(2);
    });
});

// =============================================================================
// CIRCULAR BUFFER TESTS
// =============================================================================

describe('CircularBuffer', () => {
    let buffer;

    beforeEach(() => {
        buffer = new CircularBuffer(3);
    });

    it('should add items up to capacity', () => {
        buffer.push(1);
        buffer.push(2);
        buffer.push(3);

        expect(buffer.size).toBe(3);
        expect(buffer.isFull()).toBe(true);
    });

    it('should overwrite oldest when full', () => {
        buffer.push(1);
        buffer.push(2);
        buffer.push(3);
        const overwritten = buffer.push(4);

        expect(overwritten).toBe(1);
        expect(buffer.toArray()).toEqual([2, 3, 4]);
    });

    it('should get items by index', () => {
        buffer.push('a');
        buffer.push('b');
        buffer.push('c');

        expect(buffer.get(0)).toBe('a'); // Oldest
        expect(buffer.get(2)).toBe('c'); // Newest
    });

    it('should peek most recent item', () => {
        buffer.push('a');
        buffer.push('b');

        expect(buffer.peek()).toBe('b');
    });

    it('should return undefined for out of range index', () => {
        buffer.push(1);
        expect(buffer.get(-1)).toBeUndefined();
        expect(buffer.get(10)).toBeUndefined();
    });

    it('should clear correctly', () => {
        buffer.push(1);
        buffer.push(2);
        buffer.clear();

        expect(buffer.isEmpty()).toBe(true);
        expect(buffer.size).toBe(0);
    });
});

// =============================================================================
// TRIE TESTS
// =============================================================================

describe('Trie', () => {
    let trie;

    beforeEach(() => {
        trie = new Trie();
    });

    it('should insert and search words', () => {
        trie.insert('hello');
        trie.insert('world');

        expect(trie.search('hello')).toBe(true);
        expect(trie.search('world')).toBe(true);
        expect(trie.search('hell')).toBe(false);
        expect(trie.search('missing')).toBe(false);
    });

    it('should check prefix existence', () => {
        trie.insert('hello');

        expect(trie.startsWith('he')).toBe(true);
        expect(trie.startsWith('hel')).toBe(true);
        expect(trie.startsWith('hello')).toBe(true);
        expect(trie.startsWith('helloworld')).toBe(false);
        expect(trie.startsWith('wo')).toBe(false);
    });

    it('should get all words with prefix', () => {
        trie.insert('hello');
        trie.insert('help');
        trie.insert('helper');
        trie.insert('world');

        const results = trie.getAllWithPrefix('hel');

        expect(results).toContain('hello');
        expect(results).toContain('help');
        expect(results).toContain('helper');
        expect(results).not.toContain('world');
    });

    it('should delete words', () => {
        trie.insert('hello');
        trie.insert('help');

        expect(trie.delete('hello')).toBe(true);
        expect(trie.search('hello')).toBe(false);
        expect(trie.search('help')).toBe(true);
    });

    it('should return false when deleting non-existent word', () => {
        expect(trie.delete('missing')).toBe(false);
    });
});

// =============================================================================
// BLOOM FILTER TESTS
// =============================================================================

describe('BloomFilter', () => {
    it('should add and check items', () => {
        const bloom = new BloomFilter(1000, 3);

        bloom.add('hello');
        bloom.add('world');

        expect(bloom.has('hello')).toBe(true);
        expect(bloom.has('world')).toBe(true);
    });

    it('should return false for items not added (mostly)', () => {
        const bloom = new BloomFilter(1000, 3);

        bloom.add('hello');

        // These should be false (with very high probability)
        expect(bloom.has('goodbye')).toBe(false);
        expect(bloom.has('random')).toBe(false);
    });

    it('should clear filter', () => {
        const bloom = new BloomFilter(100, 3);

        bloom.add('hello');
        expect(bloom.has('hello')).toBe(true);

        bloom.clear();
        expect(bloom.has('hello')).toBe(false);
    });

    it('should have configurable false positive rate', () => {
        // Larger size and more hash functions = fewer false positives
        const largeBlooom = new BloomFilter(10000, 7);
        const smallBloom = new BloomFilter(10, 1);

        // Add some items
        largeBlooom.add('test1');
        largeBlooom.add('test2');
        smallBloom.add('test1');
        smallBloom.add('test2');

        // Small bloom filter with few bits is more likely to have false positives
        // This is a probabilistic test, so we just check basic functionality
        expect(largeBlooom.has('test1')).toBe(true);
        expect(smallBloom.has('test1')).toBe(true);
    });
});

// =============================================================================
// BIMAP TESTS
// =============================================================================

describe('BiMap', () => {
    let bimap;

    beforeEach(() => {
        bimap = new BiMap();
    });

    it('should set and get by key', () => {
        bimap.set('a', 1);
        expect(bimap.get('a')).toBe(1);
    });

    it('should get key by value', () => {
        bimap.set('a', 1);
        expect(bimap.getKey(1)).toBe('a');
    });

    it('should check existence by key and value', () => {
        bimap.set('a', 1);

        expect(bimap.has('a')).toBe(true);
        expect(bimap.has('b')).toBe(false);
        expect(bimap.hasValue(1)).toBe(true);
        expect(bimap.hasValue(2)).toBe(false);
    });

    it('should handle overwriting keys', () => {
        bimap.set('a', 1);
        bimap.set('a', 2);

        expect(bimap.get('a')).toBe(2);
        expect(bimap.getKey(1)).toBeUndefined();
        expect(bimap.getKey(2)).toBe('a');
    });

    it('should handle overwriting values', () => {
        bimap.set('a', 1);
        bimap.set('b', 1);

        expect(bimap.get('a')).toBeUndefined();
        expect(bimap.get('b')).toBe(1);
        expect(bimap.getKey(1)).toBe('b');
    });

    it('should delete by key', () => {
        bimap.set('a', 1);
        bimap.delete('a');

        expect(bimap.has('a')).toBe(false);
        expect(bimap.hasValue(1)).toBe(false);
    });

    it('should delete by value', () => {
        bimap.set('a', 1);
        bimap.deleteValue(1);

        expect(bimap.has('a')).toBe(false);
        expect(bimap.hasValue(1)).toBe(false);
    });
});

// =============================================================================
// SET OPERATIONS TESTS
// =============================================================================

describe('SetOps', () => {
    const setA = new Set([1, 2, 3]);
    const setB = new Set([2, 3, 4]);

    it('should compute union', () => {
        const result = SetOps.union(setA, setB);
        expect([...result].sort()).toEqual([1, 2, 3, 4]);
    });

    it('should compute intersection', () => {
        const result = SetOps.intersection(setA, setB);
        expect([...result].sort()).toEqual([2, 3]);
    });

    it('should compute difference', () => {
        const result = SetOps.difference(setA, setB);
        expect([...result]).toEqual([1]);
    });

    it('should compute symmetric difference', () => {
        const result = SetOps.symmetricDifference(setA, setB);
        expect([...result].sort()).toEqual([1, 4]);
    });

    it('should check subset', () => {
        const subset = new Set([2, 3]);
        expect(SetOps.isSubset(subset, setA)).toBe(true);
        expect(SetOps.isSubset(setA, subset)).toBe(false);
    });

    it('should check superset', () => {
        const subset = new Set([2, 3]);
        expect(SetOps.isSuperset(setA, subset)).toBe(true);
        expect(SetOps.isSuperset(subset, setA)).toBe(false);
    });

    it('should check disjoint', () => {
        const disjointSet = new Set([5, 6]);
        expect(SetOps.isDisjoint(setA, disjointSet)).toBe(true);
        expect(SetOps.isDisjoint(setA, setB)).toBe(false);
    });
});
