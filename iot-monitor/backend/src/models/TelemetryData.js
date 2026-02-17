// backend/src/models/TelemetryData.js
const mongoose = require("mongoose");
const telemetryDataSchema = new mongoose.Schema(
  {
    deviceID: { type: String, required: true, index: true },
    topic: { type: String, required: true, index: true },
    data: {
      t: Date,
      x: Number,
      y: Number,
      z: Number,
      er: mongoose.Schema.Types.Mixed,
    },
    messageSize: { type: Number, required: true },
    receivedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);
telemetryDataSchema.index({ deviceID: 1, receivedAt: -1 });
telemetryDataSchema.index({ topic: 1, receivedAt: -1 });
module.exports = mongoose.model("TelemetryData", telemetryDataSchema);
