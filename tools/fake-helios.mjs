// Fake HELIOS firmware simulator. Pretends to be the ESP32 trekker:
// publishes telemetry + status, listens to control commands.
// Used for the Docker demo so the UI works without Wokwi running.

import mqtt from 'mqtt';

const HOST       = process.env.MQTT_HOST ?? 'broker.hivemq.com';
const PORT       = Number(process.env.MQTT_PORT ?? 1883);
const DEVICE_ID  = process.env.DEVICE_ID ?? 'helios-001';
const PUB_PERIOD = Number(process.env.PUB_PERIOD_MS ?? 500);

const T_TELEMETRY = `helios/${DEVICE_ID}/telemetry`;
const T_STATUS    = `helios/${DEVICE_ID}/status`;
const T_CONTROL   = `helios/${DEVICE_ID}/control`;

// ── Internal state mirroring real firmware
const state = {
  mode: 'AUTO',                 // AUTO | MANUAL | PARKED
  currentAz: 90, currentEl: 45,
  targetAz: 90,  targetEl: 45,
  ledBrightness: 0,
  deadzone: 30,
};

// Virtual sun moving across the sky in a sine pattern (full sweep ~ 2 min).
let bootMs = Date.now();
function virtualSun() {
  const t = (Date.now() - bootMs) / 1000; // seconds
  const phase = (t / 120) * Math.PI * 2;  // one full cycle / 2 minutes
  // azimuth: 0..180, elevation: 5..85
  const sunAz = 90 + Math.sin(phase) * 75;
  const sunEl = 45 + Math.cos(phase * 0.7) * 35;
  return { sunAz, sunEl };
}

// Simulated LDR matrix: brightness on each corner depends on angle to sun.
function ldrFromSun(sunAz, sunEl, viewAz, viewEl) {
  // Convert angles to vectors
  const a2r = (d) => (d * Math.PI) / 180;
  const sunVec  = [Math.cos(a2r(sunEl)) * Math.cos(a2r(sunAz)),
                   Math.cos(a2r(sunEl)) * Math.sin(a2r(sunAz)),
                   Math.sin(a2r(sunEl))];
  const viewVec = [Math.cos(a2r(viewEl)) * Math.cos(a2r(viewAz)),
                   Math.cos(a2r(viewEl)) * Math.sin(a2r(viewAz)),
                   Math.sin(a2r(viewEl))];
  const dot = sunVec[0]*viewVec[0] + sunVec[1]*viewVec[1] + sunVec[2]*viewVec[2];
  return Math.max(0, dot); // 0..1
}

function tick() {
  const { sunAz, sunEl } = virtualSun();

  // In AUTO mode, the tracker chases the sun (with some lag).
  if (state.mode === 'AUTO') {
    state.targetAz = sunAz;
    state.targetEl = sunEl;
    state.currentAz += (state.targetAz - state.currentAz) * 0.08;
    state.currentEl += (state.targetEl - state.currentEl) * 0.08;
  } else if (state.mode === 'PARKED') {
    state.targetAz = 90;
    state.targetEl = 5;
    state.currentAz += (state.targetAz - state.currentAz) * 0.04;
    state.currentEl += (state.targetEl - state.currentEl) * 0.04;
  }
  // MANUAL — target already set by command, just slew towards it
  if (state.mode === 'MANUAL') {
    state.currentAz += (state.targetAz - state.currentAz) * 0.10;
    state.currentEl += (state.targetEl - state.currentEl) * 0.10;
  }

  // LDR matrix: 4 corner sensors. Each sees slightly different angle.
  const k = 4095;
  const tl = ldrFromSun(sunAz, sunEl, state.currentAz - 10, state.currentEl + 10) * k * 0.95;
  const tr = ldrFromSun(sunAz, sunEl, state.currentAz + 10, state.currentEl + 10) * k * 0.95;
  const bl = ldrFromSun(sunAz, sunEl, state.currentAz - 10, state.currentEl - 10) * k * 0.95;
  const br = ldrFromSun(sunAz, sunEl, state.currentAz + 10, state.currentEl - 10) * k * 0.95;
  // small noise
  const n = () => (Math.random() - 0.5) * 60;
  const sensors = {
    tl: Math.round(tl + n()),
    tr: Math.round(tr + n()),
    bl: Math.round(bl + n()),
    br: Math.round(br + n()),
  };

  const diff = {
    vertical:   (sensors.tl + sensors.tr) - (sensors.bl + sensors.br),
    horizontal: (sensors.tr + sensors.br) - (sensors.tl + sensors.bl),
  };

  // Solar voltage proportional to mean LDR + bit of noise
  const avg = (sensors.tl + sensors.tr + sensors.bl + sensors.br) / 4;
  const raw = Math.max(0, Math.min(4095, Math.round(avg + (Math.random() - 0.5) * 80)));

  // LED brightness — how well aligned the tracker is (sum of LDRs)
  state.ledBrightness = Math.round(Math.min(255, avg / 16));

  const telemetry = {
    ts: Date.now() - bootMs,
    mode: state.mode,
    sensors,
    diff,
    servo: {
      az: Math.round(state.currentAz),
      el: Math.round(state.currentEl),
      targetAz: Math.round(state.targetAz),
      targetEl: Math.round(state.targetEl),
    },
    power: {
      voltage: +(raw / 4095 * 5).toFixed(2),
      ledBrightness: state.ledBrightness,
      raw,
    },
    deadzone: state.deadzone,
  };

  client.publish(T_TELEMETRY, JSON.stringify(telemetry), { qos: 0 });
}

// ── MQTT client (with LWT)
const client = mqtt.connect(`mqtt://${HOST}:${PORT}`, {
  clientId: 'fake-helios-' + Math.random().toString(16).slice(2, 10),
  reconnectPeriod: 2000,
  connectTimeout: 10_000,
  will: { topic: T_STATUS, payload: JSON.stringify({ online: false }), qos: 0, retain: true },
});

client.on('connect', () => {
  console.log(`[fake-helios] connected to ${HOST}:${PORT}, device=${DEVICE_ID}`);
  client.subscribe(T_CONTROL, { qos: 0 });
  client.publish(T_STATUS, JSON.stringify({ online: true }), { retain: true });
  setInterval(tick, PUB_PERIOD);
});

client.on('message', (topic, payload) => {
  if (topic !== T_CONTROL) return;
  let cmd;
  try { cmd = JSON.parse(payload.toString()); }
  catch { return; }

  switch (cmd.cmd) {
    case 'setMode':
      if (['AUTO', 'MANUAL', 'PARKED'].includes(cmd.value)) {
        state.mode = cmd.value;
        console.log(`[fake-helios] setMode → ${cmd.value}`);
      }
      break;
    case 'setServo':
      if (typeof cmd.az === 'number') state.targetAz = Math.max(0, Math.min(180, cmd.az));
      if (typeof cmd.el === 'number') state.targetEl = Math.max(0, Math.min(90,  cmd.el));
      // setting target manually implies MANUAL mode (mirrors firmware)
      if (state.mode !== 'MANUAL') state.mode = 'MANUAL';
      console.log(`[fake-helios] setServo az=${state.targetAz} el=${state.targetEl}`);
      break;
    case 'setDeadzone':
      if (typeof cmd.value === 'number') state.deadzone = Math.max(0, Math.min(500, cmd.value));
      console.log(`[fake-helios] setDeadzone → ${state.deadzone}`);
      break;
  }
});

client.on('error', (err) => console.error('[fake-helios] error:', err.message));

function shutdown() {
  console.log('[fake-helios] shutting down');
  try { client.publish(T_STATUS, JSON.stringify({ online: false }), { retain: true }); } catch {}
  setTimeout(() => { client.end(false, () => process.exit(0)); }, 200);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
