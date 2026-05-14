// HELIOS v2.4 — telemetry.h
// Сериализация состояния в JSON и парсинг control-команд.

#pragma once

#include <Arduino.h>
#include "sensors.h"
#include "tracker.h"

void telemetryInit();

// Сериализовать снимок (sensors + diff + tracker) в JSON и опубликовать в telemetry-топик.
void telemetryPublish(const SensorData& s, const Differentials& diff, const TrackerState& st);

// Распарсить JSON-команду из control-топика и применить к трекеру.
void telemetryHandleControl(const String& payload);
