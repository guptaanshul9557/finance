/**
 * Module KPI Cards Component
 * Displays all KPIs in 4-column grid
 * Supports drilling when isDrillingRequired is enabled
 */

import React from 'react';
import KPICard from './KPICard';

const ModuleKPICards = ({ moduleId, moduleConfig, kpiData, loading, onKPIDrilldown }) => {
  const handleKPIClick = (kpi, value) => {
    console.log('🎯 KPI Card clicked:', kpi.title, 'Value:', value, 'isDrillingRequired:', kpi.isDrillingRequired);
    
    // Don't allow drilldown if value is 0 or empty
    if (!value || value === 0 || Number(value) === 0) {
      console.log('⚠️ No data to drill down (value is 0)');
      return;
    }
    
    if (kpi.isDrillingRequired && onKPIDrilldown) {
      console.log('✅ Calling onKPIDrilldown');
      onKPIDrilldown(kpi);
    } else {
      console.log('❌ Drilling not enabled or handler missing');
    }
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '15px',
      }}
    >
      {moduleConfig.kpis.map((kpi) => {
        // Get the KPI value directly (like Dashboard)
        const value = kpiData[kpi.id] || 0;
        
        // Format value based on type
        let displayValue;
        if (kpi.format === 'currency') {
          displayValue = `₹${Number(value).toLocaleString('en-IN')}`;
        } else if (kpi.format === 'percentage') {
          displayValue = `${Number(value).toFixed(1)}%`;
        } else {
          displayValue =value;
        }
        console.log(`📊 KPI: ${kpi.title}, Raw Value: ${value}, Display Value: ${displayValue}`);

        // Determine if card should be clickable (drilling enabled AND value > 0)
        const isClickable = kpi.isDrillingRequired && value && Number(value) > 0;

        return (
          <KPICard
            key={kpi.id}
            title={kpi.title}
            value={displayValue}
            icon={kpi.icon}
            color={kpi.color}
            loading={loading}
            onClick={isClickable ? () => handleKPIClick(kpi, value) : undefined}
          />
        );
      })}
    </div>
  );
};

export default ModuleKPICards;
