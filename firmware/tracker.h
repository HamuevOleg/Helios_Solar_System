// HELIOS v2.4 — tracker.h
// Алгоритм наведения, управление двумя сервоприводами, LED-индикация точности.

#pragma once

#include "sensors.h"

// Режимы работы трекера.
enum TrackerMode {
  MODE_AUTO    = 0,  // нормальное автоматическое наведение по дифференциалам
  MODE_MANUAL  = 1,  // ручное управление с дашборда (slave to setManualTarget)
  MODE_PARKED  = 2   // ночь, парк-позиция; периодически проверяем небо
};

// Снимок состояния трекера для телеметрии и дашборда.
struct TrackerState {
  TrackerMode mode;
  int currentAz;       // фактическое положение серво, градусы
  int currentEl;
  int targetAz;        // куда стремимся (плавное движение к этой точке)
  int targetEl;
  int ledBrightness;   // яркость индикатора (0..255)
  int deadzone;        // текущий порог чувствительности
};

// Инициализация: ledc для LED, ESP32Servo для серв, парк-позиция по умолчанию.
void trackerInit();

// Главный апдейт: вызывается каждые LOOP_DELAY_MS из основного цикла.
// Принимает текущее состояние датчиков и уже посчитанные дифференциалы.
void trackerUpdate(const SensorData& s, const Differentials& diff);

// Получить копию текущего состояния (для телеметрии).
TrackerState trackerGetState();

// Команды извне (из контроль-топика или сериал-парсера).
void trackerSetMode(TrackerMode mode);
void trackerSetManualTarget(int az, int el);
void trackerSetDeadzone(int dz);
