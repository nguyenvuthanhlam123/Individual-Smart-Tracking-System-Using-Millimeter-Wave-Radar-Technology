#ifndef LOGGING_H
#define LOGGING_H

#include <stdarg.h>
#include <Arduino.h>

void logVerbose(const char* prefix, const char* format, ...);
void logInfo(const char* prefix, const char* format, ...);
void logWarn(const char* prefix, const char* format, ...);
void logError(const char* prefix, const char* format, ...);
void logResult(const char* resultString);

#endif // LOGGING_H
