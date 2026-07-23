const { Pool } = require("pg");

// Finance DB connection
const pool = new Pool({
  user: process.env.CUBEJS_DB_USER_FINANCE,
  host: process.env.CUBEJS_DB_HOST_FINANCE,
  database: process.env.CUBEJS_DB_NAME_FINANCE,
  password: process.env.CUBEJS_DB_PASS_FINANCE,
  port: process.env.CUBEJS_DB_PORT_FINANCE,
  connectionTimeoutMillis: 10000, // 10 seconds
  idleTimeoutMillis: 30000,       // 30 seconds
});

pool.query("SET search_path TO 'km.kolkata'")
  .then(() => console.log("Finance DB connected"))
  .catch((err) => console.error("Finance DB error:", err));

// DIGIT DB connection
const pool2 = new Pool({
  user: process.env.CUBEJS_DB_USER,
  host: process.env.CUBEJS_DB_HOST,
  database: process.env.CUBEJS_DB_NAME,
  password: process.env.CUBEJS_DB_PASS,
  port: process.env.CUBEJS_DB_PORT,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
});

pool2.query("SELECT NOW()")
  .then(() => console.log("Digit DB connected"))
  .catch((err) => console.error("Digit DB error:", err));

module.exports = { pool, pool2 };
