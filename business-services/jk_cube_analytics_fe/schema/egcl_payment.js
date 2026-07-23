/* eslint-disable no-undef */
cube(`egcl_payment`, {
  sql: `SELECT * FROM public.egcl_payment`,

  joins: {
    egcl_paymentdetail: {
      relationship: `hasOne`, // or `hasMany` — confirm with query above
      sql: `${CUBE}.id = ${egcl_paymentdetail}.paymentid`,
    },
  },
  // dataSource: `finance`,

  measures: {
    totalSum: {
      type: `sum`,
      sql: `totalamountpaid`,
      title: `Total Sum`,
      format: `currency`,
    },

    cashSum: {
      type: `sum`,
      sql: `CASE WHEN paymentmode = 'CASH' THEN totalamountpaid ELSE 0 END`,
      title: `Cash Sum`,
      format: `currency`,
    },

    chequeSum: {
      type: `sum`,
      sql: `CASE WHEN paymentmode = 'CHEQUE' THEN totalamountpaid ELSE 0 END`,
      title: `Cheque Sum`,
      format: `currency`,
    },

    DDSum: {
      type: `sum`,
      sql: `CASE WHEN paymentmode = 'DD' THEN totalamountpaid ELSE 0 END`,
      title: `DD Sum`,
      format: `currency`,
    },

    otherThanCashSum: {
      type: `sum`,
      sql: `CASE WHEN paymentmode != 'CASH' THEN totalamountpaid ELSE 0 END`,
      title: `Non-Cash Sum`,
      format: `currency`,
    },

    todaysCollection: {
      type: `sum`,
      sql: `totalamountpaid`,
      filters: [
        {
          sql: `${CUBE}.transactiondate >= EXTRACT(EPOCH FROM DATE_TRUNC('day', CURRENT_TIMESTAMP)) * 1000
            AND ${CUBE}.transactiondate <= EXTRACT(EPOCH FROM (DATE_TRUNC('day', CURRENT_TIMESTAMP) + INTERVAL '1 day' - INTERVAL '1 second')) * 1000`,
        },
      ],
      title: `Today's Collection`,
      format: `currency`,
    },
  },

  dimensions: {
    id: {
      sql: `id`,
      type: `string`,
      primaryKey: true,
    },
    tenantid: {
      sql: `UPPER(tenantid)`,
      type: `string`,
      title: `Tenant ID`,
    },

    paymentmode: {
      sql: `paymentmode`,
      type: `string`,
      title: `Payment Mode`,
    },

    transactionDate: {
      sql: `to_timestamp(${CUBE}.transactiondate / 1000.0)`,
      type: `time`,
      title: `Transaction Date`,
    },
  },
});
