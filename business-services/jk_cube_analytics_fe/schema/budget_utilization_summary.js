/* eslint-disable no-undef */
cube(`budget_utilization_summary`, {
  sql: `
    SELECT
      COALESCE(bills.schema_name, budget.schema_name)         AS schema_name,
      COALESCE(bills.financial_year, budget.financial_year)   AS financial_year,
      COALESCE(bills.total_expense, 0)                        AS total_expense,
      COALESCE(budget.total_approved, 0)                      AS total_approved
    FROM (
      SELECT schema_name, financial_year, SUM(total_amount) AS total_expense
      FROM public.live_bills_all
      GROUP BY schema_name, financial_year
    ) bills
    FULL OUTER JOIN (
      SELECT schema_name, financialyear AS financial_year, SUM(total_approvedamount) AS total_approved
      FROM public.live_budget_all
      GROUP BY schema_name, financialyear
    ) budget
      ON bills.schema_name = budget.schema_name
     AND bills.financial_year = budget.financial_year
  `,

  measures: {
    totalExpense: {
      type: `sum`,
      sql: `${CUBE}.total_expense`,
      title: `Total Expense`,
      format: `currency`,
    },
    totalBudgetAllocated: {
      type: `sum`,
      sql: `${CUBE}.total_approved`,
      title: `Total Budget Allocated`,
      format: `currency`,
    },
    totalBudgetUnutilized: {
      type: `sum`,
      sql: `(${CUBE}.total_approved - ${CUBE}.total_expense)`,
      title: `Total Budget Unutilized`,
      format: `currency`,
    },
  },

  dimensions: {
    id: {
      sql: `'pg.' || ${CUBE}.schema_name || '-' || ${CUBE}.financial_year`,
      type: `string`,
      primaryKey: true,
    },

    schemaName: {
      sql: `'pg.' || ${CUBE}.schema_name`,
      type: `string`,
      title: `Tenant`,
    },
    financialYear: {
      sql: `${CUBE}.financial_year`,
      type: `string`,
      title: `Financial Year`,
    },

    financialYearStartDate: {
      sql: `TO_DATE(SPLIT_PART(${CUBE}.financial_year, '-', 1) || '-04-01', 'YYYY-MM-DD')`,
      type: `time`,
      title: `Financial Year (Start)`,
    },
  },
});