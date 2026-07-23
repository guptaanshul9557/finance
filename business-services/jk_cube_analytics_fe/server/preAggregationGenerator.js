/**
 * Pre-Aggregation Generator
 * Dynamically generates Cube.js pre-aggregation definitions from screenRegistry config
 * 
 * Usage in Cube.js Schema:
 * 
 * import { generatePreAggregationsForScreen } from '../server/preAggregationGenerator.js';
 * import { screenRegistry } from '../src/config/screenRegistry.js';
 * 
 * const screen = screenRegistry.find(s => s.id === 'common_collection');
 * const preAggs = generatePreAggregationsForScreen(screen);
 * 
 * cube(`TresCollReceiptHdr`, {
 *   sql: `...`,
 *   measures: { ... },
 *   dimensions: { ... },
 *   preAggregations: preAggs
 * });
 */

/**
 * Generate Cube.js pre-aggregations from a screen's config
 * @param {Object} screen - Screen config from screenRegistry
 * @returns {Object} - Cube.js pre-aggregations object
 */
export function generatePreAggregationsForScreen(screen) {
  if (!screen || !screen.preAggregations || !screen.preAggregations.enabled) {
    return {};
  }

  const config = screen.preAggregations;
  const preAggs = {};

  // Loop through all pre-aggregation definitions in the config
  Object.keys(config).forEach((key) => {
    // Skip metadata fields
    if (key === 'enabled' || key === 'cubeName') {
      return;
    }

    const aggConfig = config[key];
    const preAgg = {
      type: aggConfig.type || 'rollup',
    };

    // Add measures
    if (aggConfig.measures && aggConfig.measures.length > 0) {
      preAgg.measures = aggConfig.measures;
    }

    // Add dimensions
    if (aggConfig.dimensions && aggConfig.dimensions.length > 0) {
      preAgg.dimensions = aggConfig.dimensions;
    }

    // Add time dimension
    if (aggConfig.timeDimension) {
      preAgg.timeDimension = aggConfig.timeDimension;
      preAgg.granularity = aggConfig.granularity || 'day';
    }

    // Add refresh key
    if (aggConfig.refreshKey) {
      preAgg.refreshKey = aggConfig.refreshKey;
    }

    // Add partition granularity
    if (aggConfig.partitionGranularity) {
      preAgg.partitionGranularity = aggConfig.partitionGranularity;
    }

    // Add build range
    if (aggConfig.buildRangeStart) {
      preAgg.buildRangeStart = aggConfig.buildRangeStart;
    }
    if (aggConfig.buildRangeEnd) {
      preAgg.buildRangeEnd = aggConfig.buildRangeEnd;
    }

    // Add indexes
    if (aggConfig.indexes) {
      preAgg.indexes = aggConfig.indexes;
    }

    preAggs[key] = preAgg;
  });

  return preAggs;
}

/**
 * Generate multiple pre-aggregations from screen registry
 * @param {Array} screens - Array of screen configs
 * @returns {Object} - Object with cube names as keys and pre-aggregations as values
 */
export function generatePreAggregationsFromRegistry(screens) {
  const preAggregations = {};

  screens.forEach((screen) => {
    if (screen.preAggregations && screen.preAggregations.enabled) {
      const cubeName = screen.preAggregations.cubeName || 'TresCollReceiptHdr';
      
      if (!preAggregations[cubeName]) {
        preAggregations[cubeName] = {};
      }

      const preAggs = generatePreAggregationsForScreen(screen);
      Object.assign(preAggregations[cubeName], preAggs);
    }
  });

  return preAggregations;
}

/**
 * Example usage in schema file:
 * 
 * // Option 1: Generate from specific screen
 * import { generatePreAggregationsForScreen } from '../server/preAggregationGenerator.js';
 * import { screenRegistry } from '../src/config/screenRegistry.js';
 * 
 * const screen = screenRegistry.find(s => s.id === 'common_collection');
 * const preAggregations = generatePreAggregationsForScreen(screen);
 * 
 * cube(`TresCollReceiptHdr`, {
 *   sql: `SELECT ...`,
 *   measures: { ... },
 *   dimensions: { ... },
 *   preAggregations: preAggregations
 * });
 * 
 * // Option 2: Generate from all screens for a specific cube
 * import { generatePreAggregationsFromRegistry } from '../server/preAggregationGenerator.js';
 * import { screenRegistry } from '../src/config/screenRegistry.js';
 * 
 * const allPreAggs = generatePreAggregationsFromRegistry(screenRegistry);
 * const preAggregations = allPreAggs['TresCollReceiptHdr'] || {};
 * 
 * cube(`TresCollReceiptHdr`, {
 *   sql: `SELECT ...`,
 *   preAggregations: preAggregations
 * });
 */

const preAggregationUtils = {
  generatePreAggregationsForScreen,
  generatePreAggregationsFromRegistry,
};

export default preAggregationUtils;
