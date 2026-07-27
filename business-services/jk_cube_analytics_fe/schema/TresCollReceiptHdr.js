/* eslint-disable no-undef */
cube(`TresCollReceiptHdr`, {
  sql: `select * from public.vw_tres_coll_receipt_hdr`,

  joins: {},
  dataSource: `default`,

  refreshKey: { every: `5 minutes` },

  measures: {
    // Count of receipts
    totalReceipts: {
      type: `count`,
      sql: `id`,
      title: `Total Receipts`,
    },
    todayTopCounterAmount: {
      type: 'sum',
      sql: `${CUBE}.tres_coll_receipt_amount`,
      filters: [
        { sql: `(${CUBE}.create_date)::date = CURRENT_DATE` }
      ],
      title: 'Today Top Counter Amount',
      format: 'currency',
    },
    // ✅ Today Counter-wise Collection Amount
    todayCollectionAmount: {
      sql: `COALESCE(${CUBE}.tres_coll_receipt_amount, 0)`,
      type: 'sum',
      format: 'currency',
      filters: [
        { sql: `(${CUBE}.create_date)::date = CURRENT_DATE` }
      ],
      title: 'Today Collection Amount',
    },
    //    todayCounterCollectionAmount: {
    //   type: 'sum',
    //   sql: `tres_coll_receipt_amount`,
    //   filters: [
    //     { sql: `DATE(create_date) = CURRENT_DATE` }
    //   ],
    //   title: 'Today Counter Collection',
    //   format: 'currency',
    // },
    // todayCounterCollectionAmount: {
    //   type: 'sum',
    //   sql: `${CUBE}.tres_coll_receipt_amount`,
    //   filters: [
    //     { sql: `DATE(${CUBE}.tres_coll_receipt_date) = CURRENT_DATE` }
    //   ],
    //   title: 'Today Counter Collection',
    // },

    todayCounterCollectionAmount: {
      type: 'sum',
      sql: `CAST(${CUBE}.tres_coll_receipt_amount AS NUMERIC)`,
      filters: [
        { sql: `(${CUBE}.create_date)::date = CURRENT_DATE` }
      ],
    },




    todayReceiptsCount: {
      // Count receipts where the row was created today
      sql: `CASE WHEN (${CUBE}.create_date)::date = CURRENT_DATE THEN ${CUBE}.id ELSE NULL END`,
      type: 'count',
      title: 'Today Receipts Count'
    },
    // todayTopCounterAmount: {
    //   sql: `CASE WHEN DATE(${CUBE}.tres_coll_receipt_date) = CURRENT_DATE THEN ${CUBE}.tres_coll_receipt_amount ELSE 0 END`,
    //   type: 'sum',
    //   title: 'Today Top Counter Amount'
    //   },
    // todayTopCounterAmount: {
    // sql: `${CUBE}.tres_coll_receipt_amount`,
    // type: 'sum',
    // title: 'Today Top Counter Amount'
    //   },


    // Sum of receipt amounts
    totalAmount: {
      type: `sum`,
      sql: `tres_coll_receipt_amount`,
      title: `Total Amount`,
      format: `currency`,
    },

    // Average receipt amount
    avgAmount: {
      type: `avg`,
      sql: `tres_coll_receipt_amount`,
      title: `Average Amount`,
      format: `currency`,
    },

    // Min amount
    minAmount: {
      type: `min`,
      sql: `tres_coll_receipt_amount`,
      title: `Minimum Amount`,
    },

    // Max amount
    maxAmount: {
      type: `max`,
      sql: `tres_coll_receipt_amount`,
      title: `Maximum Amount`,
    },

    // Total rebate amount
    totalRebateAmount: {
      type: `sum`,
      sql: `tres_coll_rebate_amount`,
      title: `Total Rebate`,
      format: `currency`,
    },

    // Total interest amount
    totalInterestAmount: {
      type: `sum`,
      sql: `tres_coll_interest_amount`,
      title: `Total Interest`,
      format: `currency`,
    },

    // Total penalty amount
    totalPenaltyAmount: {
      type: `sum`,
      sql: `tres_coll_penalty_amount`,
      title: `Total Penalty`,
      format: `currency`,
    },



    // counterNo was mistakenly defined as a measure; it's a dimension and defined below
  },

  dimensions: {
    receiptDate: {
      sql: `${CUBE}.tres_coll_receipt_date`,
      type: 'time'
    },
    // Primary key
    id: {
      sql: `id`,
      type: `number`,
      primaryKey: true,
    },

    // Receipt number
    receiptNo: {
      sql: `tres_coll_receipt_no`,
      type: `string`,
      title: `Receipt No`,
    },

    // Receipt year
    receiptYear: {
      sql: `tres_coll_receipt_year`,
      type: `string`,
      title: `Year`,
    },

    // Collection center code
    collectCenterCode: {
      sql: `tres_coll_collect_center_code`,
      type: `string`,
      title: `Collection Center`,
    },

    // Receipt date (time dimension)
    //    receiptDate: {
    //   // Ensure create_date is treated as timestamp (cast if stored as text)
    //   sql: `(${CUBE}.create_date)::timestamp`,
    //   type: 'time',
    //   title: 'Receipt Date',
    // },

    // Receipt date time
    receiptDateTime: {
      sql: `tres_coll_receipt_date_time`,
      type: `time`,
      title: `Receipt Date Time`,
    },

    // Posting date
    postingDate: {
      sql: `tres_coll_posting_date`,
      type: `time`,
      title: `Posting Date`,
    },

    // Department code
    departmentCode: {
      sql: `tres_coll_department_code`,
      type: `number`,
      title: `Department Code`,
    },

    // Department name (from joined table)
    departmentName: {
      sql: `department_name`,
      type: `string`,
      title: `Department Name`,
    },

    // Issuing office code
    issuingOfficeCode: {
      sql: `tres_coll_issuing_office_code`,
      type: `string`,
      title: `Issuing Office`,
    },

    // Receipt amount (as dimension for filtering)
    receiptAmount: {
      sql: `tres_coll_receipt_amount`,
      type: `number`,
      title: `Receipt Amount`,
    },

    // Rebate amount
    rebateAmount: {
      sql: `tres_coll_rebate_amount`,
      type: `number`,
      title: `Rebate Amount`,
    },

    // Interest amount
    interestAmount: {
      sql: `tres_coll_interest_amount`,
      type: `number`,
      title: `Interest Amount`,
    },

    // Penalty amount
    penaltyAmount: {
      sql: `tres_coll_penalty_amount`,
      type: `number`,
      title: `Penalty Amount`,
    },

    // Instrument type
    instrumentType: {
      sql: `tres_coll_instrument_type`,
      type: `string`,
      title: `Instrument Type`,
    },

    // Counter number (keep as string to avoid mixing numeric/text types in CASE)
    counterNo: {
      sql: `
        CASE
          WHEN coll_counter_no IS NULL THEN '-1'
          ELSE coll_counter_no
        END
      `,
      type: 'string',
      title: 'Counter No',
    },
    office_description: {
      sql: `
        CASE
          WHEN office_description IS NULL THEN 'N/A'
          ELSE office_description
        END
      `,
      type: 'string',
      title: 'Office Description',
    },

    // IP Address
    ipAddress: {
      sql: `coll_ip_address`,
      type: `string`,
      title: `IP Address`,
    },

    // Receipt print count
    receiptPrintCount: {
      sql: `tres_coll_receipt_print_count`,
      type: `number`,
      title: `Print Count`,
    },

    // Stationary number
    stationaryNo: {
      sql: `tres_coll_stationary_no`,
      type: `number`,
      title: `Stationary No`,
    },

    // Stationary prefix
    stationaryPrefix: {
      sql: `tres_coll_stationery_prefix`,
      type: `string`,
      title: `Stationary Prefix`,
    },

    // Collection type
    collectionType: {
      sql: `tres_coll_type`,
      type: `string`,
      title: `Collection Type`,
    },

    // Collection mode (Online / Common Collection)
    collectionMode: {
      sql: `collection_mode`,
      type: `string`,
      title: `Collection Mode`,
    },


    // Bounced amount
    bouncedAmount: {
      sql: `tres_coll_bounced_amount`,
      type: `number`,
      title: `Bounced Amount`,
    },

    // Created by
    createdBy: {
      sql: `create_uid`,
      type: `string`,
      title: `Created By`,
    },

    // Created date
    createdDate: {
      // Cast to timestamp to avoid varchar vs timestamp comparisons
      sql: `(${CUBE}.create_date)::timestamp`,
      type: `time`,
      title: `Created Date`,
    },
    systemDate: {
      // Cast to timestamp to avoid varchar vs timestamp comparisons
      sql: `(${CUBE}.create_date)::timestamp`,
      type: `time`,
      title: `Created Date`,
    },

    // Modified by
    modifiedBy: {
      sql: `modified_uid`,
      type: `string`,
      title: `Modified By`,
    },

    // Modified date
    modifiedDate: {
      sql: `modified_date`,
      type: `time`,
      title: `Modified Date`,
    },

    // Correction user
    correctionUid: {
      sql: `correction_uid`,
      type: `string`,
      title: `Correction User`,
    },

    // Correction date
    correctionDate: {
      sql: `correction_date`,
      type: `time`,
      title: `Correction Date`,
    },

    // Correction history
    correctionHistory: {
      sql: `tres_coll_correction_hist`,
      type: `string`,
      title: `Correction History`,
    },

    // Version number
    versionNo: {
      sql: `version_no`,
      type: `number`,
      title: `Version`,
    },
  },

  segments: {
    // Active receipts (amount > 0)
    activeReceipts: {
      sql: `${CUBE}.tres_coll_receipt_amount > 0`,
    },

    // Large transactions (amount > 10000)
    largeTransactions: {
      sql: `${CUBE}.tres_coll_receipt_amount > 10000`,
    },

    // Printed receipts
    printedReceipts: {
      sql: `${CUBE}.tres_coll_receipt_print_flag = 'Y'`,
    },

    // Current Financial Year (April to March)
    currentFinYear: {
      sql: `EXTRACT(MONTH FROM (${CUBE}.tres_coll_receipt_date)::timestamp) >= 4`,
    },
  },

  // ==================== PRE-AGGREGATIONS DISABLED ====================
  // Pre-aggregations are disabled (CUBEJS_PRE_AGGREGATIONS=false in .env)
  // Uncomment and configure properly if you want to enable them for performance
  /* 
  preAggregations: {
    // =====================================================
    //    1️⃣ DASHBOARD KPI ROLLUP (FAST KPI CARDS)
    //    ===================================================== 
    dashboardKpis: {
      type: 'rollup',
      measures: [
        TresCollReceiptHdr.totalAmount,
        TresCollReceiptHdr.totalReceipts,
        TresCollReceiptHdr.totalRebateAmount,
        TresCollReceiptHdr.totalInterestAmount,
        TresCollReceiptHdr.totalPenaltyAmount,
      ],
      timeDimension: TresCollReceiptHdr.receiptDate,
      granularity: 'day',
      refreshKey: {
        every: '30 seconds',
      },
    },

    // =====================================================
    //    2️⃣ DEPARTMENT-WISE DAILY ROLLUP (TABLES / CHARTS)
    //    ===================================================== 
    departmentDaily: {
      type: 'rollup',
      measures: [
        TresCollReceiptHdr.totalAmount,
        TresCollReceiptHdr.totalReceipts,
      ],
      dimensions: [
        TresCollReceiptHdr.departmentName,
      ],
      timeDimension: TresCollReceiptHdr.receiptDate,
      granularity: 'day',
      partitionGranularity: 'month',
      refreshKey: {
        every: '30 seconds',
      },
    },

    // =====================================================
    //    3️⃣ YEARLY SUMMARY (FINANCIAL YEAR VIEWS)
    //    ===================================================== 
    yearlySummary: {
      type: 'rollup',
      measures: [
        TresCollReceiptHdr.totalAmount,
        TresCollReceiptHdr.totalReceipts,
        TresCollReceiptHdr.avgAmount,
      ],
      dimensions: [
        TresCollReceiptHdr.receiptYear,
      ],
      refreshKey: {
        every: '15 minutes',
      },
    },
  },
  */


  // 🚀 Pre-Aggregations for Performance Optimization
  // These can be generated from moduleRegistry.js config or defined manually
  // TEMPORARILY DISABLED - Database password issue with pre-aggregations
  /* preAggregations: {
    // Main rollup for dashboard KPIs (most frequently accessed)
    dashboardMain: {
      type: 'rollup',
      measures: [
        TresCollReceiptHdr.totalAmount,
        TresCollReceiptHdr.totalReceipts,
        TresCollReceiptHdr.avgAmount,
      ],
      dimensions: [
        TresCollReceiptHdr.departmentName,
        TresCollReceiptHdr.receiptYear,
        TresCollReceiptHdr.instrumentType,
      ],
      timeDimension: TresCollReceiptHdr.receiptDate,
      granularity: 'day',
      refreshKey: {
        every: '1 hour', // Refresh every hour
      },
      // Build historical data from financial year start
      buildRangeStart: {
        sql: `SELECT DATE('2023-04-01')`,
      },
      buildRangeEnd: {
        sql: `SELECT NOW()`,
      },
    },

    // Department-wise monthly rollup for charts
    departmentMonthly: {
      type: 'rollup',
      measures: [
        TresCollReceiptHdr.totalAmount,
        TresCollReceiptHdr.totalReceipts,
      ],
      dimensions: [
        TresCollReceiptHdr.departmentName,
      ],
      timeDimension: TresCollReceiptHdr.receiptDate,
      granularity: 'month',
      partitionGranularity: 'year', // Partition by year for large datasets
      refreshKey: {
        every: '6 hours',
      },
    },

    // Yearly summary for quick year-over-year comparisons
    yearlySummary: {
      type: 'rollup',
      measures: [
        TresCollReceiptHdr.totalAmount,
        TresCollReceiptHdr.totalReceipts,
        TresCollReceiptHdr.avgAmount,
      ],
      dimensions: [
        TresCollReceiptHdr.receiptYear,
      ],
      refreshKey: {
        every: '24 hours', // Daily refresh is enough for yearly data
      },
    },

    // Instrument type analysis
    byInstrumentType: {
      type: 'rollup',
      measures: [
        TresCollReceiptHdr.totalAmount,
        TresCollReceiptHdr.totalReceipts,
      ],
      dimensions: [
        TresCollReceiptHdr.instrumentType,
        TresCollReceiptHdr.departmentName,
      ],
      timeDimension: TresCollReceiptHdr.receiptDate,
      granularity: 'day',
      refreshKey: {
        every: '2 hours',
      },
    },
  }, */
});
