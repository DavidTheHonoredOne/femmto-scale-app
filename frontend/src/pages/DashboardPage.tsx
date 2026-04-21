import React, { useEffect, useState, useMemo } from 'react';
import Select from 'react-select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  getProfiles,
  getMeasurementsByProfile,
  getPerformanceByProfile,
  type Profile,
  type MeasurementResponse,
  type PerformanceRecord
} from '../services/api';
import { evaluateMetric } from '../utils/healthRanges';
import { HealthProgressBar } from '../components/common/HealthProgressBar';

const METRICS_OPTIONS = [
  { value: 'peso_kg', label: 'Peso (kg)' },
  { value: 'imc', label: 'IMC' },
  { value: 'grasa_corporal_pct', label: 'Grasa Corporal (%)' },
  { value: 'masa_muscular_kg', label: 'Masa Muscular (kg)' },
  { value: 'agua_corporal_pct', label: 'Agua Corporal (%)' },
  { value: 'bmr_kcal', label: 'BMR (kcal)' },
  { value: 'edad_corporal', label: 'Edad Corporal' },
  { value: 'peso_estandar_kg', label: 'Peso Estándar (kg)' },
  { value: 'grasa_visceral', label: 'Grasa Visceral' }
];

const PERFORMANCE_OPTIONS = [
  { value: 'remate', label: 'Remate (cm)', color: '#EF5350' },
  { value: 'bloqueo', label: 'Bloqueo (cm)', color: '#4CAF82' },
  { value: 'envergadura', label: 'Envergadura (cm)', color: '#2196B5' }
];

export const DashboardPage: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  
  const [measurements, setMeasurements] = useState<MeasurementResponse[]>([]);
  const [performance, setPerformance] = useState<PerformanceRecord[]>([]);
  
  const [selectedMetric, setSelectedMetric] = useState(METRICS_OPTIONS[0]);
  const [selectedPerfMetric, setSelectedPerfMetric] = useState(PERFORMANCE_OPTIONS[0]);
  
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedProfile) {
      fetchDataForProfile(selectedProfile.id);
    } else {
      setMeasurements([]);
      setPerformance([]);
    }
  }, [selectedProfile]);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const data = await getProfiles();
      setProfiles(data);
      if (data.length > 0) {
        setSelectedProfile(data[0]);
      }
    } catch (error) {
      console.error('Error fetching profiles', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDataForProfile = async (id: number) => {
    try {
      // Usamos Promise.allSettled para que no falle todo si uno falla
      const [measRes, perfRes] = await Promise.allSettled([
        getMeasurementsByProfile(id),
        getPerformanceByProfile(id)
      ]);

      if (measRes.status === 'fulfilled') {
        // La API los devuelve ordenados descendentes, hacemos reverse para chart temporal
        setMeasurements([...measRes.value].reverse());
      } else {
        setMeasurements([]);
      }

      if (perfRes.status === 'fulfilled') {
        setPerformance([...perfRes.value].reverse());
      } else {
        setPerformance([]);
      }
    } catch (error) {
      console.error('Error fetching profile data', error);
    }
  };

  const profileOptions = profiles.map(p => ({ value: p.id, label: p.nombre, profile: p }));

  const chartData = useMemo(() => {
    return measurements.map(m => {
      const dateObj = new Date(m.created_at);
      const dateStr = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
      return {
        date: dateStr,
        [selectedMetric.value]: m[selectedMetric.value as keyof MeasurementResponse] || 0
      };
    });
  }, [measurements, selectedMetric]);

  const perfChartData = useMemo(() => {
    return performance.map(p => {
      const dateObj = new Date(p.created_at);
      const dateStr = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
      return {
        date: dateStr,
        [selectedPerfMetric.value]: p[selectedPerfMetric.value as keyof PerformanceRecord] || 0
      };
    });
  }, [performance, selectedPerfMetric]);

  const currentVal = measurements.length > 0 ? (measurements[measurements.length - 1][selectedMetric.value as keyof MeasurementResponse] as number || 0) : 0;
  const currentPerfVal = performance.length > 0 ? (performance[performance.length - 1][selectedPerfMetric.value as keyof PerformanceRecord] as number || null) : null;
  
  // Lógica KPI: Fechas y Días
  const latestDate = measurements.length > 0 ? new Date(measurements[measurements.length - 1].created_at) : null;
  const daysSince = latestDate 
    ? Math.floor((new Date().getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Lógica Salud BIA
  const evaluation = selectedProfile ? evaluateMetric(selectedMetric.value, currentVal, selectedProfile) : null;

  return (
    <div className="animate-fade-in pb-20">
      <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1A2B3C] mb-2">Dashboard Saludable</h1>
          <p className="text-[#64748B]">Monitorea las métricas del perfil global activo.</p>
        </div>

        {/* Global Profile Selector */}
        <div className="w-full md:w-72 z-50 relative">
          <Select
            className="react-select-container text-sm shadow-sm"
            options={profileOptions}
            value={profileOptions.find(o => o.value === selectedProfile?.id)}
            onChange={(opt) => setSelectedProfile(opt?.profile || null)}
            placeholder="Seleccionar perfil activo..."
          />
        </div>
      </header>

      {/* KPI Cards Row (Corrección 1) */}
      <div className="grid grid-cols-1 md:flex md:flex-row gap-6 mb-8">
        <div className="flex-1 bg-white rounded-2xl p-6 shadow-sm border border-[#E8EDF2] flex items-center gap-4 card-hover-fx">
          <div className="w-14 h-14 rounded-full flex items-center justify-center bg-[#4CAF82]/10 text-[#4CAF82]">
            <i className="fa-solid fa-id-card text-2xl"></i>
          </div>
          <div>
            <p className="text-sm font-bold text-[#64748B] mb-1">Perfil Activo</p>
            <p className="text-xl font-bold text-[#1A2B3C]">{selectedProfile ? selectedProfile.nombre : 'Ninguno'}</p>
            {selectedProfile && (
              <p className="text-xs text-[#64748B] mt-0.5">{selectedProfile.edad} años, {selectedProfile.estatura_cm} cm</p>
            )}
          </div>
        </div>

        <div className="flex-1 bg-white rounded-2xl p-6 shadow-sm border border-[#E8EDF2] flex items-center gap-4 card-hover-fx">
          <div className="w-14 h-14 rounded-full flex items-center justify-center bg-[#2196B5]/10 text-[#2196B5]">
            <i className="fa-regular fa-calendar-check text-2xl"></i>
          </div>
          <div>
            <p className="text-sm font-bold text-[#64748B] mb-1">Última Medición</p>
            <p className="text-xl font-bold text-[#1A2B3C]">{latestDate ? latestDate.toLocaleDateString() : 'Sin datos'}</p>
          </div>
        </div>

        <div className="flex-1 bg-white rounded-2xl p-6 shadow-sm border border-[#E8EDF2] flex items-center gap-4 card-hover-fx">
          <div className="w-14 h-14 rounded-full flex items-center justify-center bg-indigo-100 text-indigo-500">
            <i className="fa-solid fa-clock-rotate-left text-2xl"></i>
          </div>
          <div>
            <p className="text-sm font-bold text-[#64748B] mb-1">Días Transcurridos</p>
            <p className="text-xl font-bold text-[#1A2B3C]">
              {daysSince !== null ? (daysSince === 0 ? 'Hoy' : `${daysSince} días`) : '--'}
            </p>
          </div>
        </div>
      </div>

      {/* TENDENCIA BIA (Métricas Corporales) */}
      <h2 className="text-xl font-bold text-[#1A2B3C] mb-4">Tendencia Histórica: Composición Corporal</h2>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative z-30 mb-10">
        <div className="lg:col-span-3 bg-white rounded-2xl p-6 shadow-sm border border-[#E8EDF2] flex flex-col">
          <div className="flex justify-end mb-6">
            <div className="w-full sm:w-56 z-20">
              <Select
                className="w-full react-select-container text-sm"
                options={METRICS_OPTIONS}
                value={selectedMetric}
                onChange={(opt) => setSelectedMetric(opt || METRICS_OPTIONS[0])}
                isSearchable={false}
              />
            </div>
          </div>

          <div className="w-full mt-4" style={{ minHeight: 250, width: '100%' }}>
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-gray-400">
                <i className="fa-solid fa-spinner fa-spin text-2xl"></i>
              </div>
            ) : measurements.length < 2 ? (
              <div className="h-full flex flex-col items-center justify-center text-[#64748B]">
                <i className="fa-solid fa-chart-area text-4xl mb-3 opacity-20"></i>
                <p>Insuficientes mediciones para graficar tendencias BIA.</p>
              </div>
            ) : (
              <div style={{ width: '100%', minHeight: '250px' }}>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8EDF2" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} dx={-10} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey={selectedMetric.value} 
                      stroke="#4CAF82" 
                      strokeWidth={3}
                      dot={{ fill: '#4CAF82', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Side Detail Panel BIA */}
        <div className="bg-white rounded-2xl p-6 border border-[#E8EDF2] flex flex-col items-center text-center relative overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#4CAF82] to-[#2196B5]"></div>
          
          <h3 className="text-[#64748B] font-bold uppercase tracking-wider text-xs mb-2 mt-2">{selectedMetric.label} Actual</h3>
          <div className="text-4xl font-bold text-[#1A2B3C] font-mono-num mb-2">
            {measurements.length > 0 ? Number(currentVal).toFixed(1) : '--'}
          </div>

          {evaluation && (
            <HealthProgressBar evaluation={evaluation} />
          )}

          {!evaluation && measurements.length > 0 && (
            <div className="mt-4 text-sm text-[#64748B] bg-[#F8FAFB] p-3 rounded-xl border border-[#E8EDF2] w-full">
              No hay parámetros de salud disponibles para analizar esta métrica.
            </div>
          )}

          {measurements.length === 0 && (
            <div className="mt-6 flex flex-col items-center justify-center text-[#64748B] opacity-50">
              <i className="fa-solid fa-weight-scale text-3xl mb-2"></i>
              <p className="text-sm font-medium">Súbete a la báscula para comenzar a medir tu progreso.</p>
            </div>
          )}
        </div>
      </div>

      {/* TENDENCIA RENDIMIENTO DEPORTIVO */}
      <h2 className="text-xl font-bold text-[#1A2B3C] mb-4">Tendencia Histórica: Rendimiento Deportivo</h2>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative z-20">
        <div className="lg:col-span-3 bg-white rounded-2xl p-6 shadow-sm border border-[#E8EDF2] flex flex-col">
          <div className="flex justify-end mb-6">
            <div className="w-full sm:w-56 z-20">
              <Select
                className="w-full react-select-container text-sm"
                options={PERFORMANCE_OPTIONS}
                value={selectedPerfMetric}
                onChange={(opt) => setSelectedPerfMetric(opt || PERFORMANCE_OPTIONS[0])}
                isSearchable={false}
              />
            </div>
          </div>

          <div className="w-full mt-4" style={{ minHeight: 250, width: '100%' }}>
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-gray-400">
                <i className="fa-solid fa-spinner fa-spin text-2xl"></i>
              </div>
            ) : performance.length < 2 ? (
              <div className="h-full flex flex-col items-center justify-center text-[#64748B]">
                <i className="fa-solid fa-ranking-star text-4xl mb-3 opacity-20"></i>
                <p>Insuficientes registros para graficar rendimiento.</p>
                <span className="text-xs text-[#CBD5E1] mt-1">Ve a Alcance y Bloqueo para agregar registros históricos.</span>
              </div>
            ) : (
              <div style={{ width: '100%', minHeight: '250px' }}>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={perfChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8EDF2" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} dx={-10} domain={['auto', 'auto']} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey={selectedPerfMetric.value} 
                      stroke={selectedPerfMetric.color} 
                      strokeWidth={3}
                      dot={{ fill: selectedPerfMetric.color, strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                      connectNulls={true}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Side Detail Panel Rendimiento */}
        <div className="bg-white rounded-2xl p-6 border border-[#E8EDF2] flex flex-col items-center text-center relative overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 w-full h-1.5" style={{ backgroundColor: selectedPerfMetric.color }}></div>
          
          <div className="w-16 h-16 rounded-full flex items-center justify-center mt-4 mb-3" style={{ backgroundColor: `${selectedPerfMetric.color}15`, color: selectedPerfMetric.color }}>
            <i className="fa-solid fa-ranking-star text-2xl"></i>
          </div>

          <h3 className="text-[#64748B] font-bold uppercase tracking-wider text-xs mb-2">{selectedPerfMetric.label} Actual</h3>
          <div className="text-4xl font-bold text-[#1A2B3C] font-mono-num mb-2">
            {currentPerfVal != null ? Number(currentPerfVal).toFixed(1) : '--'}
          </div>

          <p className="text-xs text-[#64748B] mt-auto">
            Actualizar registros desde <br/>la página Alcance y Bloqueo.
          </p>
        </div>
      </div>
    </div>
  );
};
