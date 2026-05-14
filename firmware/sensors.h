// HELIOS v2.4 — sensors.h
// Чтение фото-датчиков (LDR) + Solar Voltage + EMA-фильтрация + расчёт дифференциалов.

#pragma once

#include <Arduino.h>

// Сырые/фильтрованные значения 4 LDR и "напряжения панели" в диапазоне 0..4095
struct SensorData {
  int tl;       // Top-Left
  int tr;       // Top-Right
  int bl;       // Bottom-Left
  int br;       // Bottom-Right
  int solarV;   // имитация выходного напряжения панели
};

// Дифференциальные сигналы. Положительные значения означают
// смещение "источника света" в соответствующую сторону.
struct Differentials {
  int vertical;    // > 0 — верх ярче (солнце сверху), нужно поднимать elevation
  int horizontal;  // > 0 — слева ярче, нужно крутить azimuth влево
};

// Инициализация: настройка ADC и заполнение начального состояния EMA.
void sensorsInit();

// Считать все 5 каналов с усреднением и применить EMA. Возвращает текущее
// сглаженное состояние датчиков.
SensorData sensorsRead();

// Посчитать дифференциалы по парам датчиков.
//   vertical   = (TL+TR)/2 − (BL+BR)/2
//   horizontal = (TL+BL)/2 − (TR+BR)/2
Differentials sensorsComputeDifferentials(const SensorData& s);
