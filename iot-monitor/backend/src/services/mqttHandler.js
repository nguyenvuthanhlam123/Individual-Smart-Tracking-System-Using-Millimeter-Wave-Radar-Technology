// backend/src/services/mqttHandler.js
const mqtt = require("mqtt");
const TelemetryData = require("../models/TelemetryData");
const { mqtt: mqttConfig } = require("../../config/mqttConfig");
let client = null;
const topicStats = {};
function connectMqtt() {
  const brokerUrl = process.env.MQTT_BROKER_URL || mqttConfig.brokerUrl;
  console.log(`Attempting to connect to MQTT broker at ${brokerUrl}`);
  const clientId = `iot-monitor-${Math.random().toString(16).substr(2, 8)}`;
  const options = { ...mqttConfig.options, clientId };
  client = mqtt.connect(brokerUrl, options);
  client.on("connect", () => {
    console.log("MQTT connected successfully.");
    mqttConfig.topics.forEach((t) => {
      topicStats[t.topic] = {
        messageCount: 0,
        lastMessageTimestamp: null,
        lastMessageSize: 0,
      };
      console.log(`Subscribing to topic: ${t.topic}`);
      client.subscribe(t.topic, { qos: 0 }, (err) => {
        if (err) {
          console.error(`Failed to subscribe to ${t.topic}:`, err);
        } else {
          console.log(`Subscribed to ${t.topic}`);
        }
      });
    });
  });
  client.on("message", (topic, message) => {
    const messageStr = message.toString();
    const messageSize = message.length;
    if (topicStats[topic]) {
      topicStats[topic].messageCount++;
      topicStats[topic].lastMessageTimestamp = new Date();
      topicStats[topic].lastMessageSize = messageSize;
    } else {
      topicStats[topic] = {
        messageCount: 1,
        lastMessageTimestamp: new Date(),
        lastMessageSize: messageSize,
      };
    }
    try {
      const parsedMessage = JSON.parse(messageStr);
      if (!parsedMessage.deviceID || !parsedMessage.data) {
        console.warn(
          `Received malformed message on ${topic}: Missing deviceID or data field.`
        );
        return;
      }
      const telemetry = new TelemetryData({
        deviceID: parsedMessage.deviceID,
        topic: topic,
        data: parsedMessage.data,
        messageSize: messageSize,
        receivedAt: new Date(),
      });
      telemetry.save().catch((err) => {
        console.error(
          `Error saving message from ${topic} to MongoDB:`,
          err.message
        );
      });
    } catch (err) {
      console.error(
        `Failed to parse or process message from ${topic}:`,
        err,
        `Message: ${messageStr}`
      );
    }
  });
  client.on("error", (err) => {
    console.error("MQTT client error:", err);
  });
  client.on("reconnect", () => {
    console.log("MQTT client attempting to reconnect...");
  });
  client.on("close", () => {
    console.log("MQTT connection closed.");
  });
  function gracefulShutdown() {
    if (client && client.connected) {
      client.end(true, () => {
        console.log("MQTT client disconnected.");
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  }
  process.on("SIGINT", gracefulShutdown);
  process.on("SIGTERM", gracefulShutdown);
}
function getTopicStats() {
  return JSON.parse(JSON.stringify(topicStats));
}
module.exports = { connectMqtt, getTopicStats };
