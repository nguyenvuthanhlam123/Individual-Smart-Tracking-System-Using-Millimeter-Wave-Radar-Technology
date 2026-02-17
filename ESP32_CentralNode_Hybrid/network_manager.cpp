#include <WiFi.h>
#include <sMQTTBroker.h>     // For the local broker (Switched from uMQTTBroker)
#include <PubSubClient.h>    // For the external client
#include <ArduinoJson.h>
#include "network_manager.h"
#include "config.h"
#include "logging.h"
#include "calculation_logic.h"

// --- BEGIN: LOCAL BROKER IMPLEMENTATION (using sMQTTBroker) ---

sMQTTBroker localBroker(LOCAL_BROKER_PORT);

// Callback for when a sensor connects to our local broker
void onLocalConnect(const sMQTT::Client &client) {
    if (client.isClient()) {
        logInfo("LOCAL_BROKER", "Sensor connected, id: %s, ip: %s", client.id().c_str(), client.ip().toString().c_str());
    }
}

// Callback for when a sensor disconnects from our local broker
void onLocalDisconnect(const sMQTT::Client &client) {
    if (client.isClient()) {
        logInfo("LOCAL_BROKER", "Sensor disconnected, id: %s", client.id().c_str());
    }
}

// Callback for when our local broker receives data
void onLocalData(const char *topic, const char *payload, uint8_t *payload_raw, size_t len) {
    logVerbose("RECV", "Message on LOCAL broker [%s]: %s", topic, payload);
    
    if (strcmp(topic, SENSOR_TOPIC) == 0) {
        StaticJsonDocument<96> doc;
        DeserializationError error = deserializeJson(doc, payload);
        if (error) {
            logError("PARSE", "JSON parse failed on local message: %s", error.c_str());
            return;
        }
        if (!doc.containsKey("id") || !doc.containsKey("d")) {
            logWarn("RECV", "Invalid local message: missing 'id' or 'd'");
            return;
        }
        on_distance_received(doc["id"], doc["d"]);
    }
}

void setup_local_broker() {
    logInfo("LOCAL_BROKER", "Setting up sMQTTBroker on port %d...", LOCAL_BROKER_PORT);
    localBroker.onConnect(onLocalConnect);
    localBroker.onDisconnect(onLocalDisconnect);
    localBroker.onData(onLocalData);
    logInfo("LOCAL_BROKER", "sMQTTBroker setup complete. Awaiting connections...");
}

void loop_local_broker() {
    localBroker.loop();
}

// --- END: LOCAL BROKER IMPLEMENTATION ---

// --- BEGIN: EXTERNAL CLIENT IMPLEMENTATION ---

WiFiClient espClient;
PubSubClient externalClient(espClient);

void reconnect_external_client() {
    while (!externalClient.connected()) {
        logInfo("EXT_CLIENT", "Attempting connection to external gateway...");
        if (externalClient.connect(MQTT_CLIENT_ID)) {
            logInfo("EXT_CLIENT", "Connected to %s", EXTERNAL_BROKER_IP);
        } else {
            logError("EXT_CLIENT", "Failed, rc=%d. Retrying in 5 seconds...", externalClient.state());
            delay(5000);
        }
    }
}

void setup_external_client() {
    logInfo("EXT_CLIENT", "Setting up client for external gateway %s:%d", EXTERNAL_BROKER_IP, EXTERNAL_BROKER_PORT);
    externalClient.setServer(EXTERNAL_BROKER_IP, EXTERNAL_BROKER_PORT);
    // We don't need a callback for the external client as it only publishes
}

void loop_external_client() {
    if (!externalClient.connected()) {
        reconnect_external_client();
    }
    externalClient.loop();
}

// This is the function that will be called by calculation logic
void publish_results(const char* payload) {
    if (PUBLISH_RESULTS) {
        if (externalClient.connected()) {
            logVerbose("SENDER", "Publishing to EXTERNAL gateway on topic %s", OUTPUT_TOPIC);
            externalClient.publish(OUTPUT_TOPIC, payload);
        } else {
            logWarn("SENDER", "Cannot publish to external gateway. Client not connected.");
        }
    } else {
        logVerbose("SENDER", "Publishing is disabled.");
    }
}

// --- END: EXTERNAL CLIENT IMPLEMENTATION ---

// --- BEGIN: SHARED WIFI SETUP ---

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
    logInfo("WIFI", "WiFi Connected. ESP32 IP: %s", WiFi.localIP().toString().c_str());
    logInfo("WIFI", "Sensor nodes should connect to this IP on port %d.", LOCAL_BROKER_PORT);
}

// --- END: SHARED WIFI SETUP ---
