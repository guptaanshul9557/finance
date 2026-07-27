/* eslint-disable no-undef */
cube(`ComDepartment`, {
  sql: `SELECT * FROM coll_kmc1_data.com_department`,
  
  joins: {},
  refreshKey: { every: `5 minutes` },
  
  dimensions: {
    // Department code (primary key)
    departmentCode: {
      sql: `department_code`,
      type: `number`,
      title: `Department Code`,
      primaryKey: true,
    },
    
    // Department name
    departmentName: {
      sql: `department_name`,
      type: `string`,
      title: `Department Name`,
    },
    
    // Portal transaction type ID
    portalTxnTypeId: {
      sql: `portal_txn_type_id`,
      type: `string`,
      title: `Portal Txn Type ID`,
    },
    
    // CC status
    ccStatus: {
      sql: `cc_status`,
      type: `number`,
      title: `CC Status`,
    },
    
    // Portal status
    portalStatus: {
      sql: `portal_status`,
      type: `number`,
      title: `Portal Status`,
    },
    
    // CC module name
    ccModuleName: {
      sql: `cc_module_name`,
      type: `string`,
      title: `CC Module Name`,
    },
    
    // Dishonor status
    dishonorStatus: {
      sql: `dishonor_status`,
      type: `number`,
      title: `Dishonor Status`,
    },
    
    // Suspense type
    suspenseType: {
      sql: `suspense_type`,
      type: `number`,
      title: `Suspense Type`,
    },
  },
});
