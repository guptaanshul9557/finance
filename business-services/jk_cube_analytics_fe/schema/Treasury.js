/* eslint-disable no-undef */
cube(`Treasury`, {
  sql: `SELECT * FROM "km.kolkata".vw_treasury_bank`,
  dataSource: `finance`,
  refreshKey: { every: `5 minutes` },

  measures: {
    totalFundAmount: {
      sql: `total_fund_amount`,
      type: `sum`,
    },

    totalAvailableBalance: {
      sql: `available_balance`,
      type: `sum`,
    },
  },

  dimensions: {
    bankId: {
      sql: `bank_id`,
      type: `string`,
      primaryKey: true,
      public: true,
    },

    bankName: {
      sql: `bank_name`,
      type: `string`,
      public: true,
    },

    branch: {
      sql: `branch_id`,
      type: `number`,
      public: true,          // 🔥 REQUIRED
    },

    bankBranchName: {
      sql: `bank_branch_name`,
      type: `string`,
      public: true,          // 🔥 REQUIRED
    },

    createdDate: {
      sql: `created_date`,
      type: `time`,
      public: true,
    },
    systemDate: {
      sql: `created_date`,
      type: `time`,
      public: true,
    },

  },
});
