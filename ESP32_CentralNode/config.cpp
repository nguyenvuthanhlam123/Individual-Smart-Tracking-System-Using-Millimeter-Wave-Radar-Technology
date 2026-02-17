#include "config.h"

// ===================================================================================
// |                          CONFIGURATION (Definitions)                            |
// ===================================================================================

// --- WiFi Credentials ---
const char* WIFI_SSID = "Michael's Hotspot";
const char* WIFI_PASSWORD = "khanhlinh";

// --- MQTT Broker Configuration ---
const char* MQTT_BROKER_IP = "192.168.142.203";
const int MQTT_BROKER_PORT = 1885;
const char* MQTT_CLIENT_ID = "esp32-central-node";

// --- MQTT Topics ---
const char* SENSOR_TOPIC = "/node/central";
const char* OUTPUT_TOPIC = "/central/d_gateway";

// --- Anchor Coordinates ---
const float S2_a = 370.0;
const float S3_c = 0.0;
const float S3_b = 110.0;

// --- Calculation Settings ---
// const int HISTORY_SIZE = 5;

const float DISTANCE_OFFSET = 35.0;
const unsigned long AVERAGE_INTERVAL_MS = 3000;
const bool PUBLISH_RESULTS = true;
const int OUTPUT_DEVICE_ID = 1;

// --- Logging Levels ---
const int LOG_LEVEL = LOG_LEVEL_VERBOSE;