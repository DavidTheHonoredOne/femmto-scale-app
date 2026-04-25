/// <reference types="web-bluetooth" />
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { decodePacket, type DecodedPacket } from '../utils/bleDecoder';
import { calculateMetrics, type UserProfile, type BodyMetrics } from '../utils/bodyMetrics';
import { createMeasurement, type Profile } from '../services/api';

const SERVICE_UUID  = '0000ffb0-0000-1000-8000-00805f9b34fb';
const CHAR_NOTIFY   = '0000ffb2-0000-1000-8000-00805f9b34fb';
const CHAR_WRITE    = '0000ffb1-0000-1000-8000-00805f9b34fb';
const WAKE_COMMANDS = [
  new Uint8Array([0xFD, 0x15, 0x01]),
  new Uint8Array([0x10, 0x00]),
];

type ConnectionState = 'idle' | 'connecting' | 'measuring' | 'stable' | 'done' | 'error';

interface BluetoothScaleProps {
  activeProfile: Profile;
  onMeasurementSaved: () => void;
}

export const BluetoothScale: React.FC<BluetoothScaleProps> = ({ activeProfile, onMeasurementSaved }) => {
  const [connState, setConnState] = useState<ConnectionState>('idle');
  const [currentWeight, setCurrentWeight] = useState(0);
  const [stableWeight, setStableWeight] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const gattServerRef = useRef<BluetoothRemoteGATTServer | null>(null);
  const deviceRef = useRef<BluetoothDevice | null>(null);
  const stableWeightRef = useRef(0);
  const isIntentionalDisconnectRef = useRef(false);

  // Auto-Save Management
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNotification = useCallback((event: Event) => {
    const char = event.target as BluetoothRemoteGATTCharacteristic;
    if (!char.value) return;

    const decoded: DecodedPacket = decodePacket(char.value);
    if (!decoded.valid) return;

    if (decoded.state === 'measuring') {
      setConnState('measuring');
      setCurrentWeight(decoded.weightKg);
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    } else if (decoded.state === 'stable') {
      setConnState('stable');
      setCurrentWeight(decoded.weightKg);
      setStableWeight(decoded.weightKg);
      stableWeightRef.current = decoded.weightKg;
      setStatusMsg(`Peso bloqueado: ${decoded.weightKg.toFixed(2)} kg`);
    } else if (decoded.state === 'final') {
      const { impedanceOhms } = decoded;

      const userProfile: UserProfile = {
        weightKg: stableWeightRef.current || decoded.weightKg,
        heightCm: activeProfile.estatura_cm,
        ageYears: activeProfile.edad,
        gender: activeProfile.genero === 'femenino' ? 'F' : 'M',
      };

      const result = calculateMetrics(userProfile, impedanceOhms);
      setConnState('done');
      isIntentionalDisconnectRef.current = true; // Auto-disconnect at end is fine
      setStatusMsg('Composición corporal calculada. Guardando...');
      
      // Delay of 1 second before saving
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => {
        saveMeasurement(result, impedanceOhms);
      }, 1000);
    }
  }, [activeProfile]);

  const saveMeasurement = async (metrics: BodyMetrics, impedance: number) => {
    try {
      setIsSaving(true);
      await createMeasurement({
        profile_id: activeProfile.id,
        peso_kg: metrics.weightKg,
        imc: metrics.bmi,
        grasa_corporal_pct: metrics.fatPercent ?? undefined,
        masa_muscular_kg: metrics.muscleMassKg ?? undefined,
        agua_corporal_pct: metrics.waterPercent ?? undefined,
        bmr_kcal: metrics.bmrKcal ?? undefined,
        edad_corporal: metrics.bodyAge ?? undefined,
        peso_estandar_kg: metrics.standardWeightKg ?? undefined,
        grasa_visceral: metrics.visceralFat ?? undefined,
        impedancia_ohms: impedance !== 0 ? impedance : undefined,
      });
      setStatusMsg('Medición guardada correctamente ✅');
      onMeasurementSaved();
    } catch (err) {
      setErrorMsg('Error al guardar la medición en DB');
      setStatusMsg('Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  // Deep Retry: wraps connect + getPrimaryService + characteristics in a single
  // atomic loop so a GATT-disconnected error during getPrimaryService is caught.
  const connectAndSetupBluetooth = async (device: BluetoothDevice, maxRetries = 3) => {
    let lastErr: unknown;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const server = await device.gatt!.connect();
        // Crucial 500 ms stabilisation before requesting services
        await new Promise(r => setTimeout(r, 500));
        const service     = await server.getPrimaryService(SERVICE_UUID);
        const notifyChar  = await service.getCharacteristic(CHAR_NOTIFY);
        const writeChar   = await service.getCharacteristic(CHAR_WRITE);

        notifyChar.addEventListener('characteristicvaluechanged', handleNotification);
        await notifyChar.startNotifications();

        for (const cmd of WAKE_COMMANDS) {
          try {
            await writeChar.writeValue(cmd);
            await new Promise(r => setTimeout(r, 800));
          } catch {}
        }

        return server; // success
      } catch (err) {
        lastErr = err;
        if (attempt < maxRetries - 1) {
          setStatusMsg(`Conexión inestable, reintentando (${attempt + 1}/${maxRetries})...`);
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }
    throw lastErr;
  };

  const handleConnect = useCallback(async () => {
    if (!navigator.bluetooth) {
      setErrorMsg('Tu navegador no soporta Web Bluetooth API. Usa Chrome o Edge en escritorio.');
      return;
    }

    try {
      isIntentionalDisconnectRef.current = false;
      setConnState('connecting');
      setStatusMsg('Buscando báscula...');
      setErrorMsg('');

      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [SERVICE_UUID] }],
        optionalServices: [SERVICE_UUID],
      });
      deviceRef.current = device;

      setStatusMsg('Conectando al servidor GATT...');
      const server = await connectAndSetupBluetooth(device);
      gattServerRef.current = server;

      setStatusMsg('Suba a la báscula ahora...');

      device.addEventListener('gattserverdisconnected', async () => {
        if (isIntentionalDisconnectRef.current) {
          setConnState('idle');
          return;
        }

        setStatusMsg('Conexión inestable, intentando reconectar... ¡Acércate a la báscula!');
        try {
          const newServer = await connectAndSetupBluetooth(device, 4);
          gattServerRef.current = newServer;
          setStatusMsg('¡Reconectado! Suba a la báscula...');
        } catch (err) {
          setConnState('error');
          setErrorMsg('Pérdida de señal. Acércate más y vuelve a conectar.');
        }
      });

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('cancelled') || msg.includes('User cancelled')) {
        setConnState('idle');
        setStatusMsg('');
      } else {
        setConnState('error');
        setErrorMsg(`Error de conexión: ${msg}`);
      }
    }
  }, [handleNotification]);

  const handleReset = () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    isIntentionalDisconnectRef.current = true;
    gattServerRef.current?.disconnect();
    setConnState('idle');
    setCurrentWeight(0);
    setStableWeight(0);
    setStatusMsg('');
    setErrorMsg('');
    setIsSaving(false);
  };

  const displayWeight = connState === 'done' ? stableWeight : currentWeight;
  const canConnect = connState === 'idle' || connState === 'error';

  // Ring Style logic
  const ringClass =
    connState === 'stable' || connState === 'done' ? 'ring-stable bg-[#4CAF82]/5' :
    connState === 'measuring'                      ? 'ring-measuring bg-[#2196B5]/5' :
                                                     'border-[#E8EDF2] bg-white';

  const color =
    connState === 'stable' || connState === 'done' ? 'text-[#4CAF82]' :
    connState === 'measuring'                      ? 'text-[#2196B5]' :
                                                     'text-[#1A2B3C]';

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      isIntentionalDisconnectRef.current = true;
      gattServerRef.current?.disconnect();
    };
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-[#E8EDF2] p-6 shadow-sm text-center flex flex-col items-center">
      <h3 className="text-sm font-bold text-[#1A2B3C] uppercase tracking-wide mb-6">Medición Bluetooth</h3>

      <div className={`relative w-48 h-48 rounded-full border-[6px] flex items-center justify-center transition-all duration-700 mx-auto mb-6 ${ringClass}`}>
        <div className="text-center mt-2">
          <div className={`font-mono-num text-5xl font-bold ${color} transition-colors duration-500`}>
            {displayWeight > 0 ? displayWeight.toFixed(2) : '—'}
          </div>
          <div className="text-[#64748B] text-sm mt-1 font-medium">kg</div>
        </div>
      </div>

      <div className="min-h-[2rem] text-sm font-medium mb-6">
        {errorMsg ? (
          <span className="text-[#EF4444]"><i className="fa-solid fa-triangle-exclamation mr-1"></i> {errorMsg}</span>
        ) : (
          <span className="text-[#64748B]">{statusMsg || 'Listo para comenzar'}</span>
        )}
      </div>

      <div className="w-full">
        {canConnect ? (
          <button
            onClick={handleConnect}
            className="w-full bg-[#2196B5] hover:bg-[#1D819C] active:bg-[#1A738B] text-white font-semibold py-3 px-4 rounded-xl shadow shadow-[#2196B5]/20 flex justify-center items-center gap-2 transition-all"
          >
            <i className="fa-brands fa-bluetooth-b text-lg"></i>
            Conectar Báscula
          </button>
        ) : (
          <button
            onClick={handleReset}
            disabled={isSaving}
            className="w-full hover:bg-[#F8FAFB] text-[#64748B] border border-[#E8EDF2] font-semibold py-3 px-4 rounded-xl flex justify-center items-center gap-2 transition-all disabled:opacity-50"
          >
            <i className={`fa-solid ${isSaving ? 'fa-spinner fa-spin' : 'fa-rotate-right'}`}></i>
            {isSaving ? 'Guardando...' : 'Reiniciar / Cancelar'}
          </button>
        )}
      </div>
    </div>
  );
};
