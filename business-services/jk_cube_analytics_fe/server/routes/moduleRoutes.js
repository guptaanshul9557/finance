/**
 * Module API Routes
 * Handles module data requests
 */

const express = require('express');
const commonCollectionService = require('../services/commonCollectionService.js');

const router = express.Router();

// Load module registry from root config for server-side use
let moduleRegistry = [];
try {
  const registryModule = require('../../config/moduleRegistry.js');
  moduleRegistry = Array.isArray(registryModule) ? registryModule : registryModule.moduleRegistry || [];
} catch (err) {
  console.warn('Could not load moduleRegistry from root config, using empty array');
}

const getModuleById = (id) => {
  return moduleRegistry.find((m) => m.id === id);
};

// Helper: Calculate financial year date range
const getFinancialYearRange = (year) => {
  const [startYear] = year.split('-');
  return {
    start: `${startYear}-04-01`,
    end: `${parseInt(startYear) + 1}-03-31`,
  };
};

/**
 * GET /api/modules/:moduleId/kpi/:kpiId
 * Fetch KPI data
 */
router.get('/modules/:moduleId/kpi/:kpiId', async (req, res) => {
  try {
    const { moduleId, kpiId } = req.params;
    const year = req.query.year || '2026-2027';
    const dateRange = getFinancialYearRange(year);

    const module = getModuleById(moduleId);
    if (!module) return res.status(404).json({ error: 'Module not found' });

    const kpi = module.kpis.find((k) => k.id === kpiId);
    if (!kpi) return res.status(404).json({ error: 'KPI not found' });

    let data = {};

    // Route to appropriate service
    if (moduleId === 'common_collection') {
      if (kpi.query === 'getTotalCollection') {
          data = await commonCollectionService.getTotalCollection(dateRange);
          console.log({data})
      }
    }

    res.json({
      success: true,
      data: data[kpi.metric] || 0,
      format: kpi.format,
    });
  } catch (error) {
    console.error('Error fetching KPI:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/modules/:moduleId/chart/:chartId
 * Fetch chart data
 */
router.get('/modules/:moduleId/chart/:chartId', async (req, res) => {
  try {
    const { moduleId, chartId } = req.params;
    const year = req.query.year || '2026-2027';
    const dateRange = getFinancialYearRange(year);

    const module = getModuleById(moduleId);
    if (!module) return res.status(404).json({ error: 'Module not found' });

    const chart = module.pieChart;
    if (!chart || chart.id !== chartId) return res.status(404).json({ error: 'Chart not found' });

    let data = [];

    // Route to appropriate service
    if (moduleId === 'common_collection') {
      if (chart.query === 'getCollectionByStatus') {
        data = await commonCollectionService.getCollectionByStatus(dateRange);
      }
    }

    res.json({
      success: true,
      labels: data.map((d) => d[chart.labelField]),
      datasets: [
        {
          data: data.map((d) => d[chart.dataField]),
          backgroundColor: chart.colors,
        },
      ],
    });
  } catch (error) {
    console.error('Error fetching chart:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/modules/:moduleId/table
 * Fetch table data with pagination, filters, search
 */
router.get('/modules/:moduleId/table', async (req, res) => {
  try {
    const { moduleId } = req.params;
    const year = req.query.year || '2026-2027';
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search || '';
    const filters = req.query.filters ? JSON.parse(req.query.filters) : {};
    const dateRange = getFinancialYearRange(year);

    const module = getModuleById(moduleId);
    if (!module) return res.status(404).json({ error: 'Module not found' });

    let tableData = [];
    let totalCount = 0;

    // Route to appropriate service
    if (moduleId === 'common_collection') {
      tableData = await commonCollectionService.getAllCollections(
        dateRange,
        limit,
        offset,
        filters,
        search
      );
      totalCount = await commonCollectionService.getCollectionsCount(dateRange, filters, search);
    }

    res.json({
      success: true,
      data: tableData,
      total: totalCount,
      limit,
      offset,
      pages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    console.error('Error fetching table:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/modules/:moduleId/record/:recordId
 * Fetch single record detail
 */
router.get('/modules/:moduleId/record/:recordId', async (req, res) => {
  try {
    const { moduleId, recordId } = req.params;

    const module = getModuleById(moduleId);
    if (!module) return res.status(404).json({ error: 'Module not found' });

    let data = {};

    if (moduleId === 'common_collection') {
      data = await commonCollectionService.getCollectionDetail(recordId);
    }

    if (!data) return res.status(404).json({ error: 'Record not found' });

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching record:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/modules/:moduleId/filters
 * Get available filter options
 */
router.get('/modules/:moduleId/filters', async (req, res) => {
  try {
    const { moduleId } = req.params;

    let filterOptions = {};

    if (moduleId === 'common_collection') {
      filterOptions = {
        status: await commonCollectionService.getStatusOptions(),
      };
    }

    res.json({ success: true, filterOptions });
  } catch (error) {
    console.error('Error fetching filters:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
