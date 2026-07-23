/**
 * Drilldown Modal Component
 * Displays detailed information about a selected record
 */

import React from 'react';

const DrilldownModal = ({ record, columns, moduleColor, onClose }) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '30px',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          borderTop: `4px solid ${moduleColor}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '20px',
            alignItems: 'center',
          }}
        >
          <h2 style={{ margin: 0, color: moduleColor }}>
            Record Details
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#999',
            }}
          >
            ✕
          </button>
        </div>

        <div>
          {columns.map((col) => (
            <div
              key={col.key}
              style={{
                marginBottom: '15px',
                paddingBottom: '15px',
                borderBottom: '1px solid #eee',
              }}
            >
              <div
                style={{
                  fontWeight: '600',
                  color: '#666',
                  fontSize: '12px',
                  marginBottom: '5px',
                }}
              >
                {col.label}
              </div>
              <div style={{ marginTop: '5px', fontSize: '16px' }}>
                {col.format === 'currency'
                  ? `₹${Number(record[col.key] || 0).toLocaleString()}`
                  : col.format === 'date'
                  ? new Date(record[col.key]).toLocaleDateString()
                  : record[col.key]}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: '20px',
            textAlign: 'right',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: moduleColor,
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DrilldownModal;
