// HELIOS v2.4 — sensors.cpp
// Реализация чтения и фильтрации фото-датчиков.

#include "sensors.h"
#include "config.h"

// Внутреннее состояние EMA (хранится между вызовами).
static float emaTl = 2048.0f;
static float emaTr = 2048.0f;
static float emaBl = 2048.0f;
static float emaBr = 2048.0f;
static float emaSv = 2048.0f;

// Усреднение по N сырых выборок — снижает шум ADC ESP32.
static int sampleAverage(int pin) {
  uint32_t sum = 0;
  for (int i = 0; i < ADC_SAMPLES; i++) {
    sum += analogRead(pin);
  }
  return (int)(sum / ADC_SAMPLES);
}

void sensorsInit() {
  // ESP32 ADC: 12 бит → 0..4095
  analogReadResolution(12);
  // На вход 3V3 настраиваем аттенюацию 11 дБ, чтобы видеть полный диапазон до ~3.3 В.
  analogSetPinAttenuation(PIN_LDR_TL, ADC_11db);
  analogSetPinAttenuation(PIN_LDR_TR, ADC_11db);
  analogSetPinAttenuation(PIN_LDR_BL, ADC_11db);
  analogSetPinAttenuation(PIN_LDR_BR, ADC_11db);
  analogSetPinAttenuation(PIN_SOLAR_V, ADC_11db);

  // Стартовое значение EMA = первое замеренное, чтобы не "догонять" с 2048.
  emaTl = (float)sampleAverage(PIN_LDR_TL);
  emaTr = (float)sampleAverage(PIN_LDR_TR);
  emaBl = (float)sampleAverage(PIN_LDR_BL);
  emaBr = (float)sampleAverage(PIN_LDR_BR);
  emaSv = (float)sampleAverage(PIN_SOLAR_V);
}

SensorData sensorsRead() {
  int rawTl = sampleAverage(PIN_LDR_TL);
  int rawTr = sampleAverage(PIN_LDR_TR);
  int rawBl = sampleAverage(PIN_LDR_BL);
  int rawBr = sampleAverage(PIN_LDR_BR);
  int rawSv = sampleAverage(PIN_SOLAR_V);

  // EMA: filtered = α·raw + (1−α)·filtered
  emaTl = EMA_ALPHA * rawTl + (1.0f - EMA_ALPHA) * emaTl;
  emaTr = EMA_ALPHA * rawTr + (1.0f - EMA_ALPHA) * emaTr;
  emaBl = EMA_ALPHA * rawBl + (1.0f - EMA_ALPHA) * emaBl;
  emaBr = EMA_ALPHA * rawBr + (1.0f - EMA_ALPHA) * emaBr;
  emaSv = EMA_ALPHA * rawSv + (1.0f - EMA_ALPHA) * emaSv;

  SensorData d;
  d.tl     = (int)emaTl;
  d.tr     = (int)emaTr;
  d.bl     = (int)emaBl;
  d.br     = (int)emaBr;
  d.solarV = (int)emaSv;
  return d;
}

Differentials sensorsComputeDifferentials(const SensorData& s) {
  Differentials diff;
  diff.vertical   = (s.tl + s.tr) / 2 - (s.bl + s.br) / 2;
  diff.horizontal = (s.tl + s.bl) / 2 - (s.tr + s.br) / 2;
  return diff;
}
