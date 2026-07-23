/**
 * Schema Manager - Auto-generate Cube.js schemas if they don't exist
 * 
 * This module checks if a schema file exists and creates it dynamically
 * from database metadata or configuration.
 */

const fs = require('fs');
const path = require('path');

/**
 * Check if schema file exists
 */
function schemaExists(cubeName) {
  const schemaPath = path.join(__dirname, '../schema', `${cubeName}.js`);
  return fs.existsSync(schemaPath);
}

/**
 * Generate schema file content from configuration
 */
function generateSchemaContent(config) {
  const { cubeName, tableName, measures, dimensions, segments } = config;
  
  // Generate measures block
  const measuresBlock = measures.map(m => {
    const filters = m.filters ? 
      `\n    filters: [\n      { sql: \`${m.filters[0].sql}\` }\n    ],` : '';
    
    return `  ${m.name}: {
    type: '${m.type}',
    sql: \`${m.sql}\`,
    title: '${m.title}',${filters}
  }`;
  }).join(',\n\n  ');

  // Generate dimensions block
  const dimensionsBlock = dimensions.map(d => {
    const primaryKey = d.primaryKey ? '\n    primaryKey: true,' : '';
    
    return `  ${d.name}: {
    sql: \`${d.sql}\`,
    type: '${d.type}',${primaryKey}
    title: '${d.title}',
  }`;
  }).join(',\n\n  ');

  // Generate segments block (optional)
  const segmentsBlock = segments && segments.length > 0 ? `

  segments: {
${segments.map(s => `    ${s.name}: {
      sql: \`${s.sql}\`,
    }`).join(',\n\n')}
  },` : '';

  // Complete schema file
  return `cube(\`${cubeName}\`, {
  sql: \`SELECT * FROM ${tableName}\`,

  measures: {
${measuresBlock}
  },

  dimensions: {
${dimensionsBlock}
  },${segmentsBlock}
});
`;
}

/**
 * Create schema file if it doesn't exist
 */
function ensureSchema(config) {
  const { cubeName } = config;
  const schemaPath = path.join(__dirname, '../schema', `${cubeName}.js`);
  
  // Check if already exists
  if (schemaExists(cubeName)) {
    console.log(`✅ Schema ${cubeName}.js already exists, skipping generation`);
    return { exists: true, path: schemaPath, created: false };
  }
  
  // Generate and write file
  const schemaContent = generateSchemaContent(config);
  
  try {
    fs.writeFileSync(schemaPath, schemaContent, 'utf8');
    console.log(`✅ Generated schema: ${cubeName}.js`);
    
    return { 
      exists: true, 
      path: schemaPath, 
      created: true,
      message: `Schema ${cubeName}.js created successfully`
    };
  } catch (error) {
    console.error(`❌ Error creating schema ${cubeName}.js:`, error);
    return { 
      exists: false, 
      path: schemaPath, 
      created: false, 
      error: error.message 
    };
  }
}

/**
 * Auto-generate schema from database table (advanced)
 */
async function generateSchemaFromTable(db, tableName, cubeName) {
  try {
    // Query database to get table structure
    const result = await db.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
      ORDER BY ordinal_position
    `, [tableName.split('.')[1] || tableName]);
    
    if (result.rows.length === 0) {
      throw new Error(`Table ${tableName} not found`);
    }
    
    // Map SQL types to Cube.js types
    const typeMapping = {
      'integer': 'number',
      'bigint': 'number',
      'numeric': 'number',
      'real': 'number',
      'double precision': 'number',
      'character varying': 'string',
      'text': 'string',
      'timestamp without time zone': 'time',
      'timestamp with time zone': 'time',
      'date': 'time',
      'boolean': 'boolean',
    };
    
    // Generate dimensions from columns
    const dimensions = result.rows.map((col, idx) => ({
      name: col.column_name.replace(/_([a-z])/g, (m, p1) => p1.toUpperCase()),
      sql: col.column_name,
      type: typeMapping[col.data_type] || 'string',
      title: col.column_name.split('_').map(w => 
        w.charAt(0).toUpperCase() + w.slice(1)
      ).join(' '),
      primaryKey: idx === 0, // Assume first column is primary key
    }));
    
    // Generate basic measures
    const measures = [
      {
        name: 'count',
        type: 'count',
        sql: 'id',
        title: 'Total Count',
      }
    ];
    
    // Add sum/avg measures for numeric columns
    result.rows.forEach(col => {
      if (typeMapping[col.data_type] === 'number' && col.column_name !== 'id') {
        const fieldName = col.column_name.replace(/_([a-z])/g, (m, p1) => p1.toUpperCase());
        measures.push({
          name: `total${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`,
          type: 'sum',
          sql: col.column_name,
          title: `Total ${col.column_name.split('_').join(' ')}`,
        });
      }
    });
    
    // Create schema configuration
    const config = {
      cubeName: cubeName,
      tableName: tableName,
      measures: measures,
      dimensions: dimensions,
      segments: [],
    };
    
    return ensureSchema(config);
    
  } catch (error) {
    console.error('❌ Error generating schema from table:', error);
    throw error;
  }
}

module.exports = {
  schemaExists,
  ensureSchema,
  generateSchemaFromTable,
  generateSchemaContent,
};
