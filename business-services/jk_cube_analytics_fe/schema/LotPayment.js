/* eslint-disable no-undef */
/**
 * Cube.js Schema for Lot Payments
 * Database: finance
 * Logical Cube: LotPayment
 */
cube(`LotPayment`, {
  sql: `
    SELECT
      total,
      voucher_no,
      voucher_type,
      party,
      partyvalue,
      case_type,
      type,
      typevalue,
      bank,
      COALESCE(lot_amount, 0) AS lot_amount,
      lot,
      lot_date::timestamp AS lot_date
    FROM "km.kolkata".lot_payment_data
  `,

  dataSource: `finance`,

  refreshKey: {
    every: `2 minute`
  },

  // ================= PRE AGGREGATIONS =================
  // ================= MEASURES =================
  measures: {

    totalCaseCount: {
      type: `count`,
      sql: `voucher_no`
    },

    totalPayment: {
      type: `sum`,
      sql: `total`
    },

    totalLotAmount: {
      type: `sum`,
      sql: `lot_amount`,
      format: `currency`
    },

    todaysLotAmount: {
      type: `sum`,
      sql: `lot_amount`,
      filters: [
        {
          sql: `
            ${CUBE}.lot_date >= CURRENT_DATE
            AND ${CUBE}.lot_date < CURRENT_DATE + INTERVAL '1 day'
          `
        }
      ]
    },

    todaysCaseCount: {
      type: `max`,
      sql: `lot`,
      filters: [
        {
          sql: `
            ${CUBE}.lot_date >= CURRENT_DATE
            AND ${CUBE}.lot_date < CURRENT_DATE + INTERVAL '1 day'
          `
        }
      ]
    },

    todaysPaymentCount: {
      type: `count`,
      sql: `voucher_no`,
      filters: [
        {
          sql: `
            ${CUBE}.lot_date >= CURRENT_DATE
            AND ${CUBE}.lot_date < CURRENT_DATE + INTERVAL '1 day'
          `
        }
      ]
    },
    totalLotCount: { type: "countDistinct", sql: "lot", title: "Total Lots" },
    totalPaymentCount: { type: "count", sql: "voucher_no", title: "Total Payments" },
  },

  // ================= DIMENSIONS =================
  dimensions: {

    voucherNo: {
      sql: `voucher_no`,
      type: `string`,
      primaryKey: true
    },

    voucherType: {
      sql: `voucher_type`,
      type: `string`
    },

    party: {
      sql: `party`,
      type: `string`
    },

    partyValue: {
      sql: `partyvalue`,
      type: `string`
    },

    caseType: {
      sql: `case_type`,
      type: `string`
    },

    paymentType: {
      sql: `type`,
      type: `string`
    },

    bank: {
      sql: `bank`,
      type: `string`
    },

    lotNo: {
      sql: `lot`,
      type: `string`
    },

    lotDate: {
      sql: `lot_date`,
      type: `time`
    }
  }
});
