// useHeliosSocket — единая точка для WS-соединения с бэком.
// Хранит последнее состояние, копит историю телеметрии для графиков, шлёт команды.

import { useEffect, useRef, useState, useCallback } from 'react';
import type {
  Telemetry,
  DeviceStatus,
  ServerToClient,
  ClientToServer,
} from '../types';

const HISTORY_SIZE = 120; // ~60 секунд при 500 мс между телеметриями

function getWsUrl(): string {
  if (typeof window === 'undefined') return '';
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // В dev Vite проксирует /ws → ws://localhost:8787, в prod тоже /ws.
  return `${proto}//${window.location.host}/ws`;
}

export interface HeliosState {
  wsConnected: boolean;
  brokerConnected: boolean;
  deviceOnline: boolean;
  telemetry: Telemetry | null;
  history: Telemetry[];
  lastUpdate: number | null;
  sendCommand: (cmd: ClientToServer) => void;
}

export function useHeliosSocket(): HeliosState {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  const [wsConnected, setWsConnected]         = useState(false);
  const [brokerConnected, setBrokerConnected] = useState(false);
  const [deviceOnline, setDeviceOnline]       = useState(false);
  const [telemetry, setTelemetry]             = useState<Telemetry | null>(null);
  const [history, setHistory]                 = useState<Telemetry[]>([]);
  const [lastUpdate, setLastUpdate]           = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      const url = getWsUrl();
      if (!url) return;

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled) return;
        setWsConnected(true);
      };

      ws.onclose = () => {
        setWsConnected(false);
        setBrokerConnected(false);
        setDeviceOnline(false);
        if (!cancelled) {
          reconnectTimerRef.current = window.setTimeout(connect, 2000);
        }
      };

      ws.onerror = () => {
        // close сработает следом, тут молчим
      };

      ws.onmessage = (e) => {
        let msg: ServerToClient;
        try {
          msg = JSON.parse(e.data);
        } catch {
          return;
        }

        switch (msg.type) {
          case 'telemetry':
            setTelemetry(msg.data);
            setLastUpdate(Date.now());
            setHistory((h) => {
              const next = h.length >= HISTORY_SIZE ? h.slice(1) : h.slice();
              next.push(msg.data);
              return next;
            });
            break;
          case 'status':
            setDeviceOnline(msg.data.online);
            break;
          case 'broker':
            setBrokerConnected(msg.connected);
            break;
          case 'snapshot':
            setBrokerConnected(msg.brokerConnected);
            if (msg.status) setDeviceOnline(msg.status.online);
            if (msg.telemetry) {
              setTelemetry(msg.telemetry);
              setLastUpdate(Date.now());
            }
            break;
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, []);

  const sendCommand = useCallback((cmd: ClientToServer) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn('[ws] cannot send, socket not open', cmd);
      return;
    }
    ws.send(JSON.stringify(cmd));
  }, []);

  return {
    wsConnected,
    brokerConnected,
    deviceOnline,
    telemetry,
    history,
    lastUpdate,
    sendCommand,
  };
}
