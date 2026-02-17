const http = require("http");
const fs = require("fs");
const path = require("path");
const mqtt = require("mqtt");
const WebSocket = require("ws");
const ip = require("ip");

const HTTP_PORT = 4000; // Port cho web server

// Tạo HTTP server để host dashboard
const server = http.createServer((req, res) => {
  if (req.url === "/") {
    fs.readFile(path.join(__dirname, "index.html"), (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("Không tìm thấy file");
      } else {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(data);
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

// Tích hợp WebSocket server
const wss = new WebSocket.Server({ server });

// Kết nối tới MQTT broker từ server.js
const mqttClient = mqtt.connect(`mqtt://${ip.address()}:1884`, {
  clientId: "web_gateway",
});

mqttClient.on("connect", () => {
  console.log("Đã kết nối tới MQTT broker");
  mqttClient.subscribe("/server/w_gateway", (err) => {
    if (!err) {
      console.log("Đã subscribe vào topic /server/w_gateway");
    } else {
      console.error("Lỗi subscribe:", err);
    }
  });
});

// Xử lý tin nhắn từ topic /server/w_gateway
mqttClient.on("message", (topic, message) => {
  const payload = message.toString();
  console.log(`Nhận tin nhắn từ ${topic}: ${payload}`);

  // Gửi tin nhắn tới tất cả client WebSocket (trang dashboard)
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
});

// Khởi động HTTP server
server.listen(HTTP_PORT, () => {
  console.log(`Web server đang chạy tại ${ip.address()}:${HTTP_PORT}`);
});
