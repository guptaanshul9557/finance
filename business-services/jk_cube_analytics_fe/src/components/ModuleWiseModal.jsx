import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { globalConfig } from '../config/globalConfig';
import cubejsApi from '../cubejs/cubejsApi';
import BarChart from './charts/BarChart';

const ModuleWiseModal = ({ isOpen, onClose }) => {
  const [moduleData, setModuleData] = useState({
    labels: [],
    data: [],
    loading: true,
  });

  const [tableData, setTableData] = useState([]);

  // Financial year dropdown state
  // Calculate current financial year using dayjs
  const getCurrentFinYear = () => {
    const now = dayjs();
    const year = now.year();
    const month = now.month() + 1; // dayjs month is 0-indexed
    if (month >= 4) {
      return `${year}-${year + 1}`;
    } else {
      return `${year - 1}-${year}`;
    }
  };

  const [selectedYear, setSelectedYear] = useState(getCurrentFinYear());
  // You can still keep a fixed list or generate dynamically if needed
  const financialYears = [
    '2021-2022',
    '2022-2023',
    '2023-2024',
    '2024-2025',
    '2025-2026',
    getCurrentFinYear(),
  ];

  useEffect(() => {
    if (isOpen) {
      fetchModuleWiseData(selectedYear);
    }
  }, [isOpen, selectedYear]);

  const fetchModuleWiseData = async (year) => {
    setModuleData((prev) => ({ ...prev, loading: true }));

    try {
      const resultSet = await cubejsApi.load({
        measures: ['TresCollReceiptHdr.totalAmount', 'TresCollReceiptHdr.totalReceipts'],
        dimensions: ['TresCollReceiptHdr.departmentName'],
        order: {
          'TresCollReceiptHdr.totalAmount': 'desc'
        },
        filters: [
          {
            member: 'TresCollReceiptHdr.receiptYear',
            operator: 'equals',
            values: [year],
          },
        ],
      });

      const data = resultSet.tablePivot();
      const labels = data.map((row) => row['TresCollReceiptHdr.departmentName'] || 'Unknown');
      const amounts = data.map((row) => parseFloat(row['TresCollReceiptHdr.totalAmount']) || 0);

      setModuleData({
        labels,
        data: amounts,
        loading: false,
      });

      setTableData(data);
    } catch (error) {
      console.error('Error fetching module-wise data:', error);
      setModuleData((prev) => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load data',
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={onClose}
      >
        {/* Modal */}
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '1200px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              padding: '24px',
              borderBottom: `1px solid ${globalConfig.theme.borderColor}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h2 style={{ margin: 0, fontSize: '24px', color: globalConfig.colors.text }}>
              Module-wise Collection Breakdown
            </h2>
            <div>
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
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '28px',
                cursor: 'pointer',
                color: '#64748b',
                lineHeight: 1,
                padding: '0 8px',
              }}
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: '24px' }}>
            {moduleData.loading ? (
              <div style={{ textAlign: 'center', padding: '60px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
                <div style={{ color: globalConfig.colors.text }}>Loading module-wise data...</div>
              </div>
            ) : (
              <>
                {/* Chart */}
                <div style={{ marginBottom: '32px' }}>
                  <BarChart
                    title="Collection by Module/Department"
                    data={moduleData.data}
                    labels={moduleData.labels}
                    loading={moduleData.loading}
                  />
                </div>

                {/* Table */}
                <div
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: globalConfig.layout.borderRadius,
                    border: `1px solid ${globalConfig.theme.borderColor}`,
                    overflow: 'hidden',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc' }}>
                        <th
                          style={{
                            padding: '16px',
                            textAlign: 'left',
                            fontWeight: '600',
                            fontSize: '14px',
                            color: '#64748b',
                            borderBottom: `2px solid ${globalConfig.theme.borderColor}`,
                          }}
                        >
                          Module/Department
                        </th>
                        <th
                          style={{
                            padding: '16px',
                            textAlign: 'right',
                            fontWeight: '600',
                            fontSize: '14px',
                            color: '#64748b',
                            borderBottom: `2px solid ${globalConfig.theme.borderColor}`,
                          }}
                        >
                          Total Receipts
                        </th>
                        <th
                          style={{
                            padding: '16px',
                            textAlign: 'right',
                            fontWeight: '600',
                            fontSize: '14px',
                            color: '#64748b',
                            borderBottom: `2px solid ${globalConfig.theme.borderColor}`,
                          }}
                        >
                          Total Amount
                        </th>
                        <th
                          style={{
                            padding: '16px',
                            textAlign: 'right',
                            fontWeight: '600',
                            fontSize: '14px',
                            color: '#64748b',
                            borderBottom: `2px solid ${globalConfig.theme.borderColor}`,
                          }}
                        >
                          Percentage
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map((row, index) => {
                        const totalAmount = parseFloat(row['TresCollReceiptHdr.totalAmount']) || 0;
                        const totalReceipts = parseInt(row['TresCollReceiptHdr.totalReceipts']) || 0;
                        const grandTotal = tableData.reduce((sum, r) => sum + (parseFloat(r['TresCollReceiptHdr.totalAmount']) || 0), 0);
                        const percentage = grandTotal > 0 ? (totalAmount / grandTotal * 100).toFixed(2) : '0.00';

                        return (
                          <tr
                            key={index}
                            style={{
                              backgroundColor: index % 2 === 0 ? '#fff' : '#f8fafc',
                              borderBottom: `1px solid ${globalConfig.theme.borderColor}`,
                            }}
                          >
                            <td style={{ padding: '16px', fontSize: '14px', color: globalConfig.colors.text }}>
                              {row['TresCollReceiptHdr.departmentName'] || 'Unknown'}
                            </td>
                            <td style={{ padding: '16px', fontSize: '14px', color: globalConfig.colors.text, textAlign: 'right' }}>
                              {totalReceipts.toLocaleString()}
                            </td>
                            <td style={{ padding: '16px', fontSize: '14px', color: globalConfig.colors.text, textAlign: 'right', fontWeight: '600' }}>
                              ₹{totalAmount.toLocaleString()}
                            </td>
                            <td style={{ padding: '16px', fontSize: '14px', color: globalConfig.colors.info, textAlign: 'right', fontWeight: '600' }}>
                              {percentage}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>
                        <td style={{ padding: '16px', fontSize: '14px', color: globalConfig.colors.text }}>
                          Total
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px', color: globalConfig.colors.text, textAlign: 'right' }}>
                          {tableData.reduce((sum, row) => sum + (parseInt(row['TresCollReceiptHdr.totalReceipts']) || 0), 0).toLocaleString()}
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px', color: globalConfig.colors.text, textAlign: 'right' }}>
                          ₹{tableData.reduce((sum, row) => sum + (parseFloat(row['TresCollReceiptHdr.totalAmount']) || 0), 0).toLocaleString()}
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px', color: globalConfig.colors.text, textAlign: 'right' }}>
                          100.00%
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ModuleWiseModal;
