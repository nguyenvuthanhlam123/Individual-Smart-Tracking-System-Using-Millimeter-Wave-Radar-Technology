#include <Arduino.h>
#include <ArduinoJson.h>
#include "calculation_logic.h"
#include "config.h"
#include "types.h"
#include "logging.h"

// --- State Variables ---
float latestDistances[3] = { -1.0, -1.0, -1.0 };
bool newDataFlags[3] = { false, false, false };

// --- Coordinate History Buffers ---
Point3D coordHistory[HISTORY_SIZE];
int coordHistoryIndex = 0;
int coordHistoryCount = 0;

Point3D periodicHistory[HISTORY_SIZE * 2];
int periodicHistoryCount = 0;

// --- Timers ---
unsigned long lastAverageTime = 0;

// --- Forward Declarations ---
void performInstantCalculation();
void calculateAndSendAverage();
float calculate_r();

void initialize_logic() {
    lastAverageTime = millis();
}

void loop_logic() {
    if (millis() - lastAverageTime >= AVERAGE_INTERVAL_MS) {
        lastAverageTime = millis();
        calculateAndSendAverage();
    }
}

void on_distance_received(int sensor_id, float distance) {
    if (sensor_id >= 1 && sensor_id <= 3) {
        int index = sensor_id - 1;
        latestDistances[index] = distance;
        newDataFlags[index] = true;
        logVerbose("STATE", "Updated distance: id=%d, d=%.2f. New data flags: %d,%d,%d", sensor_id, distance, newDataFlags[0], newDataFlags[1], newDataFlags[2]);

        if (newDataFlags[0] && newDataFlags[1] && newDataFlags[2]) {
            logVerbose("CALC", "All new data received. Triggering instant calculation.");
            performInstantCalculation();
            newDataFlags[0] = false;
            newDataFlags[1] = false;
            newDataFlags[2] = false;
        }
    } else {
        logWarn("RECV", "Ignoring message with invalid ID: %d", sensor_id);
    }
}

void performInstantCalculation() {
    float d1_raw = latestDistances[0];
    float d2_raw = latestDistances[1];
    float d3_raw = latestDistances[2];
    logVerbose("CALC_INPUT", "Using raw distances: d1=%.2f, d2=%.2f, d3=%.2f", d1_raw, d2_raw, d3_raw);

    float d1 = d1_raw + DISTANCE_OFFSET;
    float d2 = d2_raw + DISTANCE_OFFSET;
    float d3 = d3_raw + DISTANCE_OFFSET;
    
    float x = (pow(S2_a, 2) + pow(d1, 2) - pow(d2, 2)) / (2 * S2_a);
    float y_numerator = pow(d1, 2) + pow(S3_c, 2) + pow(S3_b, 2) - pow(d3, 2) - (2 * S3_c * x);
    float y = y_numerator / (2 * S3_b);
    float zSquared = pow(d1, 2) - pow(x, 2) - pow(y, 2);

    if (zSquared < 0) {
        logWarn("CALC", "Invalid calculation (z^2 = %.4f < 0). Discarding point.", zSquared);
        return;
    }
    float z = sqrt(zSquared);

    if (x <= 0 || y <= 0 || z <= 0) {
        logWarn("VALIDATION", "Non-positive coordinate (x=%.2f, y=%.2f, z=%.2f). Discarding point.", x, y, z);
        return;
    }

    logVerbose("CALC", "Calculated Instant Coords: x=%.2f, y=%.2f, z=%.2f", x, y, z);
    Point3D currentCoord = {x, y, z};

    coordHistory[coordHistoryIndex] = currentCoord;
    coordHistoryIndex = (coordHistoryIndex + 1) % HISTORY_SIZE;
    if (coordHistoryCount < HISTORY_SIZE) coordHistoryCount++;

    if (periodicHistoryCount < (sizeof(periodicHistory) / sizeof(Point3D))) {
        periodicHistory[periodicHistoryCount++] = currentCoord;
    } else {
        logWarn("CALC", "Periodic history buffer full.");
    }
}

void calculateAndSendAverage() {
    StaticJsonDocument<256> doc;
    JsonObject data = doc.createNestedObject("data");

    if (periodicHistoryCount > 0) {
        float sumX = 0, sumY = 0, sumZ = 0;
        for (int i = 0; i < periodicHistoryCount; i++) {
            sumX += periodicHistory[i].x;
            sumY += periodicHistory[i].y;
            sumZ += periodicHistory[i].z;
        }
        float avgX = sumX / periodicHistoryCount;
        float avgY = sumY / periodicHistoryCount;
        float avgZ = sumZ / periodicHistoryCount;

        float r_raw = calculate_r();
        float r_offset = (r_raw >= 0) ? (r_raw + DISTANCE_OFFSET) : DISTANCE_OFFSET;

        doc["deviceID"] = OUTPUT_DEVICE_ID;
        data["x"] = round(avgX * 100) / 100.0;
        data["y"] = round(avgY * 100) / 100.0;
        data["z"] = round(avgZ * 100) / 100.0;
        data["r"] = round(r_offset * 100) / 100.0;

    } else {
        logInfo("SENDER", "No valid data in interval. Sending default values.");
        doc["deviceID"] = OUTPUT_DEVICE_ID;
        data["x"] = 0;
        data["y"] = 0;
        data["z"] = 0;
        data["r"] = 0;
    }

    String output;
    serializeJson(doc, output);
    logResult(output.c_str());

    publish_results(output.c_str());
    
    periodicHistoryCount = 0;
    logVerbose("STATE", "Periodic history cleared.");
}

float calculate_r() {
    if (coordHistoryCount < HISTORY_SIZE) {
        logVerbose("ERROR_CALC", "Not enough history (%d/%d) for r-calc.", coordHistoryCount, HISTORY_SIZE);
        return -1.0;
    }

    float rValues[HISTORY_SIZE];
    float sumR = 0;
    for (int i = 0; i < HISTORY_SIZE; i++) {
        rValues[i] = sqrt(pow(coordHistory[i].x, 2) + pow(coordHistory[i].y, 2) + pow(coordHistory[i].z, 2));
        sumR += rValues[i];
    }
    float avgR = sumR / HISTORY_SIZE;
    
    float maxDeviation = -1;
    int outlierIndex = -1;
    for (int i = 0; i < HISTORY_SIZE; i++) {
        float deviation = abs(rValues[i] - avgR);
        if (deviation > maxDeviation) {
            maxDeviation = deviation;
            outlierIndex = i;
        }
    }
    
    float sumFilteredR = 0;
    int filteredCount = 0;
    for (int i = 0; i < HISTORY_SIZE; i++) {
        if (i != outlierIndex) {
            sumFilteredR += rValues[i];
            filteredCount++;
        }
    }

    if (filteredCount == 0) return -1.0;
    
    float R_avg_later = sumFilteredR / filteredCount;
    float sumDeviationsLater = 0;
    for(int i = 0; i < HISTORY_SIZE; i++){
        if(i != outlierIndex){
            sumDeviationsLater += abs(rValues[i] - R_avg_later);
        }
    }
    return sumDeviationsLater / filteredCount;
}
