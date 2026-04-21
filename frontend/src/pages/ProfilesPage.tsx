import React, { useEffect, useState } from 'react';
import Select from 'react-select';
import { getProfiles, getMeasurementsByProfile, deleteProfile, updateProfile, createProfile, type Profile, type ProfileCreate, type MeasurementResponse } from '../services/api';
import { ProfileFormModal } from '../components/profiles/ProfileFormModal';
import { ConfirmDeleteModal } from '../components/common/ConfirmDeleteModal';
import { ExportExcelModal } from '../components/common/ExportExcelModal';
import { BluetoothScale } from '../components/BluetoothScale';
import { evaluateMetric } from '../utils/healthRanges';
import { HealthProgressBar } from '../components/common/HealthProgressBar';

const METRICS_LIST = [
  { key: 'peso_kg', label: 'Peso (kg)' },
  { key: 'imc', label: 'IMC' },
  { key: 'grasa_corporal_pct', label: 'Grasa Corporal (%)' },
  { key: 'masa_muscular_kg', label: 'Masa Muscular (kg)' },
  { key: 'agua_corporal_pct', label: 'Agua Corporal (%)' },
  { key: 'bmr_kcal', label: 'BMR (kcal)' },
  { key: 'edad_corporal', label: 'Edad Corporal' },
  { key: 'peso_estandar_kg', label: 'Peso Estándar (kg)' },
  { key: 'grasa_visceral', label: 'Grasa Visceral' }
];

export const ProfilesPage: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [measurements, setMeasurements] = useState<MeasurementResponse[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  
  // Delete Modal State
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Export Excel Modal
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Accordion State
  const [openAccordionKey, setOpenAccordionKey] = useState<string | null>(null);

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    if (activeProfile) {
      loadMeasurements(activeProfile.id);
      setOpenAccordionKey(null); // Reset accordion on profile switch
    } else {
      setMeasurements([]);
    }
  }, [activeProfile]);

  const fetchProfiles = async () => {
    setIsLoading(true);
    try {
      const data = await getProfiles();
      setProfiles(data);
    } catch (err) {
      console.error('Error al cargar perfiles', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMeasurements = async (id: number) => {
    try {
      const data = await getMeasurementsByProfile(id);
      setMeasurements(data);
    } catch (err) {
      console.error('Error fetching measurements', err);
    }
  };

  const handleModalSubmit = async (profileData: ProfileCreate) => {
    if (editingProfile) {
      const updated = await updateProfile(editingProfile.id, profileData);
      setProfiles(prev => prev.map(p => p.id === updated.id ? updated : p));
      if (activeProfile?.id === updated.id) setActiveProfile(updated);
    } else {
      const newProfile = await createProfile(profileData);
      setProfiles(prev => [...prev, newProfile]);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await deleteProfile(deleteTarget.id);
      setProfiles(prev => prev.filter(p => p.id !== deleteTarget.id));
      if (activeProfile?.id === deleteTarget.id) setActiveProfile(null);
      setDeleteTarget(null);
    } catch (error) {
      alert("Error eliminando el perfil.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditClick = (e: React.MouseEvent, profile: Profile) => {
    e.stopPropagation();
    setEditingProfile(profile);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, profile: Profile) => {
    e.stopPropagation();
    setDeleteTarget(profile);
  };

  // CSV export replaced by ExportExcelModal

  const toggleAccordion = (key: string) => {
    setOpenAccordionKey(prev => prev === key ? null : key);
  };

  const latestM = measurements[0] || null;

  return (
    <div className="animate-fade-in pb-20 flex flex-col xl:flex-row gap-6 relative">
      {/* GRID PRINCIPAL */}
      <div className={`flex-1 transition-all ${activeProfile ? 'xl:mr-[28rem]' : ''}`}>
        <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#1A2B3C] mb-2">Perfiles de Medición</h1>
            <p className="text-[#64748B]">Selecciona un perfil y conecta tu Belu's BIA-8.</p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="bg-[#2196B5] hover:bg-[#1D819C] text-white font-semibold min-h-[44px] px-5 rounded-xl shadow-lg shadow-[#2196B5]/20 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <i className="fa-solid fa-file-excel"></i>
              Exportar Todo
            </button>
            <button
              onClick={() => { setEditingProfile(null); setIsModalOpen(true); }}
              className="bg-[#4CAF82] hover:bg-[#459E75] text-white font-semibold min-h-[44px] px-5 rounded-xl shadow-lg shadow-[#4CAF82]/20 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <i className="fa-solid fa-plus"></i>
              Añadir Perfil
            </button>
          </div>
        </header>

        {/* Global Searcher that maps options directly to Profile list */}
        <div className="mb-8 z-40 relative">
          <Select
            className="w-full md:w-96 react-select-container text-sm shadow-sm"
            options={profiles.map(p => ({ value: p.id, label: p.nombre, profile: p }))}
            onChange={(opt: any) => { if (opt) setActiveProfile(opt.profile); }}
            placeholder="Buscar perfil existente..."
            isClearable
          />
        </div>

        {/* Tarjetas */}
        {isLoading ? (
          <div className="flex justify-center py-20"><i className="fa-solid fa-spinner fa-spin text-3xl text-[#CBD5E1]"></i></div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-[#E8EDF2] rounded-2xl bg-white">
            <h3 className="text-[#1A2B3C] font-semibold text-lg">No hay perfiles</h3>
            <p className="text-[#64748B]">Agrega uno usando el botón superior.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {profiles.map(p => (
              <div 
                key={p.id} 
                onClick={() => setActiveProfile(p)}
                className={`bg-white rounded-2xl p-5 border cursor-pointer card-hover-fx transition-colors group relative overflow-hidden
                  ${activeProfile?.id === p.id ? 'border-[#4CAF82] shadow-sm ring-1 ring-[#4CAF82]' : 'border-[#E8EDF2]'}
                `}
              >
                {activeProfile?.id === p.id && (
                  <div className="absolute top-0 right-0 w-16 h-16 bg-[#4CAF82]/10 rounded-bl-full pointer-events-none">
                    <i className="fa-solid fa-check absolute top-3 right-3 text-[#4CAF82]"></i>
                  </div>
                )}
                
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className="w-12 h-12 bg-[#E8EDF2] text-[#2196B5] rounded-full flex items-center justify-center text-xl font-bold uppercase">
                    {p.nombre.charAt(0)}
                  </div>
                  
                  {/* Acciones */}
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => handleEditClick(e, p)} className="w-9 h-9 rounded-xl bg-[#F8FAFB] text-[#64748B] hover:text-[#2196B5] flex items-center justify-center border border-[#E8EDF2]">
                      <i className="fa-solid fa-pen text-xs"></i>
                    </button>
                    <button onClick={(e) => handleDeleteClick(e, p)} className="w-9 h-9 rounded-xl bg-[#F8FAFB] text-[#64748B] hover:text-[#EF5350] flex items-center justify-center border border-[#E8EDF2]">
                      <i className="fa-solid fa-trash text-xs"></i>
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-[#1A2B3C] mb-3">{p.nombre}</h3>
                
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-[10px] font-bold text-[#64748B] uppercase">Edad</p>
                    <p className="font-medium text-[#1A2B3C]">{p.edad} <span className="text-xs text-[#64748B]">a</span></p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#64748B] uppercase">Estat.</p>
                    <p className="font-medium text-[#1A2B3C]">{p.estatura_cm} <span className="text-xs text-[#64748B]">cm</span></p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#64748B] uppercase">Género</p>
                    <p className="font-medium text-[#1A2B3C] capitalize">{p.genero.charAt(0)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SIDEBAR DETALLE DE PERFIL */}
      {activeProfile && (
        <aside className="w-full xl:w-[28rem] xl:fixed xl:right-0 xl:top-0 xl:h-screen xl:border-l border-[#E8EDF2] bg-[#F8FAFB] xl:overflow-y-auto z-20 transition-all duration-300">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[#1A2B3C] flex items-center gap-2">
                <i className="fa-solid fa-circle-user text-[#4CAF82]"></i>
                Panel de {activeProfile.nombre}
              </h2>
              <button onClick={() => setActiveProfile(null)} className="w-10 h-10 rounded-full bg-white border border-[#E8EDF2] text-[#64748B] hover:text-[#1A2B3C] xl:hidden flex items-center justify-center">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <BluetoothScale 
              activeProfile={activeProfile} 
              onMeasurementSaved={() => loadMeasurements(activeProfile.id)}
            />

            {/* ACORDEÓN DE ÚLTIMAS MÉTRICAS */}
            <div className="mt-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-[#1A2B3C] uppercase tracking-wide">Desglose Corporal</h3>
                {latestM && <span className="text-xs text-[#64748B]"><i className="fa-regular fa-clock"></i> {new Date(latestM.created_at).toLocaleDateString()}</span>}
              </div>
              
              {!latestM ? (
                <div className="bg-white rounded-xl border border-[#E8EDF2] p-6 text-center text-[#64748B] text-sm">
                  Sin mediciones registradas. Conéctate a la báscula.
                </div>
              ) : (
                <div className="space-y-3">
                  {METRICS_LIST.map((metric) => {
                    const isOpen = openAccordionKey === metric.key;
                    const val = latestM[metric.key as keyof MeasurementResponse] as number;
                    const hasValue = val != null && !isNaN(val);
                    const evaluation = hasValue ? evaluateMetric(metric.key, val, activeProfile) : null;

                    return (
                      <div key={metric.key} className={`bg-white rounded-xl border transition-all overflow-hidden ${isOpen ? 'border-[#4CAF82] shadow-sm' : 'border-[#E8EDF2]'}`}>
                        <button 
                          onClick={() => toggleAccordion(metric.key)}
                          className="w-full flex items-center justify-between min-h-[44px] p-4 text-left focus:outline-none focus:bg-[#F8FAFB] transition-colors"
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-[#1A2B3C]">{metric.label}</span>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <span className="font-mono-num font-bold text-[#2196B5] text-lg">
                              {hasValue ? Number(val).toFixed(1) : '--'}
                            </span>
                            <i className={`fa-solid fa-chevron-down text-[#64748B] transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#4CAF82]' : ''}`}></i>
                          </div>
                        </button>
                        
                        {/* Contenido Desplegable */}
                        {isOpen && (
                          <div className="p-4 pt-0 bg-white animate-fade-in border-t border-[#E8EDF2] mt-2">
                            {evaluation ? (
                              <HealthProgressBar evaluation={evaluation} />
                            ) : (
                              <p className="text-sm text-[#64748B] italic mt-2">No se pudo evaluar esta métrica.</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* TABLA HISTORIAL */}
            <div className="mt-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-[#1A2B3C] uppercase tracking-wide">Historial ({measurements.length})</h3>
              </div>

              <div className="bg-white rounded-xl border border-[#E8EDF2] overflow-hidden overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-[#F8FAFB] text-[#64748B] font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3 border-l border-[#E8EDF2]">Peso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {measurements.slice(0, 5).map(m => (
                      <tr key={m.id} className="border-t border-[#E8EDF2]">
                        <td className="px-4 py-3 font-medium text-[#64748B]">{new Date(m.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3 border-l border-[#E8EDF2] text-[#1A2B3C] font-mono-num font-bold">
                          {Number(m.peso_kg).toFixed(1)} kg
                        </td>
                      </tr>
                    ))}
                    {measurements.length === 0 && (
                      <tr><td colSpan={2} className="px-4 py-5 text-center text-[#64748B]">Sin registros</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {measurements.length > 5 && <p className="text-xs text-center text-[#64748B] mt-3 font-medium cursor-pointer hover:text-[#2196B5]">Ver los {measurements.length - 5} registros restantes</p>}
            </div>
          </div>
        </aside>
      )}

      <ProfileFormModal 
        isOpen={isModalOpen}
        initialData={editingProfile}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
      />

      <ConfirmDeleteModal
        isOpen={deleteTarget !== null}
        profileName={deleteTarget?.nombre || ''}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ExportExcelModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        profiles={profiles}
      />
    </div>
  );
};
