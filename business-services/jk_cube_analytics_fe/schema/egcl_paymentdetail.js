cube(`egcl_paymentdetail`, {
  sql: `SELECT * FROM public.egcl_paymentdetail`,

  dimensions: {
    id: {
      sql: `id`,
      type: `string`,
      primaryKey: true,
    },
    paymentid: {
      sql: `paymentid`,
      type: `string`,
    },
    businessService: {
      sql: `businessservice`,
      type: `string`,
      title: `Business Service`,
    },
  },
});