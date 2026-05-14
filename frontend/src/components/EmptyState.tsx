import { Loader2 } from 'lucide-react';

interface Props {
  wsConnected: boolean;
  brokerConnected: boolean;
  deviceOnline: boolean;
}

export default function EmptyState({ wsConnected, brokerConnected, deviceOnline }: Props) {
  const stage = !wsConnected
    ? 'connecting to backend...'
    : !brokerConnected
      ? 'backend is up, but MQTT broker not connected...'
      : !deviceOnline
        ? 'broker connected — waiting for device telemetry...'
        : 'receiving first frame...';

  const steps = [
    { ok: wsConnected,     label: 'WebSocket to backend' },
    { ok: brokerConnected, label: 'MQTT broker (HiveMQ public)' },
    { ok: deviceOnline,    label: 'ESP32 status:online' },
  ];

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6">
      <div className="flex items-center gap-3">
        <Loader2 className="text-accent animate-spin" size={28} />
        <span className="mono text-sm text-muted">{stage}</span>
      </div>
      <div className="space-y-2 w-full max-w-md">
        {steps.map((s, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-slate-800 bg-panel/30"
          >
            <span
              className={`w-2 h-2 rounded-full ${s.ok ? 'bg-good shadow-[0_0_8px_#22c55e]' : 'bg-slate-600'}`}
            />
            <span className="text-sm flex-1">{s.label}</span>
            <span className={`text-[11px] mono uppercase ${s.ok ? 'text-good' : 'text-muted'}`}>
              {s.ok ? 'ok' : 'waiting'}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted max-w-md text-center mt-2">
        Запусти симуляцию в Wokwi (вкладка с этим проектом), и данные подтянутся через MQTT-брокер автоматически.
      </p>
    </div>
  );
}
