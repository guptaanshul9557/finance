/* eslint-disable no-undef */
cube(`live_bills_all`, {
  sql: `SELECT * FROM public.live_bills_all`,

  measures: {
    count: {
      type: `count`,
    },

    totalExpense: {
      type: `sum`,
      sql: `${CUBE}.total_amount`,
      title: `Total Expense`,
      format: `currency`,
    },

    totalBudgetUtilized: {
      type: `sum`,
      sql: `${CUBE}.total_amount`,
      title: `Total Budget Utilized`,
      format: `currency`,
    },

    billCount: {
      type: `sum`,
      sql: `${CUBE}.bill_count`,
      title: `Bill Count`,
    },
  },

  dimensions: {
    id: {
      sql: `'pg.' || ${CUBE}.schema_name || '-' || ${CUBE}.financial_year || '-' || ${CUBE}.bill_date`,
      type: `string`,
      primaryKey: true,
    },

    schemaName: {
      sql: `'pg.' || ${CUBE}.schema_name`,
      type: `string`,
      title: `Tenant`,
    },

    financialYear: {
      sql: `${CUBE}.financial_year`,
      type: `string`,
      title: `Financial Year`,
    },

    billDate: {
      sql: `${CUBE}.bill_date`,
      type: `time`,
      title: `Bill Date`,
    },
  },
});
