/**
 * Universal Screen Component
 *
 * This component renders any dashboard screen based on configuration from screenRegistry.
 * Just pass a screenId prop and it handles everything: KPIs, filters, charts, tables, drilling.
 *
 * Usage:
 *   <UniversalScreen screenId="crn_management" />
 *   <UniversalScreen screenId="common_collection" />
 */

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getScreenById, formatValue } from "../config/screenRegistry";
import cubejsApi from "../cubejs/cubejsApi";
import KPICard from "./KPICard";
import PieChart from "./charts/PieChart";
import BarChart from "./charts/BarChart";
import LineChart from "./charts/LineChart";
import Select from "react-select";
import "../styles/UniversalScreen.css";
import { IoArrowBackCircleSharp } from "react-icons/io5";
import { GrFormNextLink } from "react-icons/gr";
import { IoMdDownload } from "react-icons/io";
import axios from "axios";
import * as XLSX from "xlsx";

// Wrap cubejsApi.load with a safe fallback for time-dimension name mismatches.
// Some cubes expose `systemDate` while others expose `createdDate`. If a query
// fails because a dimension (e.g. `Treasury.systemDate`) doesn't exist, the
// wrapper will try the alternate common name (`Treasury.createdDate`) and retry.
const _originalCubeLoad = cubejsApi.load.bind(cubejsApi);
cubejsApi.load = async (query) => {
  try {
    return await _originalCubeLoad(query);
  } catch (err) {
    try {
      const msg = err && (err.message || JSON.stringify(err));
      if (msg && msg.includes("not found for path")) {
        const m = msg.match(/not found for path '([^']+)'/);
        if (m) {
          const path = m[1]; // e.g. Treasury.systemDate
          const parts = path.split(".");
          if (parts.length === 2) {
            const cube = parts[0];
            const dim = parts[1];
            let altDim = null;
            if (/systemdate/i.test(dim)) altDim = `${cube}.createdDate`;
            else if (/createddate/i.test(dim)) altDim = `${cube}.systemDate`;

            if (altDim && query && Array.isArray(query.timeDimensions)) {
              const newQuery = JSON.parse(JSON.stringify(query));
              newQuery.timeDimensions = newQuery.timeDimensions.map((td) => {
                if (td.dimension === `${cube}.${dim}`) {
                  return { ...td, dimension: altDim };
                }
                return td;
              });
              // Retry once with the alternate time-dimension
              return await _originalCubeLoad(newQuery);
            }
          }
        }
      }
    } catch (e2) {
      // ignore retry errors and fall through to rethrow original
    }
    throw err;
  }
};

// Display-only helper: raw dimension values (tenant ids, service categories/types, etc.)
// often use underscores (e.g. "ACCOUNT_SECTION" or P.>JAMMU). This turns them into a readable label
// ("ACCOUNT SECTION") or JAMMU for card titles only — the underlying value passed to
// handleDepartmentSelect / Cube.js filters is always the untouched original string.
const formatCardLabel = (label, format) => {
  if (label === null || label === undefined) return label;

  const value = String(label);

  // If it starts with "PG.", return everything after it
  if (value.startsWith("PG.")) {
    return value.substring(3);
  }

  // If it contains underscores, replace them with spaces
  if (value.includes("_")) {
    return value.replace(/_/g, " ");
  }

  // Otherwise return as is
  return value;
};

const UniversalScreen = ({ screenId }) => {
  const navigate = useNavigate();
  const screenConfig = getScreenById(screenId);

  // Helper function to handle authentication errors
  const handleAuthError = useCallback(
    (error) => {
      if (
        error.message?.includes("Invalid token") ||
        error.message?.includes("Unauthorized") ||
        error.response?.status === 401 ||
        error.response?.status === 403
      ) {
        console.error("Authentication error, redirecting to login...");
        localStorage.removeItem("token"); // Clear invalid token
        navigate("/login", { replace: true });
        return true;
      }
      return false;
    },
    [navigate],
  );

  // State Management
  const [selectedYear, setSelectedYear] = useState(
    screenConfig?.financialYear?.defaultYear || "2026-2027",
  );
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [serviceCategory, setServiceCategory] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [serviceTypeOptions, setServiceTypeOptions] = useState([]);
  const [serviceCatOptions, setServiceCatOptions] = useState([]);
  const [businessServices, setBusinessServices] = useState([]);
  const [drilldownView, setDrilldownView] = useState("tenant");
  const [isExporting, setIsExporting] = useState(false);
  const [organization, setOrganization] = useState("");
  const [ulb, setUlb] = useState("");
  const [allOrganizationOptions, setAllOrganizationOptions] = useState([]);
  const [organizationOptions, setOrganizationOptions] = useState([]);
  const [ulbOptions, setUlbOptions] = useState([]);

  const [headerKPIs, setHeaderKPIs] = useState({});
  const [bodyKPIs, setBodyKPIs] = useState({});
  const [chartData, setChartData] = useState({});
  const [chartTypes, setChartTypes] = useState({});
  const [tableData, setTableData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filter state
  const [filterValues, setFilterValues] = useState({});
  const [filterOptions, setFilterOptions] = useState({});

  // Drilling state
  const [showMonthlyDrilldown, setShowMonthlyDrilldown] = useState(false);
  const [showDailyDrilldown, setShowDailyDrilldown] = useState(false);
  const [monthlyDrilldownData, setMonthlyDrilldownData] = useState(null);
  const [dailyDrilldownData, setDailyDrilldownData] = useState(null);
  const [dailyDrilldownFilters, setDailyDrilldownFilters] = useState(null);
  const [selectedKPI, setSelectedKPI] = useState(null);

  // Department drilldown state (NEW)
  const [showDepartmentSelection, setShowDepartmentSelection] = useState(false);
  const [departmentListData, setDepartmentListData] = useState(null);
  const [departmentLoading, setDepartmentLoading] = useState(false);

  // Drilldown level tracking for color alternation
  const [drilldownLevel, setDrilldownLevel] = useState(0);

  // Chart drilldown state
  const [showChartDrilldown, setShowChartDrilldown] = useState(false);
  const [chartDrilldownData, setChartDrilldownData] = useState(null);
  const [selectedChart, setSelectedChart] = useState(null);

  // Modal chart state for different modals
  const [departmentChartData, setDepartmentChartData] = useState(null);
  const [departmentChartType, setDepartmentChartType] = useState("bar");
  const [monthlyChartData, setMonthlyChartData] = useState(null);
  const [monthlyChartType, setMonthlyChartType] = useState("bar");
  const [dailyChartData, setDailyChartData] = useState(null);
  const [dailyChartType, setDailyChartType] = useState("bar");

  // Department-wise collection state (for main dashboard)
  const [departmentWiseData, setDepartmentWiseData] = useState([]);

  // Body sections data (NEW - for generic body.sections rendering)
  const [bodySectionsData, setBodySectionsData] = useState({});
  const [modalFilter, setModalFilter] = useState([]);

  const [monthlyModalFilter, setMonthlyModalFilter] = useState([]);
  const [monthlyModalRowItem, setMonthlyModalRowItem] = useState([]);
  console.log({ modalFilter });
  console.log({ monthlyModalFilter });

  const [drilldownStack, setDrilldownStack] = useState([]);

  // ==================== RESET DRILLDOWN STATE ====================
  const resetDrilldownState = useCallback(() => {
    console.log("🔄 Resetting drilldown state");
    setShowDepartmentSelection(false);
    setShowMonthlyDrilldown(false);
    setShowDailyDrilldown(false);
    setMonthlyDrilldownData(null);
    setDailyDrilldownData(null);
    setDailyDrilldownFilters(null);
    setSelectedKPI(null);
    setDepartmentListData(null);
    setMonthlyChartData(null);
    setDailyChartData(null);
    setDrilldownStack([]);
    setDrilldownView("tenant");
    // setFromDate("");
    // setToDate("");
    // setServiceType("");
    // setServiceCategory("");
  }, []);

  const handleGoBack = () => {
    const prevLevel = drilldownStack[drilldownStack.length - 1];
    if (!prevLevel) return;
    setShowDailyDrilldown(false);
    setShowMonthlyDrilldown(false);
    setShowDepartmentSelection(false);
    if (prevLevel.type === "selection") {
      if (prevLevel.snapshot) {
        setDepartmentListData(prevLevel.snapshot.departmentListData);
        setDepartmentChartData(prevLevel.snapshot.departmentChartData);
        setDepartmentChartType(prevLevel.snapshot.departmentChartType);
        setModalFilter(prevLevel.snapshot.modalFilter);
      }
      setShowDepartmentSelection(true);
    } else if (prevLevel.type === "monthly") {
      if (prevLevel.snapshot) {
        setMonthlyDrilldownData(prevLevel.snapshot.monthlyDrilldownData);
        setMonthlyChartData(prevLevel.snapshot.monthlyChartData);
        setMonthlyChartType(prevLevel.snapshot.monthlyChartType);
        setMonthlyModalFilter(prevLevel.snapshot.monthlyModalFilter);
      }
      setShowMonthlyDrilldown(true);
    }
    setDrilldownStack((prev) => prev.slice(0, -1));
  };

  // ==================== ORGANIZATION / ULB FILTER (generic, opt-in) ====================
  // Resolves the currently-selected Organization/ULB dropdowns into a concrete list of tenant
  // codes to filter by. Returns null when neither is selected (i.e. "show everything", the
  // existing default behavior — completely unchanged).
  //   - ULB selected: filter to that exact code.
  //   - Organization selected (no ULB): filter to the organization's own code plus every child
  //     ULB under it (using the tenant list already fetched into allOrganizationOptions).

  const getChildTenantCodes = (orgCode) =>
    allOrganizationOptions
      .filter((item) => item.parent === orgCode)   // no !isParent, no code!==orgCode — just parent match
      .map((item) => item.code);

  const getOrgUlbTenantValues = () => {
    if (ulb) return [ulb];
    if (organization) {
      return [organization, ...getChildTenantCodes(organization)];
    }
    return null;
  };
  // Applies the Organization/ULB filter to a header-KPI query, IN PLACE, only when this screen
  // opts in via `screenConfig.tenantFilter`. Screens that don't define it are unaffected — this
  // is a pure no-op for them.
  const applyTenantFilterToQuery = (query) => {
    const cfg = screenConfig?.tenantFilter;
    if (!cfg?.dimension) return query;

    const tenantValues = getOrgUlbTenantValues();
    if (!tenantValues || tenantValues.length === 0) return query;

    const values =
      cfg.uppercase !== false
        ? tenantValues.map((v) => String(v).toUpperCase())
        : tenantValues;

    query.filters = [
      ...(query.filters || []),
      { member: cfg.dimension, operator: "equals", values },
    ];
    return query;
  };

  // ==================== FETCH HEADER KPIs ====================
  const fetchHeaderKPIs = async () => {
    if (!screenConfig || !screenConfig.kpis || screenConfig.kpis.length === 0)
      return;

    try {
      const [startYear, endYear] = selectedYear.split("-");
      const kpiResults = {};

      for (const kpi of screenConfig.kpis) {
        // Special logic for Today Top Grievance: fetch department with max count for today
        if (kpi.displayDepartmentName) {
          const today = new Date();
          const yyyy = today.getFullYear();
          const mm = String(today.getMonth() + 1).padStart(2, "0");
          const dd = String(today.getDate()).padStart(2, "0");
          const todayStr = `${yyyy}-${mm}-${dd}`;
          const query = {
            measures: [kpi.measure],
            dimensions: [kpi.dimension || "EgPgrService.departmentName"],
            timeDimensions: [
              {
                dimension: kpi.timeDimension,
                dateRange: [todayStr, todayStr],
              },
            ],
            order: {
              [kpi.measure]: "desc",
            },
            limit: 1,
          };
          // await cubejsApi.invalidateCache();
          applyTenantFilterToQuery(query);
          const resultSet = await cubejsApi.load(query);
          const data = resultSet.tablePivot();
          console.log({ resultSetDataHdr: data });
          // Save both value and department name
          kpiResults[kpi.id] = {
            value: data[0]?.[kpi.measure] || 0,
            department:
              data[0]?.[kpi.dimension || "EgPgrService.departmentName"] || "",
          };
          continue;
        }

        // If kpi provides a customQuery, use it (useful for multi-measure responses)
        if (kpi.customQuery?.measures?.length) {
          console.log({ customQueryInside: kpi.customQuery });
          try {
            // Clone the customQuery so we can attach dynamic timeDimensions when needed
            const queryToRun = JSON.parse(JSON.stringify(kpi.customQuery));

            // Compute date range from selected year
            const timeDim =
              kpi.timeDimension ||
              queryToRun.timeDimensions?.[0]?.dimension ||
              queryToRun.dimensions?.[0] ||
              "TresCollReceiptHdr.receiptDate";

            if (kpi.isTodayBased) {
              const today = new Date();
              const yyyy = today.getFullYear();
              const mm = String(today.getMonth() + 1).padStart(2, "0");
              const dd = String(today.getDate()).padStart(2, "0");
              const todayStr = `${yyyy}-${mm}-${dd}`;

              queryToRun.timeDimensions = [
                {
                  dimension: timeDim,
                  dateRange: [todayStr, todayStr],
                },
              ];
            } else {
              queryToRun.timeDimensions = [
                {
                  dimension: timeDim,
                  dateRange: [`${startYear}-04-01`, `${endYear}-03-31`],
                },
              ];
            }

            console.log(
              `🔍 KPI ${kpi.id} SENDING QUERY:`,
              JSON.stringify(queryToRun, null, 2),
            );
            applyTenantFilterToQuery(queryToRun);
            const resultSet = await cubejsApi.load(queryToRun);
            const data = resultSet.tablePivot();
            console.log(`🔍 KPI ${kpi.id} customQuery response:`, data);
            // If kpi has a renderValue function, call it to compute display value
            if (typeof kpi.renderValue === "function") {
              try {
                kpiResults[kpi.id] = kpi.renderValue(data);
              } catch (err) {
                console.error("❌ Error in kpi.renderValue:", err);
                kpiResults[kpi.id] = data[0] || 0;
              }
            } else {
              // Default: store the first row
              kpiResults[kpi.id] = data[0] || 0;
            }
            continue;
          } catch (err) {
            console.error(
              `❌ Error fetching customQuery for KPI ${kpi.id}:`,
              err,
            );
            kpiResults[kpi.id] = 0;
            continue;
          }
        }

        let query;

        // 🔑 If KPI defines customQuery → use it
        if (kpi?.customQuery) {
          console.log({ customQuery: kpi.customQuery }, "customQuery");

          query = structuredClone(kpi.customQuery);
        } else {
          console.log({ customQuery: kpi.measure }, "measure");

          query = {
            measures: [kpi.measure], // only for simple KPIs
          };
        }
        console.log({ query });

        if (kpi.timeDimension) {
          // If KPI is today-based, use today's date for dateRange
          if (kpi.isTodayBased) {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, "0");
            const dd = String(today.getDate()).padStart(2, "0");
            const todayStr = `${yyyy}-${mm}-${dd}`;
            query.timeDimensions = [
              {
                dimension: kpi.timeDimension,
                dateRange: [todayStr, todayStr],
              },
            ];
          } else {
            query.timeDimensions = [
              {
                dimension: kpi.timeDimension,
                dateRange: [`${startYear}-04-01`, `${endYear}-03-31`],
              },
            ];
          }
        }

        console.log(`🔍 Fetching KPI ${kpi.id} with measure:`, kpi.measure);

        // Defensive: ensure the query has valid measures before calling Cube.js
        const measuresValid =
          Array.isArray(query.measures) &&
          query.measures.length > 0 &&
          (typeof query.measures[0] === "string" ||
            typeof query.measures[0] === "object");

        if (!measuresValid) {
          console.warn(
            `Skipping KPI ${kpi.id} because query.measures is invalid:`,
            query.measures,
          );
          kpiResults[kpi.id] = 0;
          continue;
        }

        const resultSet = await cubejsApi.load(applyTenantFilterToQuery(query));
        const data = resultSet.tablePivot();
        console.log({ resultSetDatahdr3: data });
        console.log(`🔍 KPI ${kpi.id} Response:`, {
          query,
          data,
          firstRow: data[0],
          measureKey: kpi.measure,
          value: data[0]?.[kpi.measure],
          allKeys: data[0] ? Object.keys(data[0]) : [],
        });
        // Cube.js returns data with full measure name (including cube name)
        kpiResults[kpi.id] = data[0]?.[kpi.measure] || 0;
      }

      setHeaderKPIs(kpiResults);
      console.log("✅ Final Header KPIs:", kpiResults);
    } catch (error) {
      console.error("❌ Error fetching header KPIs:", error);
      if (handleAuthError(error)) {
        return;
      }
    }
  };

  // ==================== FETCH FILTER OPTIONS ====================
  const fetchFilterOptions = async () => {
    if (!screenConfig || !screenConfig.filters?.enabled) return;

    const options = {};

    for (const field of screenConfig.filters.fields || []) {
      if (field.type === "select" && field.optionsQuery) {
        try {
          const resultSet = await cubejsApi.load({
            dimensions: [
              field.optionsQuery.valueField,
              field.optionsQuery.labelField,
            ],
          });

          const data = resultSet.tablePivot();
          options[field.id] = data.map((row) => ({
            value: row[field.optionsQuery.valueField],
            label: row[field.optionsQuery.labelField],
          }));
        } catch (error) {
          console.error(`❌ Error fetching options for ${field.id}:`, error);
          if (handleAuthError(error)) {
            return;
          }
        }
      } else if (field.type === "select" && field.options) {
        options[field.id] = field.options;
      }
    }

    setFilterOptions(options);
  };

  // ==================== FETCH BODY KPIs (FILTERED) ====================
  const fetchBodyKPIs = async (isBackground = false) => {
    if (!screenConfig || !screenConfig.bodyKpis?.enabled) return;

    try {
      if (!isBackground) setLoading(true);
      const kpiResults = {};

      // Build query with filters
      for (const kpi of screenConfig.bodyKpis.kpis) {
        const query = screenConfig.table.dataQuery(filterValues);
        query.measures = [kpi.measure];

        const resultSet = await cubejsApi.load(query);
        const data = resultSet.tablePivot();
        console.log({ resultSetData: data });
        kpiResults[kpi.id] = data[0]?.[kpi.measure] || 0;
      }

      setBodyKPIs(kpiResults);
    } catch (error) {
      console.error("❌ Error fetching body KPIs:", error);
      if (handleAuthError(error)) {
        return;
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  // ==================== FETCH CHART DATA ====================
  const fetchChartData = async () => {
    if (
      !screenConfig ||
      !screenConfig.charts ||
      screenConfig.charts.length === 0
    )
      return;

    try {
      const allChartData = {};
      const [startYear, endYear] = selectedYear.split("-");

      // Fetch data for ALL charts
      for (const chart of screenConfig.charts) {
        const query = {
          measures: [chart.measure],
          dimensions: [chart.dimension],
          order: {
            [chart.measure]: chart.order?.direction || "desc",
          },
        };

        // Add time dimension if the cube has one
        if (screenConfig.schema?.cubeName) {
          const cubeName = screenConfig.schema.cubeName;

          // Check if any time dimension exists in schema
          const timeDimension = screenConfig.schema.dimensions?.find(
            (dim) => dim.type === "time",
          );

          if (timeDimension) {
            query.timeDimensions = [
              {
                dimension: `${cubeName}.${timeDimension.name}`,
                dateRange: [`${startYear}-04-01`, `${endYear}-03-31`],
              },
            ];
          }
        }

        // Apply limit if specified
        if (chart.limit) {
          query.limit = chart.limit;
        }

        const resultSet = await cubejsApi.load(query);
        const data = resultSet.tablePivot();
        console.log({ resultSetData: data });
        const formatted = data.map((row) => ({
          name: row[chart.dimension] || "N/A",
          value: parseFloat(row[chart.measure] || 0),
        }));

        allChartData[chart.id] = formatted;
      }

      setChartData(allChartData);

      // Initialize chart types with defaults
      const defaultTypes = {};
      screenConfig.charts.forEach((chart) => {
        defaultTypes[chart.id] = chart.defaultType || chart.types?.[0] || "pie";
      });
      setChartTypes(defaultTypes);
    } catch (error) {
      console.error("❌ Error fetching chart data:", error);
      if (handleAuthError(error)) {
        return;
      }
    }
  };

  // ==================== FETCH DEPARTMENT-WISE COLLECTION ====================
  const fetchDepartmentWiseCollection = async () => {
    // Only fetch for Common Collection screen
    if (screenConfig?.id !== "common_collection") return;

    try {
      const [startYear, endYear] = selectedYear.split("-");

      const query = {
        measures: ["TresCollReceiptHdr.totalAmount"],
        dimensions: ["TresCollReceiptHdr.departmentName"],
        timeDimensions: [
          {
            dimension: "TresCollReceiptHdr.receiptDate",
            dateRange: [`${startYear}-04-01`, `${endYear}-03-31`],
          },
        ],
        order: {
          "TresCollReceiptHdr.totalAmount": "desc",
        },
        limit: 10, // Top 10 departments
      };

      const resultSet = await cubejsApi.load(query);
      const data = resultSet.tablePivot();
      console.log({ resultSetData: data });
      const departments = data.map((row) => ({
        name: row["TresCollReceiptHdr.departmentName"] || "Unknown",
        value: parseFloat(row["TresCollReceiptHdr.totalAmount"] || 0),
      }));

      setDepartmentWiseData(departments);
    } catch (error) {
      console.error("❌ Error fetching department-wise collection:", error);
      if (handleAuthError(error)) {
        return;
      }
    }
  };

  // ==================== FETCH BODY SECTIONS DATA ====================
  const fetchBodySectionsData = async () => {
    if (!screenConfig?.bodyConfig?.sections) return;

    try {
      const [startYear, endYear] = selectedYear.split("-");
      const sectionsData = {};

      for (const section of screenConfig.bodyConfig.sections) {
        if (section.type === "kpiCards") {
          if (section.dataQuery) {
            // Dynamic query-based section (e.g., departmentWise with dataQuery)
            const filters = {
              dateRange: [`${startYear}-04-01`, `${endYear}-03-31`],
            };
            const query = section.dataQuery(filters);

            console.log(`🔍 Fetching body section: ${section.id}`, query);

            const resultSet = await cubejsApi.load(query);
            const data = resultSet.tablePivot();
            console.log({ resultSetData: data });

            console.log(`✅ Body section ${section.id} data:`, data);

            sectionsData[section.id] = {
              type: "dynamic",
              data: data,
              config: section.cardConfig,
            };
          } else if (section.cards) {
            // Static cards-based section (e.g., sourceWise with predefined cards)
            const cardsData = {};

            for (const card of section.cards) {
              const query = {
                measures: [card.measure],
              };

              if (card.timeDimension) {
                query.timeDimensions = [
                  {
                    dimension: card.timeDimension,
                    dateRange: [`${startYear}-04-01`, `${endYear}-03-31`],
                  },
                ];
              }

              console.log(
                `🔍 Fetching card: ${card.id} with measure:`,
                card.measure,
              );

              const resultSet = await cubejsApi.load(query);
              const data = resultSet.tablePivot();
              console.log({ resultSetData: data });
              cardsData[card.id] = {
                ...card,
                value: data[0]?.[card.measure] || 0,
              };
            }

            console.log(`✅ Body section ${section.id} cards:`, cardsData);

            sectionsData[section.id] = {
              type: "static",
              cards: cardsData,
            };
          }
        }
      }

      setBodySectionsData(sectionsData);
    } catch (error) {
      console.error("❌ Error fetching body sections:", error);
      if (handleAuthError(error)) {
        return;
      }
    }
  };

  // ==================== FETCH TABLE DATA ====================
  const fetchTableData = async (isBackground = false) => {
    if (!screenConfig || !screenConfig.table) return;

    try {
      if (!isBackground) setLoading(true);
      const offset = (currentPage - 1) * screenConfig.table.pageSize;
      const limit = screenConfig.table.pageSize;

      const tenantValues = getOrgUlbTenantValues();
      const query = screenConfig.table.dataQuery(
        {
          ...filterValues,
          ...(tenantValues ? { tenantIdValues: tenantValues } : {}),
        },
        offset,
        limit,
        selectedYear,
      );
      console.log(`🔍 Fetching table section: `, query);

      const resultSet = await cubejsApi.load(query);

      const data = resultSet.tablePivot();
      console.log({ resultSetData: data });
      setTableData(data);
    } catch (error) {
      console.error("❌ Error fetching table data:", error);
      if (handleAuthError(error)) {
        return;
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  // ==================== NEW MULTI-LEVEL DRILLDOWN HANDLER ====================
  const handleMultiLevelDrilldown = async (
    kpi,
    levelIndex = 0,
    filters = {},
    rowItem,
    viewOverride,
  ) => {
    console.log("handleMultiLevelDrilldown start", {
      kpi,
      levelIndex,
      filters,
      rowItem,
    });

    try {
      const [startYear, endYear] = selectedYear.split("-");
      const drilldownPathArray = kpi.drilldownPath || [];
      // Effective measure: prefer a per-KPI dynamic resolver (kpi.getMeasure), then explicit
      // `kpi.measure`, otherwise fall back to first customQuery measure. getMeasure lets a KPI
      // pick a different measure per drilldown based on filters already selected (e.g. the
      // combined Non-Cash card switches between chequeSum/DDSum based on filters.paymentmode).
      // Existing KPIs never define getMeasure, so this changes nothing for them.
      const measureKey =
        (typeof kpi.getMeasure === "function"
          ? kpi.getMeasure(filters)
          : undefined) ??
        kpi.measure ??
        (kpi.customQuery && Array.isArray(kpi.customQuery.measures)
          ? kpi.customQuery.measures[0]
          : undefined);
      // Effective time-dimension: prefer explicit `kpi.timeDimension`, otherwise infer from measure's cube (e.g., 'Treasury.systemDate')
      const tdDim =
        kpi.timeDimension ??
        (measureKey ? `${measureKey.split(".")[0]}.systemDate` : undefined);
      console.log(levelIndex, { drilldownPathArray });

      if (levelIndex > drilldownPathArray.length) {
        console.log("✅ Drilldown path completed");
        return;
      }

      // Get the current level config based on index
      const currentLevelConfig = drilldownPathArray[levelIndex];

      console.log(
        `📍 Processing drilldown level index ${levelIndex}:`,
        currentLevelConfig,
      );

      // ==================== GENERIC DATAQUERY HANDLING ====================
      // If the config defines a custom dataQuery function, use it!
      if (
        currentLevelConfig.dataQuery &&
        currentLevelConfig.type !== "monthly"
      ) {
        if (currentLevelConfig.type !== "daily") {
          console.log(`🚀 Using generic dataQuery for level ${levelIndex}`);
          setDepartmentLoading(true);
          try {
            // 1. Construct Cube.js filters from previous selections (stored in filters map)
            const constructedFilters = [];

            // Iterate previous levels to identify what was selected
            for (let i = 0; i < levelIndex; i++) {
              const prevConfig = drilldownPathArray[i];
              console.log({ prevConfig });

              // 🔥 FIX: For a level that offers a tenantId/serviceCategory toggle (viewOptions),
              // `prevConfig.dimension` is only a static fallback label source and never reflects
              // which toggle was actually active. `filters.level1Dimension` (set in
              // handleDepartmentSelect) is the source of truth for the active dimension.
              const effectivePrevDimension =
                i === 0 && filters.level1Dimension
                  ? filters.level1Dimension
                  : prevConfig.dimension;

              if (effectivePrevDimension) {
                // Extract the key name (e.g. "fundType" from "ComRegisteredNumber.fundType")
                const dimParts = effectivePrevDimension.split(".");
                const keyName = dimParts[dimParts.length - 1];
                const value = filters[keyName];
                if (value) {
                  constructedFilters.push({
                    member: effectivePrevDimension,
                    operator: "equals",
                    values: [value],
                  });
                  console.log(
                    `   ➕ Added context filter: ${keyName} = ${value}`,
                  );
                }
              }
            }
            console.log(`   ⚡ Executing dataQuery with kpi:`, kpi);

            // 2. Prepare context object for dataQuery
            const context = {
              ...filters, // generic map (fundType: "A")
              filters: constructedFilters, // Cube.js array ([{ member: "...", values: ["A"] }])
              dateRange: [`${startYear}-04-01`, `${endYear}-03-31`],
              year: selectedYear,
              kpiKeyFieldValue: kpi.keyFieldValue,
            };
            setModalFilter(modalFilter, ...constructedFilters);

            console.log({ constructedFilters });

            // 3. Execute the dataQuery function
            console.log(`   ⚡ Executing dataQuery with context:`, context);
            console.log(`   ⚡ Executing dataQuery with context:`, rowItem);
            const query = currentLevelConfig.dataQuery({
              filters: context,
              rowItem,
              view: viewOverride ?? drilldownView,
            });
            console.log(
              `   🔍 Generated Query:`,
              JSON.stringify(query, null, 2),
            );

            // 4. Load data
            const resultSet = await cubejsApi.load(
              applyTenantFilterToQuery(query),
            );
            const data = resultSet.tablePivot();
            console.log({ resultSetData: data });
            // 5. Map results to generic list format
            // Infer proper display keys if not explicitly known: use first dimension/measure
            const displayDim =
              query.dimensions?.[0] || currentLevelConfig.dimension;
            const displayMeasure = query.measures?.[0] || kpi.measure;

            const items = data.map((row) => {
              const rowVal = row[displayMeasure];
              return {
                name: row[displayDim] || "Unknown",
                value:
                  typeof rowVal === "number" ? rowVal : parseFloat(rowVal) || 0,
                rowItem: row,
                _raw: row,
              };
            });

            console.log(`   ✅ Query returned ${items.length} items.`);

            // 🔥 SERVICE CATEGORY FIX: egcl_paymentdetail.businessService is a compound value
            // ("SERVICE_CATEGORY.SERVICE_TYPE", e.g. "HEALTH_SECTION.CD_FINE"). When the Service
            // Category toggle is active, level-1 cards should show only the distinct categories
            // (summed), not one card per raw compound string. We derive the category breakdown
            // client-side here, and stash the raw per-businessService rows so the new
            // "serviceType" sub-level can filter/derive its cards from them directly — no extra
            // Cube.js query needed. Tenant-mode queries never use this dimension, so this block
            // is a no-op for the existing tenant flow.
            let finalItems = items;
            let rawServiceRows = null;
            if (displayDim === "egcl_paymentdetail.businessService") {
              rawServiceRows = data;
              const categoryTotals = {};
              data.forEach((row) => {
                const raw = row[displayDim] || "";
                const category = raw.split(".")[0] || "UNKNOWN";
                const rowVal = row[displayMeasure];
                const num =
                  typeof rowVal === "number" ? rowVal : parseFloat(rowVal) || 0;
                categoryTotals[category] =
                  (categoryTotals[category] || 0) + num;
              });
              finalItems = Object.entries(categoryTotals)
                .map(([name, value]) => ({
                  name,
                  value,
                  rowItem: { [displayDim]: name },
                  _raw: { [displayDim]: name },
                }))
                .sort((a, b) => b.value - a.value);
              console.log(
                `   🗂️ Grouped ${items.length} businessService rows into ${finalItems.length} service categories.`,
              );
            }

            // 🔥 DYNAMIC HEADING FIX: for a level with viewOptions (the tenantId/serviceCategory
            // toggle), the static config `label` ("Select Tenant") never reflects which toggle
            // option is actually active. Derive the heading from the active view's own label
            // instead, so it reads "Select Tenant" or "Select Service Category" correctly.
            let levelSelectionLabel = currentLevelConfig.label || "Select Item";
            if (currentLevelConfig.viewOptions?.length) {
              const activeViewId =
                viewOverride ??
                drilldownView ??
                currentLevelConfig.viewOptions[0].id;
              const activeViewOption =
                currentLevelConfig.viewOptions.find(
                  (v) => v.id === activeViewId,
                ) || currentLevelConfig.viewOptions[0];
              levelSelectionLabel = `Select ${activeViewOption.label}`;
            }

            // 6. Update State
            setSelectedKPI(kpi);
            setDepartmentListData({
              kpi: kpi,
              year: selectedYear,
              departments: finalItems,
              selectionLabel: levelSelectionLabel,
              currentLevel: levelIndex + 1,
              nextLevel: levelIndex + 2,
              levelIndex: levelIndex,
              filters: filters,
              rawServiceRows: rawServiceRows,
            });

            await fetchDepartmentChartData(kpi, finalItems);
            setDrilldownLevel(levelIndex + 1);
            setShowDepartmentSelection(true);
            return; // ✅ STOP here, do not run hardcoded logic
          } catch (err) {
            console.error("❌ Error in generic dataQuery handler:", err);
            // Fallthrough? No, probably safer to stop to avoid confusing errors from subsequent blocks
            return;
          } finally {
            setDepartmentLoading(false);
          }
        }
      }

      // ==================== PAYMENT TYPE SUB-LEVEL (Cheque vs DD) ====================
      // Used only by the combined "Non-Cash" KPI card. Fetches both totals in one query and
      // shows two cards; whichever is clicked sets filters.paymentmode, which every downstream
      // level reads (via kpi.getMeasure) to decide whether to query chequeSum or DDSum.
      if (currentLevelConfig.type === "paymentTypeSelection") {
        setDepartmentLoading(true);
        try {
          const query = {
            measures: ["egcl_payment.chequeSum", "egcl_payment.DDSum"],
            timeDimensions: [
              {
                dimension: "egcl_payment.transactionDate",
                dateRange: [`${startYear}-04-01`, `${endYear}-03-31`],
              },
            ],
          };
          const resultSet = await cubejsApi.load(
            applyTenantFilterToQuery(query),
          );
          const data = resultSet.tablePivot();
          const row = data[0] || {};
          const chequeVal = Number(row["egcl_payment.chequeSum"]) || 0;
          const ddVal = Number(row["egcl_payment.DDSum"]) || 0;

          const items = [
            {
              name: "Cheque",
              value: chequeVal,
              rowItem: { paymentType: "CHEQUE" },
              _raw: { paymentType: "CHEQUE" },
            },
            {
              name: "DD",
              value: ddVal,
              rowItem: { paymentType: "DD" },
              _raw: { paymentType: "DD" },
            },
          ];

          setSelectedKPI(kpi);
          setDepartmentListData({
            kpi: kpi,
            year: selectedYear,
            departments: items,
            selectionLabel: currentLevelConfig.label || "Select Payment Type",
            currentLevel: levelIndex + 1,
            nextLevel: levelIndex + 2,
            levelIndex: levelIndex,
            filters: filters,
          });

          await fetchDepartmentChartData(kpi, items);
          setDrilldownLevel(levelIndex + 1);
          setShowDepartmentSelection(true);
        } finally {
          setDepartmentLoading(false);
        }
        return;
      }

      // ==================== SERVICE TYPE SUB-LEVEL ====================
      // egcl_paymentdetail.businessService is "SERVICE_CATEGORY.SERVICE_TYPE". This level only
      // makes sense when the Service Category toggle was active for the level-1 selection
      // (filters.level1Dimension will be 'egcl_paymentdetail.businessService' in that case).
      // In Tenant mode there's nothing to show here, so we transparently skip straight through
      // to the next level — the tenant flow is completely unaffected.
      if (currentLevelConfig.type === "serviceType") {
        const isServiceMode =
          filters.level1Dimension === "egcl_paymentdetail.businessService";

        if (!isServiceMode) {
          console.log(
            "⏭️ Skipping Service Type level (Tenant toggle active) — passing straight through",
          );
          return handleMultiLevelDrilldown(
            kpi,
            levelIndex + 1,
            filters,
            rowItem,
            viewOverride,
          );
        }

        setDepartmentLoading(true);
        try {
          // The category chosen at level 1 was stored under filters.businessService
          // (handleDepartmentSelect stores the clicked card's name under the last segment
          // of the active dimension, which for the service toggle is "businessService").
          const selectedCategory = filters.businessService;
          const rawRows = departmentListData?.rawServiceRows || [];

          if (!selectedCategory) {
            console.warn(
              "⚠️ No service category selected — cannot derive service types.",
            );
            return;
          }

          const typeTotals = {};
          rawRows.forEach((row) => {
            const raw = row["egcl_paymentdetail.businessService"] || "";
            if (!raw.startsWith(`${selectedCategory}.`)) return;
            const type = raw.substring(selectedCategory.length + 1);
            const rowVal = row[measureKey];
            const num =
              typeof rowVal === "number" ? rowVal : parseFloat(rowVal) || 0;
            typeTotals[type] = (typeTotals[type] || 0) + num;
          });

          const items = Object.entries(typeTotals)
            .map(([name, value]) => ({
              name,
              value,
              rowItem: { businessServiceFull: `${selectedCategory}.${name}` },
              _raw: { businessServiceFull: `${selectedCategory}.${name}` },
            }))
            .sort((a, b) => b.value - a.value);

          console.log(
            `   🗂️ Derived ${items.length} service types for category "${selectedCategory}" from ${rawRows.length} cached rows.`,
          );

          setSelectedKPI(kpi);
          setDepartmentListData({
            kpi: kpi,
            year: selectedYear,
            departments: items,
            selectionLabel: currentLevelConfig.label || "Select Service Type",
            currentLevel: levelIndex + 1,
            nextLevel: levelIndex + 2,
            levelIndex: levelIndex,
            filters: filters,
            rawServiceRows: rawRows, // carried forward in case of further back/forward navigation
          });

          await fetchDepartmentChartData(kpi, items);
          setDrilldownLevel(levelIndex + 1);
          setShowDepartmentSelection(true);
        } finally {
          setDepartmentLoading(false);
        }
        return;
      }

      console.log(
        currentLevelConfig.type,
        currentLevelConfig.order === 1,
        levelIndex,
        currentLevelConfig.type === "selection" &&
          (currentLevelConfig.order === 1 ||
            (levelIndex === 0 && currentLevelConfig.type === "selection")),
      );

      // Level 1: Department Selection
      // Check by order property (new way) OR by type + position (old way for backwards compatibility)
      if (
        currentLevelConfig.type === "selection" &&
        (currentLevelConfig.order === 1 ||
          (levelIndex === 0 && currentLevelConfig.type === "selection"))
      ) {
        // Check what dimension we're selecting to show appropriate label
        const isCategory = currentLevelConfig.dimension?.includes("category");
        const isDepartment =
          currentLevelConfig.dimension?.includes("department");
        const selectionLabel = isCategory
          ? "Select Category"
          : isDepartment
            ? "Select Department"
            : "Select Option";

        console.log(`📋 Level 1: Fetching ${selectionLabel}...`);

        const level1Filters = [];

        // Add source filter if KPI has one
        if (kpi.sourceFilter) {
          level1Filters.push({
            member: kpi.sourceFilter.dimension,
            operator: "equals",
            values: [kpi.sourceFilter.value],
          });

          // Add any additional filters
          if (kpi.sourceFilter.additionalFilters) {
            kpi.sourceFilter.additionalFilters.forEach((filter) => {
              level1Filters.push({
                member: filter.dimension,
                operator: "equals",
                values: [filter.value],
              });
            });
          }
        }
        // Add department/fund-type filter if provided on the KPI (e.g., keyField/code)
        if (
          kpi.departmentFilter &&
          kpi.departmentFilter.dimension &&
          kpi.departmentFilter.value !== undefined
        ) {
          level1Filters.push({
            member: kpi.departmentFilter.dimension,
            operator: "equals",
            values: [kpi.departmentFilter.value],
          });
          console.log(
            "✅ Applied initial department/fund filter to level1:",
            kpi.departmentFilter,
          );
        }
        console.log("selectionLabel", selectionLabel, { kpi });

        setDepartmentLoading(true);
        try {
          const level1Dimensions =
            currentLevelConfig.dimensions ||
            (currentLevelConfig.dimension
              ? [currentLevelConfig.dimension]
              : []);

          const level1Query = {
            dimensions: level1Dimensions,
            measures: [measureKey],
            filters: level1Filters.length > 0 ? level1Filters : undefined,
            order: { [measureKey]: "desc" },
          };
          console.log({ tdDim });

          if (tdDim) {
            level1Query.timeDimensions = [
              {
                dimension: tdDim,
                dateRange: [`${startYear}-04-01`, `${endYear}-03-31`],
              },
            ];
          }
          console.log({ level1Query });

          const resultSet = await cubejsApi.load(
            applyTenantFilterToQuery(level1Query),
          );

          const data = resultSet.tablePivot();
          console.log({ resultSetData: data });
          const items = data.map((row) => {
            const dims = level1Dimensions;
            let name = null;
            if (currentLevelConfig.titleTemplate) {
              name = currentLevelConfig.titleTemplate
                .replace(/\{([^}]+)\}/g, (_, key) =>
                  row && row[key] !== undefined && row[key] !== null
                    ? String(row[key])
                    : "",
                )
                .trim();
            } else if (dims.length > 1) {
              name = dims
                .map((d) => row[d])
                .filter(Boolean)
                .join(" - ");
            } else {
              name = row[dims[0]];
            }

            return {
              name: name,
              value: row[measureKey] || 0,
              _raw: row,
            };
          });

          setSelectedKPI(kpi);
          setDepartmentListData({
            kpi: kpi,
            year: selectedYear,
            departments: items,
            selectionLabel: selectionLabel,
            currentLevel: 1,
            nextLevel: 2,
            levelIndex: levelIndex,
            filters: filters,
          });

          await fetchDepartmentChartData(kpi, items);
          setDrilldownLevel(1);
          setShowDepartmentSelection(true);
          console.log(`✅ Level 1 complete - showing ${selectionLabel} modal`);
          return;
        } finally {
          setDepartmentLoading(false);
        }
      }

      // Monthly Breakdown (any depth)
      if (currentLevelConfig.type === "monthly") {
        // 🔥 FIX: Dynamically extract the filter key from the appropriate level's dimension
        // If monthly is at index 0 (first level), use the dimension from the monthly config itself
        // If monthly is at index 1+, use the dimension from the first (selection) level
        let dimensionToUse;
        if (levelIndex === 0 && currentLevelConfig.dimension) {
          // Monthly is the first level - use its own dimension
          dimensionToUse = currentLevelConfig.dimension;
        } else {
          // Monthly comes after a selection level - use the ACTIVE dimension.
          // 🔥 FIX: filters.level1Dimension is set by handleDepartmentSelect based on the
          // tenantId/serviceCategory toggle. It must take precedence over the first level's
          // static `dimension` (which is only a fallback label source and never reflects the toggle).
          const firstLevelConfig = drilldownPathArray[0];
          console.log({ firstLevelConfig, currentLevelConfig });

          dimensionToUse =
            filters.level1Dimension ||
            firstLevelConfig?.dimension ||
            (Array.isArray(firstLevelConfig?.dimensions)
              ? firstLevelConfig.dimensions[0]
              : undefined);
        }

        // Extract the key name (e.g., "departmentName" from "TresCollReceiptHdr.departmentName")
        const filterKeyParts = dimensionToUse ? dimensionToUse.split(".") : [];
        const filterKey =
          filterKeyParts[filterKeyParts.length - 1] || "department"; // fallback to 'department'
        console.log(filterKey, { arshadfilters: filters }, { filterKeyParts });

        const selectedDept = filters[filterKey];
        if (!selectedDept) {
          console.warn(
            `⚠️ ${filterKey} not selected for monthly breakdown. Available filters:`,
            Object.keys(filters),
          );
          return;
        }

        console.log(
          "📊 Level Monthly: Fetching monthly data for",
          filterKey + ":",
          selectedDept,
        );

        setDepartmentLoading(true);
        try {
          const monthlyFilters = [
            {
              member: dimensionToUse,
              operator: "equals",
              values: [selectedDept],
            },
          ];

          // Add source filter if KPI has one
          if (kpi.sourceFilter) {
            monthlyFilters.push({
              member: kpi.sourceFilter.dimension,
              operator: "equals",
              values: [kpi.sourceFilter.value],
            });

            // Add any additional filters
            if (kpi.sourceFilter.additionalFilters) {
              kpi.sourceFilter.additionalFilters.forEach((filter) => {
                monthlyFilters.push({
                  member: filter.dimension,
                  operator: "equals",
                  values: [filter.value],
                });
              });
            }
          }

          console.log({ currentLevelConfig });

          const monthlyQueryTest = currentLevelConfig.dataQuery({
            filters: filters,
            rowItem: rowItem,
          });
          console.log({ monthlyQueryTest });
          const monthlyQuery = {
            measures: [measureKey],
            filters: monthlyQueryTest.filters,
          };
          setMonthlyModalFilter(monthlyQueryTest.filters);
          setMonthlyModalRowItem(rowItem);
          if (tdDim) {
            monthlyQuery.timeDimensions = [
              {
                dimension: tdDim,
                granularity: "month",
                dateRange: [`${startYear}-04-01`, `${endYear}-03-31`],
              },
            ];
            monthlyQuery.order = { [tdDim]: "asc" };
          } else {
            monthlyQuery.order = { [measureKey]: "desc" };
          }
          if (monthlyFilters?.length) {
            setModalFilter(modalFilter, ...monthlyFilters);
          }

          const resultSet = await cubejsApi.load(
            applyTenantFilterToQuery(monthlyQuery),
          );
          //   const query = screenConfig.dataQuery(filterValues);
          // query.measures = [kpi.measure];

          // const resultSet = await cubejsApi.load(query);

          const data = resultSet.tablePivot();
          console.log({ resultSetData: data });
          const monthlyData = {};

          data.forEach((row) => {
            console.log("monthKey start", kpi.timeDimension, { row, kpi });

            const monthKey = row[`${kpi.timeDimension}.month`];
            console.log("monthKey timeDimension", { monthKey });
            if (monthKey) {
              const [year, month] = monthKey.split("-");
              const monthNames = [
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
              ];
              const monthName = monthNames[parseInt(month) - 1];
              const displayKey = `${monthName} ${year}`;
              const measureValue = row[measureKey];

              monthlyData[displayKey] = {
                value:
                  typeof measureValue === "number"
                    ? measureValue
                    : parseInt(measureValue) || 0,
                monthKey: monthKey,
              };
            }
          });

          setMonthlyDrilldownData({
            kpi: kpi,
            year: selectedYear,
            months: monthlyData,
            department: selectedDept,
            currentLevel: 2,
            nextLevel: 3,
            levelIndex: levelIndex,
            filters: filters,
          });

          // Set selectedKPI so handleMonthClick has access to it
          setSelectedKPI(kpi);

          // Close all modals before showing monthly blocks
          setShowDepartmentSelection(false);
          setShowMonthlyDrilldown(false);

          await fetchMonthlyChartData(kpi, monthlyData);
          setDrilldownLevel(2);
          setShowMonthlyDrilldown(true);
          console.log("✅ Level 2 complete - showing monthly blocks");
        } finally {
          setDepartmentLoading(false);
        }
        return;
      }

      // Level 3: Check if this is 3-level drilldown going to daily (skip category selection)
      if (currentLevelConfig.type === "daily") {
        console.log(
          "📅 Level 3 (3-level drilldown): Fetching daily data directly after monthly...",
        );

        setDepartmentLoading(true);
        try {
          // This is a 3-level drilldown: Dept → Monthly → Daily
          // No category/subcategory levels, go straight to daily breakdown

          const timeDateRange =
            filters.monthDateStart && filters.monthDateEnd
              ? [filters.monthDateStart, filters.monthDateEnd]
              : [`${startYear}-04-01`, `${endYear}-03-31`];

          const queryFilters = [];

          // 🔥 FIX: Use the ACTIVE dimension (respects the tenantId/serviceCategory toggle via
          // filters.level1Dimension, set in handleDepartmentSelect), falling back to the first
          // level's static dimension only when no toggle was involved.
          const firstLevelConfig = drilldownPathArray[0];
          const firstLevelDimension =
            filters.level1Dimension ||
            firstLevelConfig?.dimension ||
            (Array.isArray(firstLevelConfig?.dimensions)
              ? firstLevelConfig.dimensions[0]
              : undefined);
          const filterKeyParts = firstLevelDimension
            ? firstLevelDimension.split(".")
            : [];
          const filterKey =
            filterKeyParts[filterKeyParts.length - 1] || "department";

          // Add department filter (required for 3-level source drilldowns)
          if (filters[filterKey]) {
            queryFilters.push({
              member: firstLevelDimension,
              operator: "equals",
              values: [filters[filterKey]],
            });
            console.log(
              `✅ Added ${filterKey} filter for daily:`,
              filters[filterKey],
            );
          }

          // Add source filter if KPI has one
          if (kpi.sourceFilter) {
            queryFilters.push({
              member: kpi.sourceFilter.dimension,
              operator: "equals",
              values: [kpi.sourceFilter.value],
            });

            // Add any additional filters
            if (kpi.sourceFilter.additionalFilters) {
              kpi.sourceFilter.additionalFilters.forEach((filter) => {
                queryFilters.push({
                  member: filter.dimension,
                  operator: "equals",
                  values: [filter.value],
                });
              });
            }
          }

          const dailyQueryTest = currentLevelConfig.dataQuery({
            filters: filters,
            rowItem: rowItem,
          });
          console.log({ dailyQueryTest });

          const dailyQuery = {
            measures: [measureKey],
            filters: dailyQueryTest?.filters?.length
              ? dailyQueryTest.filters
              : queryFilters.length > 0
                ? queryFilters
                : undefined,
          };
          if (tdDim) {
            dailyQuery.timeDimensions = [
              {
                dimension: tdDim,
                granularity: "day",
                dateRange: timeDateRange,
              },
            ];
            dailyQuery.order = { [tdDim]: "asc" };
          } else {
            dailyQuery.order = { [measureKey]: "desc" };
          }
          const resultSet = await cubejsApi.load(
            applyTenantFilterToQuery(dailyQuery),
          );

          const data = resultSet.tablePivot();
          console.log({ resultSetData: data });
          const dailyData = {};

          data.forEach((row) => {
            const dayKey = row[`${kpi.timeDimension}.day`];
            if (dayKey) {
              const measureValue = row[kpi.measure];
              dailyData[dayKey] = {
                value:
                  typeof measureValue === "number"
                    ? measureValue
                    : parseInt(measureValue) || 0,
                dayKey: dayKey,
              };
            }
          });

          console.log(
            "📊 Daily data fetched for 3-level drilldown:",
            dailyData,
          );
          console.log("📊 Total days:", Object.keys(dailyData).length);

          // Close monthly modal before showing daily data
          setShowMonthlyDrilldown(false);

          setDailyDrilldownData(dailyData);

          await fetchDailyChartData(kpi, dailyData);
          setDrilldownLevel(3);
          setShowDailyDrilldown(true);
          console.log(
            "✅ Level 3 complete - showing daily data for 3-level drilldown",
          );
        } finally {
          setDepartmentLoading(false);
        }
        return;
      }

      // Level 3: Category Selection (from monthly flow) OR Category Selection (as first level in 3-level drilldown)
      if (
        currentLevelConfig.type === "selection" &&
        (currentLevelConfig.order === 3 ||
          (levelIndex === 2 && currentLevelConfig.type === "selection"))
      ) {
        console.log("📂 Level 3: Fetching categories...");
        console.log("   Current level config:", currentLevelConfig);
        console.log("   Expected dimension:", currentLevelConfig.dimension);
        console.log("   Level index:", levelIndex);

        // Check if this is from a monthly flow (has filters.month) or category-first flow (no filters.month)
        const isFromMonthlyFlow = !!filters.month;

        console.log(
          "🔍 Context: isFromMonthlyFlow=",
          isFromMonthlyFlow,
          "filters=",
          filters,
        );
        console.log("🏗️ Drilldown Path Array:", drilldownPathArray);
        console.log(
          "🔍 Full filters object:",
          JSON.stringify(filters, null, 2),
        );

        const queryFilters = [];
        const timeDateRange = isFromMonthlyFlow
          ? [filters.monthDateStart, filters.monthDateEnd]
          : [`${startYear}-04-01`, `${endYear}-03-31`];

        // Add department/building filter if available (from either monthly flow OR from initial departmentFilter)
        if (filters.department) {
          const departmentDimension = drilldownPathArray[0].dimensions
            ? drilldownPathArray[0].dimensions[0]
            : drilldownPathArray[0].dimension;
          queryFilters.push({
            member: departmentDimension,
            operator: "equals",
            values: [filters.department],
          });
          console.log(
            "✅ Added building/department filter:",
            filters.department,
            "using dimension:",
            departmentDimension,
          );
        } else {
          console.warn(
            "⚠️ WARNING: No department filter available at Level 3!",
          );
          console.warn(
            "⚠️ This means categories will show for ALL departments, not just the selected one",
          );
          console.warn("⚠️ Available filters:", Object.keys(filters));
        }

        // Add source filter if KPI has one
        if (kpi.sourceFilter) {
          queryFilters.push({
            member: kpi.sourceFilter.dimension,
            operator: "equals",
            values: [kpi.sourceFilter.value],
          });

          // Add any additional filters
          if (kpi.sourceFilter.additionalFilters) {
            kpi.sourceFilter.additionalFilters.forEach((filter) => {
              queryFilters.push({
                member: filter.dimension,
                operator: "equals",
                values: [filter.value],
              });
            });
          }
        }

        console.log("📂 CRITICAL DEBUG - Level 3 Category Query:");
        console.log(
          "   Dimension being queried:",
          currentLevelConfig.dimension,
        );
        console.log(
          "   Query filters:",
          queryFilters.map((f) => ({ member: f.member, values: f.values })),
        );

        const level3Dimensions =
          currentLevelConfig.dimensions ||
          (currentLevelConfig.dimension ? [currentLevelConfig.dimension] : []);

        const resultSet = await cubejsApi.load({
          dimensions: level3Dimensions,
          measures: [kpi.measure],
          timeDimensions: [
            {
              dimension: kpi.timeDimension,
              dateRange: timeDateRange,
              // NOTE: No granularity - we want total count for entire date range, not monthly breakdown
            },
          ],
          filters: queryFilters.length > 0 ? queryFilters : undefined,
          order: {
            [kpi.measure]: "desc",
          },
        });

        console.log("🔍 Level 3 Category Query Details:", {
          dimension: currentLevelConfig.dimension,
          filters: queryFilters,
          dateRange: timeDateRange,
        });

        const data = resultSet.tablePivot();
        const categories = data.map((row) => {
          const dims = level3Dimensions;
          let name = null;
          if (currentLevelConfig.titleTemplate) {
            name = currentLevelConfig.titleTemplate
              .replace(/\{([^}]+)\}/g, (_, key) =>
                row && row[key] !== undefined && row[key] !== null
                  ? String(row[key])
                  : "",
              )
              .trim();
          } else if (dims.length > 1) {
            name = dims
              .map((d) => row[d])
              .filter(Boolean)
              .join(" - ");
          } else {
            name = row[dims[0]];
          }
          return { name, value: row[kpi.measure] || 0, _raw: row };
        });

        console.log("📊 Query Filters Applied:", queryFilters);
        console.log("🔍 Raw Category Data from Cube.js:", data);
        console.log("📋 Processed Categories:", categories);
        console.log(
          `✅ Found ${categories.length} categories for ${filters.department}`,
        );

        // Close monthly modal before showing category modal
        setShowMonthlyDrilldown(false);

        const categoryTitle = isFromMonthlyFlow
          ? `${filters.department} - Select Category`
          : "Select Category";

        setDepartmentListData({
          kpi: kpi,
          year: selectedYear,
          departments: categories,
          title: categoryTitle,
          currentLevel: 3,
          nextLevel: 4,
          levelIndex: levelIndex,
          filters: filters,
        });

        // Fetch chart data for categories
        await fetchDepartmentChartData(kpi, categories);

        setDrilldownLevel(3);
        setShowDepartmentSelection(true);
        console.log("✅ Level 3 complete - showing category modal");
        console.log(
          "   Will call handleDepartmentSelect when user clicks a category",
        );
        return;
      }

      if (currentLevelConfig.type === "selection") {
        console.log("📂 Level 3: Fetching categories...");
        console.log("   Current level config:", currentLevelConfig);
        console.log("   Expected dimension:", currentLevelConfig.dimension);
        console.log("   Level index:", levelIndex);

        // Check if this is from a monthly flow (has filters.month) or category-first flow (no filters.month)
        const isFromMonthlyFlow = !!filters.month;

        console.log(
          "🔍 Context: isFromMonthlyFlow=",
          isFromMonthlyFlow,
          "filters=",
          filters,
        );
        console.log("🏗️ Drilldown Path Array:", drilldownPathArray);
        console.log(
          "🔍 Full filters object:",
          JSON.stringify(filters, null, 2),
        );

        const queryFilters = [];
        const timeDateRange = isFromMonthlyFlow
          ? [filters.monthDateStart, filters.monthDateEnd]
          : [`${startYear}-04-01`, `${endYear}-03-31`];

        // Add department/building filter if available (from either monthly flow OR from initial departmentFilter)
        if (filters.department) {
          const departmentDimension = drilldownPathArray[0].dimensions
            ? drilldownPathArray[0].dimensions[0]
            : drilldownPathArray[0].dimension;
          queryFilters.push({
            member: departmentDimension,
            operator: "equals",
            values: [filters.department],
          });
          console.log(
            "✅ Added building/department filter:",
            filters.department,
            "using dimension:",
            departmentDimension,
          );
        } else {
          console.warn(
            "⚠️ WARNING: No department filter available at Level 3!",
          );
          console.warn(
            "⚠️ This means categories will show for ALL departments, not just the selected one",
          );
          console.warn("⚠️ Available filters:", Object.keys(filters));
        }

        // Add source filter if KPI has one
        if (kpi.sourceFilter) {
          queryFilters.push({
            member: kpi.sourceFilter.dimension,
            operator: "equals",
            values: [kpi.sourceFilter.value],
          });

          // Add any additional filters
          if (kpi.sourceFilter.additionalFilters) {
            kpi.sourceFilter.additionalFilters.forEach((filter) => {
              queryFilters.push({
                member: filter.dimension,
                operator: "equals",
                values: [filter.value],
              });
            });
          }
        }

        console.log("📂 CRITICAL DEBUG - Level 3 Category Query:");
        console.log(
          "   Dimension being queried:",
          currentLevelConfig.dimension,
        );
        console.log(
          "   Query filters:",
          queryFilters.map((f) => ({ member: f.member, values: f.values })),
        );

        const level3Dimensions =
          currentLevelConfig.dimensions ||
          (currentLevelConfig.dimension ? [currentLevelConfig.dimension] : []);

        const resultSet = await cubejsApi.load({
          dimensions: level3Dimensions,
          measures: [kpi.measure],
          timeDimensions: [
            {
              dimension: kpi.timeDimension,
              dateRange: timeDateRange,
              // NOTE: No granularity - we want total count for entire date range, not monthly breakdown
            },
          ],
          filters: queryFilters.length > 0 ? queryFilters : undefined,
          order: {
            [kpi.measure]: "desc",
          },
        });

        console.log("🔍 Level 3 Category Query Details:", {
          dimension: currentLevelConfig.dimension,
          filters: queryFilters,
          dateRange: timeDateRange,
        });

        const data = resultSet.tablePivot();
        const categories = data.map((row) => {
          const dims = level3Dimensions;
          let name = null;
          if (currentLevelConfig.titleTemplate) {
            name = currentLevelConfig.titleTemplate
              .replace(/\{([^}]+)\}/g, (_, key) =>
                row && row[key] !== undefined && row[key] !== null
                  ? String(row[key])
                  : "",
              )
              .trim();
          } else if (dims.length > 1) {
            name = dims
              .map((d) => row[d])
              .filter(Boolean)
              .join(" - ");
          } else {
            name = row[dims[0]];
          }
          return { name, value: row[kpi.measure] || 0, _raw: row };
        });

        console.log("📊 Query Filters Applied:", queryFilters);
        console.log("🔍 Raw Category Data from Cube.js:", data);
        console.log("📋 Processed Categories:", categories);
        console.log(
          `✅ Found ${categories.length} categories for ${filters.department}`,
        );

        // Close monthly modal before showing category modal
        setShowMonthlyDrilldown(false);

        const categoryTitle = currentLevelConfig.label;

        setDepartmentListData({
          kpi: kpi,
          year: selectedYear,
          departments: categories,
          title: categoryTitle,
          currentLevel: 3,
          nextLevel: 4,
          levelIndex: levelIndex,
          filters: filters,
        });

        // Fetch chart data for categories
        await fetchDepartmentChartData(kpi, categories);

        setDrilldownLevel(3);
        setShowDepartmentSelection(true);
        console.log("✅ Level 3 complete - showing category modal");
        console.log(
          "   Will call handleDepartmentSelect when user clicks a category",
        );
        return;
      }

      // Level 3/4: Sub-Category Selection (can be at order 4 depending on path, or levelIndex 3)
      // CRITICAL: Only trigger if:
      // 1. Type is 'selection'
      // 2. Dimension is 'subcategory'
      // 3. We have a category filter (meaning category was already selected)
      if (
        currentLevelConfig.type === "selection" &&
        currentLevelConfig.dimension?.includes("subcategory") &&
        filters.category
      ) {
        console.log(
          "📂 Level 4: Fetching sub-categories for category:",
          filters.category,
        );
        console.log("📊 Filters passed:", filters);
        console.log("   Level index:", levelIndex);
        console.log(
          "   Current config dimension:",
          currentLevelConfig.dimension,
        );

        // Check if this is 5-level (has department) or 3-level (no department) flow
        const isFiveLevel = !!filters.department;
        console.log(
          "🔍 Flow type:",
          isFiveLevel
            ? "5-level (Department→Monthly→Category→SubCat→Daily)"
            : "3-level (Building→Monthly→SubCat→Daily)",
        );

        const timeDateRange =
          isFiveLevel && filters.monthDateStart
            ? [filters.monthDateStart, filters.monthDateEnd]
            : [`${startYear}-04-01`, `${endYear}-03-31`];

        const queryFilters = [];

        // Add category filter (always needed) - use drilldownPathArray index
        const categoryDimension = drilldownPathArray.find(
          (p) =>
            p.dimension?.includes("category") &&
            !p.dimension?.includes("subcategory"),
        )?.dimension;
        queryFilters.push({
          member: categoryDimension,
          operator: "equals",
          values: [filters.category],
        });
        console.log(
          "✅ Added category filter:",
          filters.category,
          "using dimension:",
          categoryDimension,
        );

        // Add department filter only if in 5-level flow
        if (isFiveLevel && filters.department) {
          const departmentDimension = drilldownPathArray[0].dimensions
            ? drilldownPathArray[0].dimensions[0]
            : drilldownPathArray[0].dimension;
          queryFilters.unshift({
            member: departmentDimension,
            operator: "equals",
            values: [filters.department],
          });
          console.log(
            "✅ Added department filter:",
            filters.department,
            "using dimension:",
            departmentDimension,
          );
        }

        // Add source filter if KPI has one
        if (kpi.sourceFilter) {
          queryFilters.push({
            member: kpi.sourceFilter.dimension,
            operator: "equals",
            values: [kpi.sourceFilter.value],
          });

          // Add any additional filters
          if (kpi.sourceFilter.additionalFilters) {
            kpi.sourceFilter.additionalFilters.forEach((filter) => {
              queryFilters.push({
                member: filter.dimension,
                operator: "equals",
                values: [filter.value],
              });
            });
          }
        }

        console.log("📂 CRITICAL DEBUG - Level 4 Subcategory Query:");
        console.log(
          "   Dimension being queried:",
          currentLevelConfig.dimension,
        );
        console.log("   Category filter:", filters.category);
        console.log(
          "   Query filters:",
          queryFilters.map((f) => ({ member: f.member, values: f.values })),
        );

        const level4Dimensions =
          currentLevelConfig.dimensions ||
          (currentLevelConfig.dimension ? [currentLevelConfig.dimension] : []);

        const resultSet = await cubejsApi.load({
          dimensions: level4Dimensions,
          measures: [kpi.measure],
          timeDimensions: [
            {
              dimension: kpi.timeDimension,
              dateRange: timeDateRange,
              // NOTE: No granularity - we want total count for entire date range, not monthly breakdown
            },
          ],
          filters: queryFilters,
          order: {
            [kpi.measure]: "desc",
          },
        });

        const data = resultSet.tablePivot();
        const subcategories = data.map((row) => {
          const dims = level4Dimensions;
          let name = null;
          if (currentLevelConfig.titleTemplate) {
            name = currentLevelConfig.titleTemplate
              .replace(/\{([^}]+)\}/g, (_, key) =>
                row && row[key] !== undefined && row[key] !== null
                  ? String(row[key])
                  : "",
              )
              .trim();
          } else if (dims.length > 1) {
            name = dims
              .map((d) => row[d])
              .filter(Boolean)
              .join(" - ");
          } else {
            name = row[dims[0]];
          }
          return { name, value: row[kpi.measure] || 0, _raw: row };
        });

        console.log("📊 Level 4 Subcategory Query Details:", {
          category: filters.category,
          filters: queryFilters,
          dateRange: timeDateRange,
          subcategoriesCount: subcategories.length,
          subcategories: subcategories,
        });

        setDepartmentListData({
          kpi: kpi,
          year: selectedYear,
          departments: subcategories,
          title: `${filters.department ? filters.department + " - " : ""}${filters.category} - Select Sub-Category`,
          currentLevel: 4,
          nextLevel: 5,
          levelIndex: levelIndex,
          filters: filters,
        });

        // Fetch chart data for sub-categories
        await fetchDepartmentChartData(kpi, subcategories);

        setDrilldownLevel(4);
        setShowDepartmentSelection(true);
        console.log("✅ Level 4 complete - showing sub-category modal");
        console.log(
          "   Will call handleDepartmentSelect when user clicks a subcategory",
        );
        return;
      }

      // Level 3/4/5: Daily Breakdown (can be at order 3, 4, or 5 depending on drilldown path length)
      if (currentLevelConfig.type === "daily") {
        console.log("📅 Daily Breakdown: Fetching daily data...");
        console.log(
          "📅 Daily level index:",
          levelIndex,
          "currentLevelConfig:",
          currentLevelConfig,
        );

        // Check if this is 5-level (has department) or 3-level (no department) flow
        const isFiveLevel = !!filters.department;

        const timeDateRange =
          isFiveLevel && filters.monthDateStart
            ? [filters.monthDateStart, filters.monthDateEnd]
            : [`${startYear}-04-01`, `${endYear}-03-31`];

        const queryFilters = [];

        // Find indices for category and subcategory in drilldown path
        const categoryLevelIndex = drilldownPathArray.findIndex(
          (p) =>
            p.dimension?.includes("category") &&
            !p.dimension?.includes("subcategory"),
        );
        const subcategoryLevelIndex = drilldownPathArray.findIndex((p) =>
          p.dimension?.includes("subcategory"),
        );

        // Add department filter only if in 5-level flow
        if (isFiveLevel && filters.department) {
          const departmentDimension = drilldownPathArray[0].dimensions
            ? drilldownPathArray[0].dimensions[0]
            : drilldownPathArray[0].dimension;
          queryFilters.push({
            member: departmentDimension,
            operator: "equals",
            values: [filters.department],
          });
          console.log("✅ Added department filter:", filters.department);
        }

        // Add category filter (if available and if category comes BEFORE daily in drilldown path)
        const categoryDimension =
          drilldownPathArray[categoryLevelIndex]?.dimension;
        if (
          categoryLevelIndex >= 0 &&
          categoryLevelIndex < levelIndex &&
          filters.category
        ) {
          queryFilters.push({
            member: categoryDimension,
            operator: "equals",
            values: [filters.category],
          });
          console.log(
            "✅ Added category filter:",
            filters.category,
            "(category is at index",
            categoryLevelIndex,
            ", current level is",
            levelIndex,
            ")",
          );
        }

        // Add subcategory filter (if available and if subcategory comes BEFORE daily in drilldown path)
        const subcategoryDimension =
          drilldownPathArray[subcategoryLevelIndex]?.dimension;
        if (
          subcategoryLevelIndex >= 0 &&
          subcategoryLevelIndex < levelIndex &&
          filters.subcategory
        ) {
          queryFilters.push({
            member: subcategoryDimension,
            operator: "equals",
            values: [filters.subcategory],
          });
          console.log(
            "✅ Added subcategory filter:",
            filters.subcategory,
            "(subcategory is at index",
            subcategoryLevelIndex,
            ", current level is",
            levelIndex,
            ")",
          );
        } else if (subcategoryLevelIndex >= 0 && filters.subcategory) {
          console.log(
            "⚠️ WARNING: Subcategory exists in filter but drilldown order is wrong!",
          );
          console.log(
            "   Category index:",
            categoryLevelIndex,
            "Subcategory index:",
            subcategoryLevelIndex,
            "Current level:",
            levelIndex,
          );
          console.log(
            "   This usually means category was selected but subcategory selection was skipped",
          );
        }

        // Add source filter if KPI has one (for Grievances Sources cards)
        if (kpi.sourceFilter) {
          queryFilters.push({
            member: kpi.sourceFilter.dimension,
            operator: "equals",
            values: [kpi.sourceFilter.value],
          });
          console.log("✅ Added source filter:", kpi.sourceFilter.value);

          // Add any additional filters (for whatsapp servicetype, etc.)
          if (kpi.sourceFilter.additionalFilters) {
            kpi.sourceFilter.additionalFilters.forEach((filter) => {
              queryFilters.push({
                member: filter.dimension,
                operator: "equals",
                values: [filter.value],
              });
              console.log(
                "✅ Added additional filter:",
                filter.dimension,
                "=",
                filter.value,
              );
            });
          }
        }

        // Validate we have the required filters
        console.log("📊 Available filters for daily query:", {
          department: filters.department || "N/A",
          category: filters.category || "N/A",
          subcategory: filters.subcategory || "N/A",
          source: kpi.sourceFilter?.value || "N/A",
        });

        if (queryFilters.length === 0) {
          console.warn("⚠️ WARNING: No filters available for daily breakdown!");
          console.warn("⚠️ Will fetch all data for the date range");
        }

        console.log(
          "🔍 Daily breakdown filters applied - showing all grievances for selected criteria",
        );
        console.log("🔍 Daily Query Debug Info:", {
          department: filters.department,
          category: filters.category,
          subcategory: filters.subcategory,
          monthDateStart: filters.monthDateStart,
          monthDateEnd: filters.monthDateEnd,
          timeDateRange: timeDateRange,
          allFilters: filters,
        });

        console.log("📅 Level 5 Daily Query - ACTUAL FILTERS BEING USED:", {
          measure: kpi.measure,
          queryFilters: queryFilters.map((f) => ({
            member: f.member,
            values: f.values,
          })),
          dateRange: timeDateRange,
          filtersObject: filters,
        });
        const dailyQueryTest = currentLevelConfig.dataQuery({
          filters: filters,
          rowItem: rowItem,
        });
        console.log({ dailyQueryTest });

        const cubeQuery = {
          measures: [kpi.measure],
          timeDimensions: [
            {
              dimension: kpi.timeDimension,
              granularity: "day",
              dateRange: timeDateRange,
            },
          ],
          filters: dailyQueryTest?.filters || undefined,
          order: {
            [kpi.timeDimension]: "asc",
          },
        };

        console.log(
          "🔍 CUBE.JS QUERY FOR DAILY BREAKDOWN:",
          JSON.stringify(cubeQuery, null, 2),
        );

        const resultSet = await cubejsApi.load(cubeQuery);

        const data = resultSet.tablePivot();
        console.log({ resultSetData: data });
        const dailyData = {};

        console.log("📋 Raw daily data from Cube.js - Count:", data.length);
        if (data.length === 0) {
          console.warn(
            "⚠️ NO DATA returned from Cube.js for Level 5 daily breakdown!",
          );
          console.warn("⚠️ This means either:");
          console.warn("   1. The filters are too restrictive");
          console.warn("   2. There is no data for this combination");
          console.warn(
            "   3. The measure does not support this level of filtering",
          );
          console.warn("⚠️ DEBUG INFO:");
          console.warn("   - KPI:", kpi.id, kpi.label);
          console.warn("   - Measure:", kpi.measure);
          console.warn("   - Time Dimension:", kpi.timeDimension);
          console.warn("   - Date Range:", timeDateRange);
          console.warn("   - Filters Applied:", queryFilters);
          console.warn("   - Department:", filters.department);
          console.warn("   - Category:", filters.category);
          console.warn("   - Subcategory:", filters.subcategory);
          console.warn(
            "   - Month:",
            filters.month,
            "Start:",
            filters.monthDateStart,
            "End:",
            filters.monthDateEnd,
          );
        } else {
          console.log("📋 First row sample:", data[0]);
          console.log("📋 First row keys:", Object.keys(data[0]));
          console.log("📋 Total rows returned:", data.length);
        }

        data.forEach((row) => {
          // Get the actual date key from Cube.js
          // With granularity: 'day', the key formats can be:
          // - 'EgPgrService.createdDate' (full timestamp)
          // - 'EgPgrService.createdDate.day' (day-specific)

          let dateValue = null;
          const dateKey = kpi.timeDimension;

          // Try different key formats Cube.js might use
          if (row[dateKey]) {
            dateValue = row[dateKey];
            console.log(
              "✅ Found date using key:",
              dateKey,
              "Value:",
              dateValue,
            );
          } else if (row[`${dateKey}.day`]) {
            dateValue = row[`${dateKey}.day`];
            console.log(
              "✅ Found date using key:",
              `${dateKey}.day`,
              "Value:",
              dateValue,
            );
          } else {
            // Log all available keys if we can't find the date
            console.warn(
              "⚠️ Could not find date key. Available keys:",
              Object.keys(row),
            );
          }

          if (dateValue) {
            let measureValue = row[kpi.measure];

            // If measure value is not found, try alternative key formats
            if (measureValue === undefined) {
              console.warn("⚠️ Measure not found with key:", kpi.measure);
              console.warn("   Available row keys:", Object.keys(row));

              // Try finding any numeric value that could be the measure
              // (Cube.js might return measure with different key formatting)
              const numericKeys = Object.keys(row).filter((key) => {
                const val = row[key];
                return (
                  typeof val === "number" ||
                  (typeof val === "string" && !isNaN(val))
                );
              });

              console.warn("   Numeric keys available:", numericKeys);

              // Use the first numeric key found, or fallback to a count from the dimension
              if (numericKeys.length > 0) {
                measureValue = row[numericKeys[0]];
                console.log(
                  "✅ Found measure value using alternate key:",
                  numericKeys[0],
                  "Value:",
                  measureValue,
                );
              }
            }

            if (measureValue !== undefined) {
              console.log(
                "📅 Processing date:",
                dateValue,
                "with value:",
                measureValue,
              );
              // Use the actual date string from Cube.js as the key
              dailyData[dateValue] = {
                value:
                  typeof measureValue === "number"
                    ? measureValue
                    : parseInt(measureValue) || 0,
                date: dateValue,
              };
            } else {
              console.warn(
                "⚠️ CRITICAL: Could not extract measure value for date:",
                dateValue,
              );
              console.warn("   Row data:", JSON.stringify(row, null, 2));
            }
          }
        });

        console.log("📊 Daily data fetched for Level 5:", dailyData);
        console.log("📊 Total days:", Object.keys(dailyData).length);

        // Close selection modal before showing daily data
        setShowDepartmentSelection(false);

        // Build clean filters object for display (only include filters that actually came BEFORE daily in the path)
        // CRITICAL VALIDATION: Ensure category is not contaminated with subcategory value
        let categoryValue = filters.category;
        let subcategoryValue = filters.subcategory;

        // If both category and subcategory exist, verify they're different
        if (
          categoryValue &&
          subcategoryValue &&
          categoryValue === subcategoryValue
        ) {
          console.warn(
            "⚠️ CRITICAL BUG: Category and subcategory have the same value!",
          );
          console.warn("   Category:", categoryValue);
          console.warn("   Subcategory:", subcategoryValue);
          console.warn(
            "   This indicates filters.category was contaminated with subcategory value",
          );
          console.warn("   Full filters object:", filters);
          // Try to recover by only keeping the one that matches the dimension at its level
          const categoryDim = drilldownPathArray.find(
            (p) =>
              p.dimension?.includes("category") &&
              !p.dimension?.includes("subcategory"),
          );
          console.warn(
            "   Expected category dimension:",
            categoryDim?.dimension,
          );
        }

        const displayFilters = {
          department: filters.department || undefined,
          category: categoryValue || undefined,
          month: filters.month || undefined,
          monthDateStart: filters.monthDateStart || undefined,
          monthDateEnd: filters.monthDateEnd || undefined,
          // Explicitly DO NOT include subcategory unless it comes BEFORE daily
          ...(subcategoryLevelIndex >= 0 &&
          subcategoryLevelIndex < levelIndex &&
          subcategoryValue
            ? { subcategory: subcategoryValue }
            : {}),
        };

        console.log("🔍 Setting daily drilldown filters:");
        console.log("   Original filters object:", filters);
        console.log("   Display filters:", displayFilters);
        console.log(
          "   Category index:",
          categoryLevelIndex,
          "Subcategory index:",
          subcategoryLevelIndex,
          "Current level:",
          levelIndex,
        );
        console.log("   Category value:", categoryValue);
        console.log("   Subcategory value:", subcategoryValue);

        setDailyDrilldownData(dailyData);
        setDailyDrilldownFilters(displayFilters);

        await fetchDailyChartData(kpi, dailyData);
        setDrilldownLevel(5);
        setShowDailyDrilldown(true);
        console.log("✅ Level 5 complete - showing daily data");
        return;
      }

      console.warn(
        "⚠️ No matching drilldown level found for:",
        currentLevelConfig,
      );
    } catch (error) {
      console.error("❌ Error in multi-level drilldown:", error);
      if (handleAuthError(error)) {
        return;
      }
    }
  };

  // ==================== KPI DRILLING ====================
  const handleKPIDrilldown = async (kpi) => {
    console.log("🎯 handleKPIDrilldown called with kpi:", {
      id: kpi.id,
      label: kpi.label,
      drilldownPath: kpi.drilldownPath,
      keyFieldValue: kpi.keyFieldValue,
      ...kpi,
    });

    // Effective measure: prefer explicit `kpi.measure`, otherwise fall back to the
    // first measure from `kpi.customQuery.measures` (useful for KPIs that only
    // define `customQuery` like `totalGovtFund`). This prevents sending
    // `measures: [undefined]` to Cube.js which becomes `measures: [null]`.
    const measureKey =
      kpi.measure ??
      (kpi.customQuery && Array.isArray(kpi.customQuery.measures)
        ? kpi.customQuery.measures[0]
        : undefined);

    // Normalize value (support raw number/string or structured object { value, label })
    let value;
    if (kpi.value !== undefined) {
      value = kpi.value;
    } else if (kpi.id && kpi.id.includes("_")) {
      // synthetic KPI id (from dynamic cards)
      value = 1;
    } else {
      value = headerKPIs[kpi.id];
    }

    // Derive numericValue for presence check
    let numericValue;
    if (typeof value === "object" && value?.value !== undefined) {
      numericValue = Number(value.value);
    } else if (typeof value === "string") {
      // Try to extract the first numeric token from strings like "1 / 1" or "Counter 36 | ₹300,000"
      const match = value.match(
        /([-+]?\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)/,
      );
      numericValue = match ? Number(match[0].replace(/,/g, "")) : NaN;
    } else {
      numericValue = Number(value);
    }

    console.log("📊 Card value:", value, "numericValue:", numericValue);

    if (
      value === undefined ||
      value === null ||
      isNaN(numericValue) ||
      numericValue === 0
    ) {
      console.log("⚠️ No data to drill down (value is 0 or missing)");
      return;
    }

    if (!kpi.isDrillingRequired) return;

    // Use new multi-level drilldown handler
    if (kpi.drilldownPath && kpi.drilldownPath.length > 0) {
      // If there's a departmentFilter, include it in initial filters
      let initialFilters = {};
      if (kpi.departmentFilter) {
        // 🔥 FIX: Extract the key name from the dimension to match what the drilldown handler expects
        // e.g., "TresCollReceiptHdr.departmentName" → "departmentName"
        const dimParts = kpi.departmentFilter.dimension
          ? kpi.departmentFilter.dimension.split(".")
          : [];
        const filterKey = dimParts[dimParts.length - 1] || "department";

        initialFilters[filterKey] = kpi.departmentFilter.value;
        initialFilters.department = kpi.departmentFilter.value; // Keep for backward compatibility
        initialFilters.selectedValue = kpi.departmentFilter.value;
        console.log(
          `📍 Starting with ${filterKey} filter:`,
          kpi.departmentFilter.value,
        );
      }
      await handleMultiLevelDrilldown(kpi, 0, initialFilters);
      return;
    }

    try {
      const [startYear, endYear] = selectedYear.split("-");

      // Check if first level is department selection
      const firstLevel = kpi.drilldownPath?.[0];
      console.log("🔍 First drilldown level:", firstLevel);

      if (firstLevel?.type === "selection" && firstLevel?.dimension) {
        // If filterValue exists, skip to monthly breakdown directly for that department
        if (firstLevel.filterValue) {
          // Determine a valid time dimension to use for monthly breakdowns
          const tdDim =
            kpi.timeDimension ||
            (measureKey ? `${measureKey.split(".")[0]}.systemDate` : undefined);

          // Build load query defensively: only include timeDimensions if tdDim is valid
          const loadQuery = {
            measures: [measureKey],
            filters: [
              {
                member: firstLevel.dimension,
                operator: "equals",
                values: [firstLevel.filterValue],
              },
            ],
          };

          if (tdDim) {
            loadQuery.timeDimensions = [
              {
                dimension: tdDim,
                granularity: "month",
                dateRange: [`${startYear}-04-01`, `${endYear}-03-31`],
              },
            ];
            loadQuery.order = { [tdDim]: "asc" };
          }

          const resultSet = await cubejsApi.load(loadQuery);

          const data = resultSet.tablePivot();
          console.log({ resultSetData: data });
          const monthlyData = {};

          data.forEach((row) => {
            const monthKey =
              row[
                `${kpi.timeDimension || (measureKey ? `${measureKey.split(".")[0]}.systemDate` : "")}.month`
              ];
            if (monthKey) {
              const [year, month] = monthKey.split("-");
              const monthNames = [
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
              ];
              const monthName = monthNames[parseInt(month) - 1];
              const displayKey = `${monthName} ${year}`;
              const measureValue = row[measureKey];

              monthlyData[displayKey] = {
                value:
                  typeof measureValue === "number"
                    ? measureValue
                    : parseInt(measureValue) || 0,
                monthKey: monthKey,
              };
            }
          });
          console.log({ monthlyData });

          setSelectedKPI(kpi);
          setMonthlyDrilldownData({
            kpi: kpi,
            year: selectedYear,
            months: monthlyData,
            department: firstLevel.filterValue,
            filters: { department: firstLevel.filterValue },
          });

          // Fetch chart data for the modal
          await fetchMonthlyChartData(kpi, monthlyData);

          setDrilldownLevel(2); // Department level drilldown
          setShowMonthlyDrilldown(true);
          return;
        }

        // Original behavior: Fetch department list with their total collections
        // Build department list query; include timeDimensions only if we have a valid dimension
        const deptTd =
          kpi.timeDimension ||
          (measureKey ? `${measureKey.split(".")[0]}.systemDate` : undefined);
        const deptQuery = {
          dimensions: [firstLevel.dimension],
          measures: [measureKey],
          order: { [measureKey]: "desc" },
        };
        if (deptTd) {
          deptQuery.timeDimensions = [
            {
              dimension: deptTd,
              dateRange: [`${startYear}-04-01`, `${endYear}-03-31`],
            },
          ];
        }

        const resultSet = await cubejsApi.load(deptQuery);

        const data = resultSet.tablePivot();
        console.log({ resultSetData: data });
        const departments = data.map((row) => ({
          name: row[firstLevel.dimension],
          value: row[measureKey] || 0,
        }));

        setSelectedKPI(kpi);
        setDepartmentListData({
          kpi: kpi,
          year: selectedYear,
          departments: departments,
        });

        // Fetch chart data for department modal
        await fetchDepartmentChartData(kpi, departments);

        setDrilldownLevel(1); // First drilldown level
        setShowDepartmentSelection(true);
        return;
      }

      // Default behavior: Show monthly breakdown
      const tdDim =
        kpi.timeDimension ||
        (measureKey ? `${measureKey.split(".")[0]}.systemDate` : undefined);
      const query = {
        measures: [measureKey],
        order: {},
      };

      if (tdDim) {
        query.timeDimensions = [
          {
            dimension: tdDim,
            granularity: "month",
            dateRange: [`${startYear}-04-01`, `${endYear}-03-31`],
          },
        ];
        query.order = { [tdDim]: "asc" };
      } else {
        // If we don't have a time dimension, fallback to ordering by measure
        query.order = { [measureKey]: "desc" };
      }

      // Build filters array
      const filters = [];

      // If there's a departmentFilter, add it
      if (kpi.departmentFilter) {
        filters.push({
          member: kpi.departmentFilter.dimension,
          operator: "equals",
          values: [kpi.departmentFilter.value],
        });
      }

      // If there's a sourceFilter, add it
      if (kpi.sourceFilter) {
        filters.push({
          member: kpi.sourceFilter.dimension,
          operator: "equals",
          values: [kpi.sourceFilter.value],
        });

        // Add any additional filters (for whatsapp servicetype)
        if (kpi.sourceFilter.additionalFilters) {
          kpi.sourceFilter.additionalFilters.forEach((filter) => {
            filters.push({
              member: filter.dimension,
              operator: "equals",
              values: [filter.value],
            });
          });
        }
      }

      // Apply filters if any exist
      if (filters.length > 0) {
        query.filters = filters;
      }

      const resultSet = await cubejsApi.load(query);

      const data = resultSet.tablePivot();
      console.log({ resultSetData: data });
      const monthlyData = {};

      data.forEach((row) => {
        const monthKey = row[`${kpi.timeDimension}.month`];
        if (monthKey) {
          const [year, month] = monthKey.split("-");
          const monthNames = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ];
          const monthName = monthNames[parseInt(month) - 1];
          const displayKey = `${monthName} ${year}`;
          const measureValue = row[kpi.measure];

          monthlyData[displayKey] = {
            value:
              typeof measureValue === "number"
                ? measureValue
                : parseInt(measureValue) || 0,
            monthKey: monthKey,
          };
        }
      });

      setSelectedKPI(kpi);
      setSelectedKPI(kpi);
      setMonthlyDrilldownData({
        kpi: kpi,
        year: selectedYear,
        months: monthlyData,
        department: kpi.departmentFilter?.value, // Include department if filtered
        filters: { department: kpi.departmentFilter?.value },
      });

      console.log("📊 Monthly drilldown data at line 1180:", {
        department: kpi.departmentFilter?.value,
        "kpi.departmentFilter": kpi.departmentFilter,
        "kpi.name": kpi.name,
      });

      setDrilldownLevel(kpi.departmentFilter ? 2 : 1); // Level 2 if from department, Level 1 otherwise
      setShowMonthlyDrilldown(true);
    } catch (error) {
      console.error("❌ Error drilling down KPI:", error);
      if (handleAuthError(error)) {
        return;
      }
    }
  };

  // Handle department selection -> Monthly drilldown
  const handleDepartmentSelect = async (departmentName, rowItem) => {
    if (!selectedKPI || !departmentListData) return;
    setDepartmentLoading(true);
    try {
      const currentLevel = departmentListData.currentLevel || 1;
      const currentLevelIndex = departmentListData.levelIndex || 0;

      console.log(`📍 handleDepartmentSelect called`);
      console.log(`   Selected value: ${departmentName}`);
      console.log(
        `   Current level: ${currentLevel} (index ${currentLevelIndex})`,
      );
      console.log(
        `   Current level config dimension: ${selectedKPI.drilldownPath[currentLevelIndex]?.dimension}`,
      );
      console.log(
        `   Existing filters before update:`,
        departmentListData.filters,
      );
      console.log(`   Full drilldown path:`, selectedKPI.drilldownPath);
      console.log(`   rowItem:`, rowItem);

      // Build new filters object
      const newFilters = { ...departmentListData.filters };

      // Determine what we're storing based on level index and drilldown path
      const drilldownPath = selectedKPI.drilldownPath || [];
      const currentPathConfig = drilldownPath[currentLevelIndex];

      if (!currentPathConfig) {
        console.warn(
          "⚠️ No config found for current level index:",
          currentLevelIndex,
        );
        console.warn(
          "   Available indices:",
          drilldownPath.map((cfg, idx) => ({
            idx,
            type: cfg.type,
            dimension: cfg.dimension,
          })),
        );
        return;
      }

      console.log(`📍 Current path config:`, currentPathConfig);
      console.log(`   Type: ${currentPathConfig.type}`);
      console.log(`   Dimension: ${currentPathConfig.dimension}`);

      // 🔥 SERVICE TYPE FIX: a Service Type card's `departmentName` is just the short type
      // label (e.g. "CD_FINE"), not the full "CATEGORY.TYPE" businessService value that
      // monthly/daily filters need. Reconstruct the full value here (using the rowItem built
      // in the serviceType handler) and overwrite filters.businessService with it, keeping
      // filters.level1Dimension pointing at egcl_paymentdetail.businessService — so every
      // downstream dataQuery (which reads getLevel1Filter(filters)) works completely unchanged.
      // 🔥 PAYMENT TYPE FIX (combined Non-Cash card): a "Cheque"/"DD" card click needs to store
      // filters.paymentmode so every downstream level's kpi.getMeasure(filters) can resolve the
      // correct measure (chequeSum vs DDSum). Uses the rowItem built in the paymentTypeSelection
      // handler rather than the display label, so it stays correct even if the label is reworded.
      if (currentPathConfig.type === "paymentTypeSelection") {
        const paymentType =
          rowItem?.paymentType || (departmentName === "DD" ? "DD" : "CHEQUE");
        newFilters.paymentmode = paymentType;
        newFilters.paymentTypeLabel = departmentName; // kept for display/back-navigation only
        console.log("📍 Stored payment type:", paymentType);
      } else if (currentPathConfig.type === "serviceType") {
        const fullValue =
          rowItem?.businessServiceFull ||
          `${newFilters.businessService}.${departmentName}`;
        newFilters.businessService = fullValue;
        newFilters.serviceType = departmentName; // kept for display/back-navigation only
        console.log("📍 Stored full service (category + type):", fullValue);
      } else {
        // Determine the dimension actually used (accounts for the tenant/service toggle)
        let effectiveDimension = currentPathConfig.dimension;
        if (currentPathConfig.viewOptions?.length) {
          const activeViewId =
            drilldownView || currentPathConfig.viewOptions[0].id;
          const match = currentPathConfig.viewOptions.find(
            (v) => v.id === activeViewId,
          );
          if (match) effectiveDimension = match.dimension;
        }

        const dimParts = (effectiveDimension || "").split(".");
        const keyName = dimParts[dimParts.length - 1];
        if (keyName) {
          newFilters[keyName] = departmentName;
          if (currentPathConfig.viewOptions?.length) {
            newFilters.level1Dimension = effectiveDimension; // remembered for all downstream levels
          }
          console.log(
            `📍 Stored: ${keyName} =`,
            departmentName,
            "via dimension:",
            effectiveDimension,
          );
        } else {
          console.warn(
            "⚠️ Could not derive keyName for dimension:",
            effectiveDimension,
          );
        }
      }

      // Clear known downstream temporal filters when selecting a higher-level item
      delete newFilters.month;
      delete newFilters.monthDateStart;
      delete newFilters.monthDateEnd;

      console.log(`📝 Filters after update (cleaned):`, newFilters);
      console.log(`📝 Filter keys present:`, Object.keys(newFilters));
      console.log(`📝 Category value:`, newFilters.category);
      console.log(`📝 Subcategory value:`, newFilters.subcategory);

      // Generic config-driven detail group handler
      // If the KPI defines a `detailGroup` object in the screen config JSON, use it to
      // fetch a grouped breakdown (e.g., counters or process names) for the selected department.
      // This avoids hard-coded id checks and keeps behavior driven by the JSON config.
      const detailGroup = selectedKPI?.detailGroup;
      if (detailGroup) {
        try {
          console.log(
            "🔎 Running detailGroup query for KPI:",
            selectedKPI?.id,
            "detailGroup:",
            detailGroup,
          );

          const query = {
            measures: detailGroup.measures || [selectedKPI.measure],
            dimensions: [detailGroup.dimension],
            order: {
              [detailGroup.measures?.[0] || selectedKPI.measure]:
                detailGroup.orderDirection || "desc",
            },
            limit: detailGroup.limit || 100,
          };

          // Build filters: department filter is added by default when available
          const dgFilters = [];
          const deptMember =
            detailGroup.departmentMember ||
            selectedKPI.drilldownPath?.[0]?.dimension ||
            detailGroup.defaultDepartmentMember;
          if (deptMember) {
            // derive key name to look up the selected filter value in newFilters
            const keyName = String(deptMember).split(".").pop();
            // Prefer an explicit filter in newFilters, fall back to the clicked item name
            let filterValue =
              newFilters[keyName] || newFilters.department || undefined;
            if (!filterValue) filterValue = departmentName;

            // If the member refers to fundType but the value is a label (e.g. 'BEUP Fund'),
            // resolve the numeric fundTypeCode and use that for filtering (c.fundtype = 3).
            if (
              filterValue &&
              String(deptMember).toLowerCase().includes("fundtype") &&
              isNaN(Number(filterValue))
            ) {
              try {
                const lookup = await cubejsApi.load({
                  dimensions: ["ComRegisteredNumber.fundTypeCode"],
                  filters: [
                    {
                      member: "ComRegisteredNumber.fundType",
                      operator: "equals",
                      values: [filterValue],
                    },
                  ],
                  limit: 1,
                });
                const rows = lookup.tablePivot();
                const code = rows?.[0]?.["ComRegisteredNumber.fundTypeCode"];
                if (code !== undefined && code !== null) {
                  filterValue = code;
                }
              } catch (e) {
                console.warn(
                  "⚠️ fundType lookup failed, falling back to label filter:",
                  e,
                );
              }
            }

            if (filterValue) {
              dgFilters.push({
                member: deptMember,
                operator: "equals",
                values: [filterValue],
              });
            }
          }

          // Allow static filters from config
          if (Array.isArray(detailGroup.filters)) {
            detailGroup.filters.forEach((f) => dgFilters.push(f));
          }

          if (dgFilters.length > 0) query.filters = dgFilters;

          // Time dimensions: either provided in config or use today's range if requested
          if (detailGroup.timeDimensions) {
            query.timeDimensions = detailGroup.timeDimensions;
          } else if (detailGroup.onlyToday) {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, "0");
            const dd = String(today.getDate()).padStart(2, "0");
            const todayStr = `${yyyy}-${mm}-${dd}`;
            const tdDim =
              detailGroup.timeDimension ||
              selectedKPI.timeDimension ||
              `${selectedKPI.measure?.split(".")?.[0] || ""}.systemDate`;
            query.timeDimensions = [
              { dimension: tdDim, dateRange: [todayStr, todayStr] },
            ];
          }

          const result = await cubejsApi.load(query);
          const rows = result.tablePivot();

          // Build display and chart items
          const cardItems = rows.map((r) => {
            const dimKey = detailGroup.dimension;
            // If config requests a composite pair like "total_*", format first/second measure
            if (
              detailGroup.measures &&
              detailGroup.measures.length >= 2 &&
              String(detailGroup.cardFormat || "")
                .toLowerCase()
                .startsWith("total")
            ) {
              const first = Number(r[detailGroup.measures[0]] ?? 0);
              const second = Number(r[detailGroup.measures[1]] ?? 0);
              return {
                name: r[dimKey] ?? "Unknown",
                value: `${first} / ${second}`,
              };
            }

            // Default: show first measure numeric value
            const val = Number(
              r[detailGroup.measures?.[0] ?? selectedKPI.measure] ?? 0,
            );
            return { name: r[dimKey] ?? "Unknown", value: val };
          });

          const chartItems = rows.map((r) => ({
            name: r[detailGroup.dimension] ?? "Unknown",
            value: Number(
              r[detailGroup.measures?.[0] ?? selectedKPI.measure] ?? 0,
            ),
          }));

          setSelectedKPI(selectedKPI);
          setDepartmentListData({
            kpi: selectedKPI,
            year: selectedYear,
            departments: cardItems,
            title:
              detailGroup.title ||
              `${newFilters.department} - ${detailGroup.dimension?.split(".")?.pop() || "Items"}`,
            selectionLabel:
              detailGroup.selectionLabel || detailGroup.title || "Select Item",
            currentLevel: currentLevel,
            nextLevel: currentLevel + 1,
            levelIndex: currentLevelIndex + 1,
            filters: newFilters,
          });

          await fetchDepartmentChartData(selectedKPI, chartItems);
          setDrilldownLevel(currentLevel);
          setShowDepartmentSelection(true);
          console.log(
            `✅ Shown ${cardItems.length} items for department ${newFilters.department}`,
          );
          return;
        } catch (err) {
          console.error("❌ Error running detailGroup query:", err);
          // fall through to default behavior on error
        }
      }

      // Move to next level (levelIndex + 1)
      const nextLevelIndex = currentLevelIndex + 1;

      console.log(
        `🔄 Proceeding to level index ${nextLevelIndex} with filters:`,
        newFilters,
      );

      setDrilldownStack((prev) => [
        ...prev,
        {
          type: "selection",
          levelIndex: currentLevelIndex,
          snapshot: {
            departmentListData,
            departmentChartData,
            departmentChartType,
            modalFilter,
          },
        },
      ]);

      await handleMultiLevelDrilldown(
        selectedKPI,
        nextLevelIndex,
        newFilters,
        rowItem,
      );
    } catch (error) {
      console.error("❌ Error in handleDepartmentSelect:", error);
      if (handleAuthError(error)) {
        return;
      }
    } finally {
      setDepartmentLoading(false);
    }
  };

  // Handle department card click from dashboard
  // const handleDepartmentCardClick = async (departmentName) => {
  //   setDepartmentLoading(true);
  //   try {
  //     const [startYear, endYear] = selectedYear.split('-');

  //     // Create a temporary KPI object for department drilldown
  //     const departmentKPI = {
  //       label: 'Department Collection',
  //       icon: '🏢',
  //       format: 'currency',
  //       measure: 'TresCollReceiptHdr.totalAmount',
  //       timeDimension: 'TresCollReceiptHdr.receiptDate',
  //     };

  //     // Fetch monthly data for selected department
  //     const resultSet = await cubejsApi.load({
  //       measures: ['TresCollReceiptHdr.totalAmount'],
  //       timeDimensions: [
  //         {
  //           dimension: 'TresCollReceiptHdr.receiptDate',
  //           granularity: 'month',
  //           dateRange: [`${startYear}-04-01`, `${endYear}-03-31`],
  //         },
  //       ],
  //       filters: [
  //         {
  //           member: 'TresCollReceiptHdr.departmentName',
  //           operator: 'equals',
  //           values: [departmentName],
  //         },
  //       ],
  //       order: {
  //         'TresCollReceiptHdr.receiptDate': 'asc',
  //       },
  //     });

  //     const data = resultSet.tablePivot();
  //     const monthlyData = {};

  //     data.forEach((row) => {
  //       const monthKey = row['TresCollReceiptHdr.receiptDate.month'];
  //       if (monthKey) {
  //         const [year, month] = monthKey.split('-');
  //         const monthNames = [
  //           'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  //           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  //         ];
  //         const monthName = monthNames[parseInt(month) - 1];
  //         const displayKey = `${monthName} ${year}`;
  //         const measureValue = row['TresCollReceiptHdr.totalAmount'];

  //         monthlyData[displayKey] = {
  //           value: typeof measureValue === 'number' ? measureValue : (parseInt(measureValue) || 0),
  //           monthKey: monthKey,
  //         };
  //       }
  //     });

  //     setSelectedKPI(departmentKPI);
  //     setMonthlyDrilldownData({
  //       kpi: departmentKPI,
  //       year: selectedYear,
  //       months: monthlyData,
  //       department: departmentName,
  //       filters: { department: departmentName },
  //     });

  //     // Fetch chart data for the modal
  //     await fetchMonthlyChartData(departmentKPI, monthlyData);

  //     setDrilldownLevel(2); // Department level drilldown
  //     setShowMonthlyDrilldown(true);
  //   } catch (error) {
  //     console.error('❌ Error fetching department monthly data:', error);
  //     if (handleAuthError(error)) {
  //       return;
  //     }
  //   } finally {
  //     setDepartmentLoading(false);
  //   }
  // };

  const handleMonthClick = async (monthKey, monthName) => {
    console.log("handleMonthClick", {
      monthKey,
      monthName,
      selectedKPI,
      monthlyDrilldownData,
    });

    // if (!selectedKPI || !monthlyDrilldownData) {
    //   console.warn('⚠️ handleMonthClick: Missing selectedKPI or monthlyDrilldownData');
    //   return;
    // }

    try {
      const [year, month] = monthKey.split("-");
      const startDate = `${year}-${month}-01`;
      const endDate = new Date(year, parseInt(month), 0);
      const endDateStr = `${year}-${month}-${endDate.getDate()}`;

      console.log(`📍 Month clicked: ${monthName} (${monthKey})`);
      console.log(`📅 Date range: ${startDate} to ${endDateStr}`);

      console.log({ monthlyDrilldownData });

      // Build new filters for next level
      const newFilters = {
        ...(monthlyDrilldownData?.filters || {}),
        month: monthName,
        monthKey: monthKey,
        monthDateStart: startDate,
        monthDateEnd: endDateStr,
      };

      // Ensure department is preserved from monthlyDrilldownData
      if (monthlyDrilldownData?.department) {
        newFilters.department = monthlyDrilldownData.department;
      }

      // Fallback: if department is not in monthlyDrilldownData, try to get from filters
      if (
        !newFilters?.department &&
        monthlyDrilldownData?.filters?.department
      ) {
        newFilters.department = monthlyDrilldownData.filters.department;
      }

      if (!newFilters?.department) {
        console.warn("⚠️ WARNING: No department found in newFilters!");
        console.warn(
          "monthlyDrilldownData.department:",
          monthlyDrilldownData?.department,
        );
        console.warn(
          "monthlyDrilldownData.filters:",
          monthlyDrilldownData?.filters,
        );
      }

      console.log(
        "🔄 Calling handleMultiLevelDrilldown with filters:",
        newFilters,
      );

      // Determine the index of the monthly level in the drilldown path (could be different per KPI)
      const monthlyIndex = (selectedKPI?.drilldownPath || []).findIndex(
        (p) => p.type === "monthly",
      );
      const nextLevelIndex = monthlyIndex >= 0 ? monthlyIndex + 1 : 1; // fall back to 1 if not found
      console.log({
        selectedKPIdrilldownPath: selectedKPI?.drilldownPath,
        monthlyDrilldownData,
      });
      console.log(nextLevelIndex, { monthlyModalRowItem });

      setDrilldownStack((prev) => [
        ...prev,
        {
          type: "monthly",
          levelIndex: monthlyIndex,
          snapshot: {
            monthlyDrilldownData,
            monthlyChartData,
            monthlyChartType,
            monthlyModalFilter,
          },
        },
      ]);

      setShowMonthlyDrilldown(false);

      // Move to the next level after monthly: could be daily or category depending on config
      await handleMultiLevelDrilldown(
        selectedKPI,
        monthlyIndex === -1 ? 0 : nextLevelIndex,
        newFilters,
        monthlyModalRowItem,
      );
    } catch (error) {
      console.error("❌ Error in handleMonthClick:", error);
      if (handleAuthError(error)) {
        return;
      }
    }
  };

  // ==================== FETCH MODAL CHART DATA ====================
  const fetchDepartmentChartData = async (kpi, departments) => {
    if (!kpi || !departments) return;

    try {
      const labels = departments.map((d) => formatCardLabel(d.name));
      const values = departments.map((d) => d.value);

      // Generate vibrant random colors for each data point
      const generateRandomColor = () => {
        const hue = Math.floor(Math.random() * 360);
        const saturation = Math.floor(Math.random() * 30) + 60; // 60-90%
        const lightness = Math.floor(Math.random() * 20) + 45; // 45-65%
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      };

      const colors = labels.map(() => generateRandomColor());

      const chartData = {
        labels: labels,
        datasets: [
          {
            label: kpi.label,
            data: values,
            backgroundColor: colors,
            borderColor: colors.map((color) =>
              color.replace("hsl", "hsla").replace(")", ", 1)"),
            ), // Solid border
            borderWidth: 2,
          },
        ],
      };

      console.log("📊 Department Chart Data:", {
        hasLabels: !!(labels && labels.length > 0),
        labelCount: labels?.length,
        hasDatasets: true,
        dataLength: values?.length,
        isValid: !!(labels && labels.length > 0 && values && values.length > 0),
        chartData,
      });

      setDepartmentChartData(chartData);
    } catch (error) {
      console.error("❌ Error fetching department chart data:", error);
    }
  };

  const fetchMonthlyChartData = async (kpi, monthlyData) => {
    if (!kpi || !monthlyData) return;

    try {
      const labels = Object.keys(monthlyData);
      const values = labels.map((label) => monthlyData[label].value);

      // Generate vibrant random colors for each data point
      const generateRandomColor = () => {
        const hue = Math.floor(Math.random() * 360);
        const saturation = Math.floor(Math.random() * 30) + 60; // 60-90%
        const lightness = Math.floor(Math.random() * 20) + 45; // 45-65%
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      };

      const colors = labels.map(() => generateRandomColor());

      const chartData = {
        labels: labels,
        datasets: [
          {
            label: kpi.label,
            data: values,
            backgroundColor: colors,
            borderColor: colors.map((color) =>
              color.replace("hsl", "hsla").replace(")", ", 1)"),
            ), // Solid border
            borderWidth: 2,
          },
        ],
      };

      console.log("📊 Monthly Chart Data:", {
        hasLabels: !!(labels && labels.length > 0),
        labelCount: labels?.length,
        hasDatasets: true,
        dataLength: values?.length,
        isValid: !!(labels && labels.length > 0 && values && values.length > 0),
        chartData,
      });

      setMonthlyChartData(chartData);
    } catch (error) {
      console.error("❌ Error fetching monthly chart data:", error);
    }
  };

  const fetchDailyChartData = async (kpi, dailyData) => {
    if (!kpi || !dailyData) return;

    try {
      const sortedDates = Object.keys(dailyData).sort();
      const labels = sortedDates.map((date) => {
        const d = new Date(date);
        return `${d.getDate()}/${d.getMonth() + 1}`;
      });
      const values = sortedDates.map((date) => dailyData[date].value);

      // Generate vibrant random colors for each data point
      const generateRandomColor = () => {
        const hue = Math.floor(Math.random() * 360);
        const saturation = Math.floor(Math.random() * 30) + 60; // 60-90%
        const lightness = Math.floor(Math.random() * 20) + 45; // 45-65%
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      };

      const colors = labels.map(() => generateRandomColor());

      const chartData = {
        labels: labels,
        datasets: [
          {
            label: kpi.label,
            data: values,
            backgroundColor: colors,
            borderColor: colors.map((color) =>
              color.replace("hsl", "hsla").replace(")", ", 1)"),
            ), // Solid border
            borderWidth: 2,
          },
        ],
      };

      console.log("📊 Daily Chart Data:", {
        hasLabels: !!(labels && labels.length > 0),
        labelCount: labels?.length,
        hasDatasets: true,
        dataLength: values?.length,
        isValid: !!(labels && labels.length > 0 && values && values.length > 0),
        chartData,
      });

      setDailyChartData(chartData);
    } catch (error) {
      console.error("❌ Error fetching daily chart data:", error);
    }
  };

  // ==================== CHART CLICK HANDLER (DRILLDOWN) ====================
  const handleChartClick = async (segmentData, chart) => {
    if (!chart.enableDrilldown) return;

    try {
      setLoading(true);
      const [startYear, endYear] = selectedYear.split("-");

      // Build query to get detailed data for clicked segment
      const query = {
        measures: [chart.measure],
        dimensions: [chart.dimension],
        filters: [
          {
            member: chart.dimension,
            operator: "equals",
            values: [segmentData.name],
          },
        ],
        order: {
          [chart.measure]: chart.order?.direction || "desc",
        },
      };

      // Add time dimension - prefer chart.timeDimension, fallback to schema
      let timeDimensionField = chart.timeDimension; // Try chart config first

      if (!timeDimensionField && screenConfig.schema?.cubeName) {
        // Fallback to schema if available
        const cubeName = screenConfig.schema.cubeName;
        const timeDimension = screenConfig.schema.dimensions?.find(
          (dim) => dim.type === "time",
        );
        if (timeDimension) {
          timeDimensionField = `${cubeName}.${timeDimension.name}`;
        }
      }

      // Add time dimension to query if found
      if (timeDimensionField) {
        query.timeDimensions = [
          {
            dimension: timeDimensionField,
            granularity: "month",
            dateRange: [`${startYear}-04-01`, `${endYear}-03-31`],
          },
        ];
      }

      const resultSet = await cubejsApi.load(query);
      const data = resultSet.tablePivot();

      // Format monthly data
      const monthlyData = {};
      data.forEach((row) => {
        // Try to find time dimension column
        const timeKey = Object.keys(row).find((key) => key.includes(".month"));
        if (timeKey) {
          const monthKey = row[timeKey];
          const [year, month] = monthKey.split("-");
          const monthNames = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ];
          const monthName = monthNames[parseInt(month) - 1];
          const displayKey = `${monthName} ${year}`;
          const measureValue = row[chart.measure];

          monthlyData[displayKey] = {
            value:
              typeof measureValue === "number"
                ? measureValue
                : parseInt(measureValue) || 0,
            monthKey: monthKey,
          };
        }
      });

      setSelectedChart(chart);
      setChartDrilldownData({
        segment: segmentData.name,
        measure: chart.measure,
        months: monthlyData,
        total: segmentData.value,
      });
      setShowChartDrilldown(true);
    } catch (error) {
      console.error("❌ Error in chart drilldown:", error);
      if (handleAuthError(error)) {
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  // ==================== HANDLE FILTER SUBMIT ====================
  const handleFilterSubmit = async (e) => {
    e.preventDefault();
    await fetchBodyKPIs();
    await fetchTableData();
  };

  const handleFilterReset = () => {
    setFilterValues({});
    setBodyKPIs({});
    setTableData([]);
  };

  // ==================== HANDLE SERVICE CATEGORY ==================
  const handleServiceCategoryChange = (value) => {
    setServiceCategory(value);
    setServiceType("");

    console.log("businessServices", businessServices);

    const filteredTypes = businessServices
      .filter((item) => item.code.startsWith(`${value}.`))
      .map((item) => {
        const [, serviceType] = item.businessService.split(".", 2);
        const [, codeSuffix] = item.code.split(".", 2);

        return {
          value: codeSuffix.trim(),
          label: serviceType.trim(),
        };
      });

    setServiceTypeOptions(filteredTypes);
  };

  // ==================== HANDLE ORGANIZATION CHANGE ================

  const handleOrganizationChange = (selectedOrgCode) => {
    console.log("selectedOrgCode", selectedOrgCode);

  const ulbOptions = allOrganizationOptions
    .filter((item) => item.parent === selectedOrgCode)   // matches children AND the self-referencing record itself
    .map((item) => ({
      value: item.code,
      label: item.name,
    }))
    .sort((a, b) => a.label.localeCompare(b.label)); 

      setUlbOptions(ulbOptions);
    };

  // =================== HANDLE RESET ===============================

  const handleReset = () => {
    setOrganization("");
    setUlb("");
    setUlbOptions([]);
  };

  // ==================== HANDLE TOGGLE ============================
  const handleViewToggle = async (viewId) => {
    if (!selectedKPI || !departmentListData) return;
    const levelIdx = departmentListData.levelIndex;
    if (levelIdx === undefined || levelIdx === null) return;
    setDrilldownView(viewId);
    await handleMultiLevelDrilldown(
      selectedKPI,
      levelIdx,
      departmentListData.filters || {},
      undefined,
      viewId,
    );
  };

  // ==================== MANUAL REFRESH HANDLER ====================
  const handleManualRefresh = async () => {
    console.log("🔄 Manual refresh triggered");
    setRefreshing(true);

    try {
      // Note: cubejsApi.invalidateCache() is not available in client-side API
      // Instead, we'll just reload all data. Since pre-aggregations are disabled,
      // each query will hit the database directly and get fresh data.
      console.log("⚡ Reloading all dashboard data...");

      // Reload all data with fresh queries
      await Promise.all([
        fetchHeaderKPIs(),
        fetchChartData(),
        fetchDepartmentWiseCollection(),
        fetchBodySectionsData(),
        fetchBodyKPIs(),
        // Object.keys(filterValues).length > 0 ?
        fetchTableData(),
        // : Promise.resolve()
      ]);

      console.log("✅ Manual refresh completed successfully");
    } catch (error) {
      console.error("❌ Error during manual refresh:", error);
      if (!handleAuthError(error)) {
        // Show error to user if it's not an auth error
        alert("Failed to refresh data. Please try again.");
      }
    } finally {
      setRefreshing(false);
    }
  };

  // ==================== HANDLE DATA TABLE SEARCH ==================
  const handleFilterSearch = () => {
    const filters = {
      fromDate,
      toDate,
      serviceCategory,
      serviceType,
      financialYear: selectedYear,
    };
    console.log("Table Filters:", filters);
    setFilterValues(filters);
    setCurrentPage(1);
  };

  // ==================== FORMAT EXCEL DATA FUNCTION ================
  const formatCellValue = (value, type) => {
    if (value === null || value === undefined) return "";

    switch (type) {
      case "date":
        return value ? new Date(value).toLocaleDateString("en-IN") : "";
      case "currency":
        return value ? Number(value) : 0;
      default:
        return value;
    }
  };
  // ===================== HANDLE EXPORT EXCEL =====================

  const exportTableToExcel = async (
    tableConfig,
    filters,
    fileName = "export",
  ) => {
    setIsExporting(true);
    try {
      // Cube.js has a hard max limit of 50,000 rows per query
      const query = tableConfig.dataQuery(filters, 0, 50000);

      console.log("📊 Exporting with query:", query);

      const resultSet = await cubejsApi.load(query);
      const rawData = resultSet.tablePivot();

      if (!rawData.length) {
        alert("No data available to export.");
        return;
      }

      const exportRows = rawData.map((row, idx) => {
        const exportRow = {};
        tableConfig.columns.forEach((col) => {
          if (col.type === "serial") {
            exportRow[col.label] = idx + 1;
          } else {
            exportRow[col.label] = formatCellValue(row[col.key], col.type);
          }
        });
        return exportRow;
      });

      const worksheet = XLSX.utils.json_to_sheet(exportRows);

      const colWidths = tableConfig.columns.map((col) => ({
        wch: Math.max(col.label.length + 2, 15),
      }));
      worksheet["!cols"] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data");

      XLSX.writeFile(workbook, `${fileName}_${Date.now()}.xlsx`);
    } catch (error) {
      console.error("❌ Error exporting to Excel:", error);
      if (handleAuthError(error)) return;
      alert("Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };
  // ==================== FETCH SERVICE TYPE DATA ===================
  const fetchServiceCatOptions = async () => {
    try {
      const payload = {
        RequestInfo: {
          authToken:
            localStorage.getItem("token") ||
            "8d787150-2f96-4695-9757-666dd71d1de2", // or wherever your token is stored
        },
        MdmsCriteria: {
          tenantId: "pg",
          moduleDetails: [
            {
              moduleName: "BillingService",
              masterDetails: [
                {
                  name: "BusinessService",
                  filter: "[?(@.type in [Finance])]",
                },
              ],
            },
          ],
        },
      };

      const response = await axios.post(
        "/egov-mdms-service/v1/_search",
        payload,
      );
      console.log("sevice type call", response);

      const services =
        response.data?.MdmsRes?.BillingService?.BusinessService || [];

      const options = services.map((item) => ({
        value: item.code,
        label: item.businessService,
      }));
      console.log("options", options);

      setBusinessServices(services);

      const categoryMap = new Map();

      services.forEach((item) => {
        const catValue = item.code.split(".")[0].trim();
        const catLabel = item.businessService.split(".")[0].trim();

        if (!categoryMap.has(catValue)) {
          categoryMap.set(catValue, catLabel);
        }
      });

      const serviceCatOptions = Array.from(categoryMap, ([value, label]) => ({
        value,
        label,
      }));

      console.log("serviceCatOptions", serviceCatOptions);

      setServiceCatOptions(serviceCatOptions);
    } catch (error) {
      console.error("Error loading Service Types", error);
    }
  };

  // =================== Fetch Organization and ULD Data ================

  const fetchOrganizationOptions = async () => {
    try {
      // const payload = {
      //   RequestInfo: {
      //     authToken:
      //       localStorage.getItem("token") ||
      //       "8d787150-2f96-4695-9757-666dd71d1de2", // or wherever your token is stored
      //   },
      //   MdmsCriteria: {
      //     tenantId: "pg",
      //     moduleDetails: [
      //       {
      //         moduleName: "BillingService",
      //         masterDetails: [
      //           {
      //             name: "BusinessService",
      //             filter: "[?(@.type in [Finance])]",
      //           },
      //         ],
      //       },
      //     ],
      //   },
      // };

      const payload = {
        RequestInfo: {
          apiId: "Rainmaker",
          ver: ".01",
          ts: "",
          action: "_search",
          did: "1",
          key: "",
          msgId: "20170310130900|en_IN",
          authToken:
            localStorage.getItem("token") ||
            "8d787150-2f96-4695-9757-666dd71d1de2",
        },
        MdmsCriteria: {
          tenantId: "pg",
          moduleDetails: [
            {
              moduleName: "common-masters",
              masterDetails: [
                {
                  name: "StateInfo",
                },
              ],
            },
            {
              moduleName: "tenant",
              masterDetails: [
                {
                  name: "tenants",
                },
                {
                  name: "citymodule",
                },
              ],
            },
          ],
        },
      };

      const response = await axios.post(
        "/egov-mdms-service/v1/_search",
        payload,
      );
      console.log("Organization ", response);

      const tenants = response.data?.MdmsRes?.tenant?.tenants || [];

      // Keep the complete tenant list for ULB filtering later
      setAllOrganizationOptions(tenants);

      // Only show parent organizations
      const organizationOptions = tenants
        .filter((item) => item.isParent)
        .map((item) => ({
          value: item.code,
          label: item.name,
        }));

      console.log("All Tenants", tenants);
      console.log("Organization Options", organizationOptions);

      setOrganizationOptions(organizationOptions);
    } catch (error) {
      console.error("Error loading Service Types", error);
    }
  };

  // ==================== REACT HOOKS (MUST BE BEFORE RETURNS) ====================

  // Fetch all data when financial year changes
  useEffect(() => {
    const resetReportFields = () => {
      setFromDate("");
      setToDate("");
      setServiceCategory("");
      setServiceType("");
    };
    const loadAllData = async () => {
      setLoading(true);
      try {
        // Run all fetch operations in parallel
        await Promise.all([
          fetchHeaderKPIs(),
          fetchChartData(),
          fetchDepartmentWiseCollection(),
          fetchBodySectionsData(),
          fetchTableData(),
        ]);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    resetReportFields();
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, organization, ulb]);

  useEffect(() => {
    fetchFilterOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleAuthError]);

  useEffect(() => {
    // if (Object.keys(filterValues).length > 0) {

    fetchTableData();
    // }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, filterValues, handleAuthError]);

  useEffect(() => {
    fetchServiceCatOptions();
    fetchOrganizationOptions();
  }, []);

  // ==================== POLL DATA (EVERY 5 SECONDS) ====================
  // useEffect(() => {
  // const intervalId = setInterval(() => {
  //   // Fetch all data silently (isBackground = true where supported)
  //   fetchHeaderKPIs();
  //   fetchChartData();
  //   fetchDepartmentWiseCollection();
  //   fetchBodySectionsData();
  //   fetchBodyKPIs(true);
  //   fetchTableData(true);
  // }, 300000);
  // return () => clearInterval(intervalId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [selectedYear, filterValues, currentPage, screenId]);

  // ==================== VALIDATION (AFTER HOOKS) ====================
  if (!screenConfig) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <h2>Screen Not Found</h2>
        <p>Screen ID "{screenId}" does not exist in configuration.</p>
      </div>
    );
  }

  if (!screenConfig.enabled) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <h2>Screen Disabled</h2>
        <p>Screen "{screenConfig.displayName}" is currently disabled.</p>
      </div>
    );
  }

  // ==================== RENDER ====================
  return (
    <div className="universal-screen">
      {departmentLoading && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(255,255,255,0.95)",
              padding: "8px 12px",
              borderRadius: 8,
              boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
            }}
          >
            <div
              className="mini-spinner"
              style={{
                width: 18,
                height: 18,
                border: "3px solid #eee",
                borderTop: "3px solid #1e73be",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <div style={{ fontSize: 13, color: "#1e73be", fontWeight: 600 }}>
              Loading…
            </div>
          </div>
        </div>
      )}
      {/* Loading Spinner */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading dashboard data...</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="screen-header">
        <div className="header-left">
          <span className="back-icon">
            <IoArrowBackCircleSharp
              size={42}
              color="#302ba0"
              onClick={() => navigate(-1)}
              style={{ cursor: "pointer" }}
            />
          </span>
          <h2 className="screen-title">{screenConfig.displayName}</h2>
        </div>
        <div className="header-right">
          {/* Refresh Button */}
          <button
            onClick={handleManualRefresh}
            disabled={refreshing || loading}
            className="refresh-button"
            title="Refresh dashboard data"
            style={{
              padding: "5px 5px",
              cursor: refreshing || loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              minWidth: "120px",
              fontSize: "15px",
              fontWeight: "500",
              opacity: refreshing || loading ? 0.6 : 1,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                animation: refreshing ? "spin 1s linear infinite" : "none",
                fontSize: "20px",
                color: "inherit",
              }}
            >
              ↻
            </span>

            <span className="refresh-text">
              {refreshing ? "Refreshing..." : "Refresh"}
            </span>
          </button>
        </div>
      </div>

      <div>
        {(screenConfig.organization?.enabled ||
          screenConfig.ulb?.enabled ||
          screenConfig.financialYear?.enabled) && (
          <div className="main-filter-row">
            {screenConfig.organization?.enabled && (
              <div className="main-filter-group">
                <label className="main-filter-label">
                  Organization:
                  <select
                    className="main-filter-select"
                    value={organization}
                    name="organization"
                    onChange={(e) => {
                      setOrganization(e.target.value);
                      setUlb(""); // clear stale ULB from a previously selected organization
                      handleOrganizationChange(e.target.value);
                    }}
                  >
                    <option value="">Select Organization</option>

                    {organizationOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
            {screenConfig.ulb?.enabled && (
              <div className="main-filter-group">
                <label className="main-filter-label">
                  ULB:
                  <select
                    className="main-filter-select"
                    value={ulb}
                    disabled={ulbOptions?.length == 0}
                    name="ulb"
                    onChange={(e) => {
                      console.log("ulb", e.target.value);
                      setUlb(e.target.value);
                    }}
                  >
                    <option value="">Select ULB</option>
                    {ulbOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {screenConfig.financialYear?.enabled && (
              <div className="main-filter-group">
                <label className="main-filter-label">
                  Financial Year:
                  <select
                    className="main-filter-select"
                    name="selectedYear"
                    id="selectedYear"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                  >
                    {screenConfig.financialYear.availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
            <div className="btn-reset-wrapper">
              <button className="btn-reset" onClick={handleReset}>
                Reset
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Header KPIs */}
      {screenConfig.kpis && screenConfig.kpis.length > 0 && (
        <div className="kpi-section">
          <div className="kpi-grid">
            {screenConfig.kpis.map((kpi) => {
              let value = headerKPIs[kpi.id];
              const isClickable =
                kpi.isDrillingRequired &&
                value &&
                Number(value?.value ?? value) > 0;
              // Custom style for Today Collection
              let cardStyle = {};
              if (kpi.isTodayBased) {
                cardStyle = {
                  textColor: kpi.cardStyle?.textColor || "red",
                  fontSize: kpi.cardStyle?.fontSize || "20px",
                  borderColor: kpi.cardStyle?.borderColor || "red",
                  borderWidth: kpi.cardStyle?.borderWidth || "3px",
                };
              } else if (kpi.cardStyle) {
                cardStyle = kpi.cardStyle;
              }
              let displayValue = value;
              // If KPI returns structured object with a label, show the label
              if (value && typeof value === "object") {
                if (value.label) {
                  displayValue = value.label;
                } else if (value.value !== undefined) {
                  displayValue = formatValue(value.value, kpi.format);
                } else {
                  displayValue = formatValue(value, kpi.format);
                }
              } else {
                displayValue = formatValue(value, kpi.format);
              }
              return (
                <KPICard
                  key={kpi.id}
                  title={kpi.label}
                  value={displayValue}
                  icon={kpi.icon}
                  color={kpi.color}
                  drilldownLevel={0}
                  onClick={
                    isClickable ? () => handleKPIDrilldown(kpi) : undefined
                  }
                  style={{ cursor: isClickable ? "pointer" : "default" }}
                  cardStyle={cardStyle}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Form */}
      {screenConfig.filters?.enabled && (
        <div className="filter-section">
          <h2>{screenConfig.filters.title || "Filters"}</h2>
          <form onSubmit={handleFilterSubmit} className="filter-form">
            <div
              className="filter-grid"
              style={{
                gridTemplateColumns: `repeat(${screenConfig.filters.gridColumns || 4}, 1fr)`,
              }}
            >
              {screenConfig.filters.fields.map((field) => (
                <div key={field.id} className="filter-field">
                  <label>{field.label}</label>

                  {field.type === "date" && (
                    <input
                      type="date"
                      value={filterValues[field.id] || ""}
                      onChange={(e) =>
                        setFilterValues({
                          ...filterValues,
                          [field.id]: e.target.value,
                        })
                      }
                      placeholder={field.placeholder}
                      required={field.required}
                    />
                  )}

                  {field.type === "select" && (
                    <Select
                      options={filterOptions[field.id] || []}
                      value={filterValues[field.id] || null}
                      onChange={(selected) =>
                        setFilterValues({
                          ...filterValues,
                          [field.id]: selected,
                        })
                      }
                      placeholder={field.placeholder}
                      isClearable={field.isClearable}
                      isMulti={field.isMulti}
                    />
                  )}

                  {field.type === "text" && (
                    <input
                      type="text"
                      value={filterValues[field.id] || ""}
                      onChange={(e) =>
                        setFilterValues({
                          ...filterValues,
                          [field.id]: e.target.value,
                        })
                      }
                      placeholder={field.placeholder}
                      required={field.required}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="filter-actions">
              {screenConfig.filters.actions.map((action) => (
                <button
                  key={action.id}
                  type={action.type}
                  onClick={
                    action.type === "reset" ? handleFilterReset : undefined
                  }
                  style={{ backgroundColor: action.color }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </form>
        </div>
      )}

      {/* Body KPIs (Filtered Results) */}
      {screenConfig.bodyKpis?.enabled && Object.keys(bodyKPIs).length > 0 && (
        <div className="kpi-section">
          <h2>{screenConfig.bodyKpis.title || "Results"}</h2>
          <div className="kpi-grid">
            {screenConfig.bodyKpis.kpis.map((kpi) => (
              <KPICard
                key={kpi.id}
                title={kpi.label}
                value={formatValue(bodyKPIs[kpi.id], kpi.format)}
                subtitle={
                  kpi?.isDrillingRequired ? `👆 Click - Monthly Breakdown` : ""
                }
                icon={kpi.icon}
                color={kpi.color}
                drilldownLevel={0}
              />
            ))}
          </div>
        </div>
      )}

      {/* Body Sections (Dynamic from screenRegistry) - MOVED BEFORE CHARTS */}
      {screenConfig?.bodyConfig?.sections &&
        Object.keys(bodySectionsData).length > 0 && (
          <>
            {screenConfig.bodyConfig.sections.map((section) => {
              const sectionData = bodySectionsData[section.id];
              if (!sectionData) return null;
              console.log({ sectionData });
              return (
                <div
                  key={section.id}
                  className="kpi-section"
                  style={{ marginTop: "30px" }}
                >
                  <h2
                    style={{
                      marginBottom: "20px",
                      color: "#2c3e50",
                      fontSize: "22px",
                      fontWeight: "600",
                      textTransform: "capitalize",
                    }}
                  >
                    {section.title}
                  </h2>

                  {/* Dynamic query-based cards (e.g., department-wise) */}
                  {sectionData.type === "dynamic" && sectionData.data && (
                    <div
                      className="kpi-grid"
                      style={{
                        gridTemplateColumns: `repeat(${section.columns || 4}, 1fr)`,
                        gap: "20px",
                      }}
                    >
                      {(() => {
                        const cfg = sectionData.config || {};

                        // ---------------- DEDUPE LOGIC ----------------
                        let rowsToRender = sectionData.data;
                        if (cfg.dedupeByTitle) {
                          const map = new Map();
                          const valueField = cfg.valueField;
                          const secondaryField = cfg.secondaryValueField;

                          rowsToRender.forEach((r) => {
                            const titleKey = cfg.titleTemplate
                              ? cfg.titleTemplate
                                  .replace(/\{([^}]+)\}/g, (_, k) =>
                                    r && r[k] !== undefined && r[k] !== null
                                      ? String(r[k])
                                      : "",
                                  )
                                  .trim()
                              : r && cfg.titleField
                                ? r[cfg.titleField]
                                : null;

                            if (!map.has(titleKey)) {
                              map.set(titleKey, {
                                _title: titleKey,
                                _row: r,
                                _value: Number(r[valueField] || 0),
                                _secondary: Number(r[secondaryField] || 0),
                              });
                            } else {
                              const entry = map.get(titleKey);
                              entry._value += Number(r[valueField] || 0);
                              entry._secondary += Number(
                                r[secondaryField] || 0,
                              );
                            }
                          });

                          rowsToRender = Array.from(map.values())
                            .filter(
                              (e) => e._title && String(e._title).trim() !== "",
                            )
                            .map((e) => ({
                              ...e._row,
                              [cfg.valueField]: e._value,
                              [cfg.secondaryValueField]: e._secondary,
                            }));
                        }

                        // Filter out any rows that don't have a usable title (e.g., bankName null/empty)
                        rowsToRender = rowsToRender.filter((r) => {
                          const titleFromTemplate = cfg.titleTemplate
                            ? cfg.titleTemplate
                                .replace(/\{([^}]+)\}/g, (_, k) =>
                                  r && r[k] !== undefined && r[k] !== null
                                    ? String(r[k])
                                    : "",
                                )
                                .trim()
                            : null;
                          const titleFromField =
                            r && cfg.titleField ? r[cfg.titleField] : null;
                          const finalTitle =
                            titleFromTemplate || titleFromField;
                          return finalTitle && String(finalTitle).trim() !== "";
                        });

                        // ---------------- RENDER KPI CARDS ----------------
                        return rowsToRender.map((row, index) => {
                          // ---- Title handling (template OR field) ----
                          if (cfg.isMonthly) {
                            const monthKey = cfg.titleField;
                            const [year, month] = row[monthKey].split("-");

                            const monthNames = [
                              "Jan",
                              "Feb",
                              "Mar",
                              "Apr",
                              "May",
                              "Jun",
                              "Jul",
                              "Aug",
                              "Sep",
                              "Oct",
                              "Nov",
                              "Dec",
                            ];
                            const monthName = monthNames[parseInt(month) - 1];
                            const displayKey = `${monthName} ${year}`;
                            const titleFromTemplate = cfg.titleTemplate
                              ? monthName ||
                                cfg.titleTemplate
                                  .replace(/\{([^}]+)\}/g, (_, k) =>
                                    row &&
                                    row[k] !== undefined &&
                                    row[k] !== null
                                      ? String(row[k])
                                      : "",
                                  )
                                  .trim()
                              : null;
                            const titleFromField =
                              row && cfg.titleField
                                ? displayKey || row[cfg.titleField]
                                : null;
                            cfg.titleTemplate =
                              displayKey || titleFromTemplate || titleFromField;
                          }
                          let title = null;
                          if (cfg.titleTemplate) {
                            title = cfg.titleTemplate
                              .replace(/\{([^}]+)\}/g, (_, key) =>
                                row &&
                                row[key] !== undefined &&
                                row[key] !== null
                                  ? String(row[key])
                                  : "",
                              )
                              .trim();
                          } else {
                            title =
                              row && cfg.titleField
                                ? row[cfg.titleField]
                                : null;
                          }

                          let value = "";
                          if (cfg.isMultipleStringValue) {
                            value = cfg.renderValue([row]).label;
                          } else {
                            value = row[cfg.valueField];
                          }
                          const secondaryValue = cfg.secondaryValueField
                            ? row[cfg.secondaryValueField]
                            : null;

                          // ---------------- SAFE TEMP KPI FOR DRILLDOWN ----------------
                          const tempKPI = cfg.enableDrilldown
                            ? {
                                id: `${section.id}_${index}`,
                                label: title,
                                icon: cfg.icon,
                                color: cfg.secondaryValueColor || "#4CAF50",
                                format: cfg.format || "number",

                                // ✅ REAL Cube measure ONLY
                                measure: cfg.measure || cfg.valueField,
                                keyFieldValue: row?.[cfg.keyField],

                                // ✅ Add timeDimension ONLY if defined at section level
                                ...(sectionData.timeDimension
                                  ? {
                                      timeDimension:
                                        sectionData.timeDimension ||
                                        cfg.timeDimension,
                                    }
                                  : { timeDimension: cfg.timeDimension }),

                                isDrillingRequired: true,

                                // ✅ Proper Cube filters (Bank → Branch etc.)
                                // If keyField is provided, use it. Otherwise fall back to titleField.
                                filters:
                                  cfg.keyField &&
                                  row[cfg.keyField] !== undefined
                                    ? [
                                        {
                                          member: cfg.titleField, // Map the filter to the DISPLAY dimension (e.g. fundType)
                                          operator: "equals",
                                          values: [row[cfg.titleField]], // But filter by the value of titleField (e.g. "BEUP Fund")
                                        },
                                        // If we also want to filter by the code, we might need a separate mechanism,
                                        // but for now, let's assume filtering by the dimension name is what we want
                                        // based on how the previous levels worked.
                                        // Actually, let's look at how handleKPIDrilldown uses this.
                                        // It creates a `sourceFilter` or `departmentFilter` on the KPI.
                                      ]
                                    : cfg.titleField && row[cfg.titleField]
                                      ? [
                                          {
                                            member: cfg.titleField,
                                            operator: "equals",
                                            values: [row[cfg.titleField]],
                                          },
                                        ]
                                      : [],

                                // Store the specific filter context for the drilldown handler
                                departmentFilter:
                                  cfg.titleField && row[cfg.titleField]
                                    ? {
                                        dimension: cfg.titleField,
                                        value: row[cfg.titleField],
                                      }
                                    : undefined,

                                drilldownPath: cfg.drilldownPath || [],
                              }
                            : null;
                          return (
                            <KPICard
                              key={index}
                              title={title}
                              value={formatValue(value, cfg.format || "number")}
                              subtitle={
                                secondaryValue !== null
                                  ? `${cfg.secondaryValueLabel}: ${formatValue(
                                      secondaryValue,
                                      "string",
                                    )}`
                                  : cfg.enableDrilldown
                                    ? "👆 Click to drill down"
                                    : undefined
                              }
                              icon={cfg.icon}
                              color={cfg.secondaryValueColor}
                              drilldownLevel={0}
                              onClick={
                                cfg.enableDrilldown && tempKPI
                                  ? async () => {
                                      if (cfg.isMonthly) {
                                        setSelectedKPI(tempKPI);
                                        setMonthlyDrilldownData({
                                          kpi: tempKPI,
                                          year: selectedYear,
                                          months: [
                                            {
                                              month: tempKPI.keyFieldValue,
                                              value: value,
                                              secondaryValue:
                                                tempKPI.secondaryValue,
                                            },
                                          ],
                                          department: "4517940",
                                          filters: { department: "4517940" },
                                        });
                                        await handleMonthClick(
                                          tempKPI.keyFieldValue,
                                          tempKPI.label,
                                        );
                                      } else {
                                        await handleKPIDrilldown(tempKPI);
                                      }
                                    }
                                  : undefined
                              }
                              style={{
                                cursor: cfg.enableDrilldown
                                  ? "pointer"
                                  : "default",
                              }}
                            />
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

      {/* Charts - MOVED AFTER BODY SECTIONS */}
      {screenConfig.charts &&
        screenConfig.charts.length > 0 &&
        Object.keys(chartData).length > 0 && (
          <div className="charts-section">
            {screenConfig.charts.map((chart) => {
              const currentChartType =
                chartTypes[chart.id] || chart.defaultType || "pie";
              const data = chartData[chart.id] || [];

              return (
                <div key={chart.id} className="chart-section">
                  <div className="chart-header">
                    <h2>
                      {chart.title}
                      {chart.enableDrilldown && (
                        <span
                          style={{
                            fontSize: "12px",
                            color: "#999",
                            marginLeft: "10px",
                            fontWeight: "normal",
                          }}
                        >
                          👆 Click on any segment to view monthly breakdown
                        </span>
                      )}
                    </h2>
                    {chart.types && chart.types.length > 1 && (
                      <select
                        value={currentChartType}
                        onChange={(e) =>
                          setChartTypes({
                            ...chartTypes,
                            [chart.id]: e.target.value,
                          })
                        }
                        className="chart-type-selector"
                      >
                        {chart.types.map((type) => (
                          <option key={type} value={type}>
                            {type === "pie"
                              ? "🥧 Pie Chart"
                              : type === "bar"
                                ? "📊 Bar Chart"
                                : "📈 Line Chart"}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="chart-container">
                    {currentChartType === "pie" && (
                      <PieChart
                        data={data}
                        onSegmentClick={
                          chart.enableDrilldown
                            ? (segmentData) =>
                                handleChartClick(segmentData, chart)
                            : null
                        }
                      />
                    )}
                    {currentChartType === "bar" && (
                      <BarChart
                        data={data}
                        onBarClick={
                          chart.enableDrilldown
                            ? (segmentData) =>
                                handleChartClick(segmentData, chart)
                            : null
                        }
                      />
                    )}
                    {currentChartType === "line" && (
                      <LineChart
                        data={data}
                        onPointClick={
                          chart.enableDrilldown
                            ? (segmentData) =>
                                handleChartClick(segmentData, chart)
                            : null
                        }
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      {/* Report fields input form  */}
      {(screenConfig.financialYear?.enabled ||
        screenConfig.fromDate?.enabled ||
        screenConfig.toDate?.enabled ||
        screenConfig.serviceCategory?.enabled) && (
        <div className="report-search-filter-container">
          {screenConfig.fromDate?.enabled && (
            <div className="report-search-filter-group">
              <label htmlFor="fromDate" className="report-search-filter-label">
                From Date:
                <input
                  id="fromDate"
                  type="date"
                  name="fromDate"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="report-search-filter-input"
                />
              </label>
            </div>
          )}

          {screenConfig.toDate?.enabled && (
            <div className="report-search-filter-group">
              <label htmlFor="toDate" className="report-search-filter-label">
                To Date:
                <input
                  id="toDate"
                  type="date"
                  name="toDate"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="report-search-filter-input"
                />
              </label>
            </div>
          )}

          {screenConfig.serviceCategory?.enabled && (
            <div className="report-search-filter-group">
              <label
                htmlFor="serviceCategory"
                className="report-search-filter-label"
              >
                Service Category:
                <select
                  id="serviceCategory"
                  name="serviceCategory"
                  value={serviceCategory}
                  onChange={(e) => {
                    setServiceCategory(e.target.value);
                    handleServiceCategoryChange(e.target.value);
                  }}
                  className="report-search-filter-select"
                >
                  <option value="">Select Category</option>

                  {serviceCatOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {screenConfig.serviceType?.enabled && (
            <div className="report-search-filter-group">
              <label
                htmlFor="serviceType"
                className="report-search-filter-label"
              >
                Service Type:
                <select
                  id="serviceType"
                  disabled={serviceTypeOptions.length == 0}
                  name="serviceType"
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className="report-search-filter-select"
                >
                  <option value="">Select Type</option>

                  {serviceTypeOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <div className="report-search-go-btn-wrapper">
            <button
              className="report-search-go-btn"
              onClick={handleFilterSearch}
            >
              Go
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {screenConfig.table && tableData.length > 0 ? (
        <div className="table-section">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "10px",
            }}
          >
            <h2 style={{ color: "#302ba0", fontSize: "18px" }}>
              {screenConfig.table.title}
            </h2>
            <IoMdDownload
              className="export-icon"
              size={28}
              color="rgb(240, 100, 60)"
              onClick={() =>
                exportTableToExcel(
                  screenConfig.table,
                  {
                    fromDate: fromDate ? fromDate : undefined,
                    toDate: toDate ? toDate : undefined,
                    serviceCategory: serviceCategory
                      ? serviceCategory
                      : undefined,
                    serviceType: serviceType ? serviceType : undefined,
                  },
                  screenConfig.table.title.replace(/\s+/g, "_"),
                )
              }
              disabled={isExporting}
              style={{ cursor: "pointer" }}
            />
            <button
              className="export-to-excel-btn export-btn"
              onClick={() =>
                exportTableToExcel(
                  screenConfig.table,
                  {
                    fromDate: fromDate ? fromDate : undefined,
                    toDate: toDate ? toDate : undefined,
                    serviceCategory: serviceCategory
                      ? serviceCategory
                      : undefined,
                    serviceType: serviceType ? serviceType : undefined,
                  },
                  screenConfig.table.title.replace(/\s+/g, "_"),
                )
              }
              disabled={isExporting}
            >
              Export to Excel
            </button>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  {screenConfig.table.columns.map((col) => (
                    <th
                      key={col.key}
                      style={{
                        width: col.width,
                        textAlign: col.align || "left",
                      }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, idx) => (
                  <tr key={idx}>
                    {screenConfig.table.columns.map((col) => (
                      <td
                        key={col.key}
                        style={{ textAlign: col.align || "left" }}
                      >
                        {col.type === "serial"
                          ? (currentPage - 1) * screenConfig.table.pageSize +
                            idx +
                            1
                          : formatValue(row[col.key], col.type)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="pagination">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span>Page {currentPage}</span>
            <button onClick={() => setCurrentPage(currentPage + 1)}>
              Next
            </button>
          </div>
        </div>
      ) : (
        <div className="table-section-not-found-container">
          <p className="not-found-title">No Records Found.</p>
        </div>
      )}

      {/* Department Selection Modal (NEW) -drilldown 1 */}
      {showDepartmentSelection && departmentListData && (
        <div
          className="modal-overlay-crn"
          onClick={() => resetDrilldownState()}
        >
          <div
            className="modal-content-crn"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="modal-header-crn"
              style={{ borderBottomColor: "#302ba0" }}
            >
              <div className="modal-header-row">
                <div
                  className="modal-title-wrapper"
                  style={{
                    paddingLeft: drilldownStack.length > 0 ? "52px" : "0",
                  }}
                >
                  {drilldownStack.length > 0 && (
                    <IoArrowBackCircleSharp
                      size={42}
                      color="#302ba0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGoBack();
                      }}
                      style={{
                        cursor: "pointer",
                        position: "absolute",
                        left: "0",
                        top: "2px",
                      }}
                    />
                  )}
                  <h2 className="modal-title-crn">
                    {/* <span className="modal-icon-large">{selectedKPI?.icon}</span> */}
                    {selectedKPI?.label} -{" "}
                    {departmentListData.selectionLabel ||
                      departmentListData.title ||
                      "Select Department"}
                  </h2>
                  <p className="modal-subtitle">
                    Financial Year: {departmentListData.year} | Click on any{" "}
                    {departmentListData.selectionLabel
                      ?.toLowerCase()
                      .includes("category")
                      ? "category"
                      : "item"}{" "}
                    to continue
                  </p>
                </div>
                <div style={{ display: "flex" }}>
                  <button
                    className="modal-close-btn"
                    onClick={() => resetDrilldownState()}
                  >
                    ✖
                  </button>
                </div>
              </div>
              {(() => {
                const currentLevelCfg =
                  selectedKPI?.drilldownPath?.[departmentListData?.levelIndex];
                const toggleOptions = currentLevelCfg?.viewOptions;
                if (!toggleOptions?.length) return null;
                return (
                  <div className="drilldown-toggle">
                    {toggleOptions.map((view) => (
                      <button
                        key={view.id}
                        className={`toggle-btn ${drilldownView === view.id ? "active" : ""}`}
                        onClick={() => handleViewToggle(view.id)}
                      >
                        {view.label}
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="modal-body-crn">
              {/* Department Cards Grid */}
              {departmentListData.departments.length > 0 ? (
                <div
                  className="kpi-grid"
                  style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: "20px" }}
                >
                  {departmentListData.departments.map((dept) => {
                    const dg = selectedKPI?.detailGroup;
                    const defaultSubtitle = departmentListData.selectionLabel
                      ?.toLowerCase()
                      .includes("category")
                      ? "Click for sub-categories"
                      : "Click to continue";
                    const cardSubtitle =
                      dg?.cardSubtitle ||
                      (dg?.cardFormat &&
                      String(dg.cardFormat).toLowerCase().startsWith("total")
                        ? dg.cardSubtitle || "Total / Secondary"
                        : defaultSubtitle);
                    console.log({ departmentListData__dept: dept });

                    return (
                      <KPICard
                        key={dept.name}
                        title={formatCardLabel(dept.name)}
                        value={formatValue(dept.value, selectedKPI?.format)}
                        subtitle={cardSubtitle}
                        icon={selectedKPI?.icon}
                        onClick={() =>
                          handleDepartmentSelect(dept.name, dept.rowItem)
                        }
                        drilldownLevel={1}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="empty-modal-state">
                  <div className="empty-modal-icon">📭</div>
                  <div className="empty-modal-text">
                    No{" "}
                    {departmentListData.selectionLabel?.toLowerCase() ||
                      "items"}{" "}
                    available
                  </div>
                </div>
              )}
              {/* Chart Visualization */}
              {departmentChartData &&
                departmentChartData.labels &&
                departmentChartData.labels.length > 0 &&
                departmentChartData.datasets &&
                departmentChartData.datasets.length > 0 && (
                  <div
                    className="modal-chart-section"
                    style={{
                      marginBottom: "30px",
                      padding: "20px",
                      backgroundColor: "#f8f9fa",
                      borderRadius: "8px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "15px",
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                          color: "#333",
                          fontSize: "16px",
                          fontWeight: "600",
                        }}
                      >
                        📊{" "}
                        {departmentListData.selectionLabel ||
                          departmentListData.title ||
                          "Department"}
                        -wise {selectedKPI?.label}
                      </h3>
                      <select
                        value={departmentChartType}
                        onChange={(e) => setDepartmentChartType(e.target.value)}
                        className="chart-type-selector"
                        style={{
                          padding: "5px 10px",
                          borderRadius: "4px",
                          border: "1px solid #ddd",
                        }}
                      >
                        <option value="bar">📊 Bar Chart</option>
                        <option value="line">📈 Line Chart</option>
                        <option value="pie">🥧 Pie Chart</option>
                      </select>
                    </div>

                    <div
                      style={{
                        height: "450px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {departmentChartType === "bar" && (
                        <BarChart data={departmentChartData} />
                      )}
                      {departmentChartType === "line" && (
                        <LineChart data={departmentChartData} />
                      )}
                      {departmentChartType === "pie" && (
                        <PieChart data={departmentChartData} />
                      )}
                    </div>
                  </div>
                )}
            </div>

            <div className="modal-footer-crn">
              <button
                className="btn-modal-close"
                onClick={() => setShowDepartmentSelection(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Drilldown Modal  -drilldown 2*/}
      {showMonthlyDrilldown && monthlyDrilldownData && (
        <div
          className="modal-overlay-crn"
          onClick={() => setShowMonthlyDrilldown(false)}
        >
          <div
            className="modal-content-crn"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="modal-header-crn"
              style={{ borderBottomColor: "#302ba0" }}
            >
              <div className="modal-header-row">
                <div
                  className="modal-title-wrapper"
                  style={{
                    paddingLeft: drilldownStack.length > 0 ? "52px" : "0",
                  }}
                >
                  {drilldownStack.length > 0 && (
                    <IoArrowBackCircleSharp
                      size={42}
                      color="#302ba0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGoBack();
                      }}
                      style={{
                        cursor: "pointer",
                        position: "absolute",
                        left: "0",
                        top: "2px",
                      }}
                    />
                  )}
                  <h2 className="modal-title-crn">
                    {/* <span className="modal-icon-large">{selectedKPI?.icon}</span> */}
                    {selectedKPI?.label} - Monthly Breakdown
                    {monthlyDrilldownData.department && (
                      <span
                        style={{
                          fontSize: "16px",
                          color: "#666",
                          fontWeight: "normal",
                        }}
                      >
                        {" "}
                        → {formatCardLabel(monthlyDrilldownData.department)}
                      </span>
                    )}
                    {/* If a specific month is present in the filters, show it next to the title as well */}
                    {monthlyDrilldownData.filters?.month && (
                      <span
                        style={{
                          fontSize: "16px",
                          color: "#666",
                          fontWeight: "normal",
                          marginLeft: "8px",
                        }}
                      >
                        {" "}
                        | {monthlyDrilldownData.filters.month}
                      </span>
                    )}
                  </h2>
                  <p className="modal-subtitle">
                    Financial Year: {monthlyDrilldownData.year} | Click on any
                    month to view daily breakdown
                  </p>
                </div>
                <div style={{ display: "flex" }}>
                  {/* {drilldownStack.length > 0 && (
                    <button className="modal-back-btn" onClick={(e) => { e.stopPropagation(); handleGoBack(); }}>
                      ← Back
                    </button>
                  )} */}
                  <button
                    className="modal-close-btn"
                    onClick={() => resetDrilldownState()}
                  >
                    ✖
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-body-crn">
              {/* Monthly Cards Grid */}
              {Object.keys(monthlyDrilldownData.months).length > 0 ? (
                <div className={"month-grid-4col"}>
                  {Object.entries(monthlyDrilldownData.months).map(
                    ([month, data]) => (
                      <div
                        key={month}
                        className={`month-card-clickable drilldown-level-${drilldownLevel}`}
                        onClick={() => handleMonthClick(data.monthKey, month)}
                      >
                        <div className="month-name">{month}</div>
                        <div className="month-value">
                          {formatValue(data.value, selectedKPI?.format)}
                        </div>
                        <div className="month-hint">
                          View Daily Breakdown{" "}
                          <GrFormNextLink
                            size={12}
                            color="#302ba0"
                            style={{ marginTop: "3px" }}
                          />
                        </div>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <div className="empty-modal-state">
                  <div className="empty-modal-icon">📭</div>
                  <div className="empty-modal-text">
                    No data available for this period
                  </div>
                </div>
              )}
              {/* Chart Visualization */}
              {monthlyChartData &&
                monthlyChartData.labels &&
                monthlyChartData.labels.length > 0 &&
                monthlyChartData.datasets &&
                monthlyChartData.datasets.length > 0 && (
                  <div
                    className="modal-chart-section"
                    style={{
                      marginBottom: "30px",
                      padding: "20px",
                      backgroundColor: "#f8f9fa",
                      borderRadius: "8px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "15px",
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                          color: "#333",
                          fontSize: "16px",
                          fontWeight: "600",
                        }}
                      >
                        📊 Monthly Trend
                      </h3>
                      <select
                        value={monthlyChartType}
                        onChange={(e) => setMonthlyChartType(e.target.value)}
                        className="chart-type-selector"
                        style={{
                          padding: "5px 10px",
                          borderRadius: "4px",
                          border: "1px solid #ddd",
                        }}
                      >
                        <option value="bar">📊 Bar Chart</option>
                        <option value="line">📈 Line Chart</option>
                        <option value="pie">🥧 Pie Chart</option>
                      </select>
                    </div>

                    <div
                      style={{
                        height: "300px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {monthlyChartType === "bar" && (
                        <BarChart data={monthlyChartData} />
                      )}
                      {monthlyChartType === "line" && (
                        <LineChart data={monthlyChartData} />
                      )}
                      {monthlyChartType === "pie" && (
                        <PieChart data={monthlyChartData} />
                      )}
                    </div>
                  </div>
                )}
            </div>

            <div className="modal-footer-crn">
              <button
                className="btn-modal-close"
                onClick={() => setShowMonthlyDrilldown(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Drilldown Modal -drilldown 3*/}
      {showDailyDrilldown && dailyDrilldownData && (
        <div
          className="modal-overlay-crn"
          onClick={() => resetDrilldownState()}
        >
          <div
            className="modal-content-crn"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="modal-header-crn"
              style={{ borderBottomColor: "#302ba0" }}
            >
              <div className="modal-header-row">
                <div
                  className="modal-title-wrapper"
                  style={{
                    paddingLeft: drilldownStack.length > 0 ? "52px" : "0",
                  }}
                >
                  {drilldownStack.length > 0 && (
                    <IoArrowBackCircleSharp
                      size={42}
                      color="#302ba0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGoBack();
                      }}
                      style={{
                        cursor: "pointer",
                        position: "absolute",
                        left: "0",
                        top: "2px",
                      }}
                    />
                  )}
                  <h2 className="modal-title-crn">
                    {/* <span className="modal-icon-large">{selectedKPI?.icon}</span> */}
                    {selectedKPI?.label} - Daily Breakdown
                    {/* Display selected month in header (like department) for clarity during drilldowns */}
                    {dailyDrilldownFilters?.month && (
                      <span
                        style={{
                          fontSize: "16px",
                          color: "#666",
                          fontWeight: "normal",
                        }}
                      >
                        {" "}
                        → {dailyDrilldownFilters.month}
                      </span>
                    )}
                  </h2>
                  <p className="modal-subtitle">
                    {dailyDrilldownFilters?.department && (
                      <>Building: {dailyDrilldownFilters.department} |</>
                    )}
                    {dailyDrilldownFilters?.category && (
                      <>Category: {dailyDrilldownFilters.category} |</>
                    )}
                    {dailyDrilldownFilters?.subcategory && (
                      <>SubCategory: {dailyDrilldownFilters.subcategory} |</>
                    )}
                    Month: {dailyDrilldownFilters?.month || "N/A"} | Total Days:{" "}
                    {Object.keys(dailyDrilldownData).length}
                  </p>
                </div>
                <div style={{ display: "flex" }}>
                  {/* {drilldownStack.length > 0 && (
                    <button className="modal-back-btn" onClick={(e) => { e.stopPropagation(); handleGoBack(); }}>
                      ← Back
                    </button>
                  )} */}
                  <button
                    className="modal-close-btn"
                    onClick={() => resetDrilldownState()}
                  >
                    ✖
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-body-crn">
              {/* Daily Breakdown Table */}
              {Object.keys(dailyDrilldownData).length > 0 ? (
                <table className="daily-breakdown-table">
                  <thead>
                    <tr>
                      <th style={{ width: "80px" }}>Srl no.</th>
                      <th>Date</th>
                      <th style={{ textAlign: "right" }}>
                        {selectedKPI?.label}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(dailyDrilldownData).map(
                      ([date, data], idx) => {
                        // Parse date - it might be in format "YYYY-MM-DD" or just "DD"
                        let displayDate = date;
                        try {
                          if (date && date.length > 2) {
                            // If it looks like a full date (YYYY-MM-DD or similar)
                            displayDate = new Date(date).toLocaleDateString(
                              "en-IN",
                              {
                                weekday: "short",
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              },
                            );
                          } else {
                            // If it's just a day number, construct the date from filters
                            if (dailyDrilldownFilters?.monthDateStart) {
                              const [year, month] =
                                dailyDrilldownFilters.monthDateStart.split("-");
                              const fullDate = new Date(
                                `${year}-${month}-${String(parseInt(date)).padStart(2, "0")}`,
                              );
                              displayDate = fullDate.toLocaleDateString(
                                "en-IN",
                                {
                                  weekday: "short",
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                },
                              );
                            }
                          }
                        } catch (e) {
                          console.log("Date parse error:", e, date);
                          displayDate = date;
                        }

                        return (
                          <tr key={date}>
                            <td style={{ color: "#999" }}>{idx + 1}</td>
                            <td>{displayDate}</td>
                            <td
                              style={{
                                textAlign: "right",
                                fontWeight: "600",
                                color: selectedKPI?.color,
                              }}
                            >
                              {formatValue(
                                data?.value || data,
                                selectedKPI?.format,
                              )}
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              ) : (
                <div className="empty-modal-state">
                  <div className="empty-modal-icon">📭</div>
                  <div className="empty-modal-text">
                    No data available for this period
                  </div>
                </div>
              )}

              {/* Chart Visualization */}
              {dailyChartData &&
                dailyChartData.labels &&
                dailyChartData.labels.length > 0 &&
                dailyChartData.datasets &&
                dailyChartData.datasets.length > 0 && (
                  <div
                    className="modal-chart-section"
                    style={{
                      marginBottom: "30px",
                      padding: "20px",
                      backgroundColor: "#f8f9fa",
                      borderRadius: "8px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "15px",
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                          color: "#333",
                          fontSize: "16px",
                          fontWeight: "600",
                        }}
                      >
                        📊 Daily Trend{" "}
                        {dailyDrilldownFilters?.category &&
                          ` - ${dailyDrilldownFilters.category}`}
                        {dailyDrilldownFilters?.month &&
                          ` (${dailyDrilldownFilters.month})`}
                      </h3>
                      <select
                        value={dailyChartType}
                        onChange={(e) => setDailyChartType(e.target.value)}
                        className="chart-type-selector"
                        style={{
                          padding: "5px 10px",
                          borderRadius: "4px",
                          border: "1px solid #ddd",
                        }}
                      >
                        <option value="bar">📊 Bar Chart</option>
                        <option value="line">📈 Line Chart</option>
                        <option value="pie">🥧 Pie Chart</option>
                      </select>
                    </div>

                    <div
                      style={{
                        height: "300px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {dailyChartType === "bar" && (
                        <BarChart data={dailyChartData} />
                      )}
                      {dailyChartType === "line" && (
                        <LineChart data={dailyChartData} />
                      )}
                      {dailyChartType === "pie" && (
                        <PieChart data={dailyChartData} />
                      )}
                    </div>
                  </div>
                )}
            </div>

            <div
              className="modal-footer-crn"
              style={{ display: "flex", gap: "12px" }}
            >
              {/* <button
                className="btn-modal-close"
                onClick={() => {
                  setShowDailyDrilldown(false);
                  setShowMonthlyDrilldown(true);
                }}
                style={{ 
                  backgroundColor: '#302ba0',
                  color: selectedKPI?.color,
                  border: `2px solid ${selectedKPI?.color}`
                }}
              >
                ← Back to Monthly
              </button> */}
              <button
                className="btn-modal-close"
                onClick={() => {
                  setShowDailyDrilldown(false);
                  setShowMonthlyDrilldown(false);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chart Drilldown Modal */}
      {showChartDrilldown && chartDrilldownData && (
        <div
          className="modal-overlay-crn"
          onClick={() => setShowChartDrilldown(false)}
        >
          <div
            className="modal-content-crn"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="modal-header-crn"
              style={{ borderBottomColor: selectedChart?.color || "#4CAF50" }}
            >
              <div className="modal-header-row">
                <div className="modal-title-wrapper">
                  <h2 className="modal-title-crn">
                    <span className="modal-icon-large">📊</span>
                    {selectedChart?.title} - {chartDrilldownData.segment}
                  </h2>
                  <p className="modal-subtitle">
                    Total: {formatValue(chartDrilldownData.total, "currency")} |
                    Financial Year: {selectedYear} | Click on any month to view
                    details
                  </p>
                </div>
                <button
                  className="modal-close-btn"
                  onClick={() => setShowChartDrilldown(false)}
                >
                  ✖
                </button>
              </div>
            </div>

            <div className="modal-body-crn">
              {Object.keys(chartDrilldownData.months).length > 0 ? (
                <div
                  className={
                    screenConfig.id === "crn_management"
                      ? "month-grid-4col"
                      : "month-grid-auto"
                  }
                >
                  {Object.entries(chartDrilldownData.months).map(
                    ([month, data]) => (
                      <div
                        key={month}
                        className="month-card-clickable drilldown-level-1"
                      >
                        <div className="month-name">{month}</div>
                        <div className="month-value">
                          {formatValue(data.value, "currency")}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <div className="empty-modal-state">
                  <div className="empty-modal-icon">📭</div>
                  <div className="empty-modal-text">
                    No monthly data available for this segment
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer-crn">
              <button
                className="btn-modal-close"
                onClick={() => setShowChartDrilldown(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="spinner">⏳ Loading...</div>
        </div>
      )}
    </div>
  );
};

export default UniversalScreen;
