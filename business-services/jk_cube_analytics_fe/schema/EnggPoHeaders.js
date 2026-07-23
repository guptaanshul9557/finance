cube(`EnggPoHeaders`, {
  sql: `SELECT * FROM public.engg_po_headers`,
  refreshKey: { every: `5 minutes` },
  measures: {
    totalPOCount: {
      type: 'count',
      sql: `id`,
      title: 'Total PO Count',
    },
    totalApprovedPO: {
      type: 'count',
      sql: `id`,
      title: 'Total Approved PO',
      filters: [
        { sql: `${CUBE}.status_description = 'Approved'` },
      ],
    },
    totalWorkAmount: {
      type: 'sum',
      sql: `total_work_amount`,
      title: 'Total Work Amount',
      format: 'currency',
    },
    totalApprovedAmount: {
      type: 'sum',
      sql: `total_work_amount`,
      title: 'Total Approved Amount',
      format: 'currency',
      filters: [
        { sql: `${CUBE}.status_description = 'Approved'` },
      ],
    },
    avgWorkAmount: {
      type: 'avg',
      sql: `total_work_amount`,
      title: 'Average Work Amount',
      format: 'currency',
    },
  },

  dimensions: {
    id: {
      sql: `id`,
      type: 'number',
      primaryKey: true,
    },
    poNumber: {
      sql: `po_number`,
      type: 'string',
      title: 'PO Number',
    },
    poType: {
      sql: `po_type`,
      type: 'string',
      title: 'PO Type',
    },
    contractorName: {
      sql: `engg_contractor_name`,
      type: 'string',
      title: 'Contractor Name',
    },
    tenderNo: {
      sql: `tender_no`,
      type: 'string',
      title: 'Tender No',
    },
    poCreationDate: {
      sql: `po_creation_date`,
      type: 'time',
      title: 'PO Creation Date',
    },
    poApprovalDate: {
      sql: `po_approval_date`,
      type: 'time',
      title: 'PO Approval Date',
    },
    statusDescription: {
      sql: `status_description`,
      type: 'string',
      title: 'Status',
    },
    workAmount: {
      sql: `total_work_amount`,
      type: 'number',
      title: 'Work Amount',
    },
    site: {
      sql: `site`,
      type: 'string',
      title: 'Site',
    },
    description: {
      sql: `description`,
      type: 'string',
      title: 'Description',
    },
  },

  segments: {
    approvedPOs: {
      sql: `${CUBE}.status_description = 'Approved'`,
    },
    pendingPOs: {
      sql: `${CUBE}.status_description = 'Pending'`,
    },
    largePOs: {
      sql: `${CUBE}.total_work_amount > 1000000`,
    },
  },

});
