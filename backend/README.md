# HELIOS backend

Bun + Elysia мост между Wokwi-симуляцией и React-фронтом.

```
[Wokwi ESP32] ──MQTT──► [broker.hivemq.com] ◄──MQTT──► [этот бэк] ──WS──► [React]
```

## Запуск

```bash
bun install
bun run dev      # с hot-reload
# или
bun run start
```

По умолчанию слушает `http://localhost:8787`. WebSocket — `ws://localhost:8787/ws`.

## Переменные окружения

| Переменная   | По умолчанию           | Что делает                   |
|--------------|------------------------|------------------------------|
| `PORT`       | `8787`                 | порт HTTP/WS                 |
| `MQTT_HOST`  | `broker.hivemq.com`    | хост MQTT-брокера            |
| `MQTT_PORT`  | `1883`                 | порт MQTT-брокера            |
| `DEVICE_ID`  | `helios-001`           | id устройства в топиках      |

## Эндпоинты

- `GET /` — service info
- `GET /health` — статус подключений
- `GET /api/snapshot` — последний снимок состояния (вне WS)
- `WS  /ws` — подписка на телеметрию + отправка управляющих команд

## Сообщения WebSocket

**Server → Client:** `telemetry`, `status`, `broker`, `snapshot`
**Client → Server:** `setMode`, `setServo`, `setDeadzone` (см. `src/types.ts`).
