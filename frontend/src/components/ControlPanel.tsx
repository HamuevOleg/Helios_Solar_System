import { useEffect, useState, useRef } from 'react';
import clsx from 'clsx';
import type { Telemetry, TrackerMode, ClientToServer } from '../types';

interface Props {
  telemetry: Telemetry | null;
  onSend: (cmd: ClientToServer) => void;
}

const MODES: TrackerMode[] = ['AUTO', 'MANUAL', 'PARKED'];

// Утилита: дросселирование исходящих команд, чтобы не залить брокер слайдером.
function useThrottle<T extends (...args: any[]) => void>(fn: T, intervalMs = 60): T {
  const last = useRef(0);
  const pending = useRef<number | null>(null);
  const lastArgs = useRef<any[] | null>(null);
  return ((...args: any[]) => {
    const now = Date.now();
    lastArgs.current = args;
    if (now - last.current >= intervalMs) {
      last.current = now;
      fn(...args);
    } else if (pending.current === null) {
      const wait = intervalMs - (now - last.current);
      pending.current = window.setTimeout(() => {
        pending.current = null;
        last.current = Date.now();
        if (lastArgs.current) fn(...lastArgs.current);
      }, wait);
    }
  }) as T;
}

export default function ControlPanel({ telemetry, onSend }: Props) {
  const mode: TrackerMode = telemetry?.mode ?? 'AUTO';
  const isManual = mode === 'MANUAL';

  // Локальное состояние слайдеров — оптимистичное обновление, чтобы UI не дёргался.
  const [az, setAz] = useState(90);
  const [el, setEl] = useState(90);
  const [dz, setDz] = useState(50);

  // Когда не в MANUAL — синхронизируем слайдеры с реальным state устройства.
  useEffect(() => {
    if (!telemetry) return;
    if (!isManual) {
      setAz(telemetry.servo.targetAz);
      setEl(telemetry.servo.targetEl);
    }
    setDz(telemetry.deadzone);
  }, [telemetry, isManual]);

  const sendServo = useThrottle((newAz: number, newEl: number) => {
    onSend({ cmd: 'setServo', az: newAz, el: newEl });
  }, 80);

  const sendDeadzone = useThrottle((v: number) => {
    onSend({ cmd: 'setDeadzone', value: v });
  }, 120);

  function setMode(m: TrackerMode) {
    onSend({ cmd: 'setMode', value: m });
  }

  function handleAz(v: number) {
    setAz(v);
    sendServo(v, el);
  }
  function handleEl(v: number) {
    setEl(v);
    sendServo(az, v);
  }
  function handleDz(v: number) {
    setDz(v);
    sendDeadzone(v);
  }

  const modeBadgeColor: Record<TrackerMode, string> = {
    AUTO:   'bg-good text-bg',
    MANUAL: 'bg-accent text-bg',
    PARKED: 'bg-slate-700 text-slate-200',
  };

  return (
    <section className="bg-panel/40 border border-slate-800 rounded-xl p-5">
      <header className="flex items-center justify-between mb-4">
        <h2 className="text-[11px] uppercase tracking-wider text-muted">Control</h2>
        <span className={clsx('px-2 py-0.5 rounded-md text-[10px] mono font-medium', modeBadgeColor[mode])}>
          {mode}
        </span>
      </header>

      <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-lg">
        {MODES.map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={clsx(
              'mono text-[11px] py-2 rounded-md transition-all',
              mode === m
                ? 'bg-accent text-bg shadow-glow-accent'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50',
            )}
          >
            {m}
          </button>
        ))}
      </div>

      <div
        className={clsx(
          'mt-5 space-y-4 transition-opacity',
          !isManual && 'opacity-50 pointer-events-none',
        )}
      >
        <Slider label="Azimuth"   value={az} min={0}  max={180} onChange={handleAz} suffix="°" />
        <Slider label="Elevation" value={el} min={10} max={170} onChange={handleEl} suffix="°" />
        {!isManual && (
          <p className="text-[11px] text-muted italic">
            Switch to MANUAL to drive the servos directly.
          </p>
        )}
      </div>

      <div className="mt-5 pt-5 border-t border-slate-800">
        <Slider
          label="Deadzone"
          value={dz}
          min={0}
          max={500}
          onChange={handleDz}
          hint="higher = tracker ignores small lighting differences"
        />
      </div>
    </section>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  onChange,
  suffix,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  suffix?: string;
  hint?: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1.5">
        <label className="text-muted">{label}</label>
        <span className="mono text-accent">
          {value}
          {suffix ?? ''}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
      <div className="flex justify-between text-[10px] text-muted mono mt-0.5">
        <span>
          {min}
          {suffix ?? ''}
        </span>
        <span>
          {max}
          {suffix ?? ''}
        </span>
      </div>
      {hint && <p className="text-[10px] text-muted mt-1.5 italic">{hint}</p>}
    </div>
  );
}
