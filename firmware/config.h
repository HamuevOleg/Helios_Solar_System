// HELIOS v2.4 — config.h
// Централизованные настройки пинов, алгоритма и сети.
// При смене железа/брокера правишь только этот файл.

#pragma once

// ──────────────── Пины ────────────────
#define PIN_LDR_TL    34   // ADC1_CH6 — Top-Left LDR (потенциометр в Wokwi)
#define PIN_LDR_TR    35   // ADC1_CH7 — Top-Right
#define PIN_LDR_BL    32   // ADC1_CH4 — Bottom-Left
#define PIN_LDR_BR    33   // ADC1_CH5 — Bottom-Right
#define PIN_SOLAR_V   36   // ADC1_CH0 — имитация выходного напряжения панели
#define PIN_SERVO_AZ  25   // Servo Azimuth (горизонтальная ось)
#define PIN_SERVO_EL  26   // Servo Elevation (вертикальная ось)
#define PIN_LED_OUT   27   // LED индикатор точности (PWM через ledc)

// ──────────────── Алгоритм трекинга ────────────────
#define DEADZONE          50       // порог чувствительности диф-сигнала, из 0..4095
#define SERVO_STEP        1        // шаг изменения целевого угла, градусы
#define SERVO_SMOOTH_MS   30       // период плавного движения серво к цели, мс
#define NIGHT_THRESHOLD   200      // если все 4 LDR ниже — считаем что ночь
#define NIGHT_CHECK_MS    60000    // как часто проверять небо в режиме парковки
#define LOOP_DELAY_MS     50       // основной шаг главного цикла
#define TELEMETRY_PERIOD  500      // период публикации телеметрии, мс

// ──────────────── EMA-фильтр ────────────────
#define EMA_ALPHA         0.30f    // вес нового значения; чем меньше — тем плавнее
#define ADC_SAMPLES       8        // усреднение по N сырых выборок

// ──────────────── Ограничения сервоприводов ────────────────
#define AZ_MIN  0
#define AZ_MAX  180
#define EL_MIN  10                 // не упираем в горизонт
#define EL_MAX  170

// ──────────────── Парк-позиция (ночь) ────────────────
#define PARK_AZ   90
#define PARK_EL   EL_MIN

// ──────────────── PWM для LED ────────────────
// На ESP32 Arduino core 3.x ledcAttach() сам ассайнит канал по пину —
// поэтому отдельный LED_PWM_CHANNEL больше не нужен.
#define LED_PWM_FREQ     5000
#define LED_PWM_BITS     8

// ──────────────── Сеть (используется на этапе 3+) ────────────────
#define WIFI_SSID     "Wokwi-GUEST"
#define WIFI_PASS     ""
#define MQTT_HOST     "broker.hivemq.com"
#define MQTT_PORT     1883
#define DEVICE_ID     "helios-001"

// ──────────────── MQTT-топики ────────────────
#define TOPIC_TELEMETRY  "helios/helios-001/telemetry"
#define TOPIC_CONTROL    "helios/helios-001/control"
#define TOPIC_STATUS     "helios/helios-001/status"
