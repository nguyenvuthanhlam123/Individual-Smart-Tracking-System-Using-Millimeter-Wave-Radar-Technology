#include <ESP8266WiFi.h>
#include <sMQTTBroker.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <map>
#include <string>
#include "network_manager.h"
#include "config.h"
#include "logging.h"
#include "calculation_logic.h"

// --- BEGIN: LOCAL BROKER IMPLEMENTATION (sMQTTBroker Event Model) ---

// Map to store client pointers against their login IDs
std::map<sMQTTClient*, std::string> client_logins;

class MyLocalBroker : public sMQTTBroker {
public:
    // Override the onEvent method to handle all broker events
    bool onEvent(sMQTTEvent *event) override {
        switch (event->Type()) {
            case NewClient_sMQTTEventType: {
                sMQTTNewClientEvent *e = (sMQTTNewClientEvent*)event;
                sMQTTClient *client = e->Client();
                std::string login = e->Login();
                
                // Store the client's login for later use
                if (client) {
                    client_logins[client] = login;
                }
                logInfo("LOCAL_BROKER", "Sensor connected, id: %s", login.c_str());
                break;
            }
            case RemoveClient_sMQTTEventType: {
                sMQTTRemoveClientEvent *e = (sMQTTRemoveClientEvent*)event;
                sMQTTClient *client = e->Client();
                
                // Remove the client from our map
                if (client && client_logins.count(client)) {
                    logInfo("LOCAL_BROKER", "Sensor disconnected, id: %s", client_logins[client].c_str());
                    client_logins.erase(client);
                } else {
                    logInfo("LOCAL_BROKER", "An unknown sensor has disconnected.");
                }
                break;
            }
            case Public_sMQTTEventType: {
                sMQTTPublicClientEvent *e = (sMQTTPublicClientEvent*)event;
                sMQTTClient *client = e->Client();
                
                // Look up the client's login from our map
                const char* client_id = "unknown";
                if (client && client_logins.count(client)) {
                    client_id = client_logins[client].c_str();
                }

                const std::string topic_str = e->Topic();
                const char* topic = topic_str.c_str();
                const std::string payload_str = e->Payload();
                const char* payload = payload_str.c_str();

                logVerbose("RECV", "Message on LOCAL broker from [%s] on topic [%s]: %s", client_id, topic, payload);
                
                if (strcmp(topic, SENSOR_TOPIC) == 0) {
                    StaticJsonDocument<96> doc;
                    DeserializationError error = deserializeJson(doc, payload);
                    if (error) {
                        logError("PARSE", "JSON parse failed on local message: %s", error.c_str());
                    } else if (!doc.containsKey("id") || !doc.containsKey("d")) {
                        logWarn("RECV", "Invalid local message: missing 'id' or 'd'");
                    } else {
                        on_distance_received(doc["id"], doc["d"]);
                    }
                }
                break;
            }
            default:
                break;
        }
        return true;
    }
};

MyLocalBroker localBroker;

void setup_local_broker() {
    logInfo("LOCAL_BROKER", "Initializing sMQTTBroker on port %d...", LOCAL_BROKER_PORT);
    if (localBroker.init(LOCAL_BROKER_PORT)) {
        logInfo("LOCAL_BROKER", "sMQTTBroker initialized successfully.");
    } else {
        logError("LOCAL_BROKER", "Failed to initialize sMQTTBroker!");
    }
}

void loop_local_broker() {
    localBroker.update();
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
}

void loop_external_client() {
    if (!externalClient.connected()) {
        reconnect_external_client();
    }
    externalClient.loop();
}

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

// --- BEGIN: WIFI AP+STA SETUP ---

void setup_wifi_ap_sta() {
    logInfo("WIFI", "Setting up WiFi in Access Point + Station mode...");
    WiFi.mode(WIFI_AP_STA);

    // Setup the Access Point for sensors
    logInfo("WIFI_AP", "Starting Access Point with SSID: %s", AP_SSID);
    if (WiFi.softAP(AP_SSID, AP_PASSWORD)) {
        logInfo("WIFI_AP", "AP started successfully. IP for sensors: %s", WiFi.softAPIP().toString().c_str());
        logInfo("WIFI_AP", "Sensor nodes should connect to this AP and use this IP for the broker.");
    } else {
        logError("WIFI_AP", "Failed to start Access Point!");
    }

    // Setup the Station mode to connect to the external network
    logInfo("WIFI_STA", "Connecting to external WiFi: %s", WIFI_SSID);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
        if(attempts++ > 20) {
            logError("WIFI_STA", "Failed to connect to external WiFi. Restarting...");
            ESP.restart();
        }
    }
    Serial.println("");
    logInfo("WIFI_STA", "Connected to external WiFi. Device IP on external net: %s", WiFi.localIP().toString().c_str());
}

// --- END: WIFI AP+STA SETUP ---
