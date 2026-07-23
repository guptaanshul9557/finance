/**
 * Query Configuration
 * Centralized location for all Cube.js queries
 * Use Cube.js for better performance (OLAP, pre-aggregations, caching)
 */

const queryConfig = {
  // ========================================
  // HOME PAGE - GLOBAL KPIS
  // ========================================
  homePage: {
    totalCollectionCount: {
      title: "Total Collection Count",
      description: "Total number of collections across all time",
      query: {
        measures: ["TresCollReceiptHdr.totalReceipts"],
        timeDimensions: [],
      },
    },
    totalCollectionAmount: {
      title: "Total Collection Amount",
      description: "Total amount collected",
      query: {
        measures: ["TresCollReceiptHdr.totalAmount"],
        timeDimensions: [],
      },
    },
    // Add more global KPIs as needed
  },

  // ========================================
  // COMMON COLLECTION MODULE
  // ========================================
  common_collection: {
    // KPI Queries
    kpis: {
      totalCollection: {
        id: "total_collection",
        title: "Total Collection",
        description: "Total amount collected",
        format: "currency",
        icon: "💰",
        // Cube.js Query - Use receiptYear filter like Dashboard
        query: (financialYear) => {
          const [startYear] = financialYear.split("-"); // "2025-2026" → "2025"
          return {
            measures: ["TresCollReceiptHdr.totalAmount"],
            filters: [
              {
                member: "TresCollReceiptHdr.receiptYear",
                operator: "equals",
                values: [startYear],
              },
            ],
          };
        },
        // Alternative: Time-based queries
        queryByPeriod: {
          daily: (date) => ({
            measures: ["TresCollReceiptHdr.totalAmount"],
            timeDimensions: [
              {
                dimension: "TresCollReceiptHdr.receiptDate",
                dateRange: [date, date],
              },
            ],
          }),
          weekly: (startDate, endDate) => ({
            measures: ["TresCollReceiptHdr.totalAmount"],
            timeDimensions: [
              {
                dimension: "TresCollReceiptHdr.receiptDate",
                granularity: "week",
                dateRange: [startDate, endDate],
              },
            ],
          }),
          monthly: (year, month) => ({
            measures: ["TresCollReceiptHdr.totalAmount"],
            timeDimensions: [
              {
                dimension: "TresCollReceiptHdr.receiptDate",
                granularity: "month",
                dateRange: [`${year}-${month}-01`, `${year}-${month}-31`],
              },
            ],
          }),
        },
      },
    },

    // Chart Queries
    charts: {
      status_breakdown: {
        id: "status_breakdown",
        title: "Department-wise Collection",
        type: "pie",
        query: (financialYear) => {
          const [startYear] = financialYear.split("-");
          return {
            measures: ["TresCollReceiptHdr.totalAmount"],
            dimensions: ["TresCollReceiptHdr.departmentName"],
            filters: [
              {
                member: "TresCollReceiptHdr.receiptYear",
                operator: "equals",
                values: [startYear],
              },
            ],
            order: {
              "TresCollReceiptHdr.totalAmount": "desc",
            },
            limit: 10,
          };
        },
        colors: {
          // Auto-generated colors for departments
        },
      },

      collectionTrend: {
        id: "collection_trend",
        title: "Collection Trend",
        type: "line",
        query: (financialYear, granularity = "month") => ({
          measures: ["TresCollReceiptHdr.totalAmount"],
          timeDimensions: [
            {
              dimension: "TresCollReceiptHdr.receiptDate",
              granularity: granularity, // day, week, month, year
              dateRange: getFinancialYearRange(financialYear),
            },
          ],
        }),
      },
    },

    // Table Query
    table: {
      query: (financialYear, filters = {}, search = "", limit = 20, offset = 0) => {
        const [startYear] = financialYear.split("-");
        const cubeQuery = {
          dimensions: [
            "TresCollReceiptHdr.receiptNo",
            "TresCollReceiptHdr.receiptAmount",
            "TresCollReceiptHdr.departmentName",
            "TresCollReceiptHdr.receiptDate",
            "TresCollReceiptHdr.instrumentType",
            "TresCollReceiptHdr.counterNo",
          ],
          filters: [
            {
              member: "TresCollReceiptHdr.receiptYear",
              operator: "equals",
              values: [startYear],
            },
          ],
          order: {
            "TresCollReceiptHdr.receiptDate": "desc",
          },
          limit: limit,
          offset: offset,
        };

        // Add filters if provided
        if (filters.department) {
          cubeQuery.filters = cubeQuery.filters || [];
          cubeQuery.filters.push({
            member: "TresCollReceiptHdr.departmentName",
            operator: "equals",
            values: [filters.department],
          });
        }

        // Add search if provided
        if (search) {
          cubeQuery.filters = cubeQuery.filters || [];
          cubeQuery.filters.push({
            member: "f.receiptNo",
            operator: "contains",
            values: [search],
          });
        }

        return cubeQuery;
      },
    },

    // Drilldown Query - When user clicks on chart segment
    drilldown: {
      byDepartment: (department, financialYear) => ({
        dimensions: [
          "TresCollReceiptHdr.receiptNo",
          "TresCollReceiptHdr.receiptAmount",
          "TresCollReceiptHdr.departmentName",
          "TresCollReceiptHdr.receiptDate",
        ],
        timeDimensions: [
          {
            dimension: "TresCollReceiptHdr.receiptDate",
            dateRange: getFinancialYearRange(financialYear),
          },
        ],
        filters: [
          {
            member: "TresCollReceiptHdr.departmentName",
            operator: "equals",
            values: [department],
          },
        ],
        order: {
          "TresCollReceiptHdr.receiptDate": "desc",
        },
      }),
    },
  },

  // ========================================
  // CRN MODULE
  // ========================================
  crn: {
    kpis: {
      totalCrn: {
        id: "total_crn",
        title: "Total CRN",
        description: "Total number of CRN generated",
        format: "number",
        icon: "🎫",
        query: (financialYear) => ({
          measures: ["CollTransactionId.count"],
          timeDimensions: [
            {
              dimension: "CollTransactionId.createdDate",
              dateRange: getFinancialYearRange(financialYear),
            },
          ],
        }),
      },

      totalCrnAmount: {
        id: "total_crn_amount",
        title: "Total CRN Amount",
        description: "Total amount in CRN",
        format: "currency",
        icon: "💵",
        query: (financialYear) => ({
          measures: ["CollTransactionId.totalAmount"],
          timeDimensions: [
            {
              dimension: "CollTransactionId.createdDate",
              dateRange: getFinancialYearRange(financialYear),
            },
          ],
        }),
      },

      successRate: {
        id: "success_rate",
        title: "Success Rate",
        description: "Percentage of successful CRN transactions",
        format: "percentage",
        icon: "✅",
        query: (financialYear) => ({
          measures: ["CollTransactionId.successRate"],
          timeDimensions: [
            {
              dimension: "CollTransactionId.createdDate",
              dateRange: getFinancialYearRange(financialYear),
            },
          ],
        }),
      },

      pendingCrn: {
        id: "pending_crn",
        title: "Pending CRN",
        description: "Number of pending CRN transactions",
        format: "number",
        icon: "⏳",
        query: (financialYear) => ({
          measures: ["CollTransactionId.count"],
          timeDimensions: [
            {
              dimension: "CollTransactionId.createdDate",
              dateRange: getFinancialYearRange(financialYear),
            },
          ],
          filters: [
            {
              member: "CollTransactionId.status",
              operator: "equals",
              values: ["PENDING"],
            },
          ],
        }),
      },
    },

    charts: {
      crnByStatus: {
        id: "crn_by_status",
        title: "CRN Status Distribution",
        type: "pie",
        query: (financialYear) => ({
          measures: ["CollTransactionId.count"],
          dimensions: ["CollTransactionId.status"],
          timeDimensions: [
            {
              dimension: "CollTransactionId.createdDate",
              dateRange: getFinancialYearRange(financialYear),
            },
          ],
        }),
        colors: {
          SUCCESS: "#4CAF50",
          PENDING: "#FFC107",
          FAILED: "#F44336",
        },
      },
    },

    table: {
      query: (financialYear, filters = {}, search = "", limit = 20, offset = 0) => ({
        dimensions: [
          "CollTransactionId.crnNumber",
          "CollTransactionId.amount",
          "CollTransactionId.status",
          "CollTransactionId.createdDate",
          "CollTransactionId.transactionId",
        ],
        timeDimensions: [
          {
            dimension: "CollTransactionId.createdDate",
            dateRange: getFinancialYearRange(financialYear),
          },
        ],
        order: {
          "CollTransactionId.createdDate": "desc",
        },
        limit: limit,
        offset: offset,
      }),
    },
  },
};

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Get financial year date range
 * Financial year: April 1 to March 31
 * @param {string} year - Format: "2025-2026"
 * @returns {array} - [startDate, endDate] in ISO format
 */
function getFinancialYearRange(year) {
  if (!year) {
    // Default to current financial year
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    
    if (currentMonth >= 4) {
      // Apr-Dec: Current FY is currentYear to currentYear+1
      year = `${currentYear}-${currentYear + 1}`;
    } else {
      // Jan-Mar: Current FY is currentYear-1 to currentYear
      year = `${currentYear - 1}-${currentYear}`;
    }
  }

  const [startYear, endYear] = year.split("-").map(Number);
  const startDate = `${startYear}-04-01`;
  const endDate = `${endYear}-03-31`;

  return [startDate, endDate];
}

/**
 * Get query by ID from a module
 * @param {string} moduleId - Module ID (e.g., "common_collection")
 * @param {string} queryType - Type: "kpi", "chart", "table"
 * @param {string} queryId - Specific query ID
 * @returns {object} - Query configuration
 */
export function getQuery(moduleId, queryType, queryId) {
  const normalizedModuleId = moduleId.replace(/-/g, "_");
  const module = queryConfig[normalizedModuleId];

  if (!module) {
    console.error(`Module "${normalizedModuleId}" not found in queryConfig`);
    return null;
  }

  if (queryType === "kpi") {
    return module.kpis?.[queryId];
  } else if (queryType === "chart") {
    return module.charts?.[queryId];
  } else if (queryType === "table") {
    return module.table;
  } else if (queryType === "drilldown") {
    return module.drilldown;
  }

  return null;
}

/**
 * Get all KPIs for a module
 * @param {string} moduleId - Module ID
 * @returns {object} - All KPI configurations
 */
export function getModuleKPIs(moduleId) {
  const normalizedModuleId = moduleId.replace(/-/g, "_");
  return queryConfig[normalizedModuleId]?.kpis || {};
}

/**
 * Get all charts for a module
 * @param {string} moduleId - Module ID
 * @returns {object} - All chart configurations
 */
export function getModuleCharts(moduleId) {
  const normalizedModuleId = moduleId.replace(/-/g, "_");
  return queryConfig[normalizedModuleId]?.charts || {};
}

export { queryConfig, getFinancialYearRange };
export default queryConfig;
