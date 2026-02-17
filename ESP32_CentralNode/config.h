#ifndef CONFIG_H
#define CONFIG_H

// ===================================================================================
// |                          CONFIGURATION (Declarations)                           |
// ===================================================================================

// --- WiFi Credentials ---
extern const char* WIFI_SSID;
extern const char* WIFI_PASSWORD;

// --- MQTT Broker Configuration ---
extern const char* MQTT_BROKER_IP;
extern const int MQTT_BROKER_PORT;
extern const char* MQTT_CLIENT_ID;

// --- MQTT Topics ---
extern const char* SENSOR_TOPIC;
extern const char* OUTPUT_TOPIC;

// --- Anchor Coordinates ---
extern const float S2_a;
extern const float S3_c;
extern const float S3_b;

// --- Calculation Settings ---
// extern const int HISTORY_SIZE;
constexpr int HISTORY_SIZE = 5;
extern const float DISTANCE_OFFSET;
extern const unsigned long AVERAGE_INTERVAL_MS;
extern const bool PUBLISH_RESULTS;
extern const int OUTPUT_DEVICE_ID;

// --- Logging Levels ---
#define LOG_LEVEL_VERBOSE 2
#define LOG_LEVEL_RESULTS 1
#define LOG_LEVEL_MINIMAL 0
extern const int LOG_LEVEL;

#endif // CONFIG_H