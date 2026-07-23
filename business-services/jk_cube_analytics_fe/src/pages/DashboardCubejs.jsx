import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import cubejsApi from '../cubejs/cubejsApi';
import { globalConfig } from '../config/globalConfig';
import LineChart from '../components/charts/LineChart';
import BarChart from '../components/charts/BarChart';
import PieChart from '../components/charts/PieChart';
import KPICard from '../components/KPICard';
import PaginatedTable from '../components/PaginatedTable';
import ModuleWiseModal from '../components/ModuleWiseModal';

// Helper function to convert financial year (e.g., '2025-2026') to date range
const getFinancialYearDateRange = (yearStr) => {
  const [startYear] = yearStr.split('-');
  const startDate = dayjs(`${startYear}-04-01`).format('YYYY-MM-DD');
  const endDate = dayjs(`${startYear}-04-01`).add(1, 'year').subtract(1, 'day').format('YYYY-MM-DD');
  return [startDate, endDate];
};

const Dashboard = () => {
  const [kpis, setKpis] = useState({
    totalReceipts: 0,
    totalAmount: 0,
    avgAmount: 0,
    loading: true,
  });

  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);

  const [timeSeriesData, setTimeSeriesData] = useState({
    labels: [],
    data: [],
    loading: true,
  });

  const [departmentData, setDepartmentData] = useState({
    labels: [],
    data: [],
    loading: true,
  });

  const [tableData, setTableData] = useState({
    data: [],
    currentPage: 1,
    totalPages: 0,
    pageSize: 10,
    totalRecords: 0,
    loading: true,
    searchTerm: '',
  });

  const [searchDebounceTimer, setSearchDebounceTimer] = useState(null);

  // Transaction KPIs
  const [transactionKpis, setTransactionKpis] = useState({
    totalTransactions: 0,
    successCount: 0,
    pendingCount: 0,
    failedCount: 0,
    cancelCount: 0,
    loading: true,
  });

  // Specific Success KPIs
  const [successKpis, setSuccessKpis] = useState({
    dataTransfer20To10Success: 0,
    cancelReceiptSuccess: 0,
    overallSuccess: 0,
    loading: true,
  });

  // Volume and Value KPIs
  const [volumeValueKpis, setVolumeValueKpis] = useState({
    totalVolume: 0,
    totalValue: 0,
    successVolume: 0,
    successValue: 0,
    cancelVolume: 0,
    cancelValue: 0,
    loading: true,
  });

  // Data Transfer Pushed KPI (current date)
  const [dataTransferPushedKpi, setDataTransferPushedKpi] = useState({
    count: 0,
    loading: true,
  });

  // Transaction status pie chart data
  const [transactionStatusData, setTransactionStatusData] = useState({
    labels: [],
    data: [],
    loading: true,
  });

  // Financial year dropdown state - use dayjs to calculate current fin year
  const getCurrentFinYear = () => {
    const now = dayjs();
    const year = now.year();
    const month = now.month() + 1;
    if (month >= 4) {
      return `${year}-${year + 1}`;
    } else {
      return `${year - 1}-${year}`;
    }
  };

  const [selectedYear, setSelectedYear] = useState(getCurrentFinYear());
  const financialYears = [
    '2021-2022',
    '2022-2023',
    '2023-2024',
    '2024-2025',
    '2025-2026',
  ];

  // Table columns configuration
  const columns = [
    { 
      key: 'TresCollReceiptHdr.receiptNo', 
      label: 'Receipt No', 
      sortable: true,
      render: (value) => value || 'N/A'
    },
    { 
      key: 'TresCollReceiptHdr.receiptYear', 
      label: 'Year', 
      sortable: true 
    },
    {
      key: 'TresCollReceiptHdr.receiptDate',
      label: 'Receipt Date',
      sortable: true,
      render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A',
    },
    { 
      key: 'TresCollReceiptHdr.departmentName', 
      label: 'Department', 
      sortable: true,
      render: (value) => value || 'Unknown'
    },
    {
      key: 'TresCollReceiptHdr.receiptAmount',
      label: 'Amount',
      sortable: true,
      render: (value) => `₹${parseFloat(value || 0).toLocaleString()}`,
    },
    { 
      key: 'TresCollReceiptHdr.instrumentType', 
      label: 'Instrument Type' 
    },
    { 
      key: 'TresCollReceiptHdr.counterNo', 
      label: 'Counter No' 
    },
  ];

  // Fetch KPIs using Cube.js
  const fetchKPIs = async () => {
    setKpis((prev) => ({ ...prev, loading: true }));
    try {
      const resultSet = await cubejsApi.load({
        measures: [
          'TresCollReceiptHdr.totalReceipts',
          'TresCollReceiptHdr.totalAmount',
          'TresCollReceiptHdr.avgAmount'
        ],
        filters: [
          {
            member: 'TresCollReceiptHdr.receiptYear',
            operator: 'equals',
            values: [selectedYear],
          },
        ],
      });
      const data = resultSet.tablePivot()[0] || {};
      setKpis({
        totalReceipts: parseInt(data['TresCollReceiptHdr.totalReceipts']) || 0,
        totalAmount: parseFloat(data['TresCollReceiptHdr.totalAmount']) || 0,
        avgAmount: parseFloat(data['TresCollReceiptHdr.avgAmount']) || 0,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching KPIs:', error);
      setKpis((prev) => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load KPIs',
      }));
    }
  };

  // Fetch time series data using Cube.js
  const fetchTimeSeriesData = async () => {
    setTimeSeriesData((prev) => ({ ...prev, loading: true }));
    try {
      const resultSet = await cubejsApi.load({
        measures: ['TresCollReceiptHdr.totalAmount'],
        timeDimensions: [
          {
            dimension: 'TresCollReceiptHdr.receiptDate',
            granularity: 'day',
            dateRange: 'last 30 days'
          }
        ],
        filters: [
          {
            member: 'TresCollReceiptHdr.receiptYear',
            operator: 'equals',
            values: [selectedYear],
          },
        ],
      });
      const data = resultSet.chartPivot();
      const labels = data.map((row) => row.x);
      const values = data.map((row) => parseFloat(row['TresCollReceiptHdr.totalAmount']) || 0);
      setTimeSeriesData({
        labels,
        data: values,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching time series data:', error);
      setTimeSeriesData((prev) => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load chart data',
      }));
    }
  };

  // Fetch department data using Cube.js
  const fetchDepartmentData = async () => {
    setDepartmentData((prev) => ({ ...prev, loading: true }));
    try {
      const resultSet = await cubejsApi.load({
        measures: ['TresCollReceiptHdr.totalAmount'],
        dimensions: ['TresCollReceiptHdr.departmentName'],
        order: {
          'TresCollReceiptHdr.totalAmount': 'desc'
        },
        limit: 10,
        filters: [
          {
            member: 'TresCollReceiptHdr.receiptYear',
            operator: 'equals',
            values: [selectedYear],
          },
        ],
      });
      const data = resultSet.tablePivot();
      const labels = data.map((row) => row['TresCollReceiptHdr.departmentName'] || 'Unknown');
      const values = data.map((row) => parseFloat(row['TresCollReceiptHdr.totalAmount']) || 0);
      setDepartmentData({
        labels,
        data: values,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching department data:', error);
      setDepartmentData((prev) => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load chart data',
      }));
    }
  };

  // Fetch table data using Cube.js
  const fetchTableData = async (page = 1, search = '') => {
    setTableData((prev) => ({ ...prev, loading: true }));
    try {
      const offset = (page - 1) * 10;
      // Build query with search filter
      const query = {
        dimensions: [
          'TresCollReceiptHdr.receiptNo',
          'TresCollReceiptHdr.receiptYear',
          'TresCollReceiptHdr.receiptDate',
          'TresCollReceiptHdr.departmentName',
          'TresCollReceiptHdr.receiptAmount',
          'TresCollReceiptHdr.instrumentType',
          'TresCollReceiptHdr.counterNo',
        ],
        order: {
          'TresCollReceiptHdr.receiptDate': 'desc'
        },
        limit: 10,
        offset: offset,
        filters: [
          {
            member: 'TresCollReceiptHdr.receiptYear',
            operator: 'equals',
            values: [selectedYear],
          },
        ],
      };
      // Add search filter if search term exists
      if (search) {
        query.filters.push({
          or: [
            {
              member: 'TresCollReceiptHdr.receiptNo',
              operator: 'contains',
              values: [search]
            },
            {
              member: 'TresCollReceiptHdr.departmentName',
              operator: 'contains',
              values: [search]
            }
          ]
        });
      }
      const resultSet = await cubejsApi.load(query);
      const data = resultSet.tablePivot();
      // Get total count with search filter
      const countQuery = {
        measures: ['TresCollReceiptHdr.totalReceipts'],
        filters: [
          {
            member: 'TresCollReceiptHdr.receiptYear',
            operator: 'equals',
            values: [selectedYear],
          },
        ],
      };
      if (search) {
        countQuery.filters.push(...query.filters.filter(f => f.or));
      }
      const countResult = await cubejsApi.load(countQuery);
      const totalRecords = parseInt(countResult.tablePivot()[0]?.['TresCollReceiptHdr.totalReceipts']) || 0;
      const totalPages = Math.ceil(totalRecords / 10);
      setTableData({
        data,
        currentPage: page,
        totalPages,
        pageSize: 10,
        totalRecords,
        loading: false,
        searchTerm: search,
      });
    } catch (error) {
      console.error('Error fetching table data:', error);
      setTableData((prev) => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load table data',
      }));
    }
  };

  // Handle page change
  const handlePageChange = (page) => {
    fetchTableData(page, tableData.searchTerm);
  };

  // Handle search with debounce
  const handleSearch = (searchTerm) => {
    // Clear existing timer
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }

    // Set new timer - wait 500ms after user stops typing
    const timer = setTimeout(() => {
      fetchTableData(1, searchTerm);
    }, 500);

    setSearchDebounceTimer(timer);
  };

  // Handle sort (Cube.js handles this in the query)
  const handleSort = (column) => {
    // For now, just log - can be enhanced later
    console.log('Sort by:', column);
  };

  // Fetch transaction KPIs
  const fetchTransactionKpis = async () => {
    setTransactionKpis((prev) => ({ ...prev, loading: true }));
    try {
      const resultSet = await cubejsApi.load({
        measures: [
          'CollTransactionId.totalTransactions',
          'CollTransactionId.successCount',
          'CollTransactionId.pendingCount',
          'CollTransactionId.failedCount',
          'CollTransactionId.cancelCount',
        ],
        filters: [
          {
            member: 'CollTransactionId.createdDate',
            operator: 'inDateRange',
            values: getFinancialYearDateRange(selectedYear),
          },
        ],
      });

      const data = resultSet.tablePivot()[0] || {};

      setTransactionKpis({
        totalTransactions: parseInt(data['CollTransactionId.totalTransactions']) || 0,
        successCount: parseInt(data['CollTransactionId.successCount']) || 0,
        pendingCount: parseInt(data['CollTransactionId.pendingCount']) || 0,
        failedCount: parseInt(data['CollTransactionId.failedCount']) || 0,
        cancelCount: parseInt(data['CollTransactionId.cancelCount']) || 0,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching transaction KPIs:', error);
      setTransactionKpis((prev) => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load transaction KPIs',
      }));
    }
  };

  // Fetch transaction status distribution for pie chart
  const fetchTransactionStatusData = async () => {
    setTransactionStatusData((prev) => ({ ...prev, loading: true }));
    try {
      const resultSet = await cubejsApi.load({
        measures: [
          'CollTransactionId.successCount',
          'CollTransactionId.pendingCount',
          'CollTransactionId.cancelCount',
          'CollTransactionId.failedCount',
        ],
        filters: [
          {
            member: 'CollTransactionId.createdDate',
            operator: 'inDateRange',
            values: getFinancialYearDateRange(selectedYear),
          },
        ],
      });

      const data = resultSet.tablePivot()[0] || {};

      const statusLabels = ['Success', 'Pending', 'Cancel', 'Failed'];
      const statusValues = [
        parseInt(data['CollTransactionId.successCount']) || 0,
        parseInt(data['CollTransactionId.pendingCount']) || 0,
        parseInt(data['CollTransactionId.cancelCount']) || 0,
        parseInt(data['CollTransactionId.failedCount']) || 0,
      ];

      setTransactionStatusData({
        labels: statusLabels,
        data: statusValues,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching transaction status data:', error);
      setTransactionStatusData((prev) => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load transaction status data',
      }));
    }
  };

  // Fetch Data Transfer Pushed KPI (current date, within financial year)
  const fetchDataTransferPushedKpi = async () => {
    setDataTransferPushedKpi((prev) => ({ ...prev, loading: true }));
    try {
      const resultSet = await cubejsApi.load({
        measures: ['CollTransactionId.dataTransferPushedCount'],
        filters: [
          {
            member: 'CollTransactionId.createdDate',
            operator: 'inDateRange',
            values: getFinancialYearDateRange(selectedYear),
          },
        ],
      });

      const data = resultSet.tablePivot()[0] || {};

      setDataTransferPushedKpi({
        count: parseInt(data['CollTransactionId.dataTransferPushedCount']) || 0,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching data transfer pushed KPI:', error);
      setDataTransferPushedKpi((prev) => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load pushed data',
      }));
    }
  };

  // Fetch specific success KPIs
  const fetchSuccessKpis = async () => {
    setSuccessKpis((prev) => ({ ...prev, loading: true }));
    try {
      const resultSet = await cubejsApi.load({
        measures: [
          'CollTransactionId.dataTransfer20To10Success',
          'CollTransactionId.cancelReceiptSuccess',
          'CollTransactionId.overallSuccess',
        ],
        filters: [
          {
            member: 'CollTransactionId.createdDate',
            operator: 'inDateRange',
            values: getFinancialYearDateRange(selectedYear),
          },
        ],
      });

      const data = resultSet.tablePivot()[0] || {};

      setSuccessKpis({
        dataTransfer20To10Success: parseInt(data['CollTransactionId.dataTransfer20To10Success']) || 0,
        cancelReceiptSuccess: parseInt(data['CollTransactionId.cancelReceiptSuccess']) || 0,
        overallSuccess: parseInt(data['CollTransactionId.overallSuccess']) || 0,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching success KPIs:', error);
      setSuccessKpis((prev) => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load success data',
      }));
    }
  };

  // Fetch Volume and Value KPIs
  const fetchVolumeValueKpis = async () => {
    setVolumeValueKpis((prev) => ({ ...prev, loading: true }));
    try {
      const resultSet = await cubejsApi.load({
        measures: [
          'CollTransactionId.totalTransactions',
          'CollTransactionId.totalValue',
          'CollTransactionId.successVolume',
          'CollTransactionId.successValue',
          'CollTransactionId.cancelVolume',
          'CollTransactionId.cancelValue',
        ],
        filters: [
          {
            member: 'CollTransactionId.createdDate',
            operator: 'inDateRange',
            values: getFinancialYearDateRange(selectedYear),
          },
        ],
      });

      const data = resultSet.tablePivot()[0] || {};

      setVolumeValueKpis({
        totalVolume: parseInt(data['CollTransactionId.totalTransactions']) || 0,
        totalValue: parseInt(data['CollTransactionId.totalValue']) || 0,
        successVolume: parseInt(data['CollTransactionId.successVolume']) || 0,
        successValue: parseInt(data['CollTransactionId.successValue']) || 0,
        cancelVolume: parseInt(data['CollTransactionId.cancelVolume']) || 0,
        cancelValue: parseInt(data['CollTransactionId.cancelValue']) || 0,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching volume/value KPIs:', error);
      setVolumeValueKpis((prev) => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load volume/value data',
      }));
    }
  };

  // Load data on mount
  useEffect(() => {
    fetchKPIs();
    fetchTimeSeriesData();
    fetchDepartmentData();
    fetchTableData();
    fetchTransactionKpis();
    fetchTransactionStatusData();
    fetchDataTransferPushedKpi();
    fetchSuccessKpis();
    fetchVolumeValueKpis();
  }, [selectedYear]);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ 
          margin: 0, 
          fontSize: '28px', 
          color: globalConfig.colors.text,
          fontWeight: 700 
        }}>
          Analytics Dashboard
        </h1>
        <p style={{ 
          margin: '8px 0 0', 
          color: globalConfig.colors.textSecondary,
          fontSize: '14px'
        }}>
          Treasury Collection Receipt Analysis (Powered by Cube.js)
        </p>
        <div style={{ marginTop: '16px' }}>
          <label htmlFor="finYearDropdown" style={{ marginRight: '10px', fontWeight: 500 }}>
            Financial Year:
          </label>
          <select
            id="finYearDropdown"
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '6px', border: `1px solid ${globalConfig.theme.borderColor}` }}
          >
            {financialYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '20px',
          marginBottom: '30px',
        }}
      >
        {/* <KPICard
          title="Total Receipts"
          value={kpis.totalReceipts}Total Transactions
          icon="📝"
          color={globalConfig.colors.primary}
          loading={kpis.loading}
        /> */}
        <KPICard
          title="Total Collection"
          value={`₹${kpis.totalAmount.toLocaleString()}`}
          icon="💰"
          color={globalConfig.colors.success}
          loading={kpis.loading}
          onClick={() => setIsModuleModalOpen(true)}
        />
        <KPICard
          title="Total Transactions"
          value={transactionKpis.totalTransactions}
          icon="📋"
          color={globalConfig.colors.primary}
          loading={transactionKpis.loading}
        />
        {/* <KPICard
          title="Average Amount"
          value={`₹${kpis.avgAmount.toLocaleString()}`}
          icon="📊"
          color={globalConfig.colors.info}
          loading={kpis.loading}
        /> */}
      </div>

      {/* Transaction KPIs Section */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ 
          margin: '0 0 20px 0', 
          fontSize: '20px', 
          color: globalConfig.colors.text,
          fontWeight: 700 
        }}>
          Treasury Transactions
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '15px',
          }}
        >
          <KPICard
            title="Total Transactions"
            value={transactionKpis.totalTransactions}
            icon="📋"
            color={globalConfig.colors.primary}
            loading={transactionKpis.loading}
          />
          <KPICard
            title="Success"
            value={transactionKpis.successCount}
            icon="✓"
            color={globalConfig.colors.success}
            loading={transactionKpis.loading}
          />
          <KPICard
            title="Pending"
            value={transactionKpis.pendingCount}
            icon="⏳"
            color={globalConfig.colors.warning}
            loading={transactionKpis.loading}
          />
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: globalConfig.layout.borderRadius,
              border: `2px solid ${globalConfig.colors.error}`,
              padding: '20px',
              boxShadow: globalConfig.layout.boxShadow,
            }}
          >
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px', fontWeight: 600 }}>
              Cancel
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: globalConfig.colors.error, marginBottom: '8px' }}>
              {transactionKpis.loading ? '...' : transactionKpis.cancelCount}
            </div>
            {!transactionKpis.loading && (
              <div style={{ 
                fontSize: '11px', 
                color: '#333', 
                fontWeight: 500,
                padding: '6px 8px',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px'
              }}>
                Success: {transactionKpis.successCount.toLocaleString()}, Cancel: {transactionKpis.cancelCount.toLocaleString()}
              </div>
            )}
          </div>
          <KPICard
            title="Failed"
            value={transactionKpis.failedCount}
            icon="⚠️"
            color="#ff6b6b"
            loading={transactionKpis.loading}
          />
          <KPICard
            title="Data Transfer Pushed (Today)"
            value={dataTransferPushedKpi.count}
            icon="📤"
            color="#6c63ff"
            loading={dataTransferPushedKpi.loading}
          />
        </div>
      </div>

      {/* Transaction Status Pie Chart */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          marginBottom: '30px',
        }}
      >
        {/* <PieChart
          title="Transaction Status Distribution"
          data={transactionStatusData.data}
          labels={transactionStatusData.labels}
          loading={transactionStatusData.loading}
          height={300}
        /> */}
        {/* <div
          style={{
            backgroundColor: '#fff',
            borderRadius: globalConfig.layout.borderRadius,
            border: `1px solid ${globalConfig.theme.borderColor}`,
            padding: '20px',
            boxShadow: globalConfig.layout.boxShadow,
          }}
        >
          <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: 600 }}>
            Transaction Summary
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr style={{ borderBottom: `1px solid ${globalConfig.theme.borderColor}` }}>
                <td style={{ padding: '10px', fontWeight: 500 }}>Total Volume:</td>
                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600 }}>
                  {transactionKpis.totalTransactions.toLocaleString()}
                </td>
              </tr>
              <tr style={{ borderBottom: `1px solid ${globalConfig.theme.borderColor}` }}>
                <td style={{ padding: '10px', color: globalConfig.colors.success, fontWeight: 500 }}>
                  Success Rate:
                </td>
                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600, color: globalConfig.colors.success }}>
                  {transactionKpis.totalTransactions > 0
                    ? ((transactionKpis.successCount / transactionKpis.totalTransactions) * 100).toFixed(2)
                    : '0.00'}
                  %
                </td>
              </tr>
              <tr style={{ borderBottom: `1px solid ${globalConfig.theme.borderColor}` }}>
                <td style={{ padding: '10px', color: globalConfig.colors.warning, fontWeight: 500 }}>
                  Pending Rate:
                </td>
                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600, color: globalConfig.colors.warning }}>
                  {transactionKpis.totalTransactions > 0
                    ? ((transactionKpis.pendingCount / transactionKpis.totalTransactions) * 100).toFixed(2)
                    : '0.00'}
                  %
                </td>
              </tr>
              <tr>
                <td style={{ padding: '10px', color: globalConfig.colors.error, fontWeight: 500 }}>
                  Cancel Rate:
                </td>
                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600, color: globalConfig.colors.error }}>
                  {transactionKpis.totalTransactions > 0
                    ? ((transactionKpis.cancelCount / transactionKpis.totalTransactions) * 100).toFixed(2)
                    : '0.00'}
                  %
                </td>
              </tr>
            </tbody>
          </table>
        </div> */}
      </div>

      {/* Volume and Value KPIs Section */}
      {/* <div style={{ marginBottom: '30px' }}>
        <h2 style={{ 
          margin: '0 0 20px 0', 
          fontSize: '20px', 
          color: globalConfig.colors.text,
          fontWeight: 700 
        }}>
          Volume & Value Breakdown
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '15px',
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: globalConfig.layout.borderRadius,
              border: `2px solid ${globalConfig.colors.success}`,
              padding: '20px',
              boxShadow: globalConfig.layout.boxShadow,
            }}
          >
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px', fontWeight: 600 }}>
              Success Transactions
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: globalConfig.colors.success, marginBottom: '8px' }}>
              {volumeValueKpis.loading ? '...' : volumeValueKpis.successVolume.toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
              Value: ₹{volumeValueKpis.loading ? '...' : volumeValueKpis.successValue.toLocaleString()}
            </div>
            {!volumeValueKpis.loading && (volumeValueKpis.successVolume + volumeValueKpis.cancelVolume) > 0 && (
              <div style={{ 
                fontSize: '11px', 
                color: '#333', 
                fontWeight: 500,
                padding: '6px 8px',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px'
              }}>
                Success: {volumeValueKpis.successVolume.toLocaleString()}, Cancel: {volumeValueKpis.cancelVolume.toLocaleString()}
              </div>
            )}
          </div>

          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: globalConfig.layout.borderRadius,
              border: `2px solid ${globalConfig.colors.error}`,
              padding: '20px',
              boxShadow: globalConfig.layout.boxShadow,
            }}
          >
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px', fontWeight: 600 }}>
              Cancel Transactions
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: globalConfig.colors.error, marginBottom: '8px' }}>
              {volumeValueKpis.loading ? '...' : volumeValueKpis.cancelVolume.toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
              Value: ₹{volumeValueKpis.loading ? '...' : volumeValueKpis.cancelValue.toLocaleString()}
            </div>
            {!volumeValueKpis.loading && (volumeValueKpis.successVolume + volumeValueKpis.cancelVolume) > 0 && (
              <div style={{ 
                fontSize: '11px', 
                color: '#333', 
                fontWeight: 500,
                padding: '6px 8px',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px'
              }}>
                Success: {volumeValueKpis.successVolume.toLocaleString()}, Cancel: {volumeValueKpis.cancelVolume.toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div> */}

      {/* Charts */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: globalConfig.layout.chartsPerRow === 2 ? '1fr 1fr' : '1fr',
          gap: '20px',
          marginBottom: '30px',
        }}
      >
        {/* <LineChart
          title="Daily Revenue Trend"
          data={timeSeriesData.data}
          labels={timeSeriesData.labels}
          loading={timeSeriesData.loading}
        /> */}
        {/* <BarChart
          title="Top 10 Departments by Revenue"
          data={departmentData.data}
          labels={departmentData.labels}
          loading={departmentData.loading}
        /> */}
      </div>

      {/* Data Table */}
      {/* <PaginatedTable
        title="Recent Receipts"
        columns={columns}
        data={tableData.data}
        currentPage={tableData.currentPage}
        totalPages={tableData.totalPages}
        pageSize={tableData.pageSize}
        totalRecords={tableData.totalRecords}
        loading={tableData.loading}
        onPageChange={handlePageChange}
        onSort={handleSort}
        onSearch={handleSearch}
      /> */}

      {/* Module Wise Modal */}
      <ModuleWiseModal 
        isOpen={isModuleModalOpen} 
        onClose={() => setIsModuleModalOpen(false)} 
      />
    </div>
  );
};

export default Dashboard;
