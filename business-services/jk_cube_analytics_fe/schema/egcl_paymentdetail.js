cube(`egcl_paymentdetail`, {
  sql: `SELECT * FROM public.egcl_paymentdetail`,

  dimensions: {
    id: {
      sql: `${CUBE}.id`,
      type: `string`,
      primaryKey: true,
    },
    paymentid: {
      sql: `${CUBE}.paymentid`,
      type: `string`,
    },
    businessService: {
      sql: `${CUBE}.businessservice`,
      type: `string`,
      title: `Business Service`,
    },
  },
});