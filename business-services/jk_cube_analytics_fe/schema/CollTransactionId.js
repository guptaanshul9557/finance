/* eslint-disable no-undef */
cube(`CollTransactionId`, {
  sql: `
    SELECT 
      a.id,
      a.process_name,
      a.receipt_no,
      a.status,
      a.createdat,
      d.department_name,
      d.department_code,
      b.tres_coll_receipt_year
    FROM public.coll_transaction_id a
    LEFT JOIN coll_kmc1_data.tres_coll_receipt_hdr b
      ON b.tres_coll_receipt_no = a.receipt_no and a.process_name = 'Data Transfer 2.0 to 1.0'
    LEFT JOIN coll_kmc1_data.com_department d
      ON b.tres_coll_department_code = CAST(d.department_code AS INTEGER)
  `,
  joins: {},
  dataSource: `default`,

  refreshKey: { every: `5 minutes` },

  measures: {
    totalTicketsPush20: {
      type: 'count',
      sql: `
        CASE 
          WHEN process_name in('Data Transfer 2.0 to 1.0')
          THEN id
        END
      `,
      title: 'Total Tickets / Push 2.0',
    },
    // Total transaction count - only for specified process names
    totalTransactions: {
      type: `count`,
      sql: `CASE WHEN process_name IN ('Data Transfer 2.0 to 1.0') THEN id END`,
      title: `Total Transactions`,
    },

    // Total volume - only for specified process names
    totalVolume: {
      type: `count`,
      sql: `CASE WHEN process_name IN ('Data Transfer 2.0 to 1.0') THEN id END`,
      title: `Total Volume`,
    },

    // Total transaction value - only for specified process names
    totalValue: {
      type: `count`,
      sql: `CASE WHEN process_name IN ('Data Transfer 2.0 to 1.0') THEN id END`,
      title: `Total Value`,
    },

    // Success count (status = '1') - only for specified process names
    successCount: {
      type: `count`,
      sql: `CASE WHEN process_name IN ('Data Transfer 2.0 to 1.0') AND status = '1' THEN id END`,
      title: `Success Count`,
    },

    // Success volume
    successVolume: {
      type: `count`,
      sql: `CASE WHEN process_name IN ('Data Transfer 2.0 to 1.0') AND status = '1' THEN id END`,
      title: `Success Volume`,
    },

    // Pending count (status in '2','3','0') - only for specified process names
    pendingCount: {
      type: `count`,
      sql: `CASE WHEN process_name IN ('Data Transfer 2.0 to 1.0') AND status IN ('2', '3', '0') THEN id END`,
      title: `Pending Count`,
    },

    // Failed count (status not in '1','2','3','0') - only for specified process names
    failedCount: {
      type: `count`,
      sql: `CASE WHEN process_name IN ('Data Transfer 2.0 to 1.0') AND status NOT IN ('1', '2', '3', '0') THEN id END`,
      title: `Failed Count`,
    },

    // Cancel count (for cancelled transactions) - only for specified process names
    cancelCount: {
      type: `count`,
      sql: `CASE WHEN process_name IN ('Data Transfer 2.0 to 1.0') AND process_name LIKE '%Cancel%' THEN id END`,
      title: `Cancel Count`,
    },

    // Cancel volume
    cancelVolume: {
      type: `count`,
      sql: `CASE WHEN process_name IN ('Data Transfer 2.0 to 1.0') AND process_name LIKE '%Cancel%' THEN id END`,
      title: `Cancel Volume`,
    },

    // Pushed count (to 1.0)
    pushedCount: {
      type: `count`,
      sql: `CASE WHEN process_name = 'Data Transfer 2.0 to 1.0' THEN id END`,
      title: `Pushed Count`,
    },

    // Pushed to 1.0 count
    pushedTo10Count: {
      type: `count`,
      sql: `CASE WHEN process_name = 'Data Transfer 2.0 to 1.0' and status = '1' THEN id END`,
      title: `Pushed to 1.0 Count`,
    },

    // Success 2.0 count
    success20Count: {
      type: `count`,
      sql: `CASE WHEN process_name LIKE '%2.0%' AND status = '1' THEN id END`,
      title: `Success 2.0 Count`,
    },
    totalVolumeToday: {
      type: 'count',
      sql: `
        CASE 
          WHEN process_name IN ('Data Transfer 2.0 to 1.0')
          AND DATE(createdat) = CURRENT_DATE
          THEN id 
        END
      `,
      title: 'Total Volume Today',
    },
    // Data Transfer 2.0 to 1.0 Success count
    dataTransfer20To10Success: {
      type: `count`,
      sql: `CASE WHEN process_name = 'Data Transfer 2.0 to 1.0' AND (status = '1' or status='4') AND DATE(createdat) = CURRENT_DATE THEN id END`,
      title: `Data Transfer Success (2.0 to 1.0)`,
    },

    // Success today including status '1' and '4' for relevant processes
    successToday14: {
      type: `count`,
      sql: `
        CASE
          WHEN process_name IN ('Data Transfer 2.0 to 1.0')
            AND status IN ('1', '4')
            AND DATE(createdat) = CURRENT_DATE
          THEN id
        END
      `,
      title: `Success Today (1 & 4)`,
    },

    // Cancel Receipt Success count
    cancelReceiptSuccess: {
      type: `count`,
      sql: `CASE WHEN process_name = 'Cancel Receipt' AND status = '1' THEN id END`,
      title: `Cancel Receipt Success`,
    },

    // Overall Success (both Data Transfer and Cancel Receipt)
    overallSuccess: {
      type: `count`,
      sql: `CASE WHEN (process_name IN ('Data Transfer 2.0 to 1.0') AND status = '1') THEN id END`,
      title: `Overall Success`,
    },

    // Current date pushed count
    currentDatePushedCount: {
      type: `count`,
      sql: `CASE WHEN DATE(createdat) = CURRENT_DATE THEN id END`,
      title: `Current Date Pushed Count`,
    },

    // Data Transfer 2.0 to 1.0 Pushed count (current date)
    dataTransferPushedCount: {
      type: `count`,
      sql: `CASE WHEN process_name = 'Data Transfer 2.0 to 1.0' AND DATE(createdat) = CURRENT_DATE THEN id END`,
      title: `Data Transfer Pushed Count`,
    },

    // Total transactions for today for Data Transfer and Cancel Receipt
    todayTransactions: {
      type: `count`,
      sql: `CASE WHEN process_name IN ('Data Transfer 2.0 to 1.0') AND DATE(createdat) = CURRENT_DATE THEN id END`,
      title: `Today Transactions (DataTransfer / Cancel)`,
    },

    // Success value (for specified process names)
    successValue: {
      type: `count`,
      sql: `CASE WHEN process_name IN ('Data Transfer 2.0 to 1.0') AND status = '1' THEN id END`,
      title: `Success Value`,
    },

    // Cancel value (for specified process names)
    cancelValue: {
      type: `count`,
      sql: `CASE WHEN process_name IN ('Data Transfer 2.0 to 1.0') AND process_name LIKE '%Cancel%' THEN id END`,
      title: `Cancel Value`,
    },
  },

  dimensions: {
    departmentName: {
      sql: `department_name`,
      type: `string`,
      title: `Department`,
    },
    // Transaction ID
    id: {
      sql: `id`,
      type: `number`,
      title: `ID`,
      primaryKey: true,
    },

    // Transaction number
    transactionNo: {
      sql: `transaction_no`,
      type: `string`,
      title: `Transaction No`,
    },

    // Receipt number
    receiptNo: {
      sql: `receipt_no`,
      type: `string`,
      title: `Receipt No`,
    },

    // Center code
    centerCode: {
      sql: `center_code`,
      type: `string`,
      title: `Center Code`,
    },

    // Process name
    processName: {
      sql: `process_name`,
      type: `string`,
      title: `Process Name`,
    },

    // Status
    status: {
      sql: `status`,
      type: `string`,
      title: `Status`,
    },

    // Status label (human-readable)
    statusLabel: {
      case: {
        when: [
          { sql: `status = '1'`, label: `Success` },
          { sql: `status = '2'`, label: `Pending` },
          { sql: `status = '3'`, label: `Pending` },
          { sql: `status = '0'`, label: `Pending` },
        ],
        else: { label: `Failed` }
      },
      type: `string`,
      title: `Status Label`,
    },

    // Created date
    createdDate: {
      sql: `createdat`,
      type: `time`,
      title: `Created Date`,
    },
    systemDate: {
      sql: `createdat`,
      type: `time`,
      title: `Created Date`,
    },

    // Updated date
    updatedDate: {
      sql: `updatedat`,
      type: `time`,
      title: `Updated Date`,
    },
  },

  segments: {
    // Success transactions
    successTransactions: {
      sql: `status = '1'`,
    },

    // Pending transactions
    pendingTransactions: {
      sql: `status IN ('2', '3', '0')`,
    },

    // Failed transactions
    failedTransactions: {
      sql: `status NOT IN ('1', '2', '3', '0')`,
    },

    // Cancelled transactions
    cancelledTransactions: {
      sql: `process_name LIKE '%Cancel%'`,
    },

    // Pushed transactions (to 1.0)
    pushedTransactions: {
      sql: `status = '1'`,
    },
  },
});
