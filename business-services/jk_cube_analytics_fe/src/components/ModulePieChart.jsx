/**
 * Module Pie Chart Component
 * Interactive pie chart with drilldown capability
 */

import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie as ChartComponent } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const ModulePieChart = ({ chartData, config, onSegmentClick }) => {
  const handleClick = (dataIndex) => {
    if (config.drilldownEnabled && onSegmentClick) {
      const label = chartData.labels[dataIndex];
      onSegmentClick(label);
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      <ChartComponent
        data={chartData}
        options={{
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              position: 'right',
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  return ` ${context.label}: ${context.parsed}`;
                },
              },
            },
          },
          onClick: (event, elements) => {
            if (elements.length > 0) {
              handleClick(elements[0].index);
            }
          },
        }}
        height={300}
      />
      {config.drilldownEnabled && (
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#999' }}>
          💡 Click on chart segment to filter table
        </div>
      )}
    </div>
  );
};

export default ModulePieChart;
