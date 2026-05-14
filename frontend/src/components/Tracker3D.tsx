import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  OrbitControls,
  Environment,
  ContactShadows,
  Float,
  Sky,
  Cloud,
  Clouds,
} from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { Telemetry } from '../types';

interface Props { telemetry: Telemetry | null; }

// 0..180° → радианы относительно нейтрали (90°).
const toRad = (deg: number, neutral = 90) => THREE.MathUtils.degToRad(deg - neutral);

/* ─────────────────────────── PANEL ─────────────────────────── */

const COLS = 6;
const ROWS = 4;
const CELL_GAP = 0.02;
const PANEL_W = 2.0;
const PANEL_H = 1.25;
const PANEL_T = 0.05;

function SolarPanel({ ledBrightness }: { ledBrightness: number }) {
  const cells = useMemo(() => {
    const cellW = (PANEL_W - CELL_GAP * (COLS + 1)) / COLS;
    const cellH = (PANEL_H - CELL_GAP * (ROWS + 1)) / ROWS;
    const x0 = -PANEL_W / 2 + CELL_GAP + cellW / 2;
    const y0 = -PANEL_H / 2 + CELL_GAP + cellH / 2;
    const items: { x: number; y: number; w: number; h: number; k: number }[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        items.push({
          x: x0 + c * (cellW + CELL_GAP),
          y: y0 + r * (cellH + CELL_GAP),
          w: cellW,
          h: cellH,
          k: (r * COLS + c) / (ROWS * COLS),
        });
      }
    }
    return items;
  }, []);

  const tracked = THREE.MathUtils.clamp(ledBrightness / 255, 0, 1);
  const cellEmissive = 0.05 + tracked * 0.15;

  return (
    <group>
      {/* Алюминиевая рамка */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[PANEL_W + 0.08, PANEL_T, PANEL_H + 0.08]} />
        <meshPhysicalMaterial
          color="#e5e7eb"
          metalness={0.95}
          roughness={0.18}
          clearcoat={0.4}
          clearcoatRoughness={0.2}
        />
      </mesh>
      {/* Тёмная подложка панели */}
      <mesh position={[0, PANEL_T / 2 + 0.001, 0]} receiveShadow>
        <boxGeometry args={[PANEL_W, 0.005, PANEL_H]} />
        <meshStandardMaterial color="#0b1220" metalness={0.4} roughness={0.85} />
      </mesh>
      {/* Ячейки */}
      <group position={[0, PANEL_T / 2 + 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        {cells.map((cell, i) => (
          <mesh key={i} position={[cell.x, cell.y, 0]} castShadow>
            <boxGeometry args={[cell.w, cell.h, 0.012]} />
            <meshPhysicalMaterial
              color="#1e3a8a"
              emissive="#1e40af"
              emissiveIntensity={cellEmissive + Math.sin(cell.k * 7) * 0.02}
              metalness={0.5}
              roughness={0.3}
              clearcoat={1}
              clearcoatRoughness={0.06}
              reflectivity={0.7}
            />
          </mesh>
        ))}
        {cells.map((cell, i) => (
          <mesh key={`bus-${i}`} position={[cell.x, cell.y, 0.008]}>
            <boxGeometry args={[cell.w * 0.92, 0.004, 0.001]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.25} />
          </mesh>
        ))}
      </group>
      {/* Стекло */}
      <mesh position={[0, PANEL_T / 2 + 0.022, 0]}>
        <boxGeometry args={[PANEL_W - 0.02, 0.004, PANEL_H - 0.02]} />
        <meshPhysicalMaterial
          color="#f0f9ff"
          transmission={0.9}
          thickness={0.05}
          roughness={0.04}
          metalness={0}
          ior={1.45}
          attenuationColor="#bae6fd"
          attenuationDistance={1.5}
        />
      </mesh>
    </group>
  );
}

/* ─────────────────────────── TRACKER ─────────────────────────── */

function TrackerModel({
  az,
  el,
  ledBrightness,
}: { az: number; el: number; ledBrightness: number }) {
  const azRef = useRef<THREE.Group>(null!);
  const elRef = useRef<THREE.Group>(null!);

  useFrame((_, delta) => {
    // плавнее, чем раньше (3 вместо 6)
    const s = 1 - Math.exp(-delta * 3);
    if (azRef.current) {
      const t = toRad(az);
      azRef.current.rotation.y = THREE.MathUtils.lerp(azRef.current.rotation.y, t, s);
    }
    if (elRef.current) {
      const t = toRad(el);
      elRef.current.rotation.x = THREE.MathUtils.lerp(elRef.current.rotation.x, -t, s);
    }
  });

  return (
    <group position={[0, -1, 0]}>
      {/* Бетонное основание */}
      <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.95, 1.0, 0.1, 64]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.95} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.78, 0.85, 0.16, 64]} />
        <meshStandardMaterial color="#64748b" roughness={0.85} metalness={0.1} />
      </mesh>
      {/* Акцентное кольцо */}
      <mesh position={[0, 0.27, 0]}>
        <torusGeometry args={[0.79, 0.008, 12, 96]} />
        <meshStandardMaterial
          color="#fb923c"
          emissive="#fb923c"
          emissiveIntensity={0.6}
          toneMapped={false}
        />
      </mesh>

      {/* Колонна */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <cylinderGeometry args={[0.085, 0.105, 1.2, 32]} />
        <meshPhysicalMaterial
          color="#e2e8f0"
          metalness={0.92}
          roughness={0.18}
          clearcoat={0.6}
          clearcoatRoughness={0.25}
        />
      </mesh>
      <mesh position={[0, 1.35, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.08, 24]} />
        <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Azimuth */}
      <group ref={azRef} position={[0, 1.55, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.14, 28, 28]} />
          <meshPhysicalMaterial
            color="#e2e8f0"
            metalness={0.95}
            roughness={0.15}
            clearcoat={0.8}
            clearcoatRoughness={0.1}
          />
        </mesh>

        {/* Elevation */}
        <group ref={elRef}>
          <mesh position={[0, 0.16, 0]} castShadow>
            <boxGeometry args={[0.1, 0.32, 0.1]} />
            <meshPhysicalMaterial color="#e2e8f0" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.35, 0]} castShadow>
            <boxGeometry args={[0.5, 0.05, 0.08]} />
            <meshPhysicalMaterial color="#e2e8f0" metalness={0.9} roughness={0.2} />
          </mesh>

          <group position={[0, 0.4, 0]}>
            <SolarPanel ledBrightness={ledBrightness} />
          </group>
        </group>
      </group>
    </group>
  );
}

/* ─────────────────────────── SUN ─────────────────────────── */

// Поставлено так, чтобы в дефолтной камере (5.2, 2.6, 5.2 → 0, 0.9, 0) солнце было
// в верхней части кадра, в пределах frustum.
const SUN_DIR = new THREE.Vector3(-2, 4.5, -1);

function Sun() {
  return (
    <group position={SUN_DIR.toArray()}>
      <Float speed={0.3} floatIntensity={0.15} rotationIntensity={0.0}>
        {/* halo */}
        <mesh renderOrder={2}>
          <sphereGeometry args={[2.0, 32, 32]} />
          <meshBasicMaterial color="#fde68a" transparent opacity={0.08} toneMapped={false} depthWrite={false} depthTest={false} />
        </mesh>
        <mesh renderOrder={3}>
          <sphereGeometry args={[1.3, 32, 32]} />
          <meshBasicMaterial color="#fcd34d" transparent opacity={0.18} toneMapped={false} depthWrite={false} depthTest={false} />
        </mesh>
        <mesh renderOrder={4}>
          <sphereGeometry args={[0.85, 48, 48]} />
          <meshBasicMaterial color="#fef3c7" transparent opacity={0.55} toneMapped={false} depthWrite={false} depthTest={false} />
        </mesh>
        {/* ядро */}
        <mesh renderOrder={5}>
          <sphereGeometry args={[0.55, 64, 64]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} depthTest={false} />
        </mesh>
      </Float>
    </group>
  );
}

/* ─────────────────────────── GRASS FLOOR ─────────────────────────── */

function GrassFloor() {
  const { colorMap, normalMap } = useMemo(() => {
    // Процедурная травяная текстура — рисуем в canvas, делаем CanvasTexture
    const size = 512;
    const cc = document.createElement('canvas');
    cc.width = cc.height = size;
    const ctx = cc.getContext('2d')!;
    // База — несколько слоёв зелёного градиента
    const grd = ctx.createLinearGradient(0, 0, size, size);
    grd.addColorStop(0, '#4d7a3a');
    grd.addColorStop(0.5, '#5a8e44');
    grd.addColorStop(1, '#3f6b30');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, size, size);
    // Шум — мелкие травинки
    for (let i = 0; i < 18000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const v = Math.random();
      const len = Math.random() * 2 + 0.5;
      const angle = Math.random() * Math.PI;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      if (v < 0.4) ctx.fillStyle = `rgba(28, 70, 28, ${0.3 + Math.random() * 0.4})`;
      else if (v < 0.75) ctx.fillStyle = `rgba(120, 160, 90, ${0.2 + Math.random() * 0.4})`;
      else ctx.fillStyle = `rgba(180, 200, 120, ${0.15 + Math.random() * 0.3})`;
      ctx.fillRect(0, 0, len, 0.7);
      ctx.restore();
    }
    // Пятна тени / мха
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = Math.random() * 20 + 8;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(20, 50, 20, 0.15)');
      g.addColorStop(1, 'rgba(20, 50, 20, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    const tx = new THREE.CanvasTexture(cc);
    tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
    tx.repeat.set(8, 8);
    tx.anisotropy = 8;
    tx.colorSpace = THREE.SRGBColorSpace;

    // Простой normal-map: канвас в серых тонах с белым шумом → bumpmap
    const nc = document.createElement('canvas');
    nc.width = nc.height = size;
    const nctx = nc.getContext('2d')!;
    nctx.fillStyle = '#808080';
    nctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 14000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const lum = 90 + Math.random() * 90;
      nctx.fillStyle = `rgb(${lum},${lum},255)`;
      nctx.fillRect(x, y, 1.3, 1.3);
    }
    const ntx = new THREE.CanvasTexture(nc);
    ntx.wrapS = ntx.wrapT = THREE.RepeatWrapping;
    ntx.repeat.set(8, 8);

    return { colorMap: tx, normalMap: ntx };
  }, []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.0, 0]} receiveShadow>
      <planeGeometry args={[60, 60, 1, 1]} />
      <meshStandardMaterial
        map={colorMap}
        normalMap={normalMap}
        normalScale={new THREE.Vector2(0.6, 0.6)}
        roughness={0.95}
        metalness={0}
        color="#6b8f4d"
      />
    </mesh>
  );
}

/* ─────────────────────────── HUD OVERLAY ─────────────────────────── */

function HudOverlay({
  az, el, targetAz, targetEl, mode,
}: { az: number; el: number; targetAz: number; targetEl: number; mode: string }) {
  const trackingAz = Math.abs(az - targetAz);
  const trackingEl = Math.abs(el - targetEl);
  const locked = trackingAz <= 2 && trackingEl <= 2;
  return (
    <div className="pointer-events-none absolute inset-0 p-4 flex flex-col justify-between text-[10px] font-mono uppercase tracking-[0.18em]">
      <div className="flex justify-between">
        <div className="flex gap-2 items-center rounded-md bg-black/35 backdrop-blur-md px-2.5 py-1 border border-white/10">
          <span className={`h-1.5 w-1.5 rounded-full ${locked ? 'bg-good shadow-glow-good animate-pulse' : 'bg-accent shadow-glow-accent'}`} />
          <span className="text-white">{locked ? 'tracking lock' : 'aligning…'}</span>
        </div>
        <div className="rounded-md bg-black/35 backdrop-blur-md px-2.5 py-1 border border-white/10 text-white">
          mode <span className="text-accent">{mode}</span>
        </div>
      </div>
      <div className="flex justify-between items-end">
        <div className="rounded-md bg-black/30 backdrop-blur-md px-3 py-1.5 border border-white/10">
          <div className="text-[9px] text-slate-200/80">azimuth</div>
          <div className="text-base text-white normal-case font-semibold tracking-normal">
            {az.toFixed(0)}<span className="text-white/60 text-xs">°</span>
            <span className="text-white/50 text-[10px] ml-1.5">→ {targetAz.toFixed(0)}°</span>
          </div>
        </div>
        <div className="rounded-md bg-black/30 backdrop-blur-md px-3 py-1.5 border border-white/10 text-right">
          <div className="text-[9px] text-slate-200/80">elevation</div>
          <div className="text-base text-white normal-case font-semibold tracking-normal">
            {el.toFixed(0)}<span className="text-white/60 text-xs">°</span>
            <span className="text-white/50 text-[10px] ml-1.5">→ {targetEl.toFixed(0)}°</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── SCENE ROOT ─────────────────────────── */

export default function Tracker3D({ telemetry }: Props) {
  const az = telemetry?.servo.az ?? 90;
  const el = telemetry?.servo.el ?? 90;
  const targetAz = telemetry?.servo.targetAz ?? 90;
  const targetEl = telemetry?.servo.targetEl ?? 90;
  const ledBrightness = telemetry?.power.ledBrightness ?? 0;
  const mode = telemetry?.mode ?? 'AUTO';

  return (
    <section className="relative bg-panel/40 border border-slate-800 rounded-xl overflow-hidden shadow-2xl shadow-black/40">
      <header className="px-5 py-3 border-b border-slate-800/80 flex items-center justify-between flex-wrap gap-2 bg-gradient-to-r from-slate-900/60 to-transparent">
        <div>
          <h2 className="text-[11px] uppercase tracking-[0.2em] text-muted">Live 3D model</h2>
          <p className="text-sm mt-0.5 text-slate-300">
            <span className="text-muted">photoreal preview · </span>
            <span className="mono text-[11px] text-slate-400">react-three-fiber</span>
          </p>
        </div>
        <p className="text-[10px] text-muted">drag to orbit · scroll to zoom · right-click to pan</p>
      </header>

      <div className="relative aspect-[16/10] w-full">
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [5.2, 2.6, 5.2], fov: 48 }}
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 0.82,
          }}
        >
          {/* Дневное небо — приглушённое, более серо-голубое */}
          <Sky
            sunPosition={SUN_DIR.toArray()}
            turbidity={10}
            rayleigh={0.6}
            mieCoefficient={0.004}
            mieDirectionalG={0.96}
            distance={450000}
          />

          {/* Туман для глубины */}
          <fog attach="fog" args={['#94a3b8', 22, 65]} />

          {/* Дневное environment даёт мягкие отражения на металле */}
          <Environment preset="city" background={false} environmentIntensity={1.0} />

          {/* Солнце как key-light */}
          <directionalLight
            position={SUN_DIR.toArray()}
            intensity={3.2}
            color="#fff4d6"
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-left={-8}
            shadow-camera-right={8}
            shadow-camera-top={8}
            shadow-camera-bottom={-8}
            shadow-bias={-0.0001}
          />
          {/* Заполняющий ambient — равномерное свечение */}
          <ambientLight intensity={0.6} />
          {/* Голубой fill снизу — небо отражается */}
          <hemisphereLight args={['#bae6fd', '#4a6f2a', 0.8]} />

          {/* Облака — далеко, редкие */}
          <Clouds material={THREE.MeshBasicMaterial} limit={40}>
            <Cloud seed={1} segments={30} bounds={[5, 1, 1.5]} volume={4} color="white" fade={120} position={[-14, 10, -10]} opacity={0.45} />
            <Cloud seed={2} segments={30} bounds={[6, 1, 1.5]} volume={5} color="white" fade={120} position={[14, 11, -8]}  opacity={0.4} />
            <Cloud seed={3} segments={25} bounds={[4, 0.8, 1]} volume={3} color="white" fade={100} position={[-2, 12, -16]} opacity={0.35} />
          </Clouds>

          <GrassFloor />
          <ContactShadows
            position={[0, -0.999, 0]}
            opacity={0.55}
            scale={14}
            blur={3}
            far={4}
            color="#1a3010"
          />

          <TrackerModel az={az} el={el} ledBrightness={ledBrightness} />
          <Sun />

          <OrbitControls
            enableDamping
            dampingFactor={0.06}
            minDistance={3}
            maxDistance={14}
            maxPolarAngle={Math.PI / 2 - 0.05}
            target={[0, 0.9, 0]}
            rotateSpeed={0.7}
            zoomSpeed={0.8}
          />

          <EffectComposer multisampling={4}>
            <Bloom
              intensity={0.45}
              luminanceThreshold={0.92}
              luminanceSmoothing={0.5}
              mipmapBlur
            />
            <Vignette eskil={false} offset={0.25} darkness={0.45} />
          </EffectComposer>
        </Canvas>

        <HudOverlay az={az} el={el} targetAz={targetAz} targetEl={targetEl} mode={mode} />
      </div>
    </section>
  );
}
