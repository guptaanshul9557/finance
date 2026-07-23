/**
 * Module Data Table Component
 * Paginated table with search, filters, and row expansion
 * Uses Cube.js for fast OLAP queries
 */

import React, { useState, useEffect } from 'react';
import cubejsApi from '../cubejs/cubejsApi';

const ModuleDataTable = ({
  moduleId,
  tableConfig,
  filters,
  selectedYear,
  onRowClick,
}) => {
  const [tableData, setTableData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch table data using Cube.js
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const offset = (currentPage - 1) * tableConfig.pageSize;
        
        if (!tableConfig.cubeQuery) {
          console.error(`Table has no cubeQuery defined`);
          setLoading(false);
          return;
        }

        // Build Cube.js query from moduleRegistry
        const query = typeof tableConfig.cubeQuery === 'function'
          ? tableConfig.cubeQuery(selectedYear, offset, tableConfig.pageSize, search, filters)
          : tableConfig.cubeQuery;

        console.log(`📋 TABLE Query:`, JSON.stringify(query, null, 2));

        // Execute query via Cube.js
        const resultSet = await cubejsApi.load(query);
        const data = resultSet.tablePivot();

        console.log(`📋 TABLE Data:`, data);

        // Transform Cube.js data to table format
        const transformedData = data.map((row, index) => {
          const transformedRow = { id: offset + index + 1 };
          
          // Map Cube.js column names to table column IDs
          Object.keys(row).forEach(key => {
            // Extract the dimension/measure name from Cube.js format
            // e.g., "TresCollReceiptHdr.receiptNo" -> "receiptNo"
            const columnName = key.split('.').pop();
            transformedRow[columnName] = row[key];
          });
          
          return transformedRow;
        });

        setTableData(transformedData);
        
        // Calculate total pages (Cube.js doesn't return total count easily)
        // For now, assume if we get full page, there might be more
        const estimatedPages = transformedData.length === tableConfig.pageSize 
          ? currentPage + 1 
          : currentPage;
        setTotalPages(estimatedPages);

      } catch (error) {
        console.error('Error fetching table:', error);
      }
      setLoading(false);
    };

    fetchData();
  }, [moduleId, currentPage, search, filters, selectedYear, tableConfig]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div
      style={{
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        overflow: 'hidden',
      }}
    >
      {/* Search Bar */}
      {tableConfig.searchable && (
        <div style={{ padding: '15px', borderBottom: '1px solid #eee' }}>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={handleSearch}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
          />
        </div>
      )}

      {/* Table */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '14px',
        }}
      >
        <thead>
          <tr
            style={{
              backgroundColor: '#f9f9f9',
              borderBottom: '2px solid #eee',
            }}
          >
            {tableConfig.columns.map((col) => (
              <th
                key={col.key}
                style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontWeight: '600',
                  width: col.width,
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td
                colSpan={tableConfig.columns.length}
                style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: '#999',
                }}
              >
                Loading...
              </td>
            </tr>
          ) : tableData.length === 0 ? (
            <tr>
              <td
                colSpan={tableConfig.columns.length}
                style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: '#999',
                }}
              >
                No data found
              </td>
            </tr>
          ) : (
            tableData.map((row, idx) => (
              <tr
                key={idx}
                onClick={() =>
                  tableConfig.expandable && onRowClick(row)
                }
                style={{
                  borderBottom: '1px solid #eee',
                  cursor: tableConfig.expandable ? 'pointer' : 'default',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (tableConfig.expandable) {
                    e.currentTarget.style.backgroundColor = '#f5f5f5';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {tableConfig.columns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: '12px',
                      width: col.width,
                    }}
                  >
                    {col.format === 'currency'
                      ? `₹${Number(row[col.key] || 0).toLocaleString()}`
                      : col.format === 'date'
                      ? new Date(row[col.key]).toLocaleDateString()
                      : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Pagination */}
      <div
        style={{
          padding: '15px',
          textAlign: 'right',
          borderTop: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ color: '#999', fontSize: '12px' }}>
          Page {currentPage} of {totalPages}
        </span>
        <div style={{ display: 'flex', gap: '5px' }}>
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '6px 12px',
              backgroundColor:
                currentPage === 1 ? '#eee' : '#4CAF50',
              color: currentPage === 1 ? '#999' : 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: currentPage === 1 ? 'default' : 'pointer',
              fontSize: '13px',
            }}
          >
            ← Prev
          </button>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: '6px 12px',
              backgroundColor:
                currentPage === totalPages ? '#eee' : '#4CAF50',
              color: currentPage === totalPages ? '#999' : 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: currentPage === totalPages ? 'default' : 'pointer',
              fontSize: '13px',
            }}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModuleDataTable;
