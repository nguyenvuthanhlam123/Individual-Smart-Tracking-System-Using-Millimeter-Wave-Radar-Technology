#include "config.h"
#include "types.h"
#include "network_manager.h"
#include "calculation_logic.h"
#include "logging.h"

void setup() {
    Serial.begin(115200);
    while (!Serial);

    logInfo("SYSTEM", "Central Node - ESP32 HYBRID (Broker+Client) Firmware Starting...");

    // Log configuration settings
    logInfo("CONFIG", "Local Broker Port: %d", LOCAL_BROKER_PORT);
    logInfo("CONFIG", "External Gateway: %s:%d", EXTERNAL_BROKER_IP, EXTERNAL_BROKER_PORT);

    // Initialize modules
    setup_wifi();
    setup_local_broker();
    setup_external_client();
    initialize_logic();
}

void loop() {
    // Loop all network modules and the calculation logic
    loop_local_broker();
    loop_external_client();
    loop_logic();
}
