import React, { useState, useRef, useCallback } from 'react';
import { decodePacket, type DecodedPacket } from '../utils/bleDecoder';
import { calculateMetrics, type UserProfile, type BodyMetrics, type Gender } from '../utils/bodyMetrics';

// ── BLE UUIDs ────────────────────────────────────────────────────────────────
const SERVICE_UUID  = '0000ffb0-0000-1000-8000-00805f9b34fb';
const CHAR_NOTIFY   = '0000ffb2-0000-1000-8000-00805f9b34fb';
const CHAR_WRITE    = '0000ffb1-0000-1000-8000-00805f9b34fb';
const WAKE_COMMANDS = [
  new Uint8Array([0xFD, 0x15, 0x01]),
  new Uint8Array([0x10, 0x00]),
];

// ── Types ────────────────────────────────────────────────────────────────────
type ConnectionState = 'idle' | 'connecting' | 'measuring' | 'stable' | 'done' | 'error';

interface FormState { age: string; height: string; gender: Gender; }

// ── Sub-components ───────────────────────────────────────────────────────────
function MetricCard({ label, value, unit, color = 'cyan' }: {
  label: string; value: string | number; unit?: string; color?: string;
}) {
  const colorMap: Record<string, string> = {
    cyan:   'from-cyan-500/20 to-blue-500/10 border-cyan-500/20',
    violet: 'from-violet-500/20 to-purple-500/10 border-violet-500/20',
    green:  'from-emerald-500/20 to-teal-500/10 border-emerald-500/20',
    amber:  'from-amber-500/20 to-orange-500/10 border-amber-500/20',
    rose:   'from-rose-500/20 to-pink-500/10 border-rose-500/20',
    blue:   'from-blue-500/20 to-indigo-500/10 border-blue-500/20',
  };

  return (
    <div className={`metric-card glass-card bg-gradient-to-br ${colorMap[color] ?? colorMap.cyan} p-4 flex flex-col gap-1`}>
      <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</span>
      <div className="flex items-end gap-1 mt-1">
        <span className="font-mono-num text-2xl font-semibold text-white leading-none">{value}</span>
        {unit && <span className="text-sm text-slate-400 mb-0.5">{unit}</span>}
      </div>
    </div>
  );
}

function WeightRing({ weightKg, state }: { weightKg: number; state: ConnectionState }) {
  const ringClass =
    state === 'stable' || state === 'done' ? 'ring-stable border-emerald-400/60' :
    state === 'measuring'                  ? 'ring-measuring border-cyan-400/60' :
                                             'border-slate-700/50';

  const color =
    state === 'stable' || state === 'done' ? 'text-emerald-400' :
    state === 'measuring'                  ? 'text-cyan-400' :
                                             'text-slate-500';

  return (
    <div className={`relative w-52 h-52 rounded-full border-4 flex items-center justify-center ${ringClass} transition-all duration-700`}>
      <div className="text-center">
        <div className={`font-mono-num text-5xl font-bold ${color} transition-colors duration-500`}>
          {weightKg > 0 ? weightKg.toFixed(2) : '—'}
        </div>
        <div className="text-slate-400 text-sm mt-1 font-medium">kg</div>
        <div className="text-slate-500 text-xs mt-2">
          {state === 'idle'       && 'Esperando conexión'}
          {state === 'connecting' && '🔵 Conectando...'}
          {state === 'measuring'  && '⚡ Midiendo'}
          {state === 'stable'     && '✅ Peso bloqueado'}
          {state === 'done'       && '✅ Completado'}
          {state === 'error'      && '❌ Error'}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function BluetoothScale() {
  const [form, setForm] = useState<FormState>({ age: '', height: '', gender: 'M' });
  const [connState, setConnState] = useState<ConnectionState>('idle');
  const [currentWeight, setCurrentWeight] = useState(0);
  const [stableWeight, setStableWeight] = useState(0);
  const [metrics, setMetrics] = useState<BodyMetrics | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [log, setLog] = useState<string[]>([]);

  const gattServerRef = useRef<BluetoothRemoteGATTServer | null>(null);
  const stableWeightRef = useRef(0);

  const addLog = (msg: string) =>
    setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 40));

  // ── BLE notification handler ─────────────────────────────────
  const handleNotification = useCallback((event: Event) => {
    const char = event.target as BluetoothRemoteGATTCharacteristic;
    if (!char.value) return;

    const decoded: DecodedPacket = decodePacket(char.value);
    if (!decoded.valid) { addLog(`⚠️ Paquete inválido: ${decoded.error}`); return; }

    if (decoded.state === 'measuring') {
      setConnState('measuring');
      setCurrentWeight(decoded.weightKg);
    } else if (decoded.state === 'stable') {
      setConnState('stable');
      setCurrentWeight(decoded.weightKg);
      setStableWeight(decoded.weightKg);
      stableWeightRef.current = decoded.weightKg;
      setStatusMsg(`🔒 Peso bloqueado: ${decoded.weightKg.toFixed(2)} kg`);
      addLog(`✅ Peso estabilizado: ${decoded.weightKg.toFixed(2)} kg`);
    } else if (decoded.state === 'final') {
      const { impedanceOhms } = decoded;
      addLog(`🧬 Impedancia recibida: ${impedanceOhms} Ω`);

      const profile: UserProfile = {
        weightKg: stableWeightRef.current || decoded.weightKg,
        heightCm: Number(form.height),
        ageYears: Number(form.age),
        gender: form.gender,
      };

      const result = calculateMetrics(profile, impedanceOhms);
      setMetrics(result);
      setConnState('done');
      setStatusMsg('🧬 Composición corporal calculada');
    }
  }, [form]);

  // ── Connect button handler ───────────────────────────────────
  const handleConnect = useCallback(async () => {
    // Validation
    if (!form.age || !form.height) {
      setErrorMsg('Por favor ingresa tu edad y altura antes de conectar.');
      return;
    }
    setErrorMsg('');

    // Browser support check
    if (!navigator.bluetooth) {
      setErrorMsg('❌ Tu navegador no soporta Web Bluetooth API. Usa Chrome o Edge en escritorio.');
      return;
    }

    try {
      setConnState('connecting');
      setStatusMsg('🔵 Buscando báscula...');
      addLog('Iniciando escaneo BLE...');

      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [SERVICE_UUID] }],
        optionalServices: [SERVICE_UUID],
      });

      addLog(`Dispositivo encontrado: ${device.name ?? device.id}`);
      setStatusMsg('🔗 Conectando al servidor GATT...');

      const server = await device.gatt!.connect();
      gattServerRef.current = server;
      addLog('Conectado al servidor GATT');

      const service = await server.getPrimaryService(SERVICE_UUID);
      const notifyChar = await service.getCharacteristic(CHAR_NOTIFY);
      const writeChar  = await service.getCharacteristic(CHAR_WRITE);

      // Subscribe to notifications
      notifyChar.addEventListener('characteristicvaluechanged', handleNotification);
      await notifyChar.startNotifications();
      addLog('✅ Suscrito a notificaciones FFB2');

      // Send wake commands
      for (const cmd of WAKE_COMMANDS) {
        try {
          await writeChar.writeValue(cmd);
          addLog(`📤 Comando enviado: ${Array.from(cmd).map(b => b.toString(16).padStart(2,'0').toUpperCase()).join(' ')}`);
          await new Promise(r => setTimeout(r, 800));
        } catch { /* some commands may be unsupported */ }
      }

      setStatusMsg('⚖️ Suba a la báscula ahora...');
      addLog('Esperando datos de medición...');

      // Disconnect listener
      device.addEventListener('gattserverdisconnected', () => {
        addLog('Dispositivo desconectado');
        if (connState !== 'done') setConnState('error');
      });

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('cancelled') || msg.includes('User cancelled')) {
        setConnState('idle');
        setStatusMsg('');
      } else {
        setConnState('error');
        setErrorMsg(`Error de conexión: ${msg}`);
        addLog(`❌ Error: ${msg}`);
      }
    }
  }, [form, handleNotification, connState]);

  const handleReset = () => {
    gattServerRef.current?.disconnect();
    setConnState('idle');
    setCurrentWeight(0);
    setStableWeight(0);
    setMetrics(null);
    setStatusMsg('');
    setErrorMsg('');
    setLog([]);
  };

  const displayWeight = connState === 'done' ? stableWeight : currentWeight;
  const canConnect = connState === 'idle' || connState === 'error';

  return (
    <div className="min-h-screen bg-mesh flex flex-col">
      {/* ── Header ── */}
      <header className="px-6 py-5 border-b border-white/5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white tracking-tight">
              <span className="text-cyan-400">FEMMTO</span> Scale
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">BCS15 · Web Bluetooth BIA</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              connState === 'idle'       ? 'bg-slate-600' :
              connState === 'connecting' ? 'bg-yellow-400 animate-pulse' :
              connState === 'measuring'  ? 'bg-cyan-400 animate-pulse' :
              connState === 'stable'     ? 'bg-emerald-400 animate-pulse' :
              connState === 'done'       ? 'bg-emerald-400' :
                                          'bg-red-400'
            }`} />
            <span className="text-xs text-slate-400 capitalize">{connState}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 flex flex-col gap-8">

        {/* ── Profile Form ── */}
        <section className="glass-card p-6">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-widest mb-5">
            Perfil del Usuario
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Age */}
            <div className="flex flex-col gap-2">
              <label htmlFor="age-input" className="text-xs text-slate-400 font-medium">Edad (años)</label>
              <input
                id="age-input"
                type="number" min={5} max={120}
                value={form.age}
                onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                placeholder="19"
                disabled={!canConnect}
                className="bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-white text-sm
                           focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30
                           disabled:opacity-50 placeholder:text-slate-600 transition"
              />
            </div>

            {/* Height */}
            <div className="flex flex-col gap-2">
              <label htmlFor="height-input" className="text-xs text-slate-400 font-medium">Altura (cm)</label>
              <input
                id="height-input"
                type="number" min={100} max={250}
                value={form.height}
                onChange={e => setForm(f => ({ ...f, height: e.target.value }))}
                placeholder="170"
                disabled={!canConnect}
                className="bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-white text-sm
                           focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30
                           disabled:opacity-50 placeholder:text-slate-600 transition"
              />
            </div>

            {/* Gender */}
            <div className="flex flex-col gap-2">
              <label htmlFor="gender-select" className="text-xs text-slate-400 font-medium">Género</label>
              <select
                id="gender-select"
                value={form.gender}
                onChange={e => setForm(f => ({ ...f, gender: e.target.value as Gender }))}
                disabled={!canConnect}
                className="bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-white text-sm
                           focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30
                           disabled:opacity-50 transition"
              >
                <option value="M">Hombre</option>
                <option value="F">Mujer</option>
              </select>
            </div>
          </div>

          {errorMsg && (
            <p className="mt-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {errorMsg}
            </p>
          )}
        </section>

        {/* ── Weight Display + Connect ── */}
        <section className="glass-card p-8 flex flex-col items-center gap-6">
          <WeightRing weightKg={displayWeight} state={connState} />

          {statusMsg && (
            <p className="text-sm text-slate-400 text-center">{statusMsg}</p>
          )}

          <div className="flex gap-3">
            {canConnect ? (
              <button
                id="connect-btn"
                onClick={handleConnect}
                className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 active:scale-95
                           text-slate-900 font-semibold px-6 py-2.5 rounded-xl text-sm transition-all duration-150 shadow-lg shadow-cyan-500/20"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
                Conectar Báscula
              </button>
            ) : (
              <button
                id="reset-btn"
                onClick={handleReset}
                className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 active:scale-95
                           text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-all duration-150"
              >
                Nueva Medición
              </button>
            )}
          </div>
        </section>

        {/* ── Metrics Grid ── */}
        {metrics && (
          <section>
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-widest mb-4">
              Composición Corporal
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <MetricCard label="Peso"           value={metrics.weightKg}       unit="kg"   color="cyan"   />
              <MetricCard label="IMC"            value={metrics.bmi}                        color="blue"   />
              <MetricCard label="Grasa Corporal" value={metrics.fatPercent ?? '—'} unit="%" color="rose"   />
              <MetricCard label="Masa Grasa"     value={metrics.fatMassKg ?? '—'}  unit="kg" color="rose"  />
              <MetricCard label="Masa Muscular"  value={metrics.muscleMassKg ?? '—'} unit="kg" color="green" />
              <MetricCard label="Agua Corporal"  value={metrics.waterPercent ?? '—'} unit="%" color="cyan"  />
              <MetricCard label="BMR"            value={metrics.bmrKcal}         unit="kcal" color="amber"  />
              <MetricCard label="Edad Corporal"  value={metrics.bodyAge ?? '—'}  unit="años" color="violet" />
              <MetricCard label="Peso Estándar"  value={metrics.standardWeightKg} unit="kg" color="blue"   />
              <MetricCard label="Impedancia"     value={metrics.impedanceOhms}   unit="Ω"   color="violet" />
            </div>
            {metrics.biaError && (
              <p className="mt-3 text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                ⚠️ No se detectó impedancia — asegúrate de estar descalzo sobre los sensores.
                Solo se muestran métricas base (IMC, BMR, Peso Estándar).
              </p>
            )}
          </section>
        )}

        {/* ── Debug Log ── */}
        {log.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Log BLE</h2>
            <div className="glass-card p-4 max-h-40 overflow-y-auto space-y-1">
              {log.map((line, i) => (
                <p key={i} className="font-mono-num text-xs text-slate-400">{line}</p>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="text-center py-4 text-xs text-slate-600 border-t border-white/5">
        FEMMTO Scale App · Web Bluetooth BIA · Chrome / Edge only
      </footer>
    </div>
  );
}
