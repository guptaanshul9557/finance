/* eslint-disable no-undef */
/**
 * Cube.js Schema for CRN (Challan Registered Number)
 * Database: finance
 * Logical Cube: ComRegisteredNumber
 */

cube(`ComRegisteredNumber`, {
  sql: `
    SELECT c.id,
      c.billamount AS crn_amount,
      c.crnbalanceamount AS crn_balance,
      (c.crnbalanceamount) AS crn_used_amount,
      c.fundtype,
      CASE
        WHEN c.fundtype = 1 THEN 'Government Fund'
        WHEN c.fundtype = 0 THEN 'Revenue Fund'
        WHEN c.fundtype = 3 THEN 'BEUP Fund'
        ELSE 'Other'
      END AS fund,
      ed.code || ' - ' || ed.name AS source_department,
      ed2.code || ' - ' || ed2.name AS expense_department,
      c.systemdate
    FROM "km.kolkata".comregisterednumber c
    INNER JOIN "km.kolkata".eg_department ed
      ON ed.id = c.department
    INNER JOIN "km.kolkata".eg_department ed2
      ON ed2.id = c.expensedepartment
  `,

  dataSource: `finance`,
  refreshKey: { every: `5 minutes` },

  // ================= MEASURES =================
  measures: {
    totalCRNAmount: {
      sql: `crn_amount`,
      type: `sum`,
      format: `currency`,
      title: `Total CRN Amount`,
    },

    totalCRNBalance: {
      sql: `crn_balance`,
      type: `sum`,
      format: `currency`,
      title: `Total CRN Balance`,
    },

    usedCRNAmount: {
      sql: `crn_used_amount`,
      type: `sum`,
      format: `currency`,
      title: `Used / Spent CRN Amount`,
    },

    totalCRNCount: {
      sql: `id`,
      type: `count`,
      title: `Total CRN Count`,
    },

    avgCRNAmount: {
      sql: `crn_amount`,
      type: `avg`,
      format: `currency`,
      title: `Average CRN Amount`,
    },
    todaysCRNCount: {
      sql: 'id',
      type: 'count',
      format: 'number',
      filters: [
        { sql: `(${CUBE}.systemdate)::date = CURRENT_DATE` }
      ],
      title: 'Today CRN Count',
    },
  },

  // ================= DIMENSIONS =================
  dimensions: {
    id: {
      sql: `id`,
      type: `string`,
      public: true
    },

    fundTypeCode: {
      sql: `fundtype`,
      type: `number`,
    },

    fundType: {
      sql: `fund`,
      type: `string`,
      public: true
    },

    sourceDepartment: {
      sql: `source_department`,
      type: `string`,
      public: true
    },

    expenseDepartment: {
      sql: `expense_department`,
      type: `string`,
    },

    systemDate: {
      sql: `systemdate`,
      type: `time`,
      public: true
    },
  },
});
