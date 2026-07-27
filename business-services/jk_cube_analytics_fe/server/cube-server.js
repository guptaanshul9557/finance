const CubejsServer = require('@cubejs-backend/server');
const cors = require('cors');
const { PostgresDriver } = require('@cubejs-backend/postgres-driver');
const { validateToken } = require('./services/tokenService');
require('dotenv').config();

/* =========================================================
   ENV DEBUG (Safe – no passwords printed)
========================================================= */
console.log('\n========== ENVIRONMENT VARIABLES DEBUG ==========');
console.log('APP_ENV:', process.env.APP_ENV);
console.log('BE_PORT:', process.env.BE_PORT);
console.log('BASE_PATH:', process.env.BASE_PATH);

console.log('CUBEJS_DB_HOST:', process.env.CUBEJS_DB_HOST);
console.log('CUBEJS_DB_NAME:', process.env.CUBEJS_DB_NAME);
console.log('CUBEJS_DB_USER:', process.env.CUBEJS_DB_USER);
console.log('CUBEJS_DB_PASS type:', typeof process.env.CUBEJS_DB_PASS);

console.log('CUBEJS_DB_FINANCE_HOST:', process.env.CUBEJS_DB_HOST_FINANCE);
console.log('CUBEJS_DB_FINANCE_NAME:', process.env.CUBEJS_DB_NAME_FINANCE);
console.log('CUBEJS_DB_FINANCE_USER:', process.env.CUBEJS_DB_USER_FINANCE);
console.log('CUBEJS_DB_FINANCE_PASS type:', typeof process.env.CUBEJS_DB_PASS_FINANCE);
console.log('================================================\n');

/* =========================================================
   SERVER CONFIG
========================================================= */
const PORT = process.env.BE_PORT || 4000;
const BASE_PATH = (process.env.BASE_PATH || '/mis-dashboard-be').replace(/\/$/, '');

console.log('🔧 Server Configuration');
console.log('   PORT:', PORT);
console.log('   BASE_PATH:', BASE_PATH);
console.log('   process.env.CUBEJS_API_SECRET:', process.env.CUBEJS_API_SECRET);

/* =========================================================
   CUBE SERVER (FINAL CONFIG)
========================================================= */
const server = new CubejsServer({
  apiSecret: process.env.CUBEJS_API_SECRET,
  logger: (msg, params) => {
    if (msg === 'SQL Query') {
      console.log(`\n📦 SQL Query — ${params?.alias || ''}`);
      console.log(`   ${params?.query}`);
      console.log(`   Values:`, params?.values);
      console.log(`   Duration: ${params?.duration}ms\n`);
    } else if (msg === 'Query completed') {
      console.log(`   ✅ Query completed in ${params?.duration}ms\n`);
    } else if (msg === 'Load Request') {
      console.log(`\n📦 Load Request`);
      console.log(`   Query:`, JSON.stringify(params?.query, null, 4));
    }
  },
  checkAuth: (req, auth) => {
    return {};
  },
  // checkAuth: async (req, auth) => {
  //   const token = auth || req.headers.authorization?.replace('Bearer ', '');
  //   if (!token) {
  //     throw new Error('Invalid token');
  //   }
  //   const result = await validateToken(token);
  //   console.log({result});
    
  //   if (!result.valid) {
  //     throw new Error('Invalid token');
  //   }
  // },

  // 🔥 REQUIRED: Load schema files
  schemaPath: 'schema',

  basePath: BASE_PATH,
  webSocketsBasePath: BASE_PATH,
  devServer: false,

  // 🔥 REQUIRED: Database driver
  driverFactory: ({ dataSource }) => {
    console.log('🧩 Initializing DB driver for dataSource:', dataSource || 'default');

    // Finance DB
    if (dataSource === 'finance') {
      return new PostgresDriver({
        host: process.env.CUBEJS_DB_HOST_FINANCE,
        port: Number(process.env.CUBEJS_DB_PORT_FINANCE),
        database: process.env.CUBEJS_DB_NAME_FINANCE,
        user: process.env.CUBEJS_DB_USER_FINANCE,
        password: String(process.env.CUBEJS_DB_PASS_FINANCE),
      });
    }

    // Default DB (digit)
    return new PostgresDriver({
      host: process.env.CUBEJS_DB_HOST,
      port: Number(process.env.CUBEJS_DB_PORT),
      database: process.env.CUBEJS_DB_NAME,
      user: process.env.CUBEJS_DB_USER,
      password: String(process.env.CUBEJS_DB_PASS),
    });
  },
});

/* =========================================================
   START SERVER
========================================================= */
server
  .listen({ port: PORT })
  .then(({ version, port, app }) => {
    console.log(`🚀 Cube.js started (v${version})`);

    /* ==================== CORS ==================== */
    const corsOrigins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
      : [
        'http://localhost:3000',
        'http://localhost:5000',
      ];

    app.use(
      cors({
        origin: corsOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
      })
    );

    app.options('*', cors());

    /* ==================== CUSTOM ROUTES ==================== */
    const authRoutes = require('./routes/authRoutes');

    const { makeHealthRouter } = require("./health/healthCheck");
    const { pingDB } = require("./health/healthDBCheck");
    app.use("/", makeHealthRouter({ pingDB }));


    app.use(`${BASE_PATH}/api/auth`, authRoutes);
    app.use(`${BASE_PATH}/v1/api/auth`, authRoutes);
    app.use(`${BASE_PATH}/v1`, authRoutes);

    
    // app.get(`${BASE_PATH}/internal/health/cubes`, async (req, res) => {
    //   const cubes = await fetchCubeMeta();
    //   if (!cubes.includes('TresCollReceiptHdr')) {
    //     return res.status(500).json({ error: 'Cube missing' });
    //   }
    //   res.json({ status: 'OK' });
    // });
    /* ==================== HEALTH ==================== */
    app.get(`${BASE_PATH}/api/health`, (req, res) => {
      res.json({
        status: 'OK',
        message: 'Synmetrix Cube.js Server is running',
        version,
        cubeApi: `http://localhost:${port}${BASE_PATH}`,
        timestamp: new Date().toISOString(),
      });
    });

    /* ==================== CONFIG ==================== */
    app.post(`${BASE_PATH}/auth/config`, (req, res) => {
      const allowed = process.env.USER_PERMISSION.split(',').map(s => s.trim()).filter(Boolean);
      console.log({allowed});
      
      res.json({
        env: {
          USER_PERMISSION: allowed.includes(String(req.body?.userId || req.query?.userId)),
          REACT_APP_CUBEJS_API_URL: process.env.REACT_APP_CUBEJS_API_URL,
          APP_ENV: process.env.APP_ENV,
        },
      });
    });

    /* ==================== CORS TEST ==================== */
    app.get(`${BASE_PATH}/api/cors-test`, (req, res) => {
      res.json({
        status: 'OK',
        origin: req.get('origin'),
        timestamp: new Date().toISOString(),
      });
    });

    console.log(`✅ Cube.js server running on http://localhost:${port}${BASE_PATH}`);
  })
  .catch((err) => {
    console.error('❌ Fatal error during server start:', err);
    process.exit(1);
  });
