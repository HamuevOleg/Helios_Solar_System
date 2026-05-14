// Зеркало backend/src/types.ts. Держим вручную в синхроне (или вынесем в shared/ позже).

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

export type ServerToClient =
  | { type: 'telemetry'; data: Telemetry }
  | { type: 'status'; data: DeviceStatus }
  | { type: 'broker'; connected: boolean }
  | { type: 'snapshot'; brokerConnected: boolean; status: DeviceStatus | null; telemetry: Telemetry | null };

export type ClientToServer =
  | { cmd: 'setMode'; value: TrackerMode }
  | { cmd: 'setServo'; az?: number; el?: number }
  | { cmd: 'setDeadzone'; value: number };
