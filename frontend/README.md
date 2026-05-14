# HELIOS frontend

React + Vite + Tailwind + react-three-fiber + Recharts. Дашборд для двухосевого солнечного трекера.

## Запуск

```bash
bun install
bun run dev   # http://localhost:5173
```

В dev-режиме Vite проксирует `/ws` → `ws://localhost:8787` (нашему бэку). Бэк должен быть запущен в соседнем терминале — см. `../backend/README.md`.

## Стек

- React 18 + Vite + TypeScript
- Tailwind CSS (тёмная инженерная тема)
- `@react-three/fiber` + `@react-three/drei` (3D-модель трекера)
- `recharts` (графики LDR и Power)
- `lucide-react` (иконки)

## Структура

```
src/
├── App.tsx                  ← общий layout
├── main.tsx                 ← React entry
├── index.css                ← Tailwind + кастомные стили слайдера
├── types.ts                 ← зеркало backend/src/types.ts
├── hooks/
│   └── useHeliosSocket.ts   ← WebSocket-клиент + история телеметрии
└── components/
    ├── Header.tsx           ← статус-бейджи (WS / Broker / Device)
    ├── EmptyState.tsx       ← лоадер пока нет данных
    ├── SensorCards.tsx      ← 4 LDR + Power + ΔV/ΔH
    ├── Tracker3D.tsx        ← живая 3D-модель (Three.js)
    ├── Charts.tsx           ← графики LDR + Power
    └── ControlPanel.tsx     ← AUTO/MANUAL + az/el слайдеры + Deadzone
```

## Билд

```bash
bun run build
bun run preview
```
