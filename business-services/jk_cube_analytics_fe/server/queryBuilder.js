// Dynamic Synmetrix Query Builder for Node.js

class SynmetrixQueryBuilder {
  constructor(tableConfig) {
    this.tableConfig = tableConfig;
  }

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

    query += ` FROM ${this.tableConfig.schema}.${this.tableConfig.tableName}`;

    if (filters.length > 0) {
      const whereClauses = filters.map((filter) => this.buildFilterClause(filter));
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    if (groupBy && groupBy.columns.length > 0) {
      query += ` GROUP BY ${groupBy.columns.join(', ')}`;
    }

    if (orderBy.length > 0) {
      const orderClauses = orderBy.map(
        (order) => `${order.column} ${order.direction.toUpperCase()}`
      );
      query += ` ORDER BY ${orderClauses.join(', ')}`;
    }

    if (limit) {
      query += ` LIMIT ${limit}`;
    }
    if (offset) {
      query += ` OFFSET ${offset}`;
    }

    return query;
  }

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

  formatValue(value) {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    }
    if (value instanceof Date) {
      return `'${value.toISOString()}'`;
    }
    return String(value);
  }

  buildKPIQuery(aggregation, filters) {
    return this.buildQuery({
      aggregations: [aggregation],
      filters,
    });
  }

  buildTimeSeriesQuery(dateColumn, valueColumn, aggregationFunc, dateFormat = 'day', filters) {
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

  buildPaginatedQuery(page = 1, pageSize = 10, orderBy, filters) {
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
}

function createQueryBuilder(tableConfig) {
  return new SynmetrixQueryBuilder(tableConfig);
}

module.exports = {
  SynmetrixQueryBuilder,
  createQueryBuilder,
};
