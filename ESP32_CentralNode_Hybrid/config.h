#ifndef CONFIG_H
#define CONFIG_H

// --- WiFi Credentials ---
extern const char* WIFI_SSID;
extern const char* WIFI_PASSWORD;

// --- Local MQTT Broker (Server) Configuration ---
// The ESP32 will open this port to listen for sensor connections
extern const int LOCAL_BROKER_PORT;

// --- External MQTT Gateway (Client) Configuration ---
// The ESP32 will connect to this external broker to send results
extern const char* EXTERNAL_BROKER_IP;
extern const int EXTERNAL_BROKER_PORT;
extern const char* MQTT_CLIENT_ID;

// --- MQTT Topics ---
extern const char* SENSOR_TOPIC; // Topic for local broker (receiving)
extern const char* OUTPUT_TOPIC; // Topic for external broker (sending)

// --- Anchor Coordinates ---
extern const float S2_a;
extern const float S3_c;
extern const float S3_b;

// --- Calculation Settings ---
constexpr int HISTORY_SIZE = 5; // Must be constexpr for array sizing
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
