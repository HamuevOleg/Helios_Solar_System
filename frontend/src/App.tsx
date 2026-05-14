import { useHeliosSocket } from './hooks/useHeliosSocket';
import Header from './components/Header';
import SensorCards from './components/SensorCards';
import Tracker3D from './components/Tracker3D';
import Charts from './components/Charts';
import ControlPanel from './components/ControlPanel';
import EmptyState from './components/EmptyState';

export default function App() {
  const state = useHeliosSocket();
  const hasData = state.telemetry !== null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        wsConnected={state.wsConnected}
        brokerConnected={state.brokerConnected}
        deviceOnline={state.deviceOnline}
        lastUpdate={state.lastUpdate}
      />

      <main className="flex-1 px-4 lg:px-8 py-6 max-w-[1600px] mx-auto w-full">
        {!hasData ? (
          <EmptyState
            wsConnected={state.wsConnected}
            brokerConnected={state.brokerConnected}
            deviceOnline={state.deviceOnline}
          />
        ) : (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 xl:col-span-8 flex flex-col gap-6">
              <Tracker3D telemetry={state.telemetry} />
              <Charts history={state.history} />
            </div>
            <div className="col-span-12 xl:col-span-4 flex flex-col gap-6">
              <SensorCards telemetry={state.telemetry} />
              <ControlPanel telemetry={state.telemetry} onSend={state.sendCommand} />
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800/60 px-6 py-3 text-[11px] text-muted flex justify-between">
        <span>HELIOS v2.4 · helios-001</span>
        <span className="mono">broker.hivemq.com:1883</span>
      </footer>
    </div>
  );
}
