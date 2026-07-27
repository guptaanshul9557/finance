const express = require("express");

function makeHealthRouter({ pingDB }) {
  const router = express.Router();

  // Liveness — app is running
  router.get("/mis-dashboard-be/live", (_req, res) => {
    res.status(200).json({ status: "UP", message: "App is running" });
  });

  // Readiness — check DBs
  router.get("/mis-dashboard-be/ready", async (_req, res) => {
    const ok = await pingDB();
    if (ok) {
      res.status(200).json({ status: "UP", message: "All DBs reachable" });
    } else {
      res.status(503).json({ status: "DOWN", message: "DB check failed" });
    }
  });

  // Health — full check
  router.get("/mis-dashboard-be/health", async (_req, res) => {
    const ok = await pingDB();
    if (ok) {
      res.status(200).json({ status: "UP", message: "All systems healthy" });
    } else {
      res.status(503).json({ status: "DOWN", message: "Some systems unavailable" });
    }
  });

  return router;
}

module.exports = { makeHealthRouter };
