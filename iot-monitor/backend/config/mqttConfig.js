// backend/config/mqttConfig.js
module.exports = {
  mqtt: {
    brokerUrl: process.env.MQTT_BROKER_URL || "mqtt://localhost:1883",
    // brokerUrl: "mqtt://192.168.1.13:1884",
    options: {
      clientId: "iot-monitor-" + Math.random().toString(16).substr(2, 8),
      keepalive: 60,
      reconnectPeriod: 1000,
      connectTimeout: 30 * 1000,
    },
    topics: [
      {
        id: "device_d_gateway",
        name: "Device → Device Gateway",
        topic: "/device/d_gateway",
      },
      {
        id: "d_gateway_server",
        name: "Device Gateway → Server",
        topic: "/d_gateway/server",
      },
      {
        id: "server_w_gateway",
        name: "Server → Web Gateway",
        topic: "/server/w_gateway",
      },
      {
        id: "central_d_gateway",
        name: "Server → Web Gateway",
        topic: "/central/d_gateway",
      },
    ],
  },
};
