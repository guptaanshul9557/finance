// Dynamic Synmetrix Query Builder
// This module provides a flexible way to build Synmetrix queries for any table

export class SynmetrixQueryBuilder {
  constructor(tableConfig) {
    this.tableConfig = tableConfig;
  }

  // Build a Synmetrix-compatible SQL query
  buildQuery(options = {}) {
    const {
      select = ['*'],
      filters = [],
      aggregations = [],
      groupBy,
      orderBy = [],
      limit,
      offset,
    } = options;

    let query = 'SELECT ';

    // Build SELECT clause
    if (aggregations.length > 0) {
      const aggClauses = aggregations.map((agg) => {
        const alias = agg.alias || `${agg.function}_${agg.column}`;
        return `${agg.function.toUpperCase()}(${agg.column}) AS ${alias}`;
      });
      
      if (groupBy && groupBy.columns.length > 0) {
        query += `${groupBy.columns.join(', ')}, ${aggClauses.join(', ')}`;
      } else {
        query += aggClauses.join(', ');
      }
    } else {
      query += select.join(', ');
    }

    // FROM clause
    query += ` FROM ${this.tableConfig.schema}.${this.tableConfig.tableName}`;

    // WHERE clause
    if (filters.length > 0) {
      const whereClauses = filters.map((filter) => this.buildFilterClause(filter));
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    // GROUP BY clause
    if (groupBy && groupBy.columns.length > 0) {
      query += ` GROUP BY ${groupBy.columns.join(', ')}`;
    }

    // ORDER BY clause
    if (orderBy.length > 0) {
      const orderClauses = orderBy.map(
        (order) => `${order.column} ${order.direction.toUpperCase()}`
      );
      query += ` ORDER BY ${orderClauses.join(', ')}`;
    }

    // LIMIT and OFFSET
    if (limit) {
      query += ` LIMIT ${limit}`;
    }
    if (offset) {
      query += ` OFFSET ${offset}`;
    }

    return query;
  }

  // Build WHERE clause for a single filter
  buildFilterClause(filter) {
    const { column, operator, value } = filter;

    switch (operator) {
      case 'eq':
        return `${column} = ${this.formatValue(value)}`;
      case 'ne':
        return `${column} != ${this.formatValue(value)}`;
      case 'gt':
        return `${column} > ${this.formatValue(value)}`;
      case 'gte':
        return `${column} >= ${this.formatValue(value)}`;
      case 'lt':
        return `${column} < ${this.formatValue(value)}`;
      case 'lte':
        return `${column} <= ${this.formatValue(value)}`;
      case 'in':
        const inValues = Array.isArray(value)
          ? value.map((v) => this.formatValue(v)).join(', ')
          : this.formatValue(value);
        return `${column} IN (${inValues})`;
      case 'like':
        return `${column} LIKE ${this.formatValue(value)}`;
      case 'between':
        if (Array.isArray(value) && value.length === 2) {
          return `${column} BETWEEN ${this.formatValue(value[0])} AND ${this.formatValue(value[1])}`;
        }
        throw new Error('BETWEEN operator requires an array of 2 values');
      default:
        throw new Error(`Unsupported operator: ${operator}`);
    }
  }

  // Format value for SQL query
  formatValue(value) {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`; // Escape single quotes
    }
    if (value instanceof Date) {
      return `'${value.toISOString()}'`;
    }
    return String(value);
  }

  // Build a query for KPI metrics
  buildKPIQuery(aggregation, filters) {
    return this.buildQuery({
      aggregations: [aggregation],
      filters,
    });
  }

  // Build a query for time series data
  buildTimeSeriesQuery(
    dateColumn,
    valueColumn,
    aggregationFunc,
    dateFormat = 'day',
    filters
  ) {
    const dateFormatMap = {
      day: 'YYYY-MM-DD',
      week: 'YYYY-IW',
      month: 'YYYY-MM',
      year: 'YYYY',
    };

    return `
      SELECT 
        TO_CHAR(${dateColumn}, '${dateFormatMap[dateFormat]}') AS period,
        ${aggregationFunc.toUpperCase()}(${valueColumn}) AS value
      FROM ${this.tableConfig.schema}.${this.tableConfig.tableName}
      ${filters && filters.length > 0 ? `WHERE ${filters.map((f) => this.buildFilterClause(f)).join(' AND ')}` : ''}
      GROUP BY period
      ORDER BY period ASC
    `.trim();
  }

  // Build a paginated query
  buildPaginatedQuery(
    page = 1,
    pageSize = 10,
    orderBy,
    filters
  ) {
    const offset = (page - 1) * pageSize;

    const dataQuery = this.buildQuery({
      filters,
      orderBy,
      limit: pageSize,
      offset,
    });

    const countQuery = this.buildQuery({
      select: ['COUNT(*) as total'],
      filters,
    });

    return { dataQuery, countQuery };
  }

  // Get table configuration
  getTableConfig() {
    return this.tableConfig;
  }
}

// Factory function to create a query builder for a specific table
export function createQueryBuilder(tableConfig) {
  return new SynmetrixQueryBuilder(tableConfig);
}
