import React from 'react';
import { globalConfig } from '../config/globalConfig';

const KPICard = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = globalConfig.theme.primaryColor,
  loading = false,
  error,
  onClick,
  drilldownLevel = 0, // Track drilldown depth for color alternation
  cardStyle = {}, // Custom card styles
}) => {
  // Alternating color scheme based on drilldown level
  const getColorScheme = (level) => {
    // For KPI cards (level 0), always use orange border
    return {
      borderColor: 'rgb(254, 122, 81)', // Always orange border
      valueColor: '#302ba0', // Blue value
      accentColor: 'rgb(254, 122, 81)', // Orange accent bar
    };
  };

  const colorScheme = getColorScheme(drilldownLevel);

  if (loading) {
    return (
      <div
        style={{
          padding: '16px',
          backgroundColor: '#fff',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(15,23,42,0.08)',
          border: `1px solid ${globalConfig.theme.borderColor}`,
          minHeight: '110px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center', color: globalConfig.theme.textColor }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: '16px',
          backgroundColor: '#fee',
          borderRadius: globalConfig.layout.borderRadius,
          boxShadow: globalConfig.layout.boxShadow,
          border: `1px solid ${globalConfig.colors.error}`,
          minHeight: '110px',
        }}
      >
        <div style={{ color: globalConfig.colors.error, fontWeight: 'bold', marginBottom: '5px' }}>
          Error
        </div>
        <div style={{ color: globalConfig.theme.textColor, fontSize: '14px' }}>{error}</div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '18px 18px 18px 22px',
        backgroundColor: '#fff',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(15,23,42,0.08)',
        border: `1px solid ${globalConfig.theme.borderColor}`,
        minHeight: '150px',
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-3px)';
          e.currentTarget.style.boxShadow =
            '0 10px 20px rgba(15,23,42,0.12)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow =
          '0 2px 8px rgba(15,23,42,0.08)';
        }
      }}
    >
      {/* Color accent bar */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '5px',
          backgroundColor: globalConfig.theme.secondaryColor,
          borderRadius: '12px 0 0 12px',
        }}
      />

      {/* Content */}
      <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '16px',
          height: '100%',

        }}>
        <div style={{ flex: 1,
          minWidth: 0,
          overflow: 'hidden', }}>
          {/* Title */}
          <div
            style={{
              fontSize: '15px',
              fontWeight: '600',
              color: globalConfig.colors.text,
              marginBottom: '18px',
              letterSpacing: '.2px',
              textTransform: 'none',
              lineHeight: '20px',
              wordBreak: 'break-word',
              
            }}
          >
            {title}
          </div>

          {/* Value */}
          <div
            style={{
              fontSize: cardStyle.fontSize || '22px',
              fontWeight: '500',
              color:globalConfig.theme.primaryColor,
              marginBottom: '10px',
              lineHeight: '1.1',
              paddingTop: '0',
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
            }}
          >
            {value}
          </div>

          {/* Subtitle */}
          {subtitle && (
            <div
              style={{
                fontSize: '13px',
                color: globalConfig.colors.textSecondary,
                marginBottom: '6px',
              }}
            >
              {subtitle}
            </div>
          )}

          {/* Trend */}
          {trend && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                fontSize: '13px',
                fontWeight: '600',
                color: trend.isPositive ? globalConfig.colors.success : globalConfig.colors.error,
              }}
            >
              <span style={{ marginRight: '4px' }}>
                {trend.isPositive ? '↑' : '↓'}
              </span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>

        {/* Icon */}
        {icon && drilldownLevel === 0 && (
          <div
            style={{
              width: '34px',
              height: '34px',
              minWidth: '34px',
              minHeight: '34px',
              flexShrink: 0,
              borderRadius: '10px',
              backgroundColor: 'rgba(48,43,160,.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              color: globalConfig.theme.secondaryColor,
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

export default KPICard;
