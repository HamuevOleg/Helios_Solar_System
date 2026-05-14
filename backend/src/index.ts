// HELIOS backend — Bun + Elysia.
// Поднимает HTTP (/health, /api/snapshot) и WebSocket (/ws).
// WebSocket — двусторонний канал между React-фронтом и MQTT-брокером.

import { Elysia, t } from 'elysia';
import { cors } from '@elysiajs/cors';
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
  .get('/', () => ({
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
  })
  .listen(PORT);

console.log(`╔════════════════════════════════════════════════╗`);
console.log(`║  HELIOS backend                                 ║`);
console.log(`║  http://localhost:${PORT}                            ║`);
console.log(`║  ws://localhost:${PORT}/ws                           ║`);
console.log(`║  device: ${getDeviceId().padEnd(38)}║`);
console.log(`╚════════════════════════════════════════════════╝`);

export type App = typeof app;
