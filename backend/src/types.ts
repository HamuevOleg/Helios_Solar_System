// Общие типы для HELIOS-бэкенда.
// Этот же файл (или его аналог) дублируется на фронте — чтобы оба знали одинаковую форму JSON.

export type TrackerMode = 'AUTO' | 'MANUAL' | 'PARKED';

export interface Telemetry {
  ts: number;
  mode: TrackerMode;
  sensors: { tl: number; tr: number; bl: number; br: number };
  diff: { vertical: number; horizontal: number };
  servo: { az: number; el: number; targetAz: number; targetEl: number };
  power: { voltage: number; ledBrightness: number; raw: number };
  deadzone: number;
}

export interface DeviceStatus {
  online: boolean;
}

// Сообщения, которые бэк отправляет на фронт по WebSocket.
export type ServerToClient =
  | { type: 'telemetry'; data: Telemetry }
  | { type: 'status'; data: DeviceStatus }
  | { type: 'broker'; connected: boolean }
  | { type: 'snapshot'; brokerConnected: boolean; status: DeviceStatus | null; telemetry: Telemetry | null };

// Команды, которые фронт отправляет бэку → MQTT → ESP32.
export type ClientToServer =
  | { cmd: 'setMode'; value: TrackerMode }
  | { cmd: 'setServo'; az?: number; el?: number }
  | { cmd: 'setDeadzone'; value: number };
