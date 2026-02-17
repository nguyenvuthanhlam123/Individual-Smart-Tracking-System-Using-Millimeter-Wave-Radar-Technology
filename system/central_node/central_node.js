/**
 * Central Node - Offset distances, Periodic Average & Error Calculation/Sending, Input Logging
 *
 * Chức năng:
 * - Tải cấu hình từ config.json (tọa độ neo, offset, interval, MQTT, log level, publish control).
 * - Cộng offset vào d1, d2, d3 trước khi tính toán.
 * - Nhận dữ liệu khoảng cách từ 3 sensor qua MQTT.
 * - Khi đủ dữ liệu mới từ cả 3 sensor:
 * - Log giá trị d1, d2, d3 thô (ở log level verbose).
 * - Tính toán tọa độ x, y, z tức thời.
 * - Nếu hợp lệ (x,y,z > 0): Lưu tọa độ vào lịch sử chung (coordHistory) và lịch sử chu kỳ (periodicHistory).
 * - Nếu không hợp lệ: Log cảnh báo.
 * - Định kỳ mỗi averageCalculationIntervalMs (vd: 3 giây):
 * - Tính x_avg, y_avg, z_avg từ periodicHistory (nếu có điểm trong chu kỳ).
 * - Tính r từ coordHistory và cộng thêm offset.
 * - Gửi gói tin {x_avg, y_avg, z_avg, r_offset} nếu có dữ liệu hợp lệ trong chu kỳ.
 * - Gửi {x:0, y:0, z:0, r:0} nếu không có dữ liệu hợp lệ trong chu kỳ.
 * - Xóa periodicHistory để bắt đầu chu kỳ mới.
 * - Việc gửi (publish) và mức độ log được điều khiển qua config.
 */

const aedes = require("aedes")();
const net = require("net");
const ip = require("ip");
const mqtt = require("mqtt");
const fs = require("fs");
const path = require("path");

// --- File Logging Setup ---
const dataDir = path.join(__dirname, "data"); // Đường dẫn đến thư mục data
const csvFilePath = path.join(dataDir, "1.csv"); // Đường dẫn đến file 1.csv
const csvHeader = "time,d1,d2,d3,x,y,z\n"; // Header của file CSV

// Tạo thư mục 'data' nếu chưa tồn tại
if (!fs.existsSync(dataDir)) {
  try {
    fs.mkdirSync(dataDir);
    logInfo("FILE_LOG", `Đã tạo thư mục: ${dataDir}`);
  } catch (err) {
    logError("FILE_LOG", `Không thể tạo thư mục ${dataDir}:`, err);
    // Có thể quyết định thoát chương trình nếu việc ghi log là bắt buộc
    // process.exit(1);
  }
}

// Kiểm tra và ghi header nếu file chưa tồn tại
if (fs.existsSync(dataDir) && !fs.existsSync(csvFilePath)) {
  try {
    fs.writeFileSync(csvFilePath, csvHeader, "utf8");
    logInfo("FILE_LOG", `Đã tạo và ghi header cho file: ${csvFilePath}`);
  } catch (err) {
    logError("FILE_LOG", `Không thể ghi header vào file ${csvFilePath}:`, err);
  }
}

// --- Initial system log (always show) ---
console.log("[SYSTEM] Khởi tạo Central Node...");

// --- Load Configuration ---
let config;
const configPath = path.join(__dirname, "config.json");
const defaultConfig = {
  anchorCoordinates: { S2_a: 100.0, S3_c: 50.0, S3_b: 100.0 },
  calculationSettings: {
    historySize: 5,
    publishResults: true,
    distanceOffset: 30.0, // Default offset
    averageCalculationIntervalMs: 3000, // Default interval for averaging
  },
  logging: { level: "verbose" }, // Default log level
  mqttConfig: {
    centralNodePort: 1886,
    deviceGatewayUrl: `mqtt://${ip.address()}:1885`,
    sensorTopic: "/node/central",
    outputTopic: "/central/d_gateway",
    outputDeviceId: 1,
  },
};

try {
  if (fs.existsSync(configPath)) {
    const configFile = fs.readFileSync(configPath, "utf8");
    config = JSON.parse(configFile);
    console.log("[SYSTEM] Đã tải cấu hình từ config.json.");
    // Merge deep
    config.anchorCoordinates = {
      ...defaultConfig.anchorCoordinates,
      ...config.anchorCoordinates,
    };
    config.calculationSettings = {
      ...defaultConfig.calculationSettings,
      ...config.calculationSettings,
    };
    config.logging = { ...defaultConfig.logging, ...config.logging };
    config.mqttConfig = { ...defaultConfig.mqttConfig, ...config.mqttConfig };
    if (config.mqttConfig.deviceGatewayUrl.includes("<DEVICE_GATEWAY_IP>")) {
      console.warn(
        "[SYSTEM] [WARN] deviceGatewayUrl chưa được cấu hình, sử dụng IP mặc định."
      );
      config.mqttConfig.deviceGatewayUrl = `mqtt://${ip.address()}:1885`;
    }
  } else {
    console.warn(
      "[SYSTEM] [WARN] File config.json không tồn tại! Sử dụng cấu hình mặc định."
    );
    config = defaultConfig;
  }
} catch (error) {
  console.error(
    `[SYSTEM] [ERROR] Lỗi tải/phân tích config.json: ${error.message}. Sử dụng cấu hình mặc định.`
  );
  config = defaultConfig;
}

// --- Constants from Config ---
const S2_a = config.anchorCoordinates.S2_a;
const S3_c = config.anchorCoordinates.S3_c;
const S3_b = config.anchorCoordinates.S3_b;
const HISTORY_SIZE = config.calculationSettings.historySize;
const DISTANCE_OFFSET = config.calculationSettings.distanceOffset;
const AVERAGE_INTERVAL =
  config.calculationSettings.averageCalculationIntervalMs;
const PUBLISH_RESULTS = config.calculationSettings.publishResults;
const LOG_LEVEL = ["verbose", "results", "minimal"].includes(
  config.logging.level
)
  ? config.logging.level
  : "verbose";
const CENTRAL_NODE_PORT = config.mqttConfig.centralNodePort;
const DEVICE_GATEWAY_URL = config.mqttConfig.deviceGatewayUrl;
const SENSOR_TOPIC = config.mqttConfig.sensorTopic;
const OUTPUT_TOPIC = config.mqttConfig.outputTopic;
const OUTPUT_DEVICE_ID = config.mqttConfig.outputDeviceId;

// --- Custom Logger ---
function logVerbose(prefix, ...args) {
  if (LOG_LEVEL === "verbose") console.log(`[VERBOSE] [${prefix}]`, ...args);
}
function logInfo(prefix, ...args) {
  if (LOG_LEVEL === "verbose" || LOG_LEVEL === "results")
    console.log(`[INFO] [${prefix}]`, ...args);
}
function logWarn(prefix, ...args) {
  if (LOG_LEVEL === "verbose" || LOG_LEVEL === "results")
    console.warn(`[WARN] [${prefix}]`, ...args);
}
function logError(prefix, ...args) {
  console.error(`[ERROR] [${prefix}]`, ...args);
}
function logResult(resultString) {
  console.log(`[RESULT] ${resultString}`);
}

// --- Log Loaded Config ---
logInfo("CONFIG", `Tọa độ neo: S2_a=${S2_a}, S3_c=${S3_c}, S3_b=${S3_b}`);
logInfo(
  "CONFIG",
  `Cài đặt tính toán: History Size=${HISTORY_SIZE}, Distance Offset=${DISTANCE_OFFSET}, Average Interval=${AVERAGE_INTERVAL}ms`
);
logInfo("CONFIG", `Chế độ Publish kết quả: ${PUBLISH_RESULTS}`);
logInfo("CONFIG", `Chế độ Log Level: ${LOG_LEVEL}`);
logInfo(
  "CONFIG",
  `MQTT: Port=${CENTRAL_NODE_PORT}, Sensor Topic=${SENSOR_TOPIC}, Output Topic=${OUTPUT_TOPIC}, Device Gateway=${DEVICE_GATEWAY_URL}`
);

// --- Validate Essential Config ---
if (
  typeof S2_a !== "number" ||
  typeof S3_c !== "number" ||
  typeof S3_b !== "number"
) {
  logError(
    "CONFIG",
    "Cấu hình anchorCoordinates không hợp lệ hoặc bị thiếu. Thoát."
  );
  process.exit(1);
}
if (S2_a === 0) {
  logError("CONFIG", "Giá trị S2_a không được bằng 0. Thoát.");
  process.exit(1);
}
if (S3_b === 0) {
  logError("CONFIG", "Giá trị S3_b không được bằng 0. Thoát.");
  process.exit(1);
}

// --- State Variables ---
let latestDistances = { 1: null, 2: null, 3: null };
let newDataIds = new Set();
let coordHistory = []; // Lịch sử chung cho tính 'r'
let periodicHistory = []; // Lịch sử cho chu kỳ tính trung bình hiện tại
let averageSenderHandle = null; // Handle cho interval tính trung bình/gửi

// --- Default Invalid Result Message ---
const defaultInvalidMessage = {
  deviceID: OUTPUT_DEVICE_ID,
  data: { x: 0, y: 0, z: 0, r: 0 },
};

// --- MQTT Broker Setup (Aedes) ---
const centralBroker = net.createServer(aedes.handle);
centralBroker.listen(CENTRAL_NODE_PORT, () => {
  logInfo(
    "BROKER",
    `Central Node MQTT Broker đang chạy tại ${ip.address()}:${CENTRAL_NODE_PORT}`
  );
});
aedes.on("clientError", (client, err) =>
  logError(
    "BROKER",
    `Client error [${client ? client.id : "unknown"}]: ${err.message}`
  )
);
aedes.on("connectionError", (client, err) =>
  logError(
    "BROKER",
    `Connection error [${client ? client.id : "unknown"}]: ${err.message}`
  )
);
aedes.on("client", (client) =>
  logVerbose(
    "BROKER",
    `Sensor node [${client.id}] connected from ${client.conn.remoteAddress}`
  )
);
aedes.on("clientDisconnect", (client) =>
  logVerbose("BROKER", `Sensor node [${client.id}] disconnected`)
);

// --- MQTT Client Setup (to Device Gateway) ---
logInfo(
  "GATEWAY",
  `Đang kết nối đến Device Gateway tại ${DEVICE_GATEWAY_URL}...`
);
const deviceGatewayClient = mqtt.connect(DEVICE_GATEWAY_URL, {
  connectTimeout: 5000,
});
deviceGatewayClient.on("connect", () =>
  logInfo("GATEWAY", `Đã kết nối đến Device Gateway.`)
);
deviceGatewayClient.on("error", (error) =>
  logError(
    "GATEWAY",
    `Lỗi kết nối đến Device Gateway (${DEVICE_GATEWAY_URL}): ${error.message}`
  )
);
deviceGatewayClient.on("offline", () =>
  logWarn("GATEWAY", "Central Node bị offline khỏi Device Gateway.")
);
deviceGatewayClient.on("reconnect", () =>
  logInfo("GATEWAY", "Central Node đang thử kết nối lại đến Device Gateway...")
);

// --- Helper Functions ---
function getTimestampGMT7() {
  const now = new Date();

  // Tạo đối tượng Intl.DateTimeFormat để định dạng theo GMT+7 (Asia/Ho_Chi_Minh)
  // và lấy các thành phần ngày giờ riêng lẻ.
  const options = {
    timeZone: "Asia/Ho_Chi_Minh", // Múi giờ GMT+7
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false, // Sử dụng định dạng 24 giờ
  };

  // Sử dụng Intl.DateTimeFormat để định dạng hiệu quả hơn
  const formatter = new Intl.DateTimeFormat("en-CA", options); // 'en-CA' cho định dạng YYYY-MM-DD
  const parts = formatter.formatToParts(now);

  let year, month, day, hour, minute, second;
  parts.forEach((part) => {
    switch (part.type) {
      case "year":
        year = part.value;
        break;
      case "month":
        month = part.value;
        break;
      case "day":
        day = part.value;
        break;
      case "hour":
        hour = part.value;
        break;
      case "minute":
        minute = part.value;
        break;
      case "second":
        second = part.value;
        break;
    }
  });

  // Xử lý trường hợp giờ là '24' (do một số cài đặt locale), đổi thành '00'
  if (hour === "24") {
    hour = "00";
  }

  // Ghép lại thành chuỗi YYYY-MM-DD HH:MM:SS
  // Đảm bảo các thành phần đều có giá trị trước khi ghép
  if (year && month && day && hour && minute && second) {
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  } else {
    // Fallback hoặc log lỗi nếu không lấy được đủ thành phần
    logError("TIMESTAMP", "Không thể định dạng timestamp GMT+7 đầy đủ.");
    // Trả về thời gian UTC như một phương án dự phòng
    return now.toISOString();
  }
}

function saveDataToCsv(timestamp, d1, d2, d3, x, y, z) {
  // Kiểm tra nếu các giá trị đầu vào hợp lệ (có thể thêm kiểm tra chặt chẽ hơn nếu cần)
  if (d1 === null || d2 === null || d3 === null) {
    logWarn(
      "FILE_LOG",
      `Bỏ qua ghi file do có giá trị khoảng cách null: d1=${d1}, d2=${d2}, d3=${d3}`
    );
    return;
  }

  try {
    // Tạo dòng dữ liệu CSV
    const csvRow = `${timestamp},${d1},${d2},${d3},${x},${y},${z}\n`;
    // Ghi nối vào file (append)
    // Biến csvFilePath được định nghĩa ở phần setup đầu file
    fs.appendFileSync(csvFilePath, csvRow, "utf8");
    logVerbose("FILE_LOG", `Đã ghi dữ liệu vào ${csvFilePath}`); // Log nếu ở chế độ verbose
  } catch (err) {
    logError("FILE_LOG", `Lỗi khi ghi dữ liệu vào file ${csvFilePath}:`, err);
  }
}
function calculate_r(history) {
  if (!history || history.length < HISTORY_SIZE) {
    logVerbose(
      "ERROR_CALC",
      `Không đủ dữ liệu lịch sử (${history.length}/${HISTORY_SIZE}) để tính sai số r.`
    );
    return null;
  }
  const currentHistorySize = history.length;
  const rValues = history.map((point, index) => ({
    r: Math.sqrt(point.x * point.x + point.y * point.y + point.z * point.z),
    index: index,
  }));
  const sumR = rValues.reduce((acc, val) => acc + val.r, 0);
  const avgR = sumR / currentHistorySize;
  let maxDeviation = -1,
    outlierIndex = -1;
  rValues.forEach((item) => {
    const deviation = Math.abs(item.r - avgR);
    if (deviation > maxDeviation) {
      maxDeviation = deviation;
      outlierIndex = item.index;
    }
  });
  const filteredRValues = rValues.filter((item) => item.index !== outlierIndex);
  if (filteredRValues.length === 0) {
    logWarn("ERROR_CALC", "Không còn điểm nào sau khi loại bỏ outlier.");
    return null;
  }
  const sumFilteredR = filteredRValues.reduce((acc, val) => acc + val.r, 0);
  const R_avg_later = sumFilteredR / filteredRValues.length;
  // --- THÊM MỚI: Tính độ lệch trung bình sau khi lọc (avg_deviation_later) ---
  const sumDeviationsLater = filteredRValues.reduce((acc, item) => {
    // Tính tổng các độ lệch tuyệt đối so với R_avg_later
    return acc + Math.abs(item.r - R_avg_later);
  }, 0);

  const avg_deviation_later = sumDeviationsLater / filteredRValues.length;
  return parseFloat(avg_deviation_later.toFixed(2));
}

/*
 Thực hiện tính toán tọa độ tức thời khi có đủ dữ liệu mới.
 */
function performInstantCalculation() {
  logVerbose("CALC", "Đủ dữ liệu mới, bắt đầu tính toán tọa độ tức thời...");
  const d1_raw = latestDistances[1];
  const d2_raw = latestDistances[2];
  const d3_raw = latestDistances[3];

  // Log giá trị khoảng cách thô được sử dụng
  logVerbose(
    "CALC_INPUT",
    `Sử dụng khoảng cách thô: d1=${d1_raw}, d2=${d2_raw}, d3=${d3_raw}`
  );

  if (d1_raw === null || d2_raw === null || d3_raw === null) {
    logError("CALC", "Dữ liệu khoảng cách bị thiếu khi cố gắng tính toán.");
    resetStateAfterCalculation(); // Reset để chờ bộ mới
    return;
  }

  // Áp dụng Offset
  const d1 = d1_raw + DISTANCE_OFFSET;
  const d2 = d2_raw + DISTANCE_OFFSET;
  const d3 = d3_raw + DISTANCE_OFFSET;
  logVerbose(
    "CALC_OFFSET",
    `Khoảng cách đã áp dụng offset: d1=${d1.toFixed(1)}, d2=${d2.toFixed(
      1
    )}, d3=${d3.toFixed(1)}`
  );

  try {
    // Tính toán x, y, z sử dụng khoảng cách đã offset
    const x = (S2_a * S2_a + d1 * d1 - d2 * d2) / (2 * S2_a);
    const y_numerator =
      d1 * d1 + S3_c * S3_c + S3_b * S3_b - d3 * d3 - 2 * S3_c * x;
    const y = y_numerator / (2 * S3_b);
    const zSquared = d1 * d1 - x * x - y * y;

    if (zSquared < -1e-9) {
      // Cho phép sai số float nhỏ
      logWarn(
        "CALC",
        `Tính toán tọa độ tức thời không hợp lệ (z^2 < 0 (${zSquared.toFixed(
          4
        )})). Bỏ qua điểm này.`
      );
      return;
    }
    const z = Math.sqrt(Math.max(0, zSquared));

    // Kiểm tra tọa độ dương
    if (x <= 0 || y <= 0 || z <= 0) {
      logWarn(
        "VALIDATION",
        `Tọa độ tức thời không dương (x=${x.toFixed(2)}, y=${y.toFixed(
          2
        )}, z=${z.toFixed(2)}). Bỏ qua điểm này.`
      );
      return;
    }

    // --- Calculation is Valid ---
    logVerbose(
      "CALC",
      `Calculated Valid INSTANT Coords: x=${x.toFixed(2)}, y=${y.toFixed(
        2
      )}, z=${z.toFixed(2)}`
    );
    const currentCoord = {
      x: parseFloat(x.toFixed(2)),
      y: parseFloat(y.toFixed(2)),
      z: parseFloat(z.toFixed(2)),
    };

    // --- Gọi hàm để ghi dữ liệu vào file CSV ---
    const timestamp = getTimestampGMT7();
    // Sử dụng d1_raw, d2_raw, d3_raw là các giá trị trước khi cộng offset
    saveDataToCsv(
      timestamp,
      d1_raw,
      d2_raw,
      d3_raw,
      currentCoord.x,
      currentCoord.y,
      currentCoord.z
    );

    // Thêm vào cả hai lịch sử
    coordHistory.push(currentCoord);
    if (coordHistory.length > HISTORY_SIZE) coordHistory.shift();

    periodicHistory.push(currentCoord); // Thêm vào lịch sử chu kỳ để tính trung bình
  } catch (error) {
    logError(
      "CALC",
      "Lỗi không mong muốn trong quá trình tính toán tức thời:",
      error
    );
  }
}

/**
 * Reset state sau khi xử lý hoặc tính toán.
 */
function resetStateAfterCalculation() {
  newDataIds.clear(); // Sẵn sàng nhận bộ dữ liệu mới từ cả 3 sensor
  logVerbose("STATE", "Đã reset trạng thái, đang chờ dữ liệu mới...");
}

/**
 * Tính trung bình, tính r, và gửi cập nhật định kỳ.
 */
function calculateAndSendAverage() {
  let outputMessage;
  let status;

  if (periodicHistory.length > 0) {
    // --- Tính trung bình ---
    const count = periodicHistory.length;
    const sumX = periodicHistory.reduce((sum, p) => sum + p.x, 0);
    const sumY = periodicHistory.reduce((sum, p) => sum + p.y, 0);
    const sumZ = periodicHistory.reduce((sum, p) => sum + p.z, 0);
    const avgX = sumX / count;
    const avgY = sumY / count;
    const avgZ = sumZ / count;
    logVerbose(
      "AVG",
      `Tính trung bình từ ${count} điểm trong chu kỳ ${AVERAGE_INTERVAL}ms.`
    );

    // --- Tính lỗi r (dựa trên lịch sử chung coordHistory) ---
    let r_raw = calculate_r([...coordHistory]); // Sử dụng lịch sử chung ổn định hơn
    let r_offset = 0; // Mặc định r là 0 nếu không tính được
    if (r_raw !== null) {
      r_offset = r_raw + DISTANCE_OFFSET; // Cộng offset vào r
      // r_offset = r_raw +30; // Cộng offset vào r
      logVerbose(
        "ERROR_CALC",
        `Raw r=${r_raw.toFixed(2)}, Offset r=${r_offset.toFixed(2)}`
      );
    } else {
      logInfo(
        "ERROR_CALC",
        `Không tính được r (lịch sử chưa đủ: ${coordHistory.length}/${HISTORY_SIZE}). Gửi r=0 (+ offset = ${DISTANCE_OFFSET}).`
      );
      r_offset = DISTANCE_OFFSET; // Nếu không tính được r_raw, r_offset chỉ là offset
    }

    // --- Chuẩn bị gói tin output ---
    outputMessage = {
      deviceID: OUTPUT_DEVICE_ID,
      data: {
        x: parseFloat(avgX.toFixed(2)),
        y: parseFloat(avgY.toFixed(2)),
        z: parseFloat(avgZ.toFixed(2)),
        r: parseFloat(r_offset.toFixed(2)),
      },
    };
    status = `Average (${count} points)`;
    logResult(JSON.stringify(outputMessage)); // Log kết quả trung bình (luôn hiển thị)

    // --- Xóa lịch sử chu kỳ ---
    periodicHistory = []; // Bắt đầu thu thập cho chu kỳ mới
  } else {
    // Không có dữ liệu hợp lệ nào trong chu kỳ vừa qua
    outputMessage = defaultInvalidMessage;
    status = "No Valid Data in Interval";
    logInfo(
      "SENDER",
      `Không có dữ liệu hợp lệ trong chu kỳ ${AVERAGE_INTERVAL}ms. Gửi giá trị mặc định.`
    );
    logResult(JSON.stringify(outputMessage)); // Log cả giá trị mặc định
  }

  // --- Publish gói tin đã quyết định ---
  const messageStr = JSON.stringify(outputMessage);
  logInfo("SENDER", `Chuẩn bị gửi định kỳ [${status}]: ${messageStr}`);

  if (PUBLISH_RESULTS) {
    if (deviceGatewayClient.connected) {
      deviceGatewayClient.publish(
        OUTPUT_TOPIC,
        messageStr,
        { qos: 0, retain: false },
        (err) => {
          if (err) logError("SENDER", "Lỗi khi gửi định kỳ:", err);
          else logVerbose("SENDER", `Đã gửi định kỳ thành công.`);
        }
      );
    } else {
      logWarn(
        "SENDER",
        "Mất kết nối Gateway, không thể gửi định kỳ (Publish Mode: ON)."
      );
    }
  } else {
    logVerbose("SENDER", "Chế độ Publish đang TẮT.");
  }
  // Không còn cờ lastCalculationWasValid để reset
}

// --- Aedes Publish Handler ---
aedes.on("publish", (packet, client) => {
  if (client && packet.topic === SENSOR_TOPIC) {
    const payloadStr = packet.payload.toString();
    logVerbose("RECV", `Nhận tin từ sensor [${client.id}]: ${payloadStr}`);
    let data;
    try {
      data = JSON.parse(payloadStr);
    } catch (err) {
      logError(
        "PARSE",
        `Lỗi parse JSON từ sensor [${client.id}]: ${err.message}. Payload: ${payloadStr}`
      );
      return;
    }

    if (
      data &&
      typeof data.id === "number" &&
      typeof data.d === "number" &&
      [1, 2, 3].includes(data.id)
    ) {
      latestDistances[data.id] = data.d;
      newDataIds.add(data.id);
      logVerbose(
        "STATE",
        `Cập nhật khoảng cách: id=${data.id}, d=${data.d}. ID mới: ${[
          ...newDataIds,
        ].join(", ")}`
      );

      if (newDataIds.size === 3) {
        if (
          latestDistances[1] !== null &&
          latestDistances[2] !== null &&
          latestDistances[3] !== null
        ) {
          performInstantCalculation(); // Trigger tính toán tức thời
        } else {
          logVerbose("STATE", "Chờ giá trị khởi tạo...");
          // Không cần reset ở đây nữa vì performInstantCalculation sẽ reset nếu có lỗi input
        }
      }
    } else {
      logWarn(
        "RECV",
        `Bỏ qua tin nhắn không hợp lệ từ [${client.id}]: ${payloadStr}`
      );
    }
  }
});

// --- Start Periodic Averaging/Sending ---
averageSenderHandle = setInterval(calculateAndSendAverage, AVERAGE_INTERVAL);
logInfo(
  "SYSTEM",
  `Đã bắt đầu chu kỳ tính trung bình và gửi mỗi ${AVERAGE_INTERVAL}ms.`
);

// --- Graceful Shutdown ---
process.on("SIGINT", () => {
  logInfo("SYSTEM", "SIGINT nhận được. Đang đóng các kết nối...");
  if (averageSenderHandle) {
    clearInterval(averageSenderHandle);
    logInfo("SYSTEM", "Đã dừng chu kỳ tính trung bình và gửi.");
  }

  const closeGracefully = () => {
    let gwClosed = !deviceGatewayClient || !deviceGatewayClient.connected;
    let brokerClosed = false;

    const checkDone = () => {
      if (gwClosed && brokerClosed) {
        clearTimeout(forceExitTimeout);
        logInfo("SYSTEM", "Thoát thành công.");
        process.exit(0);
      }
    };

    const forceExitTimeout = setTimeout(() => {
      logError(
        "SYSTEM",
        "Không thể đóng kết nối nhẹ nhàng trong 5 giây, buộc thoát."
      );
      process.exit(1);
    }, 5000);

    if (!gwClosed && deviceGatewayClient) {
      deviceGatewayClient.end(true, () => {
        logInfo("GATEWAY", "Đã đóng kết nối đến Device Gateway.");
        gwClosed = true;
        checkDone();
      });
    } else {
      gwClosed = true;
    }

    if (centralBroker) {
      centralBroker.close(() => {
        logInfo("BROKER", "MQTT Broker (Aedes) đã đóng.");
        brokerClosed = true;
        checkDone();
      });
    } else {
      brokerClosed = true;
    }

    if (gwClosed && brokerClosed) {
      checkDone();
    }
  };
  closeGracefully();
});
