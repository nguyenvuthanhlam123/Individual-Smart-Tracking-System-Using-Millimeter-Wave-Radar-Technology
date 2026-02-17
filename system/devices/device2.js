const mqtt = require("mqtt");

// Cấu hình địa chỉ của central_node.js
const BROKER_URL = "mqtt://192.168.1.107:1886";
const TOPIC = "/node/central";
const PUBLISH_INTERVAL = 300; // ms

// Hàm tạo số ngẫu nhiên từ min đến max
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Kết nối đến MQTT broker
const client = mqtt.connect(BROKER_URL);

client.on("connect", () => {
  console.log("Đã kết nối đến central_node.js");

  // Publish tin nhắn định kỳ mỗi 300ms
  setInterval(() => {
    const data = {
      id: 2,
      d: getRandomInt(30, 450),
      // d: 0
    };
    const message = JSON.stringify(data);
    client.publish(TOPIC, message, (err) => {
      if (err) {
        console.error("Lỗi khi publish:", err);
      } else {
        // console.log(`Đã publish: ${message}`);
      }
    });
  }, PUBLISH_INTERVAL);
});

client.on("error", (error) => {
  console.error("Lỗi kết nối:", error);
});
