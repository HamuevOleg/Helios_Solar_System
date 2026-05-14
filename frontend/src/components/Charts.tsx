import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  AreaChart, Area, Legend,
} from 'recharts';
import type { Telemetry } from '../types';

interface Props { history: Telemetry[]; }

const tooltipStyle = {
  background: '#0a0e1a',
  border: '1px solid #1f2937',
  borderRadius: 8,
  fontSize: 12,
};

export default function Charts({ history }: Props) {
  const data = history.map((t, i) => ({
    i,
    tl: t.sensors.tl,
    tr: t.sensors.tr,
    bl: t.sensors.bl,
    br: t.sensors.br,
    voltage: t.power.voltage,
  }));

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-panel/40 border border-slate-800 rounded-xl p-5">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-[11px] uppercase tracking-wider text-muted">LDR sensors</h2>
          <span className="text-[10px] text-muted mono">last {history.length} frames</span>
        </header>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
            <XAxis dataKey="i" hide />
            <YAxis domain={[0, 4095]} tick={{ fontSize: 10, fill: '#64748b' }} stroke="#1f2937" />
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#94a3b8' }} />
            <Legend wrapperStyle={{ fontSize: 11 }} iconType="line" />
            <Line type="monotone" dataKey="tl" stroke="#fb923c" strokeWidth={1.6} dot={false} name="TL" isAnimationActive={false} />
            <Line type="monotone" dataKey="tr" stroke="#f59e0b" strokeWidth={1.6} dot={false} name="TR" isAnimationActive={false} />
            <Line type="monotone" dataKey="bl" stroke="#eab308" strokeWidth={1.6} dot={false} name="BL" isAnimationActive={false} />
            <Line type="monotone" dataKey="br" stroke="#84cc16" strokeWidth={1.6} dot={false} name="BR" isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-panel/40 border border-slate-800 rounded-xl p-5">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-[11px] uppercase tracking-wider text-muted">Power output</h2>
          <span className="text-[10px] text-muted mono">0..5 V scaled</span>
        </header>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="gradV" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#22c55e" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
            <XAxis dataKey="i" hide />
            <YAxis domain={[0, 5]} tick={{ fontSize: 10, fill: '#64748b' }} stroke="#1f2937" />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={{ color: '#94a3b8' }}
              formatter={(v: number | string) => [`${Number(v).toFixed(2)} V`, 'voltage']}
            />
            <Area type="monotone" dataKey="voltage" stroke="#22c55e" strokeWidth={2} fill="url(#gradV)" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
