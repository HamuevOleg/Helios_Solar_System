// HELIOS backend — Bun + Elysia.
// Поднимает HTTP (/health, /api/snapshot) и WebSocket (/ws).
// WebSocket — двусторонний канал между React-фронтом и MQTT-брокером.

import { Elysia, t } from 'elysia';
import { cors } from '@elysiajs/cors';
import { staticPlugin } from '@elysiajs/static';
import { existsSync } from 'node:fs';
import {
  connectMqtt,
  publishControl,
  getLatestTelemetry,
  getLatestStatus,
  isBrokerConnected,
  getDeviceId,
} from './mqtt';
import type { ServerToClient, ClientToServer } from './types';

const PORT = Number(process.env.PORT ?? 8787);
const STATIC_DIR = process.env.STATIC_DIR ?? '../frontend/dist';

// ── Реестр подключённых WebSocket-клиентов
type WsClient = { send: (data: string) => void };
const wsClients = new Set<WsClient>();

function broadcast(msg: ServerToClient): void {
  const text = JSON.stringify(msg);
  for (const client of wsClients) {
    try {
      client.send(text);
    } catch {
      // клиент скоро отвалится по close, проигнорируем
    }
  }
}

// ── Поднимаем MQTT-мост и форвардим всё в WS-broadcast
connectMqtt({
  onTelemetry: (data) => broadcast({ type: 'telemetry', data }),
  onStatus:    (data) => broadcast({ type: 'status',    data }),
  onBrokerConnect: (connected) => broadcast({ type: 'broker', connected }),
});

// ── Elysia-приложение
const app = new Elysia()
  .use(cors())
  // Info-эндпоинт переехал с / на /api/info — корень оставлен под
  // index.html фронтенда (static plugin цепляется ниже).
  .get('/api/info', () => ({
    name: 'helios-backend',
    version: '1.0.0',
    deviceId: getDeviceId(),
  }))
  .get('/health', () => ({
    ok: true,
    brokerConnected: isBrokerConnected(),
    deviceOnline: getLatestStatus()?.online ?? false,
    hasTelemetry: getLatestTelemetry() !== null,
  }))
  .get('/api/snapshot', () => ({
    brokerConnected: isBrokerConnected(),
    status: getLatestStatus(),
    telemetry: getLatestTelemetry(),
  }))
  .ws('/ws', {
    body: t.Any(),
    open(ws) {
      console.log('[ws] client connected');
      wsClients.add(ws as unknown as WsClient);
      // Сразу пуляем снапшот, чтобы фронт не моргал пустотой
      const snapshot: ServerToClient = {
        type: 'snapshot',
        brokerConnected: isBrokerConnected(),
        status: getLatestStatus(),
        telemetry: getLatestTelemetry(),
      };
      ws.send(JSON.stringify(snapshot));
    },
    close(ws) {
      console.log('[ws] client disconnected');
      wsClients.delete(ws as unknown as WsClient);
    },
    message(_ws, raw) {
      let cmd: ClientToServer;
      try {
        cmd = typeof raw === 'string' ? JSON.parse(raw) : (raw as ClientToServer);
      } catch (e) {
        console.error('[ws] invalid JSON from client:', e);
        return;
      }
      publishControl(cmd);
    },
  });

// В production (или просто если рядом лежит frontend/dist) — раздаём
// собранный фронт с того же порта. В dev это не нужно: Vite держит свой
// сервер на 5173 и проксирует /ws → 8787.
if (existsSync(STATIC_DIR)) {
  console.log(`[http] serving static frontend from ${STATIC_DIR}`);
  // /assets/* и /vite.svg, /metronome.svg и т.п. — через static-плагин.
  app.use(staticPlugin({ assets: STATIC_DIR, prefix: '', alwaysStatic: false }));
  // Корень и любой не-API маршрут (SPA-fallback) — отдают index.html.
  app.get('/', () => new Response(Bun.file(`${STATIC_DIR}/index.html`), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  }));
} else {
  console.log(`[http] no static dir at ${STATIC_DIR} — UI served separately`);
}

app.listen(PORT);

console.log(`╔════════════════════════════════════════════════╗`);
console.log(`║  HELIOS backend                                 ║`);
console.log(`║  http://localhost:${PORT}                            ║`);
console.log(`║  ws://localhost:${PORT}/ws                           ║`);
console.log(`║  device: ${getDeviceId().padEnd(38)}║`);
console.log(`╚════════════════════════════════════════════════╝`);

export type App = typeof app;
