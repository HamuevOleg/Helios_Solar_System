// HELIOS v2.4 — network.cpp
// WiFi → MQTT мост: подписка на control, паблиш телеметрии, LWT для offline-статуса.

#include "network.h"
#include "config.h"
#include <WiFi.h>
#include <PubSubClient.h>

static WiFiClient        wifiClient;
static PubSubClient      mqtt(wifiClient);
static ControlHandler    controlHandler = nullptr;
static unsigned long     lastReconnectAttempt = 0;
static const unsigned long RECONNECT_INTERVAL_MS = 5000;

// Колбэк PubSubClient: пришло сообщение, перепаковываем в String и зовём пользователя.
static void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String msg;
  msg.reserve(length);
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];
  Serial.printf("[mqtt] RX %s: %s\n", topic, msg.c_str());
  if (controlHandler) controlHandler(msg);
}

// Попытка подключиться к брокеру + сразу публикуем status:online (retained).
// LWT настраивается до connect — он сработает на стороне брокера, если ESP отвалится без отписки.
static bool connectMqtt() {
  Serial.print(F("[mqtt] connecting... "));
  const char* willTopic   = TOPIC_STATUS;
  const char* willPayload = "{\"online\":false}";
  if (mqtt.connect(DEVICE_ID, NULL, NULL, willTopic, 0, true, willPayload)) {
    Serial.println(F("OK"));
    mqtt.publish(TOPIC_STATUS, "{\"online\":true}", true);
    mqtt.subscribe(TOPIC_CONTROL);
    return true;
  }
  Serial.printf("FAIL rc=%d\n", mqtt.state());
  return false;
}

void networkInit(ControlHandler onControl) {
  controlHandler = onControl;

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print(F("[wifi] connecting to "));
  Serial.println(WIFI_SSID);

  // Wokwi-GUEST поднимается быстро; даём 10 секунд на коннект, потом всё равно идём в loop().
  const unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 10000) {
    delay(100);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[wifi] connected, IP=%s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println(F("\n[wifi] connect timeout — will keep retrying in loop."));
  }

  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(mqttCallback);
  mqtt.setBufferSize(1024);   // JSON-телеметрия укладывается в ~400 байт, 1 КБ с запасом.
  connectMqtt();
}

void networkLoop() {
  // ESP32 автоматически переподключает Wi-Fi; ждём пока WL_CONNECTED.
  if (WiFi.status() != WL_CONNECTED) return;

  if (!mqtt.connected()) {
    const unsigned long now = millis();
    if (now - lastReconnectAttempt > RECONNECT_INTERVAL_MS) {
      lastReconnectAttempt = now;
      connectMqtt();
    }
    return;
  }
  mqtt.loop();
}

bool networkIsConnected() {
  return WiFi.status() == WL_CONNECTED && mqtt.connected();
}

bool networkPublish(const char* topic, const char* payload, bool retain) {
  if (!mqtt.connected()) return false;
  return mqtt.publish(topic, payload, retain);
}

bool networkPublish(const char* topic, const String& payload, bool retain) {
  return networkPublish(topic, payload.c_str(), retain);
}
