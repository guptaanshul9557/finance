cube(`receipt_register`, {
  sql: `
    SELECT
      py.tenantid,
      py.paymentmode,
      py.paidby,
      py.additionaldetails,
      py.createdtime,
      py.additionaldetails->>'wardNo' AS ward_no,
      pyd.receiptnumber,
      pyd.receiptdate,
      REPLACE(SPLIT_PART(pyd.businessservice, '.', 1), '_', ' ') AS service_category,
      REPLACE(SPLIT_PART(pyd.businessservice, '.', 2), '_', ' ') AS service_type,
      pyd.amountpaid
    FROM public.egcl_payment py
    INNER JOIN public.egcl_paymentdetail pyd
      ON pyd.paymentid = py.id
  `,

  measures: {
    amountPaid: {
      sql: `amountpaid`,
      type: `sum`,
    },

    count: {
      type: `count`,
    },
  },

  dimensions: {
    tenantId: {
      sql: `tenantid`,
      type: `string`,
    },

    paymentMode: {
      sql: `paymentmode`,
      type: `string`,
    },

    paidBy: {
      sql: `paidby`,
      type: `string`,
    },

    additionalDetails: {
      sql: `additionaldetails`,
      type: `string`,
    },

    wardNo: {
      sql: `ward_no`,
      type: `string`,
    },

    // fundName: {
    //   sql: `fund_name`,
    //   type: `string`,
    // },

    // narration: {
    //   sql: `narration`,
    //   type: `string`,
    // },

    receiptNumber: {
      sql: `receiptnumber`,
      type: `string`,
    },

    serviceCategory: {
      sql: `service_category`,
      type: `string`,
    },

    serviceType: {
      sql: `service_type`,
      type: `string`,
    },

    receiptDate: {
      sql: `to_timestamp(receiptdate / 1000.0)`,
      type: `time`,
    },

    createdTime: {
      sql: `to_timestamp(createdtime / 1000.0)`,
      type: `time`,
    },
  },
});