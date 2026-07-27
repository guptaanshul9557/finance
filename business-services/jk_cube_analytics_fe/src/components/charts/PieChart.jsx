import React from 'react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Title,
} from 'chart.js';
import { globalConfig } from '../../config/globalConfig';

ChartJS.register(ArcElement, Tooltip, Legend, Title);

const PieChart = ({
  title,
  labels = [],
  data = [],
  height = globalConfig.charts.defaultHeight,
  customOptions,
  loading = false,
  error,
  onSegmentClick,
}) => {
  // Support both formats: 
  // 1. {labels: [...], datasets: [...]} - Full chart data object
  // 2. {labels: [...], data: [...]} 
  // 3. data: [{name: '...', value: ...}]
  let chartLabels = labels;
  let chartValues = data;
  let chartDatasets = null;
  
  // If data is an object with labels and datasets (full chart data format)
  if (data && typeof data === 'object' && !Array.isArray(data) && data.labels && data.datasets) {
    chartLabels = data.labels;
    chartDatasets = data.datasets;
  }
  // If data is array of objects with name/value
  else if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && 'name' in data[0]) {
    chartLabels = data.map(item => item.name);
    chartValues = data.map(item => item.value);
  }
  
  const chartData = {
    labels: chartLabels || [],
    datasets: chartDatasets || [
      {
        label: title || 'Data',
        data: chartValues || [],
        backgroundColor: globalConfig.colors.chartColors,
        borderColor: globalConfig.colors.chartColors.map(color => {
          // Darken the color for border
          return color.replace('cc', 'ff');
        }),
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (event, elements) => {
      // Only trigger on actual mouse clicks, not keyboard events
      if (elements.length > 0 && onSegmentClick && event.native?.type === 'click') {
        const index = elements[0].index;
        const label = chartData.labels[index];
        const value = chartData.datasets[0].data[index];
        onSegmentClick({ name: label, value: value, index: index });
      }
    },
    plugins: {
      title: {
        display: !!title,
        text: title,
        color: globalConfig.theme.textColor,
        font: {
          size: 16,
          weight: 'bold',
        },
      },
      legend: {
        position: 'bottom',
        labels: {
          color: globalConfig.theme.textColor,
          padding: 15,
        },
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            return label + ': ₹' + value.toLocaleString('en-IN');
          },
        },
      },
    },
    ...customOptions,
  };

  if (loading) {
    return (
      <div
        style={{
          height: `${height}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: globalConfig.theme.backgroundColor,
          borderRadius: globalConfig.layout.borderRadius,
          border: `1px solid ${globalConfig.theme.borderColor}`,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
          <div style={{ color: globalConfig.theme.textColor }}>Loading chart data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          height: `${height}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fee',
          borderRadius: globalConfig.layout.borderRadius,
          border: `1px solid ${globalConfig.colors.error}`,
          padding: '20px',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '10px', color: globalConfig.colors.error }}>
            ⚠️
          </div>
          <div style={{ color: globalConfig.colors.error, fontWeight: 'bold' }}>Error loading chart</div>
          <div style={{ color: globalConfig.theme.textColor, fontSize: '14px', marginTop: '5px' }}>
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        height: `${height}px`,
        padding: '20px',
        backgroundColor: '#fff',
        borderRadius: globalConfig.layout.borderRadius,
        boxShadow: globalConfig.layout.boxShadow,
        border: `1px solid ${globalConfig.theme.borderColor}`,
         width:"100%"
      }}
    >
      <Pie data={chartData} options={options} />
    </div>
  );
};

export default PieChart;
