const fs = require("fs");
const path = require("path");
const { parse } = require("json2csv");

const server_wg_topic = "/server/w_gateway";
const wg_server_topic = "/w_gateway/server";
const dg_server_topic = "/d_gateway/server";

// function store_device_data(message){
//     let deviceID = message['deviceID']
//     // deviceiD = message.deviceID (same result for json format data)
//     let data = message['data']

//     const dir = path.join(__dirname, 'data')
//     const filePath = path.join(dir, `${deviceID}.csv`)
//     if (!fs.existsSync(dir)){
//         fs.mkdirSync(dir)
//     }

//     let csv = parse([data], {header: false})
//     fs.appendFileSync(filePath, csv + '\n', 'utf8')
// }

function store_device_data(message) {
  // Kiểm tra nếu message là chuỗi, thì parse sang đối tượng
  if (typeof message === "string") {
    try {
      message = JSON.parse(message);
    } catch (error) {
      console.error("Lỗi parse JSON trong store_device_data:", error);
      return;
    }
  }

  let deviceID = message.deviceID;
  let data = message.data;

  // Nếu dữ liệu trống thì log lỗi
  if (!data) {
    console.error("Không tìm thấy dữ liệu trong message");
    return;
  }

  const dir = path.join(__dirname, "data");
  const filePath = path.join(dir, `${deviceID}.csv`);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  let csv = parse([data], { header: false });
  fs.appendFileSync(filePath, csv + "\n", "utf8");
}

function store_user_log(message) {
  const dir = path.join(__dirname, "user");
  const filePath = path.join(dir, `user_log.csv`);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  let csv = parse([message], { header: false });
  fs.appendFileSync(filePath, csv + "\n", "utf8");
}

function publish_data(server, Topic, message) {
  let data_payload = Buffer.from(message);
  let packet = {
    topic: Topic,
    payload: data_payload,
    retain: false,
    qos: 0,
  };

  server.publish(packet, function () {
    console.log(`Data [${Topic}] published!`);
  });
}

function process_message(packet, client, server) {
  let topic = packet.topic;
  switch (topic) {
    case dg_server_topic:
      console.log(
        `Device gateway [${
          client.conn.remoteAddress
        }]: [${packet.payload.toString()}]`
      );
      // Save to csv
      store_device_data(packet.payload.toString());
      // Publish to web gateway
      publish_data(server, server_wg_topic, packet.payload.toString());
      break;
    case wg_server_topic:
      console.log(
        `Web gateway [${
          client.conn.remoteAddress
        }]: [${packet.payload.toString()}]`
      );
      // Manage user login
      store_user_log(packet.payload.toString());
      // Process user download data file
      break;
  }
}

module.exports = {
  process_message: process_message,
};
