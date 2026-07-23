// Global Configuration for Analytics Dashboard

export const globalConfig = {
  theme: {
    mode: 'light',
    primaryColor: 'rgb(254, 122, 81)', // Orange
    secondaryColor: '#302ba0', // Blue
    backgroundColor: '#f8fafc',
    textColor: '#333', // Black
    borderColor: '#e2e8f0',
  },
  colors: {
    text: '#333',
    textSecondary: '#666',
    chartColors: [
      '#302ba0', // Blue
      'rgb(254, 122, 81)', // Orange
      '#333', // Black
      '#95a5a6', // Grey
      '#7f8c8d', // Dark Grey
      '#bdc3c7', // Light Grey
      'rgba(254, 122, 81, 0.7)', // Light Orange
      'rgba(48, 43, 160, 0.7)', // Light Blue
    ],
    success: '#10b981',
    warning: 'rgb(254, 122, 81)', // Orange
    error: '#ef4444',
    info: '#302ba0', // Blue
    gradients: {
      primary: ['#302ba0', 'rgb(254, 122, 81)'], // Blue to Orange
      secondary: ['rgb(254, 122, 81)', '#302ba0'], // Orange to Blue
    },
  },
  layout: {
    maxWidth: '1400px',
    spacing: {
      small: '0.5rem',
      medium: '1rem',
      large: '2rem',
    },
    borderRadius: '0.5rem',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  },
  charts: {
    defaultHeight: 400,
    animations: true,
    responsive: true,
    maintainAspectRatio: false,
  },
};

// Helper function to get chart options with global config
export const getChartOptions = (customOptions = {}) => {
  return {
    responsive: globalConfig.charts.responsive,
    maintainAspectRatio: globalConfig.charts.maintainAspectRatio,
    animation: globalConfig.charts.animations,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: globalConfig.theme.textColor,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: globalConfig.theme.borderColor,
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: globalConfig.theme.textColor,
        },
      },
      y: {
        grid: {
          color: globalConfig.theme.borderColor,
        },
        ticks: {
          color: globalConfig.theme.textColor,
        },
      },
    },
    ...customOptions,
  };
};

export default globalConfig;
