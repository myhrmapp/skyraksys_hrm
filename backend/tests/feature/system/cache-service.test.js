/**
 * CacheService Tests
 * 
 * Tests for in-memory caching with TTL support
 */

const { CacheService, resetCacheInstance } = require('../../../services/CacheService');

describe('CacheService', () => {
    let cache;

    beforeEach(() => {
        // Reset singleton between tests
        resetCacheInstance();
        cache = new CacheService({ defaultTTL: 5, cleanupInterval: 1000 });
    });

    afterEach(async () => {
        if (cache) {
            await cache.shutdown();
        }
    });

    describe('Basic Operations', () => {
        test('should set and get a value', async () => {
            await cache.set('test-key', { data: 'test-value' }, 60);
            const result = await cache.get('test-key');
            
            expect(result).toEqual({ data: 'test-value' });
        });

        test('should return null for non-existent key', async () => {
            const result = await cache.get('non-existent');
            expect(result).toBeNull();
        });

        test('should delete a key', async () => {
            await cache.set('test-key', { data: 'test' }, 60);
            const deleted = cache.delete('test-key');
            const result = await cache.get('test-key');
            
            expect(deleted).toBe(true);
            expect(result).toBeNull();
        });

        test('should check if key exists', async () => {
            await cache.set('test-key', { data: 'test' }, 60);
            
            const exists = await cache.has('test-key');
            const notExists = await cache.has('non-existent');
            
            expect(exists).toBe(true);
            expect(notExists).toBe(false);
        });

        test('should clear all entries', async () => {
            await cache.set('key1', 'value1', 60);
            await cache.set('key2', 'value2', 60);
            await cache.set('key3', 'value3', 60);
            
            await cache.clear();
            
            const result1 = await cache.get('key1');
            const result2 = await cache.get('key2');
            const result3 = await cache.get('key3');
            
            expect(result1).toBeNull();
            expect(result2).toBeNull();
            expect(result3).toBeNull();
        });
    });

    describe('TTL (Time To Live)', () => {
        test('should expire entry after TTL', async () => {
            await cache.set('test-key', { data: 'test' }, 1); // 1 second TTL
            
            // Should exist immediately
            let result = await cache.get('test-key');
            expect(result).toEqual({ data: 'test' });
            
            // Wait for expiration
            await new Promise(resolve => setTimeout(resolve, 1100));
            
            // Should be expired
            result = await cache.get('test-key');
            expect(result).toBeNull();
        });

        test('should use default TTL when not specified', async () => {
            await cache.set('test-key', { data: 'test' }); // Uses defaultTTL (5 seconds)
            
            const ttl = await cache.getTTL('test-key');
            expect(ttl).toBeGreaterThan(0);
            expect(ttl).toBeLessThanOrEqual(5);
        });

        test('should get remaining TTL', async () => {
            await cache.set('test-key', { data: 'test' }, 10);
            
            const ttl = await cache.getTTL('test-key');
            expect(ttl).toBeGreaterThan(8);
            expect(ttl).toBeLessThanOrEqual(10);
        });

        test('should return null TTL for non-existent key', async () => {
            const ttl = await cache.getTTL('non-existent');
            expect(ttl).toBeNull();
        });
    });

    describe('Pattern Invalidation', () => {
        test('should invalidate keys by wildcard pattern', async () => {
            await cache.set('user:1', 'data1', 60);
            await cache.set('user:2', 'data2', 60);
            await cache.set('user:3', 'data3', 60);
            await cache.set('product:1', 'data4', 60);
            
            const deleted = await cache.invalidate('user:*');
            
            expect(deleted).toBe(3);
            expect(await cache.get('user:1')).toBeNull();
            expect(await cache.get('user:2')).toBeNull();
            expect(await cache.get('user:3')).toBeNull();
            expect(await cache.get('product:1')).toEqual('data4');
        });

        test('should support single character wildcard', async () => {
            await cache.set('user1', 'data1', 60);
            await cache.set('user2', 'data2', 60);
            await cache.set('user10', 'data3', 60);
            
            const deleted = await cache.invalidate('user?');
            
            expect(deleted).toBe(2); // Only matches user1 and user2
            expect(await cache.get('user10')).toEqual('data3');
        });

        test('should invalidate all with global wildcard', async () => {
            await cache.set('key1', 'data1', 60);
            await cache.set('key2', 'data2', 60);
            await cache.set('key3', 'data3', 60);
            
            const deleted = await cache.invalidate('*');
            
            expect(deleted).toBe(3);
            expect(await cache.get('key1')).toBeNull();
        });
    });

    describe('getOrSet Pattern', () => {
        test('should fetch and cache on cache miss', async () => {
            const fetchFn = jest.fn().mockResolvedValue({ data: 'fetched-data' });
            
            const result = await cache.getOrSet('test-key', fetchFn, 60);
            
            expect(result).toEqual({ data: 'fetched-data' });
            expect(fetchFn).toHaveBeenCalledTimes(1);
            
            // Verify it was cached
            const cached = await cache.get('test-key');
            expect(cached).toEqual({ data: 'fetched-data' });
        });

        test('should return cached value on cache hit', async () => {
            const fetchFn = jest.fn().mockResolvedValue({ data: 'fetched-data' });
            
            // First call - cache miss
            await cache.getOrSet('test-key', fetchFn, 60);
            
            // Second call - cache hit
            const result = await cache.getOrSet('test-key', fetchFn, 60);
            
            expect(result).toEqual({ data: 'fetched-data' });
            expect(fetchFn).toHaveBeenCalledTimes(1); // Should only be called once
        });

        test('should not cache null or undefined values', async () => {
            const fetchFn1 = jest.fn().mockResolvedValue(null);
            const fetchFn2 = jest.fn().mockResolvedValue(undefined);
            
            const result1 = await cache.getOrSet('null-key', fetchFn1, 60);
            const result2 = await cache.getOrSet('undefined-key', fetchFn2, 60);
            
            expect(result1).toBeNull();
            expect(result2).toBeUndefined();
            
            // Verify not cached
            expect(await cache.has('null-key')).toBe(false);
            expect(await cache.has('undefined-key')).toBe(false);
        });

        test('should propagate fetch function errors', async () => {
            const fetchFn = jest.fn().mockRejectedValue(new Error('Fetch failed'));
            
            await expect(cache.getOrSet('test-key', fetchFn, 60))
                .rejects.toThrow('Fetch failed');
        });
    });

    describe('Memory Management', () => {
        test('should enforce max size limit', async () => {
            const smallCache = new CacheService({ maxSize: 3 });
            
            await smallCache.set('key1', 'value1', 60);
            await smallCache.set('key2', 'value2', 60);
            await smallCache.set('key3', 'value3', 60);
            await smallCache.set('key4', 'value4', 60); // Should evict key1
            
            const stats = smallCache.getStats();
            expect(stats.totalEntries).toBeLessThanOrEqual(3);
            
            await smallCache.shutdown();
        });

        test('should provide cache statistics', async () => {
            await cache.set('key1', 'value1', 60);
            await cache.set('key2', 'value2', 1); // Short TTL
            await cache.set('key3', 'value3', 60);
            
            // Stats before expiration
            let stats = cache.getStats();
            expect(stats.totalEntries).toBe(3);
            expect(stats.validEntries).toBe(3);
            
            // Wait for expiration (but before cleanup)
            await new Promise(resolve => setTimeout(resolve, 1100));
            
            // After expiration (before cleanup removes it)
            stats = cache.getStats();
            expect(stats.totalEntries).toBeGreaterThanOrEqual(2); // May be 2 or 3 depending on cleanup timing
            expect(stats.maxSize).toBeDefined();
        });

        test('should prevent mutation of cached values', async () => {
            const original = { data: 'original', nested: { value: 'test' } };
            await cache.set('test-key', original, 60);
            
            // Modify the original object
            original.data = 'modified';
            original.nested.value = 'changed';
            
            // Cached value should be unchanged
            const cached = await cache.get('test-key');
            expect(cached.data).toBe('original');
            expect(cached.nested.value).toBe('test');
            
            // Modify the cached result
            cached.data = 'mutated';
            
            // Get again - should still be original
            const cached2 = await cache.get('test-key');
            expect(cached2.data).toBe('original');
        });
    });

    describe('Cleanup', () => {
        test('should automatically cleanup expired entries', async () => {
            const quickCleanupCache = new CacheService({ 
                defaultTTL: 5, 
                cleanupInterval: 500 
            });
            
            await quickCleanupCache.set('key1', 'value1', 1);
            await quickCleanupCache.set('key2', 'value2', 60);
            
            // Wait for expiration + cleanup
            await new Promise(resolve => setTimeout(resolve, 1600));
            
            const stats = quickCleanupCache.getStats();
            expect(stats.expiredEntries).toBe(0); // Should be cleaned up
            expect(stats.validEntries).toBe(1);
            
            await quickCleanupCache.shutdown();
        });

        test('should stop cleanup on shutdown', async () => {
            cache.stopCleanup();
            expect(cache.cleanupTimer).toBeNull();
        });
    });
});
