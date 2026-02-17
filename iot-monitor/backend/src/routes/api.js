// backend/src/routes/api.js
const express = require("express");
const TelemetryData = require("../models/TelemetryData");
const { getTopicStats } = require("../services/mqttHandler");
const { requireAuth } = require("../middleware/authMiddleware");
const router = express.Router();
router.use(requireAuth);
router.get("/telemetry/latest", async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  try {
    const data = await TelemetryData.find()
      .sort({ receivedAt: -1 })
      .limit(limit)
      .lean();
    res.json(data);
  } catch (err) {
    console.error("Error fetching latest telemetry:", err);
    res.status(500).json({ error: "Failed to fetch telemetry data" });
  }
});
router.get("/telemetry/device/:deviceId", async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const deviceId = req.params.deviceId;
  try {
    const data = await TelemetryData.find({ deviceID: deviceId })
      .sort({ receivedAt: -1 })
      .limit(limit)
      .lean();
    res.json(data);
  } catch (err) {
    console.error(`Error fetching telemetry for device ${deviceId}:`, err);
    res.status(500).json({ error: "Failed to fetch device telemetry data" });
  }
});
router.get("/stats/message-size", async (req, res) => {
  const intervalSeconds = parseInt(req.query.interval) || 60;
  const since = new Date(Date.now() - intervalSeconds * 1000);
  try {
    const result = await TelemetryData.aggregate([
      { $match: { receivedAt: { $gte: since } } },
      {
        $group: {
          _id: "$topic",
          avgSize: { $avg: "$messageSize" },
          minSize: { $min: "$messageSize" },
          maxSize: { $max: "$messageSize" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    res.json(result);
  } catch (err) {
    console.error("Error fetching message size stats:", err);
    res.status(500).json({ error: "Failed to fetch message size stats" });
  }
});
router.get("/status/topics", (req, res) => {
  try {
    const stats = getTopicStats();
    res.json(stats);
  } catch (err) {
    console.error("Error fetching topic status:", err);
    res.status(500).json({ error: "Failed to fetch topic status" });
  }
});
module.exports = router;
