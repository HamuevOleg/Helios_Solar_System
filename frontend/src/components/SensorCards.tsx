import type { Telemetry } from '../types';

interface Props { telemetry: Telemetry | null; }

const LDR_MAX = 4095;

function LdrCell({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, Math.max(0, (value / LDR_MAX) * 100));
  return (
    <div className="bg-panel/60 border border-slate-800 rounded-lg p-3">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted">{label}</span>
        <span className="mono text-accent font-medium">{value}</span>
      </div>
      <div className="h-1.5 mt-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-orange-500 to-yellow-300 transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function SensorCards({ telemetry }: Props) {
  const s = telemetry?.sensors ?? { tl: 0, tr: 0, bl: 0, br: 0 };
  const voltage = telemetry?.power.voltage ?? 0;
  const ledBrightness = telemetry?.power.ledBrightness ?? 0;
  const dV = telemetry?.diff.vertical ?? 0;
  const dH = telemetry?.diff.horizontal ?? 0;

  return (
    <section className="bg-panel/40 border border-slate-800 rounded-xl p-5">
      <header className="flex items-center justify-between mb-4">
        <h2 className="text-[11px] uppercase tracking-wider text-muted">Sensors</h2>
        <span className="text-[10px] text-muted mono">12-bit ADC · 0..4095</span>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <LdrCell label="LDR Top-Left"  value={s.tl} />
        <LdrCell label="LDR Top-Right" value={s.tr} />
        <LdrCell label="LDR Bot-Left"  value={s.bl} />
        <LdrCell label="LDR Bot-Right" value={s.br} />
      </div>

      <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] text-muted">Panel output</p>
          <p className="mono text-2xl text-good">
            {voltage.toFixed(2)}
            <span className="text-xs text-muted ml-1">V</span>
          </p>
        </div>
        <div>
          <p className="text-[11px] text-muted">LED indicator</p>
          <p className="mono text-2xl text-amber-400">
            {ledBrightness}
            <span className="text-xs text-muted ml-1">/255</span>
          </p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 gap-3 text-[11px]">
        <div className="flex justify-between bg-slate-900/40 px-3 py-2 rounded">
          <span className="text-muted">ΔV (top–bot)</span>
          <span className={`mono ${dV > 0 ? 'text-accent' : dV < 0 ? 'text-sky-300' : 'text-muted'}`}>{dV >= 0 ? '+' : ''}{dV}</span>
        </div>
        <div className="flex justify-between bg-slate-900/40 px-3 py-2 rounded">
          <span className="text-muted">ΔH (left–right)</span>
          <span className={`mono ${dH > 0 ? 'text-accent' : dH < 0 ? 'text-sky-300' : 'text-muted'}`}>{dH >= 0 ? '+' : ''}{dH}</span>
        </div>
      </div>
    </section>
  );
}
