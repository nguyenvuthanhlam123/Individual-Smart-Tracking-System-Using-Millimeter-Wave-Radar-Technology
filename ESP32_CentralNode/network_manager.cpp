#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "network_manager.h"
#include "config.h"
#include "logging.h"
#include "calculation_logic.h" // To call on_distance_received

// --- Networking & MQTT Objects ---
WiFiClient espClient;
PubSubClient mqttClient(espClient);

void mqtt_callback(char* topic, byte* payload, unsigned int length);
void reconnect_mqtt();

void setup_wifi() {
    logInfo("WIFI", "Connecting to %s", WIFI_SSID);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
        if(attempts++ > 20) {
            logError("WIFI", "Failed to connect. Restarting...");
            ESP.restart();
        }
    }
    Serial.println("");
    logInfo("WIFI", "WiFi Connected. IP: %s", WiFi.localIP().toString().c_str());
}

void setup_mqtt() {
    mqttClient.setServer(MQTT_BROKER_IP, MQTT_BROKER_PORT);
    mqttClient.setCallback(mqtt_callback);
}

void loop_mqtt() {
    if (!mqttClient.connected()) {
        reconnect_mqtt();
    }
    mqttClient.loop();
}

void reconnect_mqtt() {
    while (!mqttClient.connected()) {
        logInfo("MQTT", "Attempting MQTT connection...");
        if (mqttClient.connect(MQTT_CLIENT_ID)) {
            logInfo("MQTT", "Connected to broker.");
            if(mqttClient.subscribe(SENSOR_TOPIC)){
                logInfo("MQTT", "Subscribed to topic: %s", SENSOR_TOPIC);
            } else {
                logError("MQTT", "Subscription failed!");
            }
        } else {
            logError("MQTT", "Failed, rc=%d. Retrying in 5 seconds...", mqttClient.state());
            delay(5000);
        }
    }
}

void mqtt_callback(char* topic, byte* payload, unsigned int length) {
    char payloadStr[length + 1];
    memcpy(payloadStr, payload, length);
    payloadStr[length] = '\0';
    
    logVerbose("RECV", "Message arrived [%s]: %s", topic, payloadStr);

    StaticJsonDocument<96> doc;
    DeserializationError error = deserializeJson(doc, payloadStr);

    if (error) {
        logError("PARSE", "deserializeJson() failed: %s", error.c_str());
        return;
    }

    if (!doc.containsKey("id") || !doc.containsKey("d")) {
        logWarn("RECV", "Ignoring invalid message: missing 'id' or 'd'");
        return;
    }

    int id = doc["id"];
    float d = doc["d"];

    // Pass the received data to the calculation logic module
    on_distance_received(id, d);
}

// This function needs to be declared in network_manager.cpp as well to be callable from calculation_logic.cpp
void publish_results(const char* payload) {
    if (PUBLISH_RESULTS) {
        if (mqttClient.connected()) {
            mqttClient.publish(OUTPUT_TOPIC, payload);
            logVerbose("SENDER", "Published message successfully.");
        } else {
            logWarn("SENDER", "Cannot publish. MQTT client not connected.");
        }
    } else {
        logVerbose("SENDER", "Publishing is disabled.");
    }
}
