// simulator.js
const mqtt = require("mqtt");
const readline = require("readline");
const BROKER_URL = process.env.MQTT_BROKER_URL || "mqtt://localhost:1883";
const INITIAL_NUM_DEVICES = 3;
const MESSAGE_INTERVAL_MS = 200;
const ERROR_RATE = 0.02;
const STATS_INTERVAL_MS = 2000;
const DEVICE_TO_GATEWAY_TOPIC = "/device/d_gateway";
const GATEWAY_TO_SERVER_TOPIC = "/d_gateway/server";
const VALID_TOPICS = [DEVICE_TO_GATEWAY_TOPIC, GATEWAY_TO_SERVER_TOPIC];
let client = null;
let deviceCounter = 0;
let activeDevices = {};
let publishingPaused = {
  [DEVICE_TO_GATEWAY_TOPIC]: false,
  [GATEWAY_TO_SERVER_TOPIC]: false,
};
let messagesPublishedSinceLastStat = 0;
function connectMQTT() {
  console.log(`Attempting to connect to MQTT broker at ${BROKER_URL}`);
  client = mqtt.connect(BROKER_URL, {
    clientId: `iot-interactive-simulator-${Math.random()
      .toString(16)
      .substr(2, 8)}`,
    connectTimeout: 5000,
    reconnectPeriod: 1000,
  });
  client.on("connect", () => {
    console.log("MQTT Simulator connected successfully.");
    console.log("Starting initial devices...");
    for (let i = 0; i < INITIAL_NUM_DEVICES; i++) {
      startNewDevice();
    }
    setInterval(logStats, STATS_INTERVAL_MS);
    startCLI();
  });
  client.on("error", (err) => {
    console.error("MQTT Simulator connection error:", err);
  });
  client.on("reconnect", () => {
    console.log("MQTT Simulator attempting to reconnect...");
  });
  client.on("close", () => {
    console.log("MQTT Simulator connection closed.");
  });
}
function startNewDevice() {
  deviceCounter++;
  const deviceId = `sim-device-${deviceCounter}`;
  console.log(`Starting device: ${deviceId}`);
  const intervalId = setInterval(() => {
    publishMessage(deviceId);
  }, MESSAGE_INTERVAL_MS);
  activeDevices[deviceId] = intervalId;
  return deviceId;
}
function stopLastDevice() {
  const deviceIds = Object.keys(activeDevices);
  if (deviceIds.length > 0) {
    const lastDeviceId = deviceIds[deviceIds.length - 1];
    const intervalId = activeDevices[lastDeviceId];
    clearInterval(intervalId);
    delete activeDevices[lastDeviceId];
    console.log(`Stopped device: ${lastDeviceId}`);
    return lastDeviceId;
  } else {
    console.log("No active devices to stop.");
    return null;
  }
}
function generateData(deviceId) {
  const hasError = Math.random() < ERROR_RATE;
  const data = {
    t: new Date().toISOString(),
    x: parseFloat((Math.random() * 200 - 100).toFixed(3)),
    y: parseFloat((Math.random() * 200 - 100).toFixed(3)),
    z: parseFloat((Math.random() * 200 - 100).toFixed(3)),
    er: hasError ? `ERR_${Math.floor(Math.random() * 5) + 1}` : null,
  };
  return { deviceID: deviceId, data: data };
}
function publishMessage(deviceId) {
  if (!client || !client.connected) return;
  const payload = generateData(deviceId);
  const payloadStr = JSON.stringify(payload);
  if (!publishingPaused[DEVICE_TO_GATEWAY_TOPIC]) {
    client.publish(DEVICE_TO_GATEWAY_TOPIC, payloadStr, { qos: 0 }, (err) => {
      if (err) {
        console.error(`Error publishing to ${DEVICE_TO_GATEWAY_TOPIC}:`, err);
      } else {
        messagesPublishedSinceLastStat++;
      }
    });
  }
  if (!publishingPaused[GATEWAY_TO_SERVER_TOPIC]) {
    client.publish(GATEWAY_TO_SERVER_TOPIC, payloadStr, { qos: 0 }, (err) => {
      if (err) {
        console.error(`Error publishing to ${GATEWAY_TO_SERVER_TOPIC}:`, err);
      } else {
        messagesPublishedSinceLastStat++;
      }
    });
  }
}
function logStats() {
  const rate = (
    messagesPublishedSinceLastStat /
    (STATS_INTERVAL_MS / 1000)
  ).toFixed(1);
  const activeDeviceCount = Object.keys(activeDevices).length;
  console.log(
    `[Stats] Active Devices: ${activeDeviceCount} | Pub Rate (approx): ${rate} msgs/sec`
  );
  messagesPublishedSinceLastStat = 0;
}
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "SIM> ",
});
function startCLI() {
  console.log("\nInteractive Simulator Controls:");
  console.log(
    " Commands: add | remove | pause <topic> | resume <topic> | status | exit"
  );
  console.log(
    ` Valid topics: ${DEVICE_TO_GATEWAY_TOPIC} | ${GATEWAY_TO_SERVER_TOPIC}`
  );
  rl.prompt();
  rl.on("line", (line) => {
    handleCommand(line.trim());
    rl.prompt();
  }).on("close", () => {
    console.log("Exiting simulator CLI.");
    shutdown();
  });
}
function handleCommand(line) {
  const parts = line.split(" ");
  const command = parts[0]?.toLowerCase();
  const arg1 = parts[1];
  switch (command) {
    case "add":
      const newId = startNewDevice();
      console.log(` Added device: ${newId}`);
      break;
    case "remove":
      const removedId = stopLastDevice();
      if (removedId) {
        console.log(` Removed device: ${removedId}`);
      }
      break;
    case "pause":
      if (VALID_TOPICS.includes(arg1)) {
        publishingPaused[arg1] = true;
        console.log(` Paused publishing to: ${arg1}`);
      } else {
        console.log(` Invalid topic. Use: ${VALID_TOPICS.join(" or ")}`);
      }
      break;
    case "resume":
      if (VALID_TOPICS.includes(arg1)) {
        publishingPaused[arg1] = false;
        console.log(` Resumed publishing to: ${arg1}`);
      } else {
        console.log(` Invalid topic. Use: ${VALID_TOPICS.join(" or ")}`);
      }
      break;
    case "status":
      console.log("\n--- Simulator Status ---");
      console.log(
        ` Active Devices (${Object.keys(activeDevices).length}): ${Object.keys(
          activeDevices
        ).join(", ")}`
      );
      console.log(" Topic Publishing Status:");
      for (const topic in publishingPaused) {
        console.log(
          `  - ${topic}: ${publishingPaused[topic] ? "PAUSED" : "ACTIVE"}`
        );
      }
      console.log("------------------------");
      break;
    case "exit":
      rl.close();
      break;
    case "":
      break;
    default:
      console.log(
        ` Unknown command: '${command}'. Type 'add', 'remove', 'pause <topic>', 'resume <topic>', 'status', or 'exit'.`
      );
      break;
  }
}
function shutdown() {
  console.log("\nShutting down simulator...");
  Object.values(activeDevices).forEach(clearInterval);
  activeDevices = {};
  if (client && client.connected) {
    client.end(true, () => {
      console.log("MQTT Simulator disconnected.");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}
process.on("SIGINT", () => {
  console.log("\nCaught SIGINT (Ctrl+C).");
  shutdown();
});
process.on("SIGTERM", () => {
  console.log("\nCaught SIGTERM.");
  shutdown();
});
connectMQTT();
