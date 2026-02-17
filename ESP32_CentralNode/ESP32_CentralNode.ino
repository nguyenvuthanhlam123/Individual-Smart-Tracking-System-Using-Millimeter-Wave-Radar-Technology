#include "config.h"
#include "types.h"
#include "network_manager.h"
#include "calculation_logic.h"
#include "logging.h"

void setup() {
    Serial.begin(115200);
    while (!Serial); // Wait for serial connection

    logInfo("SYSTEM", "Central Node - ESP32 Firmware Starting...");

    // Log configuration settings from config.h
    logInfo("CONFIG", "Anchor Coords: S2_a=%.2f, S3_c=%.2f, S3_b=%.2f", S2_a, S3_c, S3_b);
    logInfo("CONFIG", "Calc Settings: History=%d, Offset=%.2f, Avg Interval=%lu ms", HISTORY_SIZE, DISTANCE_OFFSET, AVERAGE_INTERVAL_MS);
    logInfo("CONFIG", "Publish Mode: %s", PUBLISH_RESULTS ? "ON" : "OFF");
    logInfo("CONFIG", "Log Level: %d", LOG_LEVEL);

    // Validate essential config
    if (S2_a == 0 || S3_b == 0) {
        logError("CONFIG", "S2_a or S3_b cannot be zero. Halting.");
        while(1); // Stop execution
    }

    // Initialize modules
    setup_wifi();
    setup_mqtt();
    initialize_logic();
}

void loop() {
    // Main loop delegates tasks to the respective modules
    loop_mqtt();
    loop_logic();
}
