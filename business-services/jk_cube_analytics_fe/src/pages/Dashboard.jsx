import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { globalConfig } from '../config/globalConfig';
import LineChart from '../components/charts/LineChart';
import BarChart from '../components/charts/BarChart';
import KPICard from '../components/KPICard';
import PaginatedTable from '../components/PaginatedTable';

const Dashboard = () => {
  const [kpis, setKpis] = useState({
    totalReceipts: 0,
    totalAmount: 0,
    avgAmount: 0,
    loading: true,
  });

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
  });

  // Table columns configuration
  const columns = [
    { key: 'tres_coll_receipt_no', label: 'Receipt No', sortable: true },
    { key: 'tres_coll_receipt_year', label: 'Year', sortable: true },
    {
      key: 'tres_coll_receipt_date',
      label: 'Receipt Date',
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString(),
    },
    { key: 'tres_coll_department_code', label: 'Dept Code', sortable: true },
    {
      key: 'tres_coll_receipt_amount',
      label: 'Amount',
      sortable: true,
      render: (value) => `₹${parseFloat(value || 0).toLocaleString()}`,
    },
    { key: 'tres_coll_instrument_type', label: 'Instrument Type' },
    { key: 'coll_counter_no', label: 'Counter No' },
  ];

  // Fetch KPIs
  const fetchKPIs = async () => {
    setKpis((prev) => ({ ...prev, loading: true }));
    
    try {
      const [totalReceipts, totalAmount, avgAmount] = await Promise.all([
        axios.get('/api/kpi/total-receipts'),
        axios.get('/api/kpi/total-amount'),
        axios.get('/api/kpi/average-amount'),
      ]);

      setKpis({
        totalReceipts: totalReceipts.data.value || 0,
        totalAmount: totalAmount.data.value || 0,
        avgAmount: avgAmount.data.value || 0,
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

  // Fetch time series data
  const fetchTimeSeriesData = async () => {
    setTimeSeriesData((prev) => ({ ...prev, loading: true }));

    try {
      const response = await axios.get('/api/timeseries');

      setTimeSeriesData({
        labels: response.data.labels || [],
        data: response.data.data || [],
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

  // Fetch department data
  const fetchDepartmentData = async () => {
    setDepartmentData((prev) => ({ ...prev, loading: true }));

    try {
      const response = await axios.get('/api/department-data');

      const labels = response.data.labels || [];
      const data = response.data.data || [];

      setDepartmentData({
        labels,
        data,
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

  // Fetch table data
  const fetchTableData = async (page = 1, orderBy) => {
    setTableData((prev) => ({ ...prev, loading: true }));

    try {
      const response = await axios.get('/api/table-data', {
        params: {
          page,
          pageSize: 10,
        },
      });

      setTableData({
        data: response.data.data || [],
        currentPage: response.data.pagination.currentPage,
        totalPages: response.data.pagination.totalPages,
        pageSize: response.data.pagination.pageSize,
        totalRecords: response.data.pagination.totalRecords,
        loading: false,
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
    fetchTableData(page);
  };

  // Handle sort
  const handleSort = (column, direction) => {
    fetchTableData(tableData.currentPage, [{ column, direction }]);
  };

  // Load data on mount
  useEffect(() => {
    fetchKPIs();
    fetchTimeSeriesData();
    fetchDepartmentData();
    fetchTableData();
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: globalConfig.theme.backgroundColor,
        padding: '20px',
      }}
    >
      {/* Header */}
      <div style={{ maxWidth: globalConfig.layout.maxWidth, margin: '0 auto' }}>
        <div style={{ marginBottom: '30px' }}>
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: globalConfig.theme.textColor,
              marginBottom: '8px',
            }}
          >
            Treasury Collection Analytics
          </h1>
          <p style={{ fontSize: '16px', color: '#64748b' }}>
            Dynamic dashboard powered by Synmetrix + PostgreSQL
          </p>
        </div>

        {/* KPI Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
            marginBottom: '30px',
          }}
        >
          {/* <KPICard
            title="Total Receipts"
            value={kpis.totalReceipts.toLocaleString()}
            subtitle="All time receipts"
            icon="📝"
            color={globalConfig.colors.chartColors[0]}
            loading={kpis.loading}
            error={kpis.error}
          /> */}
          <KPICard
            title="Total Amount"
            value={`₹${(kpis.totalAmount / 1000000).toFixed(2)}M`}
            subtitle="Revenue collected"
            icon="💰"
            color={globalConfig.colors.chartColors[1]}
            loading={kpis.loading}
            error={kpis.error}
            trend={{ value: 12.5, isPositive: true }}
          />
          {/* <KPICard
            title="Average Amount"
            value={`₹${kpis.avgAmount.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}`}
            subtitle="Per receipt"
            icon="📊"
            color={globalConfig.colors.chartColors[2]}
            loading={kpis.loading}
            error={kpis.error}
          /> */}
        </div>

        {/* Charts */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
            gap: '20px',
            marginBottom: '30px',
          }}
        >
          <LineChart
            title="Receipt Amount Over Time"
            labels={timeSeriesData.labels}
            datasets={[
              {
                label: 'Amount',
                data: timeSeriesData.data,
              },
            ]}
            loading={timeSeriesData.loading}
            error={timeSeriesData.error}
          />
          <BarChart
            title="Top 10 Departments by Collection"
            labels={departmentData.labels}
            datasets={[
              {
                label: 'Total Amount',
                data: departmentData.data,
              },
            ]}
            loading={departmentData.loading}
            error={departmentData.error}
          />
        </div>

        {/* Table */}
        <div style={{ marginBottom: '30px' }}>
          <h2
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: globalConfig.theme.textColor,
              marginBottom: '16px',
            }}
          >
            Recent Receipts
          </h2>
          <PaginatedTable
            columns={columns}
            data={tableData.data}
            currentPage={tableData.currentPage}
            totalPages={tableData.totalPages}
            pageSize={tableData.pageSize}
            totalRecords={tableData.totalRecords}
            onPageChange={handlePageChange}
            onSort={handleSort}
            loading={tableData.loading}
            error={tableData.error}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
