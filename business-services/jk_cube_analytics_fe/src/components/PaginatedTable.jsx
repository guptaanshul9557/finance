import React, { useState } from 'react';
import { globalConfig } from '../config/globalConfig';

const PaginatedTable = ({
  columns,
  data,
  currentPage,
  totalPages,
  pageSize,
  totalRecords,
  onPageChange,
  onSort,
  onSearch,
  loading = false,
  error,
}) => {
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [searchTerm, setSearchTerm] = useState('');

  const handleSort = (columnKey) => {
    if (!onSort) return;

    const newDirection =
      sortColumn === columnKey && sortDirection === 'asc' ? 'desc' : 'asc';
    
    setSortColumn(columnKey);
    setSortDirection(newDirection);
    onSort(columnKey, newDirection);
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  const renderPaginationButtons = () => {
    const buttons = [];
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage - startPage < maxButtons - 1) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    // Previous button
    buttons.push(
      <button
        key="prev"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        style={{
          padding: '8px 12px',
          margin: '0 4px',
          border: `1px solid ${globalConfig.theme.borderColor}`,
          borderRadius: '4px',
          backgroundColor: currentPage === 1 ? '#f1f5f9' : '#fff',
          color: currentPage === 1 ? '#94a3b8' : globalConfig.theme.textColor,
          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: '500',
        }}
      >
        ← Previous
      </button>
    );

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => onPageChange(i)}
          style={{
            padding: '8px 12px',
            margin: '0 4px',
            border: `1px solid ${
              currentPage === i ? globalConfig.theme.primaryColor : globalConfig.theme.borderColor
            }`,
            borderRadius: '4px',
            backgroundColor: currentPage === i ? globalConfig.theme.primaryColor : '#fff',
            color: currentPage === i ? '#fff' : globalConfig.theme.textColor,
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: currentPage === i ? 'bold' : '500',
          }}
        >
          {i}
        </button>
      );
    }

    // Next button
    buttons.push(
      <button
        key="next"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        style={{
          padding: '8px 12px',
          margin: '0 4px',
          border: `1px solid ${globalConfig.theme.borderColor}`,
          borderRadius: '4px',
          backgroundColor: currentPage === totalPages ? '#f1f5f9' : '#fff',
          color: currentPage === totalPages ? '#94a3b8' : globalConfig.theme.textColor,
          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: '500',
        }}
      >
        Next →
      </button>
    );

    return buttons;
  };

  if (loading) {
    return (
      <div
        style={{
          padding: '40px',
          backgroundColor: '#fff',
          borderRadius: globalConfig.layout.borderRadius,
          boxShadow: globalConfig.layout.boxShadow,
          border: `1px solid ${globalConfig.theme.borderColor}`,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
        <div style={{ color: globalConfig.theme.textColor }}>Loading table data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: '40px',
          backgroundColor: '#fee',
          borderRadius: globalConfig.layout.borderRadius,
          boxShadow: globalConfig.layout.boxShadow,
          border: `1px solid ${globalConfig.colors.error}`,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '24px', marginBottom: '10px', color: globalConfig.colors.error }}>
          ⚠️
        </div>
        <div style={{ color: globalConfig.colors.error, fontWeight: 'bold' }}>Error loading table</div>
        <div style={{ color: globalConfig.theme.textColor, fontSize: '14px', marginTop: '5px' }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: '#fff',
        borderRadius: globalConfig.layout.borderRadius,
        boxShadow: globalConfig.layout.boxShadow,
        border: `1px solid ${globalConfig.theme.borderColor}`,
        overflow: 'hidden',
      }}
    >
      {/* Search Bar */}
      {onSearch && (
        <div style={{ padding: '16px', borderBottom: `1px solid ${globalConfig.theme.borderColor}` }}>
          <input
            type="text"
            placeholder="Search receipts..."
            value={searchTerm}
            onChange={handleSearch}
            style={{
              width: '100%',
              padding: '10px 16px',
              fontSize: '14px',
              border: `1px solid ${globalConfig.theme.borderColor}`,
              borderRadius: '6px',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => e.target.style.borderColor = globalConfig.colors.primary}
            onBlur={(e) => e.target.style.borderColor = globalConfig.theme.borderColor}
          />
        </div>
      )}
      
      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc' }}>
              {columns.map((column) => (
                <th
                  key={column.key}
                  onClick={() => column.sortable && handleSort(column.key)}
                  style={{
                    padding: '16px',
                    textAlign: 'left',
                    fontWeight: '600',
                    fontSize: '14px',
                    color: '#64748b',
                    borderBottom: `2px solid ${globalConfig.theme.borderColor}`,
                    cursor: column.sortable ? 'pointer' : 'default',
                    userSelect: 'none',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {column.label}
                    {column.sortable && sortColumn === column.key && (
                      <span style={{ fontSize: '12px' }}>
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: '#94a3b8',
                    fontSize: '14px',
                  }}
                >
                  No data available
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  style={{
                    borderBottom: `1px solid ${globalConfig.theme.borderColor}`,
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      style={{
                        padding: '16px',
                        fontSize: '14px',
                        color: globalConfig.theme.textColor,
                      }}
                    >
                      {column.render
                        ? column.render(row[column.key], row)
                        : row[column.key] ?? '-'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 0 && (
        <div
          style={{
            padding: '16px',
            borderTop: `1px solid ${globalConfig.theme.borderColor}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          {/* Info */}
          <div style={{ fontSize: '14px', color: '#64748b' }}>
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} records
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {renderPaginationButtons()}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaginatedTable;
