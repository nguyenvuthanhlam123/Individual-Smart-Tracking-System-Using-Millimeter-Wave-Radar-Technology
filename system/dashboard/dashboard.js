// server.js
const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const mqtt = require("mqtt");

const HTTP_PORT = 4000; // Cong cho web dashboard, ban co the doi neu can
// *** THAY DOI DIA CHI MQTT BROKER CUA BAN O DAY NEU CAN ***
const MQTT_BROKER_URL = "mqtt://192.168.1.107:1884"; // Vi du: neu broker chay tren cung may o cong 1884
// *********************************************************
const MQTT_TOPIC_SUBSCRIBE = "/server/w_gateway";

// --- 1. HTTP Server de phuc vu file index.html ---
const server = http.createServer((req, res) => {
  if (req.url === "/" || req.url === "/index2.html") {
    fs.readFile(path.join(__dirname, "index2.html"), (err, data) => {
      if (err) {
        console.error("Loi doc file index2.html:", err);
        res.writeHead(500);
        res.end("Loi: Khong the tai file giao dien.");
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(data);
    });
  } else {
    res.writeHead(404);
    res.end("Not Found");
  }
});

// --- 2. WebSocket Server ---
const wss = new WebSocket.Server({ server });
console.log(`WebSocket server dang lang nghe tren cong ${HTTP_PORT}`);
wss.on("connection", (ws) => {
  console.log("Mot client dashboard da ket noi qua WebSocket.");
  ws.on("close", () => {
    console.log("Mot client dashboard da ngat ket noi.");
  });
  ws.on("error", (error) => {
    console.error("Loi WebSocket:", error);
  });
});

function broadcastData(data) {
  const jsonData = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(jsonData);
      } catch (error) {
        console.error("Loi gui du lieu qua WebSocket:", error);
      }
    }
  });
}

// --- 3. MQTT Client ---
console.log(`Dang ket noi den MQTT broker tai ${MQTT_BROKER_URL}...`);
const mqttClient = mqtt.connect(MQTT_BROKER_URL);
mqttClient.on("connect", () => {
  console.log("Da ket noi thanh cong den MQTT broker.");
  mqttClient.subscribe(MQTT_TOPIC_SUBSCRIBE, (err) => {
    if (!err) {
      console.log(
        `Da dang ky (subscribe) thanh cong vao topic: ${MQTT_TOPIC_SUBSCRIBE}`
      );
    } else {
      console.error(`Loi khi dang ky topic ${MQTT_TOPIC_SUBSCRIBE}:`, err);
    }
  });
});
mqttClient.on("error", (error) => {
  console.error("Loi ket noi MQTT:", error);
});
mqttClient.on("close", () => {
  console.log("Ket noi MQTT da dong.");
});
mqttClient.on("reconnect", () => {
  console.log("Dang ket noi lai den MQTT broker...");
});

// --- 4. Xu ly tin nhan MQTT nhan duoc ---
mqttClient.on("message", (topic, message) => {
  if (topic === MQTT_TOPIC_SUBSCRIBE) {
    try {
      // mqttClient.publish("/w_gateway/server", "OK");
      const payloadString = message.toString();
      // console.log(`Nhan tin nhan MQTT tu ${topic}: ${payloadString}`); // Uncomment neu can debug
      const parsedMessage = JSON.parse(payloadString);
      if (
        parsedMessage &&
        parsedMessage.data &&
        typeof parsedMessage.data.x === "number" &&
        typeof parsedMessage.data.y === "number" &&
        typeof parsedMessage.data.z === "number" &&
        typeof parsedMessage.data.r === "number"
      ) {
        const dataForDashboard = {
          x: parsedMessage.data.x,
          y: parsedMessage.data.y,
          z: parsedMessage.data.z,
          r: parsedMessage.data.r,
        };
        broadcastData(dataForDashboard);
      } else {
        console.warn(
          "Tin nhan MQTT nhan duoc khong dung cau truc mong doi:",
          parsedMessage
        );
      }
    } catch (error) {
      console.error("Loi xu ly tin nhan MQTT:", error);
      console.error("Tin nhan goc:", message.toString());
    }
  }
});
setInterval(() => {
  mqttClient.publish("/w_gateway/server", "OK");
}, 800);

// --- 5. Khoi dong HTTP Server ---
server.listen(HTTP_PORT, () => {
  console.log(
    `Web dashboard server dang chay tai http://localhost:${HTTP_PORT}`
  );
  console.log(
    `(Hoac dia chi IP cua may nay neu truy cap tu may khac trong mang)`
  );
});

// --- Xu ly tat server ---
process.on("SIGINT", () => {
  console.log("Dang dong ket noi MQTT va tat server...");
  mqttClient.end();
  wss.close();
  server.close(() => {
    console.log("Server da tat.");
    process.exit(0);
  });
});
