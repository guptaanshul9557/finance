/**
 * Schema Generator - Converts JSON Schema Configuration to Cube.js Schema Files
 * 
 * This utility reads schema definitions from screenRegistry.js and generates
 * corresponding Cube.js schema files in the schema/ directory.
 * 
 * Usage:
 *   node server/schemaGenerator.js
 *   OR
 *   npm run generate-schemas
 */

const fs = require('fs');
const path = require('path');

/**
 * Generate measures section for Cube.js schema
 */
function generateMeasures(measures) {
  if (!measures || measures.length === 0) return '';

  const measureDefs = measures.map((measure) => {
    let measureCode = `    ${measure.name}: {\n`;
    measureCode += `      type: '${measure.type}',\n`;
    measureCode += `      sql: \`${measure.sql}\`,\n`;
    
    if (measure.title) {
      measureCode += `      title: '${measure.title}',\n`;
    }
    
    if (measure.format) {
      measureCode += `      format: '${measure.format}',\n`;
    }
    
    if (measure.filters && measure.filters.length > 0) {
      measureCode += `      filters: [\n`;
      measure.filters.forEach((filter) => {
        measureCode += `        { sql: \`${filter.sql}\` },\n`;
      });
      measureCode += `      ],\n`;
    }
    
    measureCode += `    },`;
    return measureCode;
  }).join('\n');

  return `  measures: {\n${measureDefs}\n  },\n`;
}

/**
 * Generate dimensions section for Cube.js schema
 */
function generateDimensions(dimensions) {
  if (!dimensions || dimensions.length === 0) return '';

  const dimensionDefs = dimensions.map((dimension) => {
    let dimCode = `    ${dimension.name}: {\n`;
    dimCode += `      sql: \`${dimension.sql}\`,\n`;
    dimCode += `      type: '${dimension.type}',\n`;
    
    if (dimension.title) {
      dimCode += `      title: '${dimension.title}',\n`;
    }
    
    if (dimension.primaryKey) {
      dimCode += `      primaryKey: true,\n`;
    }
    
    dimCode += `    },`;
    return dimCode;
  }).join('\n');

  return `  dimensions: {\n${dimensionDefs}\n  },\n`;
}

/**
 * Generate segments section for Cube.js schema
 */
function generateSegments(segments) {
  if (!segments || segments.length === 0) return '';

  const segmentDefs = segments.map((segment) => {
    let segCode = `    ${segment.name}: {\n`;
    segCode += `      sql: \`${segment.sql}\`,\n`;
    segCode += `    },`;
    return segCode;
  }).join('\n');

  return `  segments: {\n${segmentDefs}\n  },\n`;
}

/**
 * Convert JSON schema configuration to Cube.js schema file content
 */
function generateCubeSchema(schemaConfig) {
  if (!schemaConfig || !schemaConfig.cubeName) {
    throw new Error('Invalid schema configuration: cubeName is required');
  }

  const { cubeName, sql, tableName, measures, dimensions, segments } = schemaConfig;

  let schemaCode = `cube(\`${cubeName}\`, {\n`;
  
  // SQL query
  if (sql) {
    schemaCode += `  sql: \`${sql}\`,\n\n`;
  } else if (tableName) {
    schemaCode += `  sql: \`SELECT * FROM ${tableName}\`,\n\n`;
  }

  // Generate measures
  if (measures && measures.length > 0) {
    schemaCode += generateMeasures(measures);
    schemaCode += '\n';
  }

  // Generate dimensions
  if (dimensions && dimensions.length > 0) {
    schemaCode += generateDimensions(dimensions);
    schemaCode += '\n';
  }

  // Generate segments
  if (segments && segments.length > 0) {
    schemaCode += generateSegments(segments);
    schemaCode += '\n';
  }

  schemaCode += `});\n`;

  return schemaCode;
}

/**
 * Write schema file to disk
 */
function writeSchemaFile(cubeName, schemaContent) {
  const schemaDir = path.join(__dirname, '../schema');
  
  // Create schema directory if it doesn't exist
  if (!fs.existsSync(schemaDir)) {
    fs.mkdirSync(schemaDir, { recursive: true });
  }

  const filePath = path.join(schemaDir, `${cubeName}.js`);
  fs.writeFileSync(filePath, schemaContent, 'utf8');
  
  console.log(`✅ Generated schema: ${cubeName}.js`);
  return filePath;
}

/**
 * Validate schema configuration
 */
function validateSchemaConfig(config) {
  const errors = [];

  if (!config.cubeName) {
    errors.push('cubeName is required');
  }

  if (!config.sql && !config.tableName) {
    errors.push('Either sql or tableName must be provided');
  }

  if (!config.measures || config.measures.length === 0) {
    errors.push('At least one measure is required');
  }

  if (!config.dimensions || config.dimensions.length === 0) {
    errors.push('At least one dimension is required');
  }

  // Validate measures
  if (config.measures) {
    config.measures.forEach((measure, index) => {
      if (!measure.name) {
        errors.push(`Measure at index ${index} is missing 'name' property`);
      }
      if (!measure.type) {
        errors.push(`Measure '${measure.name}' is missing 'type' property`);
      }
      if (!measure.sql) {
        errors.push(`Measure '${measure.name}' is missing 'sql' property`);
      }
    });
  }

  // Validate dimensions
  if (config.dimensions) {
    config.dimensions.forEach((dimension, index) => {
      if (!dimension.name) {
        errors.push(`Dimension at index ${index} is missing 'name' property`);
      }
      if (!dimension.type) {
        errors.push(`Dimension '${dimension.name}' is missing 'type' property`);
      }
      if (!dimension.sql) {
        errors.push(`Dimension '${dimension.name}' is missing 'sql' property`);
      }
    });
  }

  return errors;
}

/**
 * Generate schema file from screen configuration
 */
function generateSchemaFromScreen(screen) {
  if (!screen.schema) {
    console.log(`⚠️  Screen '${screen.name}' has no schema configuration, skipping...`);
    return null;
  }

  console.log(`\n📋 Generating schema for: ${screen.name}`);

  // Validate configuration
  const validationErrors = validateSchemaConfig(screen.schema);
  if (validationErrors.length > 0) {
    console.error(`❌ Validation errors for '${screen.name}':`);
    validationErrors.forEach(err => console.error(`   - ${err}`));
    return null;
  }

  try {
    // Generate schema code
    const schemaCode = generateCubeSchema(screen.schema);
    
    // Write to file
    const filePath = writeSchemaFile(screen.schema.cubeName, schemaCode);
    
    return filePath;
  } catch (error) {
    console.error(`❌ Error generating schema for '${screen.name}':`, error.message);
    return null;
  }
}

/**
 * Generate all schemas from screenRegistry
 */
function generateAllSchemas(screenRegistry) {
  console.log('🚀 Starting schema generation from screenRegistry...\n');
  
  const screensWithSchema = screenRegistry.filter(screen => screen.schema && screen.enabled);
  
  if (screensWithSchema.length === 0) {
    console.log('⚠️  No screens with schema configuration found.');
    return [];
  }

  console.log(`📊 Found ${screensWithSchema.length} screen(s) with schema definitions\n`);

  const generatedFiles = [];
  
  screensWithSchema.forEach((screen) => {
    const filePath = generateSchemaFromScreen(screen);
    if (filePath) {
      generatedFiles.push(filePath);
    }
  });

  console.log(`\n✅ Successfully generated ${generatedFiles.length} schema file(s)`);
  
  return generatedFiles;
}

/**
 * Main execution - Generate schemas from screenRegistry
 */
function main() {
  try {
    // Import screenRegistry
    const screenRegistryPath = path.join(__dirname, '../src/config/screenRegistry.js');
    
    // Read the file content
    let fileContent = fs.readFileSync(screenRegistryPath, 'utf8');
    
    // Replace all export statements
    fileContent = fileContent.replace(/export const /g, 'const ');
    fileContent = fileContent.replace(/export function /g, 'function ');
    fileContent = fileContent.replace(/export \{[\s\S]*?\};/g, '');
    
    // Add module.exports at the end
    fileContent += `
module.exports = { 
  screenRegistry,
  getScreenById,
  getSidebarScreens,
  getHomescreenScreens
};
`;
    
    // Write to temp file
    const tempPath = path.join(__dirname, '../src/config/screenRegistry.temp.js');
    fs.writeFileSync(tempPath, fileContent, 'utf8');
    
    // Clear require cache
    delete require.cache[require.resolve('../src/config/screenRegistry.temp.js')];
    
    // Require the temp file
    const { screenRegistry } = require('../src/config/screenRegistry.temp.js');
    
    // Generate all schemas
    generateAllSchemas(screenRegistry);
    
    // Clean up temp file
    try {
      fs.unlinkSync(tempPath);
    } catch (e) {
      // Ignore cleanup errors
    }
    
    console.log('\n✨ Schema generation complete!\n');
  } catch (error) {
    console.error('❌ Schema generation failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Export functions for use in other modules
module.exports = {
  generateCubeSchema,
  generateSchemaFromScreen,
  generateAllSchemas,
  validateSchemaConfig,
  writeSchemaFile,
};

// Run if executed directly
if (require.main === module) {
  main();
}
