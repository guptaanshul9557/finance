/* eslint-disable no-undef */
cube(`live_budget_all`, {
  sql: `SELECT * FROM public.live_budget_all`,

  measures: {
    count: { type: `count` },

    totalBudgetAllocated: {
      type: `sum`,
      sql: `${CUBE}.total_approvedamount`,
      title: `Total Budget Allocated`,
      format: `currency`,
    },
    totalOriginalAmount: {
      type: `sum`,
      sql: `${CUBE}.total_originalamount`,
      title: `Total Original Amount`,
      format: `currency`,
    },
    totalBudgetAvailable: {
      type: `sum`,
      sql: `${CUBE}.total_budgetavailable`,
      title: `Total Budget Available`,
      format: `currency`,
    },
  },

  dimensions: {
    id: {
      sql: `'pg.' || ${CUBE}.schema_name || '-' || ${CUBE}.financialyear`,
      type: `string`,
      primaryKey: true,
    },
    schemaName: {
      sql: `'pg.' || ${CUBE}.schema_name`,
      type: `string`,
      title: `Tenant`,
    },
    financialYear: {
      sql: `${CUBE}.financialyear`,
      type: `string`,
      title: `Financial Year`,
    },

    // NEW: synthesized time dimension, so this cube can be filtered with the same
    // timeDimensions/dateRange pattern as egcl_payment.transactionDate, instead of a
    // static equals-filter on the string. Takes the leading 4-digit year out of
    // financialyear regardless of whether it's stored as "2026-2027" or "2026-27"
    // (SPLIT_PART on '-' returns "2026" either way), and anchors it to April 1st —
    // matching the fiscal-year boundary already used everywhere else in this codebase.
    financialYearStartDate: {
      sql: `TO_DATE(SPLIT_PART(${CUBE}.financialyear, '-', 1) || '-04-01', 'YYYY-MM-DD')`,
      type: `time`,
      title: `Financial Year (Start)`,
    },
  },
});
