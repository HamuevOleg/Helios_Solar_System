# HELIOS v2.4 — Solar Tracker

Двухосевой солнечный трекер с реалтайм-телеметрией и веб-дашбордом. Полностью симуляция:
прошивка крутится в Wokwi, бэк и фронт — у тебя на машине, MQTT-брокер публичный
(`broker.hivemq.com`). Никакого реального железа.

## Архитектура

```
┌──────────────────┐    MQTT      ┌──────────────────┐   MQTT    ┌─────────────────┐
│  Wokwi ESP32     │ ────────► ┌─►│  broker.hivemq   │ ────────► │ Bun/Elysia bk   │
│  firmware/       │           │  │  .com (public)   │           │ backend/        │
│  - 4 LDR + Solar │           │  └──────────────────┘           └─────────────────┘
│  - 2 servos      │           │           ▲                              │  WS
│  - LED indicator │           │           │                              ▼
└──────────────────┘           │           │                     ┌─────────────────┐
        ▲                      │           └─────────────────────│  React frontend │
        │     control          │                   MQTT          │  frontend/      │
        └──────────────────────┴─────────────────────────────────│  Tracker3D, etc │
                                                                 └─────────────────┘
```

Один поток данных идёт телеметрией снизу вверх (Wokwi → брокер → бэк → фронт), второй
поток — команды фронта (`AUTO/MANUAL`, ручной az/el, deadzone) идёт сверху вниз
через тот же бэк и брокер обратно к ESP32.

## Папки

| Папка        | Что лежит                                                    |
|--------------|--------------------------------------------------------------|
| `firmware/`  | Arduino C++ для ESP32: `sketch.ino`, `config.h`, `sensors.*`, `tracker.*`, `network.*`, `telemetry.*`, `diagram.json`, `libraries.txt`. |
| `backend/`   | Bun + ElysiaJS. MQTT-клиент + WebSocket-сервер.              |
| `frontend/`  | React + Vite + Tailwind + react-three-fiber + Recharts.      |

## Запуск (локально)

Нужен **[Bun](https://bun.sh)** (любая свежая версия).

### 1. Прошивка в Wokwi

Зайди на https://wokwi.com/projects/new/esp32, замени `sketch.ino` и `diagram.json` на
содержимое из папки `firmware/`. Добавь остальные файлы (`config.h`, `sensors.h/.cpp`,
`tracker.h/.cpp`, `network.h/.cpp`, `telemetry.h/.cpp`, `libraries.txt`) как новые
вкладки. Нажми ▶ — Wokwi сам подтянет библиотеки из `libraries.txt`:

- ESP32Servo
- PubSubClient
- ArduinoJson

### 2. Бэкенд

```bash
cd backend
bun install
bun run dev
# http://localhost:8787  ·  ws://localhost:8787/ws
```

### 3. Фронтенд

```bash
cd frontend
bun install
bun run dev
# http://localhost:5173
```

Открой `http://localhost:5173` в браузере — статус-бейджи `WS / Broker / Device`
сначала станут зелёными, потом приедет первая телеметрия и UI оживёт.

## MQTT-топики

| Топик                                | Кто пишет | Кто читает  |
|--------------------------------------|-----------|-------------|
| `helios/helios-001/telemetry`        | ESP32     | backend     |
| `helios/helios-001/status`           | ESP32     | backend     |
| `helios/helios-001/control`          | backend   | ESP32       |

`status` использует MQTT Last Will and Testament — если ESP32 отвалится,
брокер автоматически опубликует `{"online":false}` в этот топик.

## Команды управления (фронт → ESP32)

```jsonc
{ "cmd": "setMode",     "value": "MANUAL" }       // или "AUTO" / "PARKED"
{ "cmd": "setServo",    "az": 120, "el": 60 }     // только в MANUAL
{ "cmd": "setDeadzone", "value": 80 }
```

## Этапы сборки

1. ✅ Wokwi-схема + минимальный sketch
2. ✅ Алгоритм трекинга (без сети)
3. ✅ Wi-Fi + MQTT
4. ✅ Полная JSON-телеметрия + control
5. ✅ Bun/Elysia бэкенд (MQTT-мост + WS)
6. ✅ React + Vite + Tailwind — скелет дашборда
7. ✅ Графики + 3D-сцена + контрол
8. ✅ Полировка + LWT + README

## Технологии

- **Симуляция:** Wokwi (ESP32 DevKit-C v4)
- **Firmware:** C++ (Arduino), ESP32Servo, PubSubClient, ArduinoJson
- **Backend:** Bun runtime, Elysia HTTP/WS, `mqtt` (Node-compatible)
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, `@react-three/fiber`, Recharts, Lucide
