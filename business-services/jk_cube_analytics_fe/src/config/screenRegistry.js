/**
 * Screen Registry - Universal Configuration for All Dashboard Screens
 *
 * This registry allows you to define complete screen configurations including:
 * - KPIs (metrics, formats, drilling)
 * - Filters (date ranges, dropdowns, multi-selects)
 * - Charts (pie, bar, line)
 * - Tables (columns, formatting)
 * - Modals and drilldowns
 *
 * To add a new screen, simply add a new object to this array!
 */

import { MdCurrencyRupee } from "react-icons/md";
import { BsCashStack } from "react-icons/bs";
import { LiaMoneyCheckSolid } from "react-icons/lia";
import { MdDashboard } from "react-icons/md";
import { FaAward } from "react-icons/fa";

// ---- Level-1 view toggle (Tenant vs Service Category) ----
const LEVEL1_VIEW_OPTIONS = [
  { id: "tenant", label: "Tenant Wise Category", dimension: "egcl_payment.tenantid" },
  { id: "service", label: "Service Wise Category", dimension: "egcl_paymentdetail.businessService" },
];

const getLevel1Dimension = (view) =>
  (LEVEL1_VIEW_OPTIONS.find((v) => v.id === view) || LEVEL1_VIEW_OPTIONS[0]).dimension;

// ---- Optional "Service Type" sub-level ----
// egcl_paymentdetail.businessService is a compound value: "SERVICE_CATEGORY.SERVICE_TYPE"
// (e.g. "HEALTH_SECTION.CD_FINE"). When the Service Category toggle is active, level-1 cards
// should show just the distinct categories (HEALTH_SECTION, BUILDING_SECTION, ...); clicking one
// should reveal the service *types* within that category before continuing to monthly/daily.
// This step is a no-op placeholder — UniversalScreen.jsx recognizes `type: "serviceType"` and:
//   - skips straight through when the Tenant toggle is active (so tenant flow is unaffected)
//   - derives the category/type breakdown entirely client-side from data already fetched at
//     level 1, so no extra Cube.js query or schema change is required.

const SERVICE_TYPE_STEP = {
  type: "serviceType",
  label: "Select Service Type",
};

// ---- Payment Type sub-level (used only by the combined Cheque+DD card) ----
// The "Non-Cash" KPI card combines egcl_payment.chequeSum + egcl_payment.DDSum into one
// dashboard tile. Clicking it should first ask "Cheque or DD?" before continuing into the
// exact same Tenant/Service → Service Type → Monthly → Daily drilldown each already had.
// This step has no dataQuery — UniversalScreen.jsx recognizes `type: "paymentTypeSelection"`,
// fetches both totals in one query, and shows two cards (Cheque / DD). Whichever is clicked
// sets filters.paymentmode, which every downstream level in this KPI's drilldownPath reads via
// `kpi.getMeasure(filters)` to decide whether to query chequeSum or DDSum.
const PAYMENT_TYPE_STEP = {
  type: "paymentTypeSelection",
  label: "Select Payment Type",
};

// After a level-1 card is clicked, UniversalScreen stores the value under
// filters[<lastSegmentOfDimension>] plus filters.level1Dimension. This reads
// it back out regardless of which dimension was active.
const getLevel1Filter = (filters) => {
  const dimension = filters?.level1Dimension || "egcl_payment.tenantid";
  const key = dimension.split(".").pop();
  return { dimension, value: filters?.[key] };
};

// Returns the current financial year in the format "2026-2027"
function getCurrentFinancialYear() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0 = Jan, 3 = Apr

  const startYear = month >= 3 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

// Returns the last N financial years (including current)
function getLastFinancialYears(count = 5) {
  const currentFY = getCurrentFinancialYear();
  const currentStartYear = parseInt(currentFY.split("-")[0], 10);

  return Array.from({ length: count }, (_, index) => {
    const startYear = currentStartYear - index;
    return `${startYear}-${startYear + 1}`;
  });
}

export const screenRegistry = [
  // ==================== ULB PAYMENT COLLECTION DASHBOARD ====================
  {
    id: "egcl_payment",
    name: "J&K Dashboard",
    displayName: "J&K HUDD Finance and Accounting Dashboard",
    route: "/modules/payment-collection",
    icon: <MdDashboard size={24} color="#302ba0"/>,
    color: "#302ba0",
    enabled: true,
    enableInHomescreen: true,
    enableInSidebar: true,

    organization: {
      enabled: true,
      defaultValue: "",
      availableOptions: [],
    },

    ulb: {
      enabled: true,
      defaultValue: "",
      availableOptions: [],
    },

    // 🔥 Wires the Organization/ULB dropdowns to actual data filtering for the header KPI cards.
    // Opt-in and generic: UniversalScreen.jsx only applies this when a screen defines it, so
    // other screens using the same dropdowns/component are unaffected if they omit this block.
    // egcl_payment.tenantid is stored as UPPER(tenantid), so filter values are upper-cased
    // before matching. (The report table's tenant filter is wired separately below, directly
    // in table.dataQuery, since receipt_register.tenantId stores the raw/lowercase code.)
    tenantFilter: {
      dimension: "egcl_payment.tenantid",
      uppercase: true,
    },

    financialYear: {
      enabled: true,
      defaultYear: getCurrentFinancialYear(),
      availableYears: getLastFinancialYears(),
    },

    // ==================== Report Fields ===========================
    fromDate: {
      enabled: true,
      defaultYear: "",
    },
    toDate: {
      enabled: true,
      defaultYear: "",
    },
    serviceCategory: {
      enabled: true,
      defaultYear: "",
       optionsQuery: {
        valueField: "egcl_payment.serviceCategory",
        labelField: "egcl_payment.serviceCategory"
        }
    },
    serviceType: {
      enabled: true,
      defaultYear: "",
       optionsQuery: {
        valueField: "egcl_payment.serviceCategory",
        labelField: "egcl_payment.serviceCategory"
        }
    },

    kpisLayout: {
      columns: 4,
      gap: "20px",
    },
    kpis: [
      {
        id: "egclTotalSum",
        label: "Total Revenue",
        icon: <MdCurrencyRupee size={18} color="#302ba0" />,
        color: "#302ba0",
        format: "currency",
        measure: "egcl_payment.totalSum",
        timeDimension: "egcl_payment.transactionDate",
        isDrillingRequired: true,
        drilldownPath: [
        {
          order: 1,
          type: "selection",
          dimension: "egcl_payment.tenantid", // default/fallback label source
          label: "Select Tenant",
          viewOptions: LEVEL1_VIEW_OPTIONS,     // <-- drives the toggle UI
          dataQuery: ({ filters, view }) => ({
            measures: ["egcl_payment.totalSum"],
            dimensions: [getLevel1Dimension(view)],
            timeDimensions: [
              {
                dimension: "egcl_payment.transactionDate",
                dateRange: filters?.dateRange || "This year",
              },
            ],
            order: { "egcl_payment.totalSum": "desc" },
          }),
        },
        SERVICE_TYPE_STEP,
        {
          order: 2,
          type: "selection",
          dimension: "egcl_payment.paymentmode",
          label: "Select Payment Mode",
          dataQuery: ({ filters }) => {
            const level1 = getLevel1Filter(filters);
            return {
              measures: ["egcl_payment.totalSum"],
              dimensions: ["egcl_payment.paymentmode"],
              filters: [
                { dimension: level1.dimension, operator: "equals", values: [level1.value] },
              ],
              timeDimensions: [
                { dimension: "egcl_payment.transactionDate", dateRange: filters?.dateRange || "This year" },
              ],
              order: { "egcl_payment.totalSum": "desc" },
            };
          },
        },
        {
          type: "monthly",
          label: "Monthly Breakdown",
          granularity: "month",
          order: 3,
          dataQuery: ({ filters }) => {
            const level1 = getLevel1Filter(filters);
            return {
              measures: ["egcl_payment.totalSum"],
              filters: [
                { dimension: level1.dimension, operator: "equals", values: [level1.value] },
              ].concat(
                filters.paymentmode
                  ? [{ dimension: "egcl_payment.paymentmode", operator: "equals", values: [filters.paymentmode] }]
                  : []
              ),
              timeDimensions: [
                { dimension: "egcl_payment.transactionDate", dateRange: filters?.dateRange || "This year" },
              ],
            };
          },
        },
        {
          type: "daily",
          label: "Daily Breakdown",
          granularity: "day",
          order: 4,
          dataQuery: ({ filters }) => {
            const level1 = getLevel1Filter(filters);
            return {
              measures: ["egcl_payment.totalSum"],
              filters: [
                { dimension: level1.dimension, operator: "equals", values: [level1.value] },
              ].concat(
                filters.paymentmode
                  ? [{ dimension: "egcl_payment.paymentmode", operator: "equals", values: [filters.paymentmode] }]
                  : []
              ),
              timeDimensions: [
                { dimension: "egcl_payment.transactionDate", dateRange: filters?.dateRange || "This year" },
              ],
            };
          },
        },
        ],
      },
      {
        id: "egclCashSum",
        label: "Cash Transactions",
        icon: <BsCashStack size={16} color="#302ba0" />,
        color: "#302ba0",
        format: "currency",
        measure: "egcl_payment.cashSum",
        timeDimension: "egcl_payment.transactionDate",
        isDrillingRequired: true,
        drilldownPath: [
          {
            order: 1,
            type: "selection",
            dimension: "egcl_payment.tenantid", // fallback label source
            label: "Select Tenant",
            viewOptions: LEVEL1_VIEW_OPTIONS,
            dataQuery: ({ filters, view }) => ({
              measures: ["egcl_payment.cashSum"],
              dimensions: [getLevel1Dimension(view)],
              timeDimensions: [
                {
                  dimension: "egcl_payment.transactionDate",
                  dateRange: filters?.dateRange || "This year",
                },
              ],
              order: { "egcl_payment.cashSum": "desc" },
            }),
          },
          SERVICE_TYPE_STEP,
          {
            type: "monthly",
            label: "Monthly Breakdown",
            granularity: "month",
            order: 2,
            dataQuery: ({ filters }) => {
              const level1 = getLevel1Filter(filters);
              return {
                measures: ["egcl_payment.cashSum"],
                filters: [
                  { dimension: level1.dimension, operator: "equals", values: [level1.value] },
                ],
                timeDimensions: [
                  {
                    dimension: "egcl_payment.transactionDate",
                    dateRange: filters?.dateRange || "This year",
                  },
                ],
              };
            },
          },
          {
            type: "daily",
            label: "Daily Breakdown",
            granularity: "day",
            order: 3,
            dataQuery: ({ filters }) => {
              const level1 = getLevel1Filter(filters);
              return {
                measures: ["egcl_payment.cashSum"],
                filters: [
                  { dimension: level1.dimension, operator: "equals", values: [level1.value] },
                ],
                timeDimensions: [
                  {
                    dimension: "egcl_payment.transactionDate",
                    dateRange: filters?.dateRange || "This year",
                  },
                ],
              };
            },
          },
        ],
      },
      {
        id: "egclNonCash",
        label: "Non-Cash Transactions",
        icon: <LiaMoneyCheckSolid size={18} color="#302ba0" />,
        color: "#302ba0",
        format: "currency",
        // No single `measure` — the card's displayed value is chequeSum + DDSum, computed via
        // customQuery + renderValue (the same pattern topPerformingOrganization already uses).
        customQuery: {
          measures: ["egcl_payment.chequeSum", "egcl_payment.DDSum"],
        },
        renderValue: (data) => {
          const row = data?.[0] || {};
          const cheque = Number(row["egcl_payment.chequeSum"]) || 0;
          const dd = Number(row["egcl_payment.DDSum"]) || 0;
          return cheque + dd;
        },
        timeDimension: "egcl_payment.transactionDate",
        isDrillingRequired: true,
        // 🔥 Every downstream level in this drilldownPath reads filters.paymentmode (set at the
        // PAYMENT_TYPE_STEP below) to decide which single measure to actually query. Existing
        // KPIs don't define `getMeasure`, so this has zero effect on any other card.
        getMeasure: (filters) =>
          filters?.paymentmode === "DD" ? "egcl_payment.DDSum" : "egcl_payment.chequeSum",
        drilldownPath: [
          PAYMENT_TYPE_STEP,
          {
            order: 1,
            type: "selection",
            dimension: "egcl_payment.tenantid", // fallback label source
            label: "Select Tenant",
            viewOptions: LEVEL1_VIEW_OPTIONS,
            dataQuery: ({ filters, view }) => {
              const measure = filters.paymentmode === "DD" ? "egcl_payment.DDSum" : "egcl_payment.chequeSum";
              return {
                measures: [measure],
                dimensions: [getLevel1Dimension(view)],
                timeDimensions: [
                  {
                    dimension: "egcl_payment.transactionDate",
                    dateRange: filters?.dateRange || "This year",
                  },
                ],
                order: { [measure]: "desc" },
              };
            },
          },
          SERVICE_TYPE_STEP,
          {
            type: "monthly",
            label: "Monthly Breakdown",
            granularity: "month",
            order: 2,
            dataQuery: ({ filters }) => {
              const level1 = getLevel1Filter(filters);
              const measure = filters.paymentmode === "DD" ? "egcl_payment.DDSum" : "egcl_payment.chequeSum";
              return {
                measures: [measure],
                filters: [
                  { dimension: level1.dimension, operator: "equals", values: [level1.value] },
                ],
                timeDimensions: [
                  {
                    dimension: "egcl_payment.transactionDate",
                    dateRange: filters?.dateRange || "This year",
                  },
                ],
              };
            },
          },
          {
            type: "daily",
            label: "Daily Breakdown",
            granularity: "day",
            order: 3,
            dataQuery: ({ filters }) => {
              const level1 = getLevel1Filter(filters);
              const measure = filters.paymentmode === "DD" ? "egcl_payment.DDSum" : "egcl_payment.chequeSum";
              return {
                measures: [measure],
                filters: [
                  { dimension: level1.dimension, operator: "equals", values: [level1.value] },
                ],
                timeDimensions: [
                  {
                    dimension: "egcl_payment.transactionDate",
                    dateRange: filters?.dateRange || "This year",
                  },
                ],
              };
            },
          },
        ],
      },
      {
        id: "egclTodayCollection",
        label: "Today's Collection Amount",
        icon: <MdCurrencyRupee size={18} color="#302ba0" />,
        color: "#302ba0",
        format: "currency",
        measure: "egcl_payment.todaysCollection",
        isTodayBased: true,
        isDrillingRequired: true,
        drilldownPath: [
          {
            order: 1,
            type: "selection",
            dimension: "egcl_payment.tenantid", // fallback label source
            label: "Select Tenant",
            viewOptions: LEVEL1_VIEW_OPTIONS,
            dataQuery: ({ filters, view }) => ({
              measures: ["egcl_payment.todaysCollection"],
              dimensions: [getLevel1Dimension(view)],
              order: {
                "egcl_payment.todaysCollection": "desc",
              },
            }),
          },
          SERVICE_TYPE_STEP,
          {
            type: "monthly",
            label: "Monthly Breakdown (Today)",
            granularity: "month",
            order: 2,
            dataQuery: ({ filters }) => {
              const level1 = getLevel1Filter(filters);
              return {
                measures: ["egcl_payment.todaysCollection"],
                filters: [
                  { dimension: level1.dimension, operator: "equals", values: [level1.value] },
                ],
              };
            },
          },
          {
            type: "daily",
            label: "Daily Breakdown (Today)",
            granularity: "day",
            order: 3,
            dataQuery: ({ filters }) => {
              const level1 = getLevel1Filter(filters);
              return {
                measures: ["egcl_payment.todaysCollection"],
                filters: [
                  { dimension: level1.dimension, operator: "equals", values: [level1.value] },
                ],
              };
            },
          },
        ],
      },
      {
        id: "topPerformingOrganizationRevenue",
        label: "Top Performing Organization (Revenue)",
        icon: <FaAward size={18} color="#302ba0" />,
        color: "#302ba0",
        format: "org",
        customQuery: {
          measures: ["egcl_payment.totalSum"],
          dimensions: ["egcl_payment.tenantid"],
          order: {
            "egcl_payment.totalSum": "desc",
          },
          limit: 1,
        },

        timeDimension: "egcl_payment.transactionDate",

        renderValue: (data) => {
          return data?.[0]?.["egcl_payment.tenantid"] || "-";
        },
        isDrillingRequired: false,
      },
      // ==================== NEW: LIVE BILLS / BUDGET KPI CARDS ====================
      // These 5 cards are backed by live_bills_all, live_budget_all, and
      // budget_utilization_summary (a combining cube — see its schema file for why a plain
      // `joins` block between live_bills_all/live_budget_all isn't used). Per spec, none of
      // these cards has a Tenant/Service Category toggle — they filter only by tenant
      // (schema_name) and financial year — so unlike the egcl_payment cards above, none of
      // these define `viewOptions`/`SERVICE_TYPE_STEP`, and their level-1 dataQuery reads the
      // tenant straight off `filters.schemaName` (no getLevel1Dimension/getLevel1Filter needed).
      //
      // live_bills_all has a real date column (bill_date), so Total Expense and Total Budget
      // Utilized get the same 3-level Tenant → Monthly → Daily drilldown as the egcl_payment
      // cards, using `kpi.timeDimension` exactly like they do. live_budget_all and
      // budget_utilization_summary have no date column — only a `financial_year` string — so
      // Total Budget Allocated and Total Budget Unutilized intentionally stop at a single
      // Tenant-breakdown level (no monthly/daily is possible without a date field), and use the
      // new `kpi.staticFilters` hook (see UniversalScreen.jsx) to apply the financial-year
      // equals-filter at the header-card level instead of a dateRange.
      //
      // All 5 set `tenantFilterDimension` so the screen's Organization/ULB dropdown filters
      // them on the correct cube's own tenant dimension rather than the screen-level default
      // (egcl_payment.tenantid), which isn't reachable from these unjoined cubes. NOTE:
      // `tenantFilterUppercase` is left `false` below — verify whether live_bills_all.schema_name
      // / live_budget_all.schema_name are stored upper- or lower-case (egcl_payment.tenantid
      // is upper-cased in its own dimension SQL; these new tables may not be) and flip if needed.
      {
        id: "egclTotalExpense",
        label: "Total Expense",
        icon: <MdCurrencyRupee size={18} color="#302ba0" />,
        color: "#302ba0",
        format: "currency",
        measure: "live_bills_all.totalExpense",
        timeDimension: "live_bills_all.billDate",
        tenantFilterDimension: "live_bills_all.schemaName",
        tenantFilterUppercase: false,
        isDrillingRequired: true,
        drilldownPath: [
          {
            order: 1,
            type: "selection",
            dimension: "live_bills_all.schemaName",
            label: "Select Tenant",
            dataQuery: ({ filters }) => ({
              measures: ["live_bills_all.totalExpense"],
              dimensions: ["live_bills_all.schemaName"],
              timeDimensions: [
                {
                  dimension: "live_bills_all.billDate",
                  dateRange: filters?.dateRange || "This year",
                },
              ],
              order: { "live_bills_all.totalExpense": "desc" },
            }),
          },
          {
            type: "monthly",
            label: "Monthly Breakdown",
            granularity: "month",
            order: 2,
            dataQuery: ({ filters }) => ({
              measures: ["live_bills_all.totalExpense"],
              filters: [
                {
                  dimension: "live_bills_all.schemaName",
                  operator: "equals",
                  values: [filters.schemaName],
                },
              ],
              timeDimensions: [
                {
                  dimension: "live_bills_all.billDate",
                  dateRange: filters?.dateRange || "This year",
                },
              ],
            }),
          },
          {
            type: "daily",
            label: "Daily Breakdown",
            granularity: "day",
            order: 3,
            dataQuery: ({ filters }) => ({
              measures: ["live_bills_all.totalExpense"],
              filters: [
                {
                  dimension: "live_bills_all.schemaName",
                  operator: "equals",
                  values: [filters.schemaName],
                },
              ],
              timeDimensions: [
                {
                  dimension: "live_bills_all.billDate",
                  dateRange: filters?.dateRange || "This year",
                },
              ],
            }),
          },
        ],
      },
      {
        id: "egclTotalBudgetAllocated",
        label: "Total Budget Allocated",
        icon: <BsCashStack size={16} color="#302ba0" />,
        color: "#302ba0",
        format: "currency",
        measure: "live_budget_all.totalBudgetAllocated",
        // Uses the synthesized financialYearStartDate (see live_budget_all.js) so this plugs
        // into the exact same kpi.timeDimension + dateRange mechanism as every other card on
        // this screen — the header query in fetchHeaderKPIs handles this automatically, no
        // staticFilters hook needed.
        timeDimension: "live_budget_all.financialYearStartDate",
        tenantFilterDimension: "live_budget_all.schemaName",
        tenantFilterUppercase: false,
        isDrillingRequired: true,
        drilldownPath: [
          // Single level only — no monthly/daily breakdown is possible; financialYearStartDate
          // is one synthetic date per (tenant, financial year), not a real per-transaction date.
          {
            order: 1,
            type: "selection",
            dimension: "live_budget_all.schemaName",
            label: "Select Tenant",
            dataQuery: ({ filters }) => ({
              measures: ["live_budget_all.totalBudgetAllocated"],
              dimensions: ["live_budget_all.schemaName"],
              timeDimensions: [
                {
                  dimension: "live_budget_all.financialYearStartDate",
                  dateRange: filters?.dateRange || "This year",
                },
              ],
              order: { "live_budget_all.totalBudgetAllocated": "desc" },
            }),
          },
        ],
      },
      {
        id: "egclTotalBudgetUtilized",
        label: "Total Budget Utilized",
        icon: <BsCashStack size={16} color="#302ba0" />,
        color: "#302ba0",
        format: "currency",
        // Same underlying figure as Total Expense today, exposed via its own measure name
        // (live_bills_all.totalBudgetUtilized) — see the schema file comment for why.
        measure: "live_bills_all.totalBudgetUtilized",
        timeDimension: "live_bills_all.billDate",
        tenantFilterDimension: "live_bills_all.schemaName",
        tenantFilterUppercase: false,
        isDrillingRequired: true,
        drilldownPath: [
          {
            order: 1,
            type: "selection",
            dimension: "live_bills_all.schemaName",
            label: "Select Tenant",
            dataQuery: ({ filters }) => ({
              measures: ["live_bills_all.totalBudgetUtilized"],
              dimensions: ["live_bills_all.schemaName"],
              timeDimensions: [
                {
                  dimension: "live_bills_all.billDate",
                  dateRange: filters?.dateRange || "This year",
                },
              ],
              order: { "live_bills_all.totalBudgetUtilized": "desc" },
            }),
          },
          {
            type: "monthly",
            label: "Monthly Breakdown",
            granularity: "month",
            order: 2,
            dataQuery: ({ filters }) => ({
              measures: ["live_bills_all.totalBudgetUtilized"],
              filters: [
                {
                  dimension: "live_bills_all.schemaName",
                  operator: "equals",
                  values: [filters.schemaName],
                },
              ],
              timeDimensions: [
                {
                  dimension: "live_bills_all.billDate",
                  dateRange: filters?.dateRange || "This year",
                },
              ],
            }),
          },
          {
            type: "daily",
            label: "Daily Breakdown",
            granularity: "day",
            order: 3,
            dataQuery: ({ filters }) => ({
              measures: ["live_bills_all.totalBudgetUtilized"],
              filters: [
                {
                  dimension: "live_bills_all.schemaName",
                  operator: "equals",
                  values: [filters.schemaName],
                },
              ],
              timeDimensions: [
                {
                  dimension: "live_bills_all.billDate",
                  dateRange: filters?.dateRange || "This year",
                },
              ],
            }),
          },
        ],
      },
      {
        id: "egclTotalBudgetUnutilized",
        label: "Total Budget Unutilized",
        icon: <BsCashStack size={16} color="#302ba0" />,
        color: "#302ba0",
        format: "currency",
        // Cross-table calculated measure — see budget_utilization_summary.js. Pre-aggregates
        // live_bills_all and live_budget_all to one row per (schema_name, financial_year)
        // BEFORE joining them, so summing this measure further never double-counts.
        measure: "budget_utilization_summary.totalBudgetUnutilized",
        // Uses the synthesized financialYearStartDate (see budget_utilization_summary.js) —
        // same pattern as egclTotalBudgetAllocated, no staticFilters hook needed.
        timeDimension: "budget_utilization_summary.financialYearStartDate",
        tenantFilterDimension: "budget_utilization_summary.schemaName",
        tenantFilterUppercase: false,
        isDrillingRequired: true,
        drilldownPath: [
          {
            order: 1,
            type: "selection",
            dimension: "budget_utilization_summary.schemaName",
            label: "Select Tenant",
            dataQuery: ({ filters }) => ({
              measures: ["budget_utilization_summary.totalBudgetUnutilized"],
              dimensions: ["budget_utilization_summary.schemaName"],
              timeDimensions: [
                {
                  dimension: "budget_utilization_summary.financialYearStartDate",
                  dateRange: filters?.dateRange || "This year",
                },
              ],
              order: { "budget_utilization_summary.totalBudgetUnutilized": "desc" },
            }),
          },
        ],
      },
      {
        id: "topPerformingOrganizationExpense",
        label: "Top Performing Organization (Expense)",
        icon: <FaAward size={18} color="#302ba0" />,
        color: "#302ba0",
        format: "org",
        // Mirrors topPerformingOrganizationRevenue's customQuery + renderValue pattern exactly.
        customQuery: {
          measures: ["live_bills_all.totalExpense"],
          dimensions: ["live_bills_all.schemaName"],
          order: {
            "live_bills_all.totalExpense": "desc",
          },
          limit: 1, // bump to N for a top-N list instead of top-1
        },
        // live_bills_all.billDate is a real time dimension, so this plugs into the existing
        // customQuery auto-dateRange logic in fetchHeaderKPIs with no further changes needed —
        // same as topPerformingOrganizationRevenue's timeDimension does today.
        timeDimension: "live_bills_all.billDate",
        tenantFilterDimension: "live_bills_all.schemaName",
        tenantFilterUppercase: false,
        renderValue: (data) => {
          return data?.[0]?.["live_bills_all.schemaName"] || "-";
        },
        isDrillingRequired: false,
      },
     
    ],

    // bodyConfig: {
    //   sections: [
    //     {
    //       id: "ulbPayment",
    //       title: "🏛️ ULB (Urban Local Body)",
    //       type: "kpiCards",
    //       layout: "grid",
    //       columns: 4,
    //       timeDimension: "egcl_payment.transactionDate",
    //       dataQuery: (filters) => ({
    //         measures: ["egcl_payment.totalSum", "egcl_payment.cashSum", "egcl_payment.otherThanCashSum"],
    //         dimensions: ["egcl_payment.tenantid"],
    //         timeDimensions: [
    //           {
    //             dimension: "egcl_payment.transactionDate",
    //             dateRange: filters.dateRange || "This year",
    //           },
    //         ],
    //         order: {
    //           "egcl_payment.totalSum": "desc",
    //         },
    //       }),
    //       cardConfig: {
    //         titleField: "egcl_payment.tenantid",
    //         valueField: "egcl_payment.totalSum",
    //         secondaryValueField: "egcl_payment.cashSum",
    //         secondaryValueLabel: "Cash",
    //         icon: "🏛️",
    //         format: "currency",
    //         measure: "egcl_payment.totalSum",
    //         timeDimension: "egcl_payment.transactionDate",
    //         enableDrilldown: true,
    //         drilldownPath: [
    //           {
    //             order: 1,
    //             type: "selection",
    //             dimension: "egcl_payment.paymentmode",
    //             label: "Select Payment Mode",
    //             dataQuery: ({ filters }) => ({
    //               measures: ["egcl_payment.totalSum"],
    //               dimensions: ["egcl_payment.paymentmode"],
    //               filters: [
    //                 {
    //                   dimension: "egcl_payment.tenantid",
    //                   operator: "equals",
    //                   values: [filters.tenantid],
    //                 },
    //               ],
    //               timeDimensions: [
    //                 {
    //                   dimension: "egcl_payment.transactionDate",
    //                   dateRange: filters?.dateRange || "This year",
    //                 },
    //               ],
    //               order: {
    //                 "egcl_payment.totalSum": "desc",
    //               },
    //             }),
    //           },
    //           {
    //             type: "monthly",
    //             label: "Monthly Breakdown",
    //             granularity: "month",
    //             order: 2,
    //             dataQuery: ({ filters, rowItem }) => ({
    //               measures: ["egcl_payment.totalSum"],
    //               filters: [
    //                 {
    //                   dimension: "egcl_payment.tenantid",
    //                   operator: "equals",
    //                   values: [filters.tenantid],
    //                 },
    //               ].concat(filters.paymentmode ? [{
    //                 dimension: "egcl_payment.paymentmode",
    //                 operator: "equals",
    //                 values: [filters.paymentmode],
    //               }] : []),
    //               timeDimensions: [
    //                 {
    //                   dimension: "egcl_payment.transactionDate",
    //                   dateRange: filters?.dateRange || "This year",
    //                 },
    //               ],
    //             }),
    //           },
    //           {
    //             type: "daily",
    //             label: "Daily Breakdown",
    //             granularity: "day",
    //             order: 3,
    //             dataQuery: ({ filters, rowItem }) => ({
    //               measures: ["egcl_payment.totalSum"],
    //               filters: [
    //                 {
    //                   dimension: "egcl_payment.tenantid",
    //                   operator: "equals",
    //                   values: [filters.tenantid],
    //                 },
    //               ].concat(filters.paymentmode ? [{
    //                 dimension: "egcl_payment.paymentmode",
    //                 operator: "equals",
    //                 values: [filters.paymentmode],
    //               }] : []),
    //               timeDimensions: [
    //                 {
    //                   dimension: "egcl_payment.transactionDate",
    //                   dateRange: filters?.dateRange || "This year",
    //                 },
    //               ],
    //             }),
    //           },
    //         ],
    //       },
    //     },
    //   ],
    // },
    
    // ======================= Report Table ========================
    table: {
      title: "Payment Transaction Details",
      pageSize: 10,
      columns: [
        {
          key: "srlNo",
          label: "Srl No.",
          type: "serial"   // special type, not a Cube.js field
        },
        {
          key: "receipt_register.receiptNumber",
          label: "Receipt No.",
          type: "text"
        },
        {
          key: "receipt_register.receiptDate",
          label: "Receipt Date",
          type: "timestamp"
        },
        {
          key: "receipt_register.serviceCategory",
          label: "Service Category",
          type: "text"
        },
        {
          key: "receipt_register.serviceType",
          label: "Service Type",
          type: "text"
        },
        {
          key: "receipt_register.paymentMode",
          label: "Payment Mode",
          type: "text"
        },
        {
          key: "receipt_register.amountPaid",
          label: "Amount",
          type: "currency"
        },
        {
          key: "receipt_register.paidBy",
          label: "Payer Name",
          type: "text"
        },
        {
          key: "receipt_register.wardNo",
          label: "Ward",
          type: "text"
        },
        {
          key: "receipt_register.tenantId",
          label: "Organization",
          type: "org"
        }
      ],
      dataQuery: (filters, offset, limit, selectedYear) => {
        const [startYear, endYear] = selectedYear?.split('-');
        const query = {
          measures: [
            "receipt_register.amountPaid"
          ],


          dimensions: [
            "receipt_register.receiptNumber",
            "receipt_register.tenantId",
            "receipt_register.paymentMode",
            "receipt_register.paidBy",
            "receipt_register.wardNo",
            "receipt_register.serviceCategory",
            "receipt_register.serviceType",
            "receipt_register.receiptDate"
          ],

          limit,
          offset
        };
        // Filter data based on the selected year
        if(selectedYear){
          query.timeDimensions = [
            {
              dimension: "receipt_register.createdTime",
              dateRange: [`${startYear}-04-01`, `${endYear}-03-31`],
            }
          ];

        }

        // Only add date filter if both dates are actually selected
        // If fromDate and toDate present, override  
        if (filters.fromDate && filters.toDate) {
          query.timeDimensions = [
            {
              dimension: "receipt_register.createdTime",
              dateRange: [filters.fromDate, filters.toDate]
            }
          ];
        }

        // Build filters array conditionally
        const queryFilters = [];

        if (filters.serviceCategory) {
          queryFilters.push({
            member: "receipt_register.serviceCategory",
            operator: "equals",
             values: [filters.serviceCategory.replace(/_/g, ' ')]
          });
        }

        if (filters.serviceType) {
          queryFilters.push({
            member: "receipt_register.serviceType",
            operator: "equals",
             values: [filters.serviceType.replace(/_/g, ' ')]
          });
        }

        // 🔥 ORGANIZATION / ULB FILTER: UniversalScreen.jsx resolves the selected
        // Organization/ULB into a concrete list of tenant codes (tenantIdValues) and passes it
        // in via `filters`. Absent (both dropdowns empty) => no filter => unchanged behavior.
        if (filters.tenantIdValues && filters.tenantIdValues.length > 0) {
          queryFilters.push({
            member: "receipt_register.tenantId",
            operator: "equals",
            values: filters.tenantIdValues,
          });
        }

        if (queryFilters.length > 0) {
          query.filters = queryFilters;
        }

        return query;
      }
    },
  },

];

// Helper function to get screen by ID
export const getScreenById = (screenId) => {
  return screenRegistry.find((screen) => screen.id === screenId);
};

// Helper function to get screen by route
export const getScreenByRoute = (route) => {
  return screenRegistry.find(
    (screen) =>
      screen.route === route
  );
};

// Helper function to get all enabled screens
export const getEnabledScreens = () => {
  return screenRegistry.filter((screen) => screen.enabled);
};

// 🏠 Helper function to get screens for home page
export const getHomescreenScreens = () => {
  return screenRegistry.filter(
    (screen) => screen.enabled && screen.enableInHomescreen
  );
};

// 📍 Helper function to get screens for sidebar navigation
export const getSidebarScreens = () => {
  return screenRegistry.filter(
    (screen) => screen.enabled && screen.enableInSidebar
  );
};

// Helper function to format value based on type
export const formatValue = (value, type) => {
  // Handle object structure { value: X, dayKey: Y }
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    value = value.value;
  }

  if (value === null || value === undefined) return "N/A";

  // If value is a pair string like "123 / 45", format both sides according to `type`.
  if (typeof value === "string" && value.includes("/")) {
    const parts = value.split("/").map((p) => p.trim());
    const leftRaw = parts[0] || "";
    const rightRaw = parts[1] || "";

    const safeNumber = (v) => {
      const n = Number(String(v).replace(/[^0-9.-]+/g, ""));
      return Number.isFinite(n) ? n : 0;
    };

    switch (type) {
      case "string": {
        const left = safeNumber(leftRaw);
        const right = safeNumber(rightRaw);
        const lf = left.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        const rf = right.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        return value;
      }
      case "currency": {
        const left = safeNumber(leftRaw);
        const right = safeNumber(rightRaw);
        const lf = left.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        const rf = right.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        return `₹${lf} / ₹${rf}`;
      }
      case "number": {
        const left = safeNumber(leftRaw);
        const right = safeNumber(rightRaw);
        return `${left.toLocaleString("en-IN")} / ${right.toLocaleString(
          "en-IN"
        )}`;
      }
      default:
        return value;
    }
  }

  if (typeof value === "string" && value !== "") {
        if (type === "text") {
        return value;
      }
      if(type === "timestamp"){
        return new Date(value).toLocaleDateString("en-GB");
      }
      if (type === "org") {
        const organization = value?.split(".")?.[1];
        return organization?.toUpperCase() ?? "";
      }
    // If string contains currency symbols or commas, try to coerce safely
    const cleaned = value.replace(/[^0-9.-]+/g, "");
    if (cleaned === "") {
      // non-numeric string - return as-is for text types
      if (type === "text" || type === undefined) return value;
    }
    value = cleaned === "" ? value : Number(cleaned);
  }

  switch (type) {
    case "currency":
      return `₹${Number(value).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    case "number":
      return Number(value).toLocaleString("en-IN");
    case "percentage":
      return `${Number(value).toFixed(2)}%`;
    case "date":
      return new Date(value).toLocaleDateString("en-IN");
    case "text":
    default:
      return value;
  }
};