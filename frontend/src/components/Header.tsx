import { Wifi, WifiOff, Cpu, Radio, Sun } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  wsConnected: boolean;
  brokerConnected: boolean;
  deviceOnline: boolean;
  lastUpdate: number | null;
}

function StatusBadge({
  ok,
  labelOn,
  labelOff,
  Icon,
}: {
  ok: boolean;
  labelOn: string;
  labelOff: string;
  Icon: React.ComponentType<{ size?: number }>;
}) {
  return (
    <div
      className={clsx(
        'flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-medium border transition-colors',
        ok
          ? 'border-good/40 bg-good/10 text-good'
          : 'border-bad/40 bg-bad/10 text-bad',
      )}
    >
      <Icon size={14} />
      <span className="mono uppercase tracking-wide">{ok ? labelOn : labelOff}</span>
    </div>
  );
}

function timeAgo(ts: number | null): string {
  if (!ts) return '—';
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 2) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const m = Math.floor(sec / 60);
  return `${m}m ${sec % 60}s ago`;
}

export default function Header({ wsConnected, brokerConnected, deviceOnline, lastUpdate }: Props) {
  return (
    <header className="border-b border-slate-800/60 bg-panel/40 backdrop-blur sticky top-0 z-20">
      <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-amber-600 flex items-center justify-center shadow-glow-accent">
            <Sun size={18} className="text-bg" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight">
              HELIOS <span className="text-muted font-normal">v2.4</span>
            </h1>
            <p className="text-[11px] text-muted mono">Solar Tracker · helios-001</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-muted mono mr-2">last frame: {timeAgo(lastUpdate)}</span>
          <StatusBadge ok={wsConnected}     labelOn="WS LINK"   labelOff="WS DOWN"   Icon={wsConnected ? Wifi : WifiOff} />
          <StatusBadge ok={brokerConnected} labelOn="BROKER"    labelOff="NO BROKER" Icon={Radio} />
          <StatusBadge ok={deviceOnline}    labelOn="DEVICE"    labelOff="DEV OFF"   Icon={Cpu} />
        </div>
      </div>
    </header>
  );
}
