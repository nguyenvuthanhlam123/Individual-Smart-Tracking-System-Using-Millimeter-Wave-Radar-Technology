#include "config.h"

// --- WiFi Credentials ---
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// --- Local MQTT Broker (Server) Configuration ---
const int LOCAL_BROKER_PORT = 1886;

// --- External MQTT Gateway (Client) Configuration ---
const char* EXTERNAL_BROKER_IP = "192.168.43.52"; // IP of the external Device Gateway
const int EXTERNAL_BROKER_PORT = 1885;
const char* MQTT_CLIENT_ID = "esp32-central-node-hybrid";

// --- MQTT Topics ---
const char* SENSOR_TOPIC = "/node/central";
const char* OUTPUT_TOPIC = "/central/d_gateway";

// --- Anchor Coordinates ---
const float S2_a = 370.0;
const float S3_c = 0.0;
const float S3_b = 110.0;

// --- Calculation Settings ---
// HISTORY_SIZE is defined in config.h as constexpr
const float DISTANCE_OFFSET = 35.0;
const unsigned long AVERAGE_INTERVAL_MS = 3000;
const bool PUBLISH_RESULTS = true;
const int OUTPUT_DEVICE_ID = 1;

// --- Logging Levels ---
const int LOG_LEVEL = LOG_LEVEL_VERBOSE;
