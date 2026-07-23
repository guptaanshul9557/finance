// Alternative Refresh Implementation
// This provides different strategies for implementing manual refresh in Cube.js

// ============================================================
// STRATEGY 1: Cache Invalidation (Current Implementation)
// ============================================================
// Pros: Forces complete refresh of all data
// Cons: Clears entire cache, potentially affecting other queries
const handleManualRefresh_CacheInvalidation = async () => {
  console.log('🔄 Manual refresh triggered (Cache Invalidation)');
  setRefreshing(true);
  
  try {
    // Invalidate entire Cube.js cache
    await cubejsApi.invalidateCache();
    console.log('✅ Cache invalidated');
    
    // Reload all data
    await Promise.all([
      fetchHeaderKPIs(),
      fetchChartData(),
      fetchDepartmentWiseCollection(),
      fetchBodySectionsData(),
      fetchBodyKPIs(),
      Object.keys(filterValues).length > 0 ? fetchTableData() : Promise.resolve()
    ]);
    
    console.log('✅ Manual refresh completed');
  } catch (error) {
    console.error('❌ Error during manual refresh:', error);
    alert('Failed to refresh data. Please try again.');
  } finally {
    setRefreshing(false);
  }
};

// ============================================================
// STRATEGY 2: Unique Cache Key (Per-Query Refresh)
// ============================================================
// Pros: Only refreshes specific queries, doesn't affect other cached data
// Cons: Requires modifying each fetch function to accept a cache key
const handleManualRefresh_CacheKey = async () => {
  console.log('🔄 Manual refresh triggered (Cache Key)');
  setRefreshing(true);
  
  try {
    // Generate unique cache key using timestamp
    const cacheKey = `manual-refresh-${Date.now()}`;
    console.log('✅ Using cache key:', cacheKey);
    
    // Pass cache key to each fetch function
    // Note: You would need to modify each fetch function to accept and use this parameter
    await Promise.all([
      fetchHeaderKPIsWithCacheKey(cacheKey),
      fetchChartDataWithCacheKey(cacheKey),
      fetchDepartmentWiseCollectionWithCacheKey(cacheKey),
      fetchBodySectionsDataWithCacheKey(cacheKey),
      fetchBodyKPIsWithCacheKey(cacheKey),
      Object.keys(filterValues).length > 0 ? fetchTableDataWithCacheKey(cacheKey) : Promise.resolve()
    ]);
    
    console.log('✅ Manual refresh completed');
  } catch (error) {
    console.error('❌ Error during manual refresh:', error);
    alert('Failed to refresh data. Please try again.');
  } finally {
    setRefreshing(false);
  }
};

// Example of modified fetch function that accepts cache key
const fetchHeaderKPIsWithCacheKey = async (cacheKey = null) => {
  if (!screenConfig || !screenConfig.kpis || screenConfig.kpis.length === 0) return;

  try {
    const [startYear, endYear] = selectedYear.split('-');
    const kpiResults = {};

    for (const kpi of screenConfig.kpis) {
      let query = {
        measures: [kpi.measure],
      };

      if (kpi.timeDimension) {
        if (kpi.isTodayBased) {
          const today = new Date();
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          query.timeDimensions = [
            {
              dimension: kpi.timeDimension,
              dateRange: [todayStr, todayStr],
            },
          ];
        } else {
          query.timeDimensions = [
            {
              dimension: kpi.timeDimension,
              dateRange: [`${startYear}-04-01`, `${endYear}-03-31`],
            },
          ];
        }
      }

      // Add unique cache key if provided
      if (cacheKey) {
        query = {
          ...query,
          renewQuery: true, // Force Cube.js to bypass cache
          cacheKey: cacheKey // Optional: for tracking
        };
      }

      const resultSet = await cubejsApi.load(query);
      const data = resultSet.tablePivot();
      kpiResults[kpi.id] = data[0]?.[kpi.measure] || 0;
    }

    setHeaderKPIs(kpiResults);
  } catch (error) {
    console.error('❌ Error fetching header KPIs:', error);
  }
};

// ============================================================
// STRATEGY 3: renewQuery Parameter (Best Practice)
// ============================================================
// Pros: Built-in Cube.js feature, clean and efficient
// Cons: None - this is the recommended approach
const handleManualRefresh_RenewQuery = async () => {
  console.log('🔄 Manual refresh triggered (renewQuery)');
  setRefreshing(true);
  
  try {
    // Set a flag to force query renewal
    const refreshOptions = { renewQuery: true };
    
    // Reload all data with renewQuery flag
    // Note: You would need to modify fetch functions to accept this option
    await Promise.all([
      fetchHeaderKPIs(refreshOptions),
      fetchChartData(refreshOptions),
      fetchDepartmentWiseCollection(refreshOptions),
      fetchBodySectionsData(refreshOptions),
      fetchBodyKPIs(refreshOptions),
      Object.keys(filterValues).length > 0 ? fetchTableData(false, refreshOptions) : Promise.resolve()
    ]);
    
    console.log('✅ Manual refresh completed');
  } catch (error) {
    console.error('❌ Error during manual refresh:', error);
    alert('Failed to refresh data. Please try again.');
  } finally {
    setRefreshing(false);
  }
};

// Example of modified fetch function that uses renewQuery
const fetchHeaderKPIsWithRenewQuery = async (options = {}) => {
  if (!screenConfig || !screenConfig.kpis || screenConfig.kpis.length === 0) return;

  try {
    const [startYear, endYear] = selectedYear.split('-');
    const kpiResults = {};

    for (const kpi of screenConfig.kpis) {
      let query = {
        measures: [kpi.measure],
        renewQuery: options.renewQuery || false, // Use renewQuery option
      };

      if (kpi.timeDimension) {
        if (kpi.isTodayBased) {
          const today = new Date();
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          query.timeDimensions = [
            {
              dimension: kpi.timeDimension,
              dateRange: [todayStr, todayStr],
            },
          ];
        } else {
          query.timeDimensions = [
            {
              dimension: kpi.timeDimension,
              dateRange: [`${startYear}-04-01`, `${endYear}-03-31`],
            },
          ];
        }
      }

      const resultSet = await cubejsApi.load(query);
      const data = resultSet.tablePivot();
      kpiResults[kpi.id] = data[0]?.[kpi.measure] || 0;
    }

    setHeaderKPIs(kpiResults);
  } catch (error) {
    console.error('❌ Error fetching header KPIs:', error);
  }
};

// ============================================================
// RECOMMENDATION
// ============================================================
// For your use case, the current implementation (Strategy 1: Cache Invalidation)
// is the simplest and most effective. It ensures all data is refreshed from the
// source without requiring extensive modifications to existing fetch functions.
//
// If you need finer-grained control in the future, consider implementing
// Strategy 3 (renewQuery) as it's the official Cube.js recommended approach.

export {
  handleManualRefresh_CacheInvalidation,
  handleManualRefresh_CacheKey,
  handleManualRefresh_RenewQuery
};
