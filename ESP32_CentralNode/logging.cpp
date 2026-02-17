#include "logging.h"
#include "config.h"

void logVerbose(const char* prefix, const char* format, ...) {
    if (LOG_LEVEL >= LOG_LEVEL_VERBOSE) {
        char buffer[256];
        va_list args;
        va_start(args, format);
        vsprintf(buffer, format, args);
        va_end(args);
        Serial.printf("[VERBOSE] [%s] %s\n", prefix, buffer);
    }
}

void logInfo(const char* prefix, const char* format, ...) {
    if (LOG_LEVEL >= LOG_LEVEL_RESULTS) {
        char buffer[256];
        va_list args;
        va_start(args, format);
        vsprintf(buffer, format, args);
        va_end(args);
        Serial.printf("[INFO] [%s] %s\n", prefix, buffer);
    }
}

void logWarn(const char* prefix, const char* format, ...) {
    if (LOG_LEVEL >= LOG_LEVEL_RESULTS) {
        char buffer[256];
        va_list args;
        va_start(args, format);
        vsprintf(buffer, format, args);
        va_end(args);
        Serial.printf("[WARN] [%s] %s\n", prefix, buffer);
    }
}

void logError(const char* prefix, const char* format, ...) {
    char buffer[256];
    va_list args;
    va_start(args, format);
    vsprintf(buffer, format, args);
    va_end(args);
    Serial.printf("[ERROR] [%s] %s\n", prefix, buffer);
}

void logResult(const char* resultString) {
    Serial.printf("[RESULT] %s\n", resultString);
}
