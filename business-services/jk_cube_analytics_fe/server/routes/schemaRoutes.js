/**
 * Schema Management Routes
 * 
 * Endpoints to check and generate Cube.js schemas dynamically
 */

const express = require('express');
const router = express.Router();
const { 
  schemaExists, 
  ensureSchema, 
  generateSchemaFromTable 
} = require('./schemaManager');

/**
 * Check if schema exists
 * GET /api/schema/check/:cubeName
 */
router.get('/check/:cubeName', (req, res) => {
  const { cubeName } = req.params;
  const exists = schemaExists(cubeName);
  
  res.json({
    success: true,
    cubeName,
    exists,
  });
});

/**
 * Generate schema from configuration
 * POST /api/schema/generate
 * 
 * Body: {
 *   cubeName: 'EnggPoHeaders',
 *   tableName: 'public.engg_po_headers',
 *   measures: [...],
 *   dimensions: [...],
 *   segments: [...]
 * }
 */
router.post('/generate', (req, res) => {
  const config = req.body;
  
  if (!config.cubeName || !config.tableName) {
    return res.status(400).json({
      success: false,
      error: 'cubeName and tableName are required',
    });
  }
  
  const result = ensureSchema(config);
  
  res.json({
    success: result.exists,
    ...result,
  });
});

/**
 * Auto-generate schema from database table
 * POST /api/schema/auto-generate
 * 
 * Body: {
 *   tableName: 'public.engg_po_headers',
 *   cubeName: 'EnggPoHeaders'
 * }
 */
router.post('/auto-generate', async (req, res) => {
  const { tableName, cubeName } = req.body;
  
  if (!tableName || !cubeName) {
    return res.status(400).json({
      success: false,
      error: 'tableName and cubeName are required',
    });
  }
  
  try {
    const db = req.app.locals.db; // Assume DB connection is in app.locals
    const result = await generateSchemaFromTable(db, tableName, cubeName);
    
    res.json({
      success: result.exists,
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Ensure schema exists before loading screen
 * POST /api/schema/ensure
 * 
 * This is called from frontend when loading a screen
 * If schema doesn't exist, it fetches config from database and creates it
 */
router.post('/ensure', async (req, res) => {
  const { screenId, cubeName } = req.body;
  
  try {
    // Check if schema exists
    if (schemaExists(cubeName)) {
      return res.json({
        success: true,
        exists: true,
        message: `Schema ${cubeName} already exists`,
      });
    }
    
    // Fetch schema config from database
    const db = req.app.locals.db;
    const result = await db.query(`
      SELECT cube_name, table_name, columns_json, screen_json
      FROM dashboard_configs
      WHERE screen_id = $1 AND cube_name = $2
    `, [screenId, cubeName]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No configuration found for ${cubeName}`,
      });
    }
    
    const dbConfig = result.rows[0];
    const screenJson = typeof dbConfig.screen_json === 'string' 
      ? JSON.parse(dbConfig.screen_json) 
      : dbConfig.screen_json;
    
    // Use schema from database if available
    if (screenJson.schema) {
      const schemaResult = ensureSchema({
        cubeName: dbConfig.cube_name,
        tableName: dbConfig.table_name,
        measures: screenJson.schema.measures || [],
        dimensions: screenJson.schema.dimensions || [],
        segments: screenJson.schema.segments || [],
      });
      
      return res.json({
        success: true,
        ...schemaResult,
      });
    }
    
    // Otherwise auto-generate from table structure
    const autoResult = await generateSchemaFromTable(
      db, 
      dbConfig.table_name, 
      dbConfig.cube_name
    );
    
    res.json({
      success: true,
      ...autoResult,
    });
    
  } catch (error) {
    console.error('Error ensuring schema:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
