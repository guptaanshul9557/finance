const { pool, pool2 } = require("../config/server.js");

async function pingDB() {
  try {
    await Promise.all([
      pool.query("SELECT 1"),
      pool2.query("SELECT 1"),
    ]);
    return true;
  } catch (err) {
    console.error("Database check failed:", err.message);
    return false;
  }
}
module.exports = {
  pingDB,
};
