// HELIOS v2.4 — tracker.cpp
// Реализация двухосевого трекинга с плавным движением и LED-индикацией.

#include "tracker.h"
#include "config.h"
#include <ESP32Servo.h>

// ──────────────── Локальное состояние модуля ────────────────
static Servo servoAz;
static Servo servoEl;

static TrackerState state = {
  .mode          = MODE_AUTO,
  .currentAz     = PARK_AZ,
  .currentEl     = PARK_EL,
  .targetAz      = PARK_AZ,
  .targetEl      = PARK_EL,
  .ledBrightness = 0,
  .deadzone      = DEADZONE,
};

static unsigned long lastSmoothMove = 0;
static unsigned long lastNightCheck = 0;

// ──────────────── Вспомогательные функции ────────────────

// Все 4 LDR ниже порога — значит "ночь".
static bool isNight(const SensorData& s) {
  return s.tl < NIGHT_THRESHOLD &&
         s.tr < NIGHT_THRESHOLD &&
         s.bl < NIGHT_THRESHOLD &&
         s.br < NIGHT_THRESHOLD;
}

// Плавное движение к цели: раз в SERVO_SMOOTH_MS делаем ±1° по каждой оси.
// Это убирает рывки сервы при больших скачках target-а.
static void smoothMove() {
  unsigned long now = millis();
  if (now - lastSmoothMove < SERVO_SMOOTH_MS) return;
  lastSmoothMove = now;

  if (state.currentAz < state.targetAz) state.currentAz++;
  else if (state.currentAz > state.targetAz) state.currentAz--;

  if (state.currentEl < state.targetEl) state.currentEl++;
  else if (state.currentEl > state.targetEl) state.currentEl--;

  servoAz.write(state.currentAz);
  servoEl.write(state.currentEl);
}

// LED горит ярче когда ошибка наведения мала.
static void updateLedIndicator(const Differentials& diff) {
  int err = abs(diff.vertical) + abs(diff.horizontal);
  int constrained = err > 4095 ? 4095 : err;
  int brightness = map(constrained, 0, 4095, 255, 0);
  state.ledBrightness = brightness;
  // ESP32 Arduino core 3.x: ledcWrite по пину, без отдельного канала.
  ledcWrite(PIN_LED_OUT, brightness);
}

// ──────────────── Публичный API ────────────────

void trackerInit() {
  // ESP32 Arduino core 3.x API: ledcAttach(pin, freq, bits) = setup+attach в один шаг.
  ledcAttach(PIN_LED_OUT, LED_PWM_FREQ, LED_PWM_BITS);
  ledcWrite(PIN_LED_OUT, 0);

  // Резервируем таймеры для двух серв.
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  servoAz.setPeriodHertz(50);
  servoEl.setPeriodHertz(50);
  servoAz.attach(PIN_SERVO_AZ, 500, 2400);
  servoEl.attach(PIN_SERVO_EL, 500, 2400);

  // Стартуем из парк-позиции.
  state.currentAz = PARK_AZ;
  state.currentEl = PARK_EL;
  state.targetAz  = PARK_AZ;
  state.targetEl  = PARK_EL;
  servoAz.write(state.currentAz);
  servoEl.write(state.currentEl);
}

void trackerUpdate(const SensorData& s, const Differentials& diff) {
  // ── MANUAL: никакой автоматики, просто едем к ручному target.
  if (state.mode == MODE_MANUAL) {
    state.ledBrightness = 0;
    ledcWrite(PIN_LED_OUT, 0);
    smoothMove();
    return;
  }

  // ── PARKED: ждём ночь, раз в минуту проверяем не рассвело ли.
  if (state.mode == MODE_PARKED) {
    unsigned long now = millis();
    if (now - lastNightCheck > NIGHT_CHECK_MS) {
      lastNightCheck = now;
      if (!isNight(s)) {
        state.mode = MODE_AUTO;
      }
    }
    state.ledBrightness = 0;
    ledcWrite(PIN_LED_OUT, 0);
    smoothMove();
    return;
  }

  // ── AUTO: основной алгоритм наведения.

  // Ночью — паркуемся и выходим.
  if (isNight(s)) {
    state.mode      = MODE_PARKED;
    state.targetAz  = PARK_AZ;
    state.targetEl  = PARK_EL;
    lastNightCheck  = millis();
    state.ledBrightness = 0;
    ledcWrite(PIN_LED_OUT, 0);
    return;
  }

  // Elevation: положительный diff.vertical → "верх" ярче → поднимаем панель.
  if (abs(diff.vertical) > state.deadzone) {
    if (diff.vertical > 0 && state.targetEl < EL_MAX) {
      state.targetEl += SERVO_STEP;
    } else if (diff.vertical < 0 && state.targetEl > EL_MIN) {
      state.targetEl -= SERVO_STEP;
    }
  }

  // Azimuth: положительный diff.horizontal → "лево" ярче → крутим к левому краю
  // (уменьшаем угол). Знак подобран так, чтобы трекер физически шёл К свету.
  if (abs(diff.horizontal) > state.deadzone) {
    if (diff.horizontal > 0 && state.targetAz > AZ_MIN) {
      state.targetAz -= SERVO_STEP;
    } else if (diff.horizontal < 0 && state.targetAz < AZ_MAX) {
      state.targetAz += SERVO_STEP;
    }
  }

  smoothMove();
  updateLedIndicator(diff);
}

TrackerState trackerGetState() {
  return state;
}

void trackerSetMode(TrackerMode mode) {
  if (mode == state.mode) return;
  state.mode = mode;
  if (mode == MODE_PARKED) {
    state.targetAz = PARK_AZ;
    state.targetEl = PARK_EL;
    lastNightCheck = millis();
  }
}

void trackerSetManualTarget(int az, int el) {
  // Принимаем команду только если реально в ручном режиме.
  if (state.mode != MODE_MANUAL) return;
  if (az < AZ_MIN) az = AZ_MIN;
  if (az > AZ_MAX) az = AZ_MAX;
  if (el < EL_MIN) el = EL_MIN;
  if (el > EL_MAX) el = EL_MAX;
  state.targetAz = az;
  state.targetEl = el;
}

void trackerSetDeadzone(int dz) {
  if (dz < 0) dz = 0;
  if (dz > 2000) dz = 2000;
  state.deadzone = dz;
}
