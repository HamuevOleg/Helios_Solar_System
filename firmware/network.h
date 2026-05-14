// HELIOS v2.4 — network.h
// Wi-Fi (Wokwi-GUEST) + MQTT-клиент. Подписка на control-топик, публикация телеметрии.

#pragma once

#include <Arduino.h>
#include <functional>

// Колбэк, который вызывается при приходе JSON-команды в control-топик.
using ControlHandler = std::function<void(const String& payload)>;

// Поднять Wi-Fi и MQTT, навесить обработчик команд.
void networkInit(ControlHandler onControl);

// Тикать в основном цикле — поддерживает соединение и перепарсивает входящие.
void networkLoop();

// True, если активны и Wi-Fi, и MQTT.
bool networkIsConnected();

// Опубликовать сообщение в произвольный топик.
bool networkPublish(const char* topic, const char* payload, bool retain = false);
bool networkPublish(const char* topic, const String& payload, bool retain = false);
