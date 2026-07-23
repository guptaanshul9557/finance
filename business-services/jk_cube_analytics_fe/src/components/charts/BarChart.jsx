import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { globalConfig, getChartOptions } from '../../config/globalConfig';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const BarChart = ({
  title,
  labels = [],
  datasets,
  data: simpleData,
  height = globalConfig.charts.defaultHeight,
  customOptions,
  loading = false,
  error,
  onBarClick,
}) => {
  // Support multiple data formats:
  // 1. {labels: [...], datasets: [...]} - Full chart data object
  // 2. {labels: [...], data: [...]}
  // 3. data: [{name: '...', value: ...}]
  
  let chartLabels = labels;
  let finalDatasets = datasets || [];
  
  // If data is an object with labels and datasets (full chart data format)
  if (simpleData && typeof simpleData === 'object' && !Array.isArray(simpleData) && simpleData.labels && simpleData.datasets) {
    chartLabels = simpleData.labels;
    finalDatasets = simpleData.datasets;
  }
  // If simple data array is provided
  else if (simpleData && !datasets) {
    // Check if it's array of objects with name/value
    if (Array.isArray(simpleData) && simpleData.length > 0 && typeof simpleData[0] === 'object' && 'name' in simpleData[0]) {
      chartLabels = simpleData.map(item => item.name);
      finalDatasets = [{
        label: title || 'Data',
        data: simpleData.map(item => item.value),
      }];
    } else if (Array.isArray(simpleData)) {
      // Simple array of numbers
      finalDatasets = [{
        label: title || 'Data',
        data: simpleData,
      }];
    }
  }

  const enhancedDatasets = (finalDatasets || []).map((dataset, index) => ({
    ...dataset,
    backgroundColor: dataset.backgroundColor || `${globalConfig.colors.chartColors[index % globalConfig.colors.chartColors.length]}cc`,
    borderColor: dataset.borderColor || globalConfig.colors.chartColors[index % globalConfig.colors.chartColors.length],
    borderWidth: 2,
  }));

  const chartData = {
    labels: chartLabels || [],
    datasets: enhancedDatasets,
  };

  const options = {
    ...getChartOptions({
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
      },
      ...customOptions,
    }),
    onClick: (event, elements) => {
      // Only trigger on actual mouse clicks, not keyboard events
      if (elements.length > 0 && onBarClick && event.native?.type === 'click') {
        const index = elements[0].index;
        const label = chartData.labels[index];
        const value = chartData.datasets[0].data[index];
        onBarClick({ name: label, value: value, index: index });
      }
    },
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
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default BarChart;
