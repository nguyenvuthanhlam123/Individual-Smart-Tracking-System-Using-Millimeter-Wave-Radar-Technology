#include "config.h"

// --- WiFi Credentials for Station Mode (Connecting to your main router) ---
const char* WIFI_SSID = "Telecom-Admin";
const char* WIFI_PASSWORD = "telecom@vnpt#";

// --- WiFi Credentials for Access Point Mode (The network created by the ESP32) ---
const char* AP_SSID = "ESP8266_Sensor_Network"; // Tên mạng WiFi cho các sensor
const char* AP_PASSWORD = "password123";      // Mật khẩu cho mạng WiFi của sensor. Đặt là NULL nếu muốn mạng mở.

// --- Local MQTT Broker (Server) Configuration ---
const int LOCAL_BROKER_PORT = 1886;

// --- External MQTT Gateway (Client) Configuration ---
const char* EXTERNAL_BROKER_IP = "192.168.1.251";
const int EXTERNAL_BROKER_PORT = 1885;
const char* MQTT_CLIENT_ID = "esp32-central-node-hybrid-ap";

// --- MQTT Topics ---
const char* SENSOR_TOPIC = "/node/central";
const char* OUTPUT_TOPIC = "/central/d_gateway";

// --- Anchor Coordinates ---
const float S2_a = 81.0;
const float S3_c = 0.0;
const float S3_b = 54.0;

// --- Calculation Settings ---
const float DISTANCE_OFFSET = 35.0;
const unsigned long AVERAGE_INTERVAL_MS = 3000;
const bool PUBLISH_RESULTS = true;
const int OUTPUT_DEVICE_ID = 1;

// --- Logging Levels ---
const int LOG_LEVEL = LOG_LEVEL_VERBOSE;
