#include "config.h"
#include "types.h"
#include "network_manager.h"
#include "calculation_logic.h"
#include "logging.h"

void setup() {
    Serial.begin(115200);
    while (!Serial);

    logInfo("SYSTEM", "Central Node - ESP32 HYBRID (AP+STA) Firmware Starting...");

    // Initialize modules
    setup_wifi_ap_sta();      // Setup both WiFi modes
    setup_local_broker();     // Start the broker on the AP
    setup_external_client();  // Setup the client on the STA connection
    initialize_logic();
}

void loop() {
    // Loop all network modules and the calculation logic
    loop_local_broker();
    loop_external_client();
    loop_logic();
}
