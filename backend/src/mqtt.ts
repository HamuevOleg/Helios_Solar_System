// HELIOS backend — MQTT-клиент.
// Подписывается на helios/<deviceId>/{telemetry,status}, форвардит наверх через колбэки.
// Публикует команды в helios/<deviceId>/control.

import mqtt, { type MqttClient } from 'mqtt';
import type { Telemetry, DeviceStatus, ClientToServer } from './types';

const HOST = process.env.MQTT_HOST ?? 'broker.hivemq.com';
const PORT = Number(process.env.MQTT_PORT ?? 1883);
const DEVICE_ID = process.env.DEVICE_ID ?? 'helios-001';

const TOPIC_TELEMETRY = `helios/${DEVICE_ID}/telemetry`;
const TOPIC_STATUS    = `helios/${DEVICE_ID}/status`;
const TOPIC_CONTROL   = `helios/${DEVICE_ID}/control`;

export interface MqttBridgeEvents {
  onTelemetry: (data: Telemetry) => void;
  onStatus: (data: DeviceStatus) => void;
  onBrokerConnect: (connected: boolean) => void;
}

let client: MqttClient | null = null;
let latestTelemetry: Telemetry | null = null;
let latestStatus: DeviceStatus | null = null;
let brokerConnected = false;

export const getLatestTelemetry = () => latestTelemetry;
export const getLatestStatus    = () => latestStatus;
export const isBrokerConnected  = () => brokerConnected;
export const getDeviceId        = () => DEVICE_ID;

export function connectMqtt(events: MqttBridgeEvents): void {
  const clientId = `helios-backend-${Math.random().toString(16).slice(2, 10)}`;
  console.log(`[mqtt] connecting to ${HOST}:${PORT} as ${clientId}`);

  client = mqtt.connect(`mqtt://${HOST}:${PORT}`, {
    clientId,
    clean: true,
    reconnectPeriod: 2000,
    connectTimeout: 10_000,
  });

  client.on('connect', () => {
    brokerConnected = true;
    console.log(`[mqtt] connected to ${HOST}`);
    client?.subscribe([TOPIC_TELEMETRY, TOPIC_STATUS], { qos: 0 }, (err) => {
      if (err) console.error('[mqtt] subscribe error:', err);
      else console.log(`[mqtt] subscribed to telemetry + status`);
    });
    events.onBrokerConnect(true);
  });

  client.on('reconnect', () => {
    console.log('[mqtt] reconnecting...');
  });

  client.on('close', () => {
    if (brokerConnected) console.log('[mqtt] connection closed');
    brokerConnected = false;
    events.onBrokerConnect(false);
  });

  client.on('error', (err) => {
    console.error('[mqtt] error:', err.message);
  });

  client.on('message', (topic, payload) => {
    let json: unknown;
    try {
      json = JSON.parse(payload.toString('utf-8'));
    } catch (e) {
      console.error('[mqtt] bad JSON on', topic, ':', e);
      return;
    }
    if (topic === TOPIC_TELEMETRY) {
      latestTelemetry = json as Telemetry;
      events.onTelemetry(latestTelemetry);
    } else if (topic === TOPIC_STATUS) {
      latestStatus = json as DeviceStatus;
      events.onStatus(latestStatus);
    }
  });
}

export function publishControl(cmd: ClientToServer): boolean {
  if (!client || !brokerConnected) {
    console.warn('[mqtt] cannot publish, not connected');
    return false;
  }
  const payload = JSON.stringify(cmd);
  client.publish(TOPIC_CONTROL, payload, { qos: 0, retain: false }, (err) => {
    if (err) console.error('[mqtt] publish error:', err);
  });
  console.log('[mqtt] TX', TOPIC_CONTROL, payload);
  return true;
}
