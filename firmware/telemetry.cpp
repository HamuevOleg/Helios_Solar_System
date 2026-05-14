// HELIOS v2.4 — telemetry.cpp
// JSON-сериализация телеметрии и обработка входящих команд через ArduinoJson 7.

#include "telemetry.h"
#include "network.h"
#include "config.h"
#include <ArduinoJson.h>

void telemetryInit() {
  // Резерв на будущее (счётчики, агрегирование).
}

static const char* modeToStr(TrackerMode m) {
  switch (m) {
    case MODE_AUTO:   return "AUTO";
    case MODE_MANUAL: return "MANUAL";
    case MODE_PARKED: return "PARKED";
  }
  return "UNKNOWN";
}

void telemetryPublish(const SensorData& s, const Differentials& diff, const TrackerState& st) {
  JsonDocument doc;
  doc["ts"]   = millis();
  doc["mode"] = modeToStr(st.mode);

  JsonObject sensors = doc["sensors"].to<JsonObject>();
  sensors["tl"] = s.tl;
  sensors["tr"] = s.tr;
  sensors["bl"] = s.bl;
  sensors["br"] = s.br;

  JsonObject d = doc["diff"].to<JsonObject>();
  d["vertical"]   = diff.vertical;
  d["horizontal"] = diff.horizontal;

  JsonObject servo = doc["servo"].to<JsonObject>();
  servo["az"]       = st.currentAz;
  servo["el"]       = st.currentEl;
  servo["targetAz"] = st.targetAz;
  servo["targetEl"] = st.targetEl;

  JsonObject power = doc["power"].to<JsonObject>();
  // 12-bit ADC → масштабируем в условные 0..5 В, как «выход панели».
  power["voltage"]       = (s.solarV / 4095.0f) * 5.0f;
  power["ledBrightness"] = st.ledBrightness;
  power["raw"]           = s.solarV;

  doc["deadzone"] = st.deadzone;

  String json;
  serializeJson(doc, json);
  networkPublish(TOPIC_TELEMETRY, json);
}

void telemetryHandleControl(const String& payload) {
  JsonDocument doc;
  const DeserializationError err = deserializeJson(doc, payload);
  if (err) {
    Serial.printf("[control] JSON parse error: %s\n", err.c_str());
    return;
  }

  const char* cmd = doc["cmd"];
  if (!cmd) {
    Serial.println(F("[control] missing 'cmd' field"));
    return;
  }

  if (strcmp(cmd, "setMode") == 0) {
    const char* val = doc["value"];
    if (!val) return;
    if      (strcmp(val, "AUTO")   == 0) trackerSetMode(MODE_AUTO);
    else if (strcmp(val, "MANUAL") == 0) trackerSetMode(MODE_MANUAL);
    else if (strcmp(val, "PARKED") == 0) trackerSetMode(MODE_PARKED);
    Serial.printf("[control] setMode -> %s\n", val);
  }
  else if (strcmp(cmd, "setServo") == 0) {
    // Принимаем az/el, оба опциональны.
    const TrackerState st = trackerGetState();
    int az = doc["az"] | st.targetAz;
    int el = doc["el"] | st.targetEl;
    trackerSetManualTarget(az, el);
    Serial.printf("[control] setServo az=%d el=%d\n", az, el);
  }
  else if (strcmp(cmd, "setDeadzone") == 0) {
    int dz = doc["value"] | -1;
    if (dz >= 0) {
      trackerSetDeadzone(dz);
      Serial.printf("[control] setDeadzone -> %d\n", dz);
    }
  }
  else {
    Serial.printf("[control] unknown cmd: %s\n", cmd);
  }
}
