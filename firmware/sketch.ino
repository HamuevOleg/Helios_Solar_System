// HELIOS v2.4 — sketch.ino
// Финальная прошивка: трекинг + Wi-Fi + MQTT + JSON-телеметрия + control-команды.

#include "config.h"
#include "sensors.h"
#include "tracker.h"
#include "network.h"
#include "telemetry.h"

static unsigned long lastLoopTick      = 0;
static unsigned long lastTelemetryTick = 0;
static unsigned long lastSerialTick    = 0;
static const unsigned long SERIAL_PERIOD = 2000;  // диагностический лог раз в 2 секунды

static const char* modeShort(TrackerMode m) {
  switch (m) {
    case MODE_AUTO:   return "AUTO";
    case MODE_MANUAL: return "MAN ";
    case MODE_PARKED: return "PARK";
  }
  return "????";
}

void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println();
  Serial.println(F("=== HELIOS v2.4 — full firmware online ==="));
  Serial.println(F("Tracker + Wi-Fi + MQTT + JSON telemetry."));
  Serial.println();

  sensorsInit();
  trackerInit();
  telemetryInit();
  networkInit(telemetryHandleControl);
}

void loop() {
  const unsigned long now = millis();

  // Сетевой тик — каждый цикл, чтобы MQTT успевал держать keepalive и принимать команды.
  networkLoop();

  // Основной алгоритмический шаг — раз в LOOP_DELAY_MS.
  if (now - lastLoopTick < LOOP_DELAY_MS) return;
  lastLoopTick = now;

  const SensorData    s    = sensorsRead();
  const Differentials diff = sensorsComputeDifferentials(s);
  trackerUpdate(s, diff);

  // Телеметрия по MQTT — раз в TELEMETRY_PERIOD.
  if (now - lastTelemetryTick >= TELEMETRY_PERIOD) {
    lastTelemetryTick = now;
    if (networkIsConnected()) {
      telemetryPublish(s, diff, trackerGetState());
    }
  }

  // Дублирование в Serial для отладки (медленнее, чем MQTT).
  if (now - lastSerialTick >= SERIAL_PERIOD) {
    lastSerialTick = now;
    const TrackerState st = trackerGetState();
    const char* netStatus = networkIsConnected() ? "ONLINE " : "OFFLINE";
    Serial.printf(
      "[%s|%s] LDR=%4d/%4d/%4d/%4d dV=%+5d dH=%+5d az=%3d el=%3d LED=%3d DZ=%d SV=%4d\n",
      netStatus, modeShort(st.mode),
      s.tl, s.tr, s.bl, s.br,
      diff.vertical, diff.horizontal,
      st.currentAz, st.currentEl,
      st.ledBrightness, st.deadzone, s.solarV);
  }
}
