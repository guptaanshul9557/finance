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
        icon: <MdCurrencyRupee size={22} color="#302ba0" />,
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
        icon: <BsCashStack size={20} color="#302ba0" />,
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
        icon: <LiaMoneyCheckSolid size={22} color="#302ba0" />,
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
        icon: <MdCurrencyRupee size={22} color="#302ba0" />,
        color: "#302ba0",
        format: "currency",
        measure: "egcl_payment.todaysCollection",
        isTodayBased: true,
        isDrillingRequired: true,
      },
      {
        id: "topPerformingOrganization",
        label: "Top Performing Organization",
        icon: <FaAward size={22} color="#302ba0" />,
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
      }
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