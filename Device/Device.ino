#define RADAR_SERIAL Serial2
#define RADAR_RX_PIN 17
#define RADAR_TX_PIN 16

#include <ld2410.h>
#include <PubSubClient.h> // Include the PubSubClient library
#include <WiFi.h>
#include <ArduinoJson.h>

// const char* ssid = "Highlands Coffee";
// const char* password = "M.le@0911"; // Replace with your WiFi password
const char* mqtt_server = "192.168.4.1"; // Replace with your MQTT server IP
const char* ssid = "ESP8266_Sensor_Network";
const char* password = "password123"; // Replace with your WiFi password
// const char* mqtt_server = "192.168.1.13"; // Replace with your MQTT server IP
const int mqtt_port = 1886; // Replace with your MQTT server port (default is 1883)
const char* client_id = "ESP8266Client2"; // Give your ESP a unique client ID

WiFiClient espClient; // Create a WiFi client object
PubSubClient client(espClient); // Create a PubSubClient object

// Define a struct
struct data {
  int Md;
  int Me;
  int Sd;
  int Se;
};

// Function prototype
data get_data();

// Define global variables
int Md, Me, Sd, Se, x;
int d = 0;
int id = 2;
unsigned long previousMillis = 0;
const long interval = 600;

ld2410 radar;
uint32_t lastReading = 0;
bool radarConnected = false;

void setup(void) {
  //Setup Radar
  Serial.begin(115200);  // Feedback over Serial Monitor
  RADAR_SERIAL.begin(256000);
  delay(1000);
  Serial.print(F("\nConnect LD2410 radar TX to GPIO:"));
  Serial.println(RADAR_RX_PIN);
  Serial.print(F("Connect LD2410 radar RX to GPIO:"));
  Serial.println(RADAR_TX_PIN);
  Serial.print(F("LD2410 radar sensor initialising: "));

  radar.begin(RADAR_SERIAL);
  Serial.println(F("OK"));
  Serial.print(F("LD2410 firmware version: "));
  Serial.print(radar.firmware_major_version);
  Serial.print('.');
  Serial.print(radar.firmware_minor_version);
  Serial.print('.');
  Serial.println(radar.firmware_bugfix_version, HEX);

  // Connect to WiFi network
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("Connected to WiFi!");

  // Connect to MQTT server
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback); // Set callback function for incoming messages (optional)
  while (!client.connected()) {
    reconnectMQTT();
    delay(5000);
  }
  Serial.println("Connected to MQTT!");
}

void loop() {
  if (!client.connected()) {
    reconnectMQTT();
  }
  client.loop(); // Keep client connected

  // // Publish "Hello" message every 5 seconds
  // static unsigned long lastMillis = 0;
  // if (millis() - lastMillis >= 5000) {
  //   client.publish("//message/clients", "Hello");
  //   Serial.println("Sent 'Hello' to Broker!");
  //   lastMillis = millis();
  // }
  data radar_data = get_data();
  if (abs(radar_data.Md - radar_data.Sd) <= 15){
    d = (radar_data.Md + radar_data.Sd)/2;
    x = d;
  }
  else if (abs(radar_data.Sd - x) <= 25){
    d = (x + radar_data.Sd)/2;
  }
  if (millis() - previousMillis >= interval) {
    previousMillis = millis();
    Serial.print("Md: ");
    Serial.println(radar_data.Md);
    Serial.print("Me: ");
    Serial.println(radar_data.Me);
    Serial.print("Sd: ");
    Serial.println(radar_data.Sd);
    Serial.print("Se: ");
    Serial.println(radar_data.Se);
    Serial.print("d: ");
    Serial.println(d);

    // Convert radar data to JSON format
    StaticJsonDocument<200> doc;
    // doc["Md"] = radar_data.Md;
    // doc["Me"] = radar_data.Me;
    // doc["Sd"] = radar_data.Sd;
    // doc["Se"] = radar_data.Se;
    doc["id"] = id;
    doc["d"] = d;

    // Serialize JSON to a char array
    char buffer[256];
    serializeJson(doc, buffer);

    // Publish radar data to MQTT server
    client.publish("/node/central", buffer);
    Serial.println("Published radar data to MQTT gateway.");
    Serial.println();
    d = 0;
  }
}

data get_data() {
  data received_data;
  if (radar.isConnected() && millis() - lastReading > 150) {
    lastReading = millis();
    unsigned long currentMillis = millis();
    if ((radar.movingTargetDistance() >= 30) && (radar.movingTargetEnergy() >= 25)) {
      Md = radar.movingTargetDistance();
      Me = radar.movingTargetEnergy();
    } else {
      Md = 0;
      Me = 0;
    }
    if ((radar.stationaryTargetDistance() >= 30) && (radar.stationaryTargetEnergy() >= 25)) {
      Sd = radar.stationaryTargetDistance();
      Se = radar.stationaryTargetEnergy();
    } else {
      Sd = 0;
      Se = 0;
    }
  }
  received_data.Md = Md;
  received_data.Me = Me;
  received_data.Sd = Sd;
  received_data.Se = Se;
  return received_data;
}

void callback(char* topic, byte* payload, unsigned int length) {
  // Process incoming MQTT messages (optional)
  Serial.print("Message received on topic: ");
  Serial.println(topic);
  Serial.print("Payload: ");
  Serial.println((char*)payload);
}

void reconnectMQTT() {
  // Attempt to reconnect to MQTT server if disconnected
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    if (client.connect(client_id)) {
      Serial.println("connected.");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 3 seconds");
      delay(3000);
    }
  }
}
