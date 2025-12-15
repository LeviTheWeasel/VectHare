/**
 * ============================================================================
 * VECTHARE WORLD INFO INTEGRATION
 * ============================================================================
 * Enhanced integration between vectorized lorebooks and ST's world info system
 * Provides semantic activation of WI entries based on vector similarity
 *
 * @author VectHare Team
 * @version 1.0.0
 * ============================================================================
 */

import { extension_settings } from '../../../../extensions.js';
import { queryCollection } from './core-vector-api.js';
import { getCollectionMeta, isCollectionEnabled } from './collection-metadata.js';
import { buildLorebookCollectionId } from './collection-ids.js';

// ============================================================================
// WORLD INFO ACTIVATION HOOKS
// ============================================================================

/**
 * Get vectorized lorebook entries that should be activated based on semantic similarity
 * This function is called by ST's world info system to get additional entries to activate
 *
 * @param {string[]} recentMessages - Recent chat messages to use as query
 * @param {object[]} activeEntries - Currently active WI entries (from keyword matching)
 * @param {object} settings - VectHare settings
 * @returns {Promise<object[]>} Array of WI entries to activate { uid, key, content, score }
 */
export async function getSemanticWorldInfoEntries(recentMessages, activeEntries, settings) {
    if (!settings.enabled_world_info) {
        return [];
    }

    // Build search query from recent messages
    const query = recentMessages.slice(-settings.world_info_query_depth || -3).join('\n');
    if (!query.trim()) {
        return [];
    }

    console.log(`VectHare: Querying vectorized lorebooks for semantic WI activation...`);

    const semanticEntries = [];
    const threshold = settings.world_info_threshold || 0.3;
    const topK = settings.world_info_top_k || 3;

    // Get all enabled lorebook collections
    const lorebookCollections = getEnabledLorebookCollections(settings);

    for (const collection of lorebookCollections) {
        try {
            // Query this lorebook collection
            const results = await queryCollection(collection.id, query, topK, settings);

            if (results && results.metadata) {
                for (let i = 0; i < results.metadata.length; i++) {
                    const meta = results.metadata[i];
                    const score = meta.score || 0;

                    if (score >= threshold) {
                        // Extract WI entry data from metadata
                        const entry = {
                            uid: meta.uid || meta.hash,
                            key: meta.keywords || meta.entryName || [],
                            content: meta.text || '',
                            score: score,
                            lorebookName: collection.name,
                            collectionId: collection.id,
                            vectorActivated: true,
                            metadata: meta
                        };

                        semanticEntries.push(entry);
                        console.log(`VectHare: Semantic WI activation: "${entry.key}" (score: ${score.toFixed(3)})`);
                    }
                }
            }
        } catch (error) {
            console.warn(`VectHare: Failed to query lorebook collection ${collection.id}:`, error);
        }
    }

    // Sort by score descending
    semanticEntries.sort((a, b) => b.score - a.score);

    // Deduplicate with already active entries (avoid duplicates from keyword matching)
    const deduplicatedEntries = deduplicateWithActiveEntries(semanticEntries, activeEntries);

    console.log(`VectHare: Found ${deduplicatedEntries.length} semantic WI entries to activate`);
    return deduplicatedEntries;
}

/**
 * Get all enabled lorebook collections
 * @param {object} settings - VectHare settings
 * @returns {Array<{id: string, name: string}>}
 */
function getEnabledLorebookCollections(settings) {
    const collections = [];
    const collectionRegistry = settings.vecthare_collection_registry || [];

    for (const collectionId of collectionRegistry) {
        // Check if this is a lorebook collection
        if (!collectionId.includes('lorebook')) {
            continue;
        }

        // Check if collection is enabled
        if (!isCollectionEnabled(collectionId, settings)) {
            continue;
        }

        // Get collection metadata
        const meta = getCollectionMeta(collectionId);
        const name = meta?.sourceName || collectionId;

        collections.push({ id: collectionId, name });
    }

    return collections;
}

/**
 * Deduplicate semantic entries with already active entries
 * @param {object[]} semanticEntries - Entries from vector search
 * @param {object[]} activeEntries - Already active entries from keyword matching
 * @returns {object[]} Deduplicated entries
 */
function deduplicateWithActiveEntries(semanticEntries, activeEntries) {
    const activeUids = new Set(activeEntries.map(e => e.uid));
    const activeContents = new Set(activeEntries.map(e => e.content?.trim().toLowerCase()));

    return semanticEntries.filter(entry => {
        // Skip if UID already active
        if (activeUids.has(entry.uid)) {
            return false;
        }

        // Skip if content already active (fuzzy match)
        const content = entry.content?.trim().toLowerCase();
        if (content && activeContents.has(content)) {
            return false;
        }

        return true;
    });
}

// ============================================================================
// LOREBOOK VECTORIZATION HELPERS
// ============================================================================

/**
 * Check if a lorebook is already vectorized
 * @param {string} lorebookName - Name of the lorebook
 * @param {object} settings - VectHare settings
 * @returns {boolean}
 */
export function isLorebookVectorized(lorebookName, settings) {
    const collectionId = buildLorebookCollectionId(lorebookName, 'global');
    const collectionRegistry = settings.vecthare_collection_registry || [];
    return collectionRegistry.includes(collectionId);
}

/**
 * Get vectorization status for all lorebooks
 * @param {string[]} lorebookNames - Array of lorebook names
 * @param {object} settings - VectHare settings
 * @returns {Map<string, boolean>} Map of lorebook name -> is vectorized
 */
export function getLorebooksVectorizationStatus(lorebookNames, settings) {
    const statusMap = new Map();

    for (const name of lorebookNames) {
        statusMap.set(name, isLorebookVectorized(name, settings));
    }

    return statusMap;
}

/**
 * Get statistics for vectorized lorebook
 * @param {string} lorebookName - Name of the lorebook
 * @param {object} settings - VectHare settings
 * @returns {Promise<object|null>} Stats object or null if not vectorized
 */
export async function getLorebookVectorStats(lorebookName, settings) {
    const collectionId = buildLorebookCollectionId(lorebookName, 'global');
    const meta = getCollectionMeta(collectionId);

    if (!meta) {
        return null;
    }

    return {
        collectionId,
        sourceName: meta.sourceName,
        chunkCount: meta.chunkCount || 0,
        createdAt: meta.createdAt,
        enabled: isCollectionEnabled(collectionId, settings),
        strategy: meta.settings?.strategy || 'per_entry',
        scope: meta.scope || 'global',
    };
}

// ============================================================================
// WORLD INFO UI INTEGRATION
// ============================================================================

/**
 * Add vector status indicators to world info entries in the UI
 * This function can be called to enhance the WI editor UI
 *
 * @param {string} lorebookName - Name of the current lorebook
 * @param {object[]} entries - World info entries
 * @param {object} settings - VectHare settings
 * @returns {object[]} Enhanced entries with vector status
 */
export function enhanceWorldInfoEntriesUI(lorebookName, entries, settings) {
    const isVectorized = isLorebookVectorized(lorebookName, settings);

    if (!isVectorized) {
        return entries;
    }

    // Add vector status to each entry
    return entries.map(entry => ({
        ...entry,
        vectorized: true,
        vectorStatus: {
            isVectorized: true,
            canUseSemanticActivation: true,
            lorebookVectorized: isVectorized
        }
    }));
}

// ============================================================================
// EXPORT FOR ST INTEGRATION
// ============================================================================

/**
 * Initialize world info integration hooks
 * This should be called when VectHare loads
 */
export function initializeWorldInfoIntegration() {
    // Make functions available globally for ST to call
    window.VectHare_WorldInfo = {
        getSemanticEntries: getSemanticWorldInfoEntries,
        isLorebookVectorized: isLorebookVectorized,
        getVectorizationStatus: getLorebooksVectorizationStatus,
        getVectorStats: getLorebookVectorStats,
        enhanceEntriesUI: enhanceWorldInfoEntriesUI
    };

    console.log('VectHare: World Info integration hooks initialized');
}
