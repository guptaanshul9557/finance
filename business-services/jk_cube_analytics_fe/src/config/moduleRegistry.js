/**
 * Module Registry - Central Configuration for All Modules
 * Each module has KPIs, charts, and table configurations
 * 
 * ✅ Now uses Cube.js queries for better performance
 * ✅ Pre-aggregation configurations can be defined here
 * Queries are defined in queryConfig.js and referenced here
 */

export const moduleRegistry = [
  {
    // ========== COMMON COLLECTION MODULE ==========
    id: 'common_collection',
    name: 'Common Collection',
    displayName: 'Common Collection',
    description: 'Common Collection Data and Analytics',
    enabled: true,
    icon: '💰',
    color: '#4CAF50',
    route: '/modules/common-collection',

    // 🚀 Pre-Aggregation Configuration (Optional - for performance optimization)
    preAggregation: {
      enabled: true,
      name: 'commonCollectionRollup',
      type: 'rollup',
      measures: [
        'TresCollReceiptHdr.totalAmount',
        'TresCollReceiptHdr.totalReceipts',
        'TresCollReceiptHdr.avgAmount',
      ],
      dimensions: [
        'TresCollReceiptHdr.departmentName',
        'TresCollReceiptHdr.receiptYear',
        'TresCollReceiptHdr.instrumentType',
      ],
      timeDimension: 'TresCollReceiptHdr.receiptDate',
      granularity: 'day', // 'hour', 'day', 'week', 'month'
      refreshKey: {
        every: '0', // How often to refresh the pre-aggregation
      },
      // Optional: Build range for historical data
      buildRangeStart: { sql: `SELECT DATE('2023-04-01')` },
      buildRangeEnd: { sql: `SELECT NOW()` },
    },

    // KPIs Configuration (Cube.js powered) - Simple structure
    kpis: [
      {
        id: 'totalAmount',
        title: 'Total Collection',
        icon: '💵',
        format: 'currency',
        color: '#4CAF50',
        measure: 'TresCollReceiptHdr.totalAmount', // Direct measure reference
        isDrillingRequired: true, // Enable monthly/daily drilling
      },
      {
        id: 'totalReceipts',
        title: 'Total Transactions',
        icon: '�',
        format: 'number',
        color: '#2196F3',
        measure: 'TresCollReceiptHdr.totalReceipts', // Direct measure reference
        isDrillingRequired: true, // Enable monthly/daily drilling
      },
      {
        id: 'pushReceipts',
        title: 'Push 2.0 to 1.0/ Day',
        icon: '�',
        format: 'number',
        color: '#FF9800',
        measure: 'TresCollReceiptHdr.totalAmount', // Direct measure reference
        isDrillingRequired: true, // Enable monthly/daily drilling
    },
      {
        id: 'CancelledReceipts',
        title: 'Cancelled Receipts/ Day',
        icon: '❌',
        format: 'number',
        color: '#F44336',
        measure: 'TresCollReceiptHdr.totalAmount', // Direct measure reference
        isDrillingRequired: true, // Enable monthly/daily drilling
      },
    ],

    // Pie Chart Configuration (Department Breakdown - Cube.js powered)
    pieChart: {
      id: 'department_breakdown',
      title: 'Department-wise Collection',
      dataField: 'TresCollReceiptHdr.totalAmount', // Amount per department
      labelField: 'TresCollReceiptHdr.departmentName', // Department names (already joined in schema)
      colors: ['#4CAF50', '#FFC107', '#F44336', '#9C27B0', '#2196F3', '#FF5722', '#795548', '#607D8B', '#E91E63', '#00BCD4'],
      drilldownEnabled: true,
      // Cube.js query for chart
      cubeQuery: (financialYear) => {
        const [startYear] = financialYear.split("-");
        return {
          measures: ["TresCollReceiptHdr.totalAmount"],
          dimensions: ["TresCollReceiptHdr.departmentName"], // Use dimension from TresCollReceiptHdr
          filters: [
            {
              member: "TresCollReceiptHdr.receiptYear",
              operator: "equals",
              values: [startYear],
            },
          ],
          order: {
            "TresCollReceiptHdr.totalAmount": "desc", // Top departments by amount
          },
          limit: 10, // Top 10 departments
        };
      },
      onDrilldown: (departmentName) => ({
        filterKey: 'department',
        filterValue: departmentName,
        action: 'FILTER_TABLE',
      }),
    },

    // Data Table Configuration (Cube.js powered)
    table: {
      id: 'collections_table',
      title: 'Collections',
      pageSize: 20,
      // Cube.js query for table data
      cubeQuery: (financialYear, offset = 0, limit = 20, search = '', filters = {}) => {
        const [startYear] = financialYear.split("-");
        
        const query = {
          dimensions: [
            "TresCollReceiptHdr.receiptNo",
            "TresCollReceiptHdr.receiptAmount",
            "TresCollReceiptHdr.receiptDate",
            "TresCollReceiptHdr.departmentName", // Already joined in schema
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

        // Apply search filter if provided
        if (search) {
          query.filters.push({
            member: "TresCollReceiptHdr.receiptNo",
            operator: "contains",
            values: [search],
          });
        }

        // Apply additional filters
        if (filters.department) {
          query.filters.push({
            member: "TresCollReceiptHdr.departmentName",
            operator: "equals",
            values: [filters.department],
          });
        }

        return query;
      },

      columns: [
        {
          key: 'tres_coll_receipt_no',
          label: 'Collection No',
          width: '150px',
          sortable: true,
          drilldown: true,
        },
        {
          key: 'amount',
          label: 'Amount',
          width: '120px',
          format: 'currency',
          sortable: true,
        },
        {
          key: 'status',
          label: 'Status',
          width: '100px',
          sortable: true,
          drilldown: true,
          drilldownAction: {
            type: 'FILTER',
            field: 'status',
          },
        },
        {
          key: 'department_name',
          label: 'Department',
          width: '150px',
          sortable: true,
          drilldown: true,
          drilldownAction: {
            type: 'FILTER',
            field: 'department_code',
          },
        },
        {
          key: 'created_date',
          label: 'Date',
          width: '130px',
          format: 'date',
          sortable: true,
        },
      ],

      searchable: true,
      searchFields: ['collection_no', 'department_name'],
      sortable: true,
      defaultSort: 'created_date',
      defaultSortOrder: 'desc',
      expandable: true,
    },

    // Filters Available for Table
    filters: [
      {
        id: 'status_filter',
        label: 'Status',
        type: 'select',
        apiEndpoint: '/api/modules/common_collection/filters',
      },
      {
        id: 'date_filter',
        label: 'Date Range',
        type: 'daterange',
      },
    ],
  },

  {
    // ========== CRN MODULE ==========
    id: 'crn',
    name: 'CRN',
    displayName: 'CRN Collection',
    description: 'CRN Collection Data and Analytics',
    enabled: true,
    icon: '💳',
    color: '#2196F3',
    route: '/crn-management',

    kpis: [
      {
        id: 'total_crn',
        title: 'Total CRN Amount',
        icon: '💳',
        format: 'currency',
        color: '#2196F3',
        cubeQuery: () => ({
          measures: ["ComRegisteredNumber.totalCRNAmount"],
          timeDimensions: [{
            dimension: "ComRegisteredNumber.systemDate",
            dateRange: "This year",
          }],
        }),
      },
      {
        id: 'crn_count',
        title: 'Total CRN Count',
        icon: '📋',
        format: 'number',
        color: '#9C27B0',
        cubeQuery: () => ({
          measures: ["ComRegisteredNumber.totalCRNCount"],
          timeDimensions: [{
            dimension: "ComRegisteredNumber.systemDate",
            dateRange: "This year",
          }],
        }),
      },
      {
        id: 'crn_balance',
        title: 'CRN Balance',
        icon: '💰',
        format: 'currency',
        color: '#4CAF50',
        cubeQuery: () => ({
          measures: ["ComRegisteredNumber.totalCRNBalance"],
          timeDimensions: [{
            dimension: "ComRegisteredNumber.systemDate",
            dateRange: "This year",
          }],
        }),
      },
      {
        id: 'crn_unused',
        title: 'Unused Amount',
        icon: '📊',
        format: 'currency',
        color: '#FF9800',
        cubeQuery: () => ({
          measures: ["ComRegisteredNumber.usedCRNAmount"],
          timeDimensions: [{
            dimension: "ComRegisteredNumber.systemDate",
            dateRange: "This year",
          }],
        }),
      },
    ],

    pieChart: {
      id: 'crn_fund_breakdown',
      title: 'CRN by Fund Type',
      dataField: 'ComRegisteredNumber.totalCRNAmount',
      labelField: 'ComRegisteredNumber.fundType',
      colors: ['#4CAF50', '#FFC107', '#F44336', '#9C27B0', '#2196F3'],
      drilldownEnabled: true,
      cubeQuery: () => ({
        measures: ["ComRegisteredNumber.totalCRNAmount"],
        dimensions: ["ComRegisteredNumber.fundType"],
        timeDimensions: [{
          dimension: "ComRegisteredNumber.systemDate",
          dateRange: "This year",
        }],
        order: { "ComRegisteredNumber.totalCRNAmount": "desc" },
        limit: 10,
      }),
    },

    table: {
      id: 'crn_table',
      title: 'CRN Records',
      pageSize: 20,

      cubeQuery: (financialYear, offset = 0, limit = 20, search = '', filters = {}) => ({
        dimensions: [
          "ComRegisteredNumber.id",
          "ComRegisteredNumber.fundType",
          "ComRegisteredNumber.sourceDepartment",
          "ComRegisteredNumber.expenseDepartment",
        ],
        measures: [
          "ComRegisteredNumber.totalCRNAmount",
          "ComRegisteredNumber.totalCRNBalance",
        ],
        timeDimensions: [{
          dimension: "ComRegisteredNumber.systemDate",
          dateRange: "This year",
        }],
        order: { "ComRegisteredNumber.totalCRNAmount": "desc" },
        limit,
        offset,
      }),

      columns: [
        { key: 'id', label: 'CRN ID', width: '100px', sortable: true },
        { key: 'fundType', label: 'Fund Type', width: '150px', sortable: true, drilldown: true },
        { key: 'sourceDepartment', label: 'Source Dept', width: '200px', sortable: true },
        { key: 'expenseDepartment', label: 'Expense Dept', width: '200px', sortable: true },
        { key: 'totalCRNAmount', label: 'Amount', width: '120px', format: 'currency', sortable: true },
        { key: 'totalCRNBalance', label: 'Balance', width: '120px', format: 'currency', sortable: true },
      ],

      searchable: true,
      searchFields: ['id', 'fundType'],
      expandable: true,
    },

    filters: [
      {
        id: 'fund_type_filter',
        label: 'Fund Type',
        type: 'select',
        optionsQuery: {
          dimensions: ["ComRegisteredNumber.fundType"],
        },
      },
    ],
    },

];

// ===== HELPER FUNCTIONS =====

export const getEnabledModules = () => {
  return moduleRegistry.filter((m) => m.enabled);
};

export const getModuleById = (id) => {
  return moduleRegistry.find((m) => m.id === id);
};

export const getModuleByRoute = (route) => {
  return moduleRegistry.find((m) => m.route === route);
};

export default moduleRegistry;
