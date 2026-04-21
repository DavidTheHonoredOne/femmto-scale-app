import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import {
  getProfiles,
  getPerformanceByProfile,
  getAllPerformanceRecords,
  createPerformanceRecord,
  type Profile,
  type PerformanceRecord,
  type PerformanceCreate,
} from '../services/api';

// ─── Add Performance Record Modal ────────────────────────────────────────────

interface AddPerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
  onSaved: (record: PerformanceRecord) => void;
}

const AddPerformanceModal: React.FC<AddPerformanceModalProps> = ({ isOpen, onClose, profile, onSaved }) => {
  const [remate, setRemate] = useState<number | ''>('');
  const [bloqueo, setBloqueo] = useState<number | ''>('');
  const [envergadura, setEnvergadura] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRemate('');
      setBloqueo('');
      setEnvergadura('');
    }
  }, [isOpen]);

  if (!isOpen || !profile) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (remate === '' && bloqueo === '' && envergadura === '') {
      alert('Ingresa al menos una métrica de rendimiento.');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: PerformanceCreate = {
        profile_id: profile.id,
        remate: remate === '' ? null : Number(remate),
        bloqueo: bloqueo === '' ? null : Number(bloqueo),
        envergadura: envergadura === '' ? null : Number(envergadura),
      };
      const record = await createPerformanceRecord(payload);
      onSaved(record);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error al guardar el registro de rendimiento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = 'w-full bg-[#F8FAFB] border border-[#E8EDF2] text-[#1A2B3C] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#4CAF82]/50 focus:border-[#4CAF82] transition-colors';
  const labelClass = 'block text-[11px] font-bold text-[#1A2B3C] mb-1.5 uppercase tracking-wide';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative animate-fade-in">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#4CAF82]/10 rounded-xl flex items-center justify-center">
              <i className="fa-solid fa-plus text-[#4CAF82]"></i>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1A2B3C]">Nuevo Registro</h2>
              <p className="text-sm text-[#64748B]">{profile.nombre}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>Remate (cm)</label>
              <input type="number" step="0.1" value={remate}
                onChange={(e) => setRemate(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Altura de remate en cm" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Bloqueo (cm)</label>
              <input type="number" step="0.1" value={bloqueo}
                onChange={(e) => setBloqueo(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Altura de bloqueo en cm" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Envergadura (cm)</label>
              <input type="number" step="0.1" value={envergadura}
                onChange={(e) => setEnvergadura(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Envergadura en cm" className={inputClass} />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#E8EDF2]">
              <button type="button" onClick={onClose} disabled={isSubmitting}
                className="px-4 py-2.5 text-sm font-bold text-[#64748B] hover:text-[#1A2B3C] bg-[#F8FAFB] hover:bg-[#E8EDF2] rounded-xl transition-colors disabled:opacity-50">
                Cancelar
              </button>
              <button type="submit" disabled={isSubmitting}
                className="px-5 py-2.5 text-sm font-bold text-white bg-[#4CAF82] hover:bg-[#459E75] rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50">
                {isSubmitting ? <><i className="fa-solid fa-spinner fa-spin"></i> Guardando</> : <><i className="fa-solid fa-check"></i> Guardar</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ─── Export Performance Modal ────────────────────────────────────────────────

interface ExportPerfModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: Profile[];
}

const ExportPerformanceModal: React.FC<ExportPerfModalProps> = ({ isOpen, onClose, profiles }) => {
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const allRecords = await getAllPerformanceRecords();
      const profileMap = new Map(profiles.map(p => [p.id, p]));

      const headers = ['Nombre', 'Fecha Registro', 'Remate (cm)', 'Bloqueo (cm)', 'Envergadura (cm)'];
      const rows: (string | number | null)[][] = [headers];

      // Sort: Nombre ASC → Fecha DESC (already ordered by API, just need to sort by name)
      const sorted = [...allRecords].sort((a, b) => {
        const nameA = profileMap.get(a.profile_id)?.nombre ?? '';
        const nameB = profileMap.get(b.profile_id)?.nombre ?? '';
        const nameComp = nameA.localeCompare(nameB);
        if (nameComp !== 0) return nameComp;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      for (const rec of sorted) {
        const profile = profileMap.get(rec.profile_id);
        rows.push([
          profile?.nombre ?? `Perfil #${rec.profile_id}`,
          new Date(rec.created_at).toLocaleString('es-ES'),
          rec.remate ?? null,
          rec.bloqueo ?? null,
          rec.envergadura ?? null,
        ]);
      }

      const ws = XLSX.utils.aoa_to_sheet(rows);

      // Style header row
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r: 0, c });
        if (ws[addr]) {
          ws[addr].s = {
            fill: { patternType: 'solid', fgColor: { rgb: '4CAF82' } },
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            alignment: { horizontal: 'center' },
          };
        }
      }

      ws['!cols'] = [{ wch: 20 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 16 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Rendimiento');
      XLSX.writeFile(wb, `belus-rendimiento-${new Date().toISOString().slice(0, 10)}.xlsx`);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden relative animate-fade-in">
        <div className="p-6 text-center">
          <div className="w-14 h-14 bg-[#4CAF82]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fa-solid fa-ranking-star text-[#4CAF82] text-2xl"></i>
          </div>
          <h2 className="text-xl font-bold text-[#1A2B3C] mb-2">Exportar Rendimiento</h2>
          <p className="text-sm text-[#64748B] mb-6">
            Exporta el historial completo de remate, bloqueo y envergadura de todos los perfiles.
            <br /><span className="font-semibold text-[#1A2B3C]">Una fila por registro.</span>
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 text-sm font-bold text-[#64748B] bg-[#F8FAFB] hover:bg-[#E8EDF2] rounded-xl transition-colors">
              Cancelar
            </button>
            <button onClick={handleExport} disabled={isExporting}
              className="flex-1 py-2.5 text-sm font-bold text-white bg-[#4CAF82] hover:bg-[#459E75] rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              {isExporting ? <><i className="fa-solid fa-spinner fa-spin"></i> Exportando</> : <><i className="fa-solid fa-download"></i> Exportar</>}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ─── Main Page ───────────────────────────────────────────────────────────────

export const AlcanceBloqueoPage: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [performanceMap, setPerformanceMap] = useState<Map<number, PerformanceRecord[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'remate' | 'bloqueo' | 'envergadura'>('remate');
  const [addTarget, setAddTarget] = useState<Profile | null>(null);
  const [expandedProfile, setExpandedProfile] = useState<number | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const profs = await getProfiles();
      setProfiles(profs);

      const map = new Map<number, PerformanceRecord[]>();
      await Promise.all(
        profs.map(async (p) => {
          try {
            const records = await getPerformanceByProfile(p.id);
            map.set(p.id, records);
          } catch {
            map.set(p.id, []);
          }
        })
      );
      setPerformanceMap(map);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const getLatestRecord = (profileId: number): PerformanceRecord | null => {
    const records = performanceMap.get(profileId) ?? [];
    return records.length > 0 ? records[0] : null;
  };

  const sortedProfiles = useMemo(() => {
    let filtered = profiles;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      filtered = profiles.filter(p => p.nombre.toLowerCase().includes(q));
    }

    return [...filtered].sort((a, b) => {
      const latA = getLatestRecord(a.id);
      const latB = getLatestRecord(b.id);
      const valA = latA?.[sortBy] ?? -1;
      const valB = latB?.[sortBy] ?? -1;
      return valB - valA;
    });
  }, [profiles, performanceMap, sortBy, searchQuery]);

  const handleSaved = (record: PerformanceRecord) => {
    setPerformanceMap(prev => {
      const updated = new Map(prev);
      const existing = updated.get(record.profile_id) ?? [];
      updated.set(record.profile_id, [record, ...existing]);
      return updated;
    });
  };

  const fmt = (v: number | undefined | null) => v != null ? v.toFixed(1) : '--';

  return (
    <div className="animate-fade-in pb-20">
      <header className="mb-6 flex flex-col xl:flex-row justify-between xl:items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1A2B3C] mb-2">Alcance y Bloqueo</h1>
          <p className="text-[#64748B]">Historial de rendimiento deportivo por perfil.</p>
        </div>
        <div className="flex gap-3 flex-wrap items-center">
          <div className="relative w-full sm:w-64">
            <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]"></i>
            <input
              type="text"
              placeholder="Buscar perfil..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#E8EDF2] text-[#1A2B3C] rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4CAF82]/50 focus:border-[#4CAF82] transition-colors shadow-sm"
            />
          </div>
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-4 py-2.5 text-sm font-bold text-white bg-[#4CAF82] hover:bg-[#459E75] rounded-xl flex items-center gap-2 shadow-sm transition-colors"
          >
            <i className="fa-solid fa-download"></i> Exportar
          </button>
          <div className="bg-white rounded-xl shadow-sm border border-[#E8EDF2] p-1 flex">
            {(['remate', 'bloqueo', 'envergadura'] as const).map(key => (
              <button key={key} onClick={() => setSortBy(key)}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors capitalize ${sortBy === key ? 'bg-[#4CAF82]/10 text-[#4CAF82]' : 'text-[#64748B] hover:bg-[#F8FAFB]'}`}>
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-20"><i className="fa-solid fa-spinner fa-spin text-3xl text-[#CBD5E1]"></i></div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-[#E8EDF2] overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-[#F8FAFB] text-[#64748B] font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-5 py-4">Pos</th>
                  <th className="px-5 py-4 border-l border-[#E8EDF2]">Perfil</th>
                  {(['remate', 'bloqueo', 'envergadura'] as const).map(k => (
                    <th key={k} className={`px-5 py-4 border-l border-[#E8EDF2] text-center ${sortBy === k ? 'bg-[#4CAF82]/10 text-[#4CAF82]' : ''}`}>
                      {k.charAt(0).toUpperCase() + k.slice(1)}
                    </th>
                  ))}
                  <th className="px-5 py-4 border-l border-[#E8EDF2] text-center">Historial</th>
                  <th className="px-5 py-4 border-l border-[#E8EDF2] text-center">Agregar</th>
                </tr>
              </thead>
              <tbody>
                {sortedProfiles.map((p, idx) => {
                  const latest = getLatestRecord(p.id);
                  const isTop = idx === 0 && latest != null;
                  const history = performanceMap.get(p.id) ?? [];
                  const isExpanded = expandedProfile === p.id;

                  return (
                    <React.Fragment key={p.id}>
                      <tr className={`border-t border-[#E8EDF2] hover:bg-[#F8FAFB] transition-colors ${isTop ? 'bg-[#4CAF82]/5' : ''}`}>
                        <td className="px-5 py-4 font-bold text-[#64748B]">
                          {isTop ? <i className="fa-solid fa-trophy text-amber-400"></i> : idx + 1}
                        </td>
                        <td className="px-5 py-4 border-l border-[#E8EDF2]">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isTop ? 'bg-[#4CAF82] text-white' : 'bg-[#E8EDF2] text-[#2196B5]'}`}>
                              {p.nombre.charAt(0)}
                            </div>
                            <div>
                              <p className={`font-semibold ${isTop ? 'text-[#4CAF82]' : 'text-[#1A2B3C]'}`}>{p.nombre}</p>
                              <p className="text-xs text-[#64748B]">{p.edad}a · {p.estatura_cm}cm</p>
                            </div>
                          </div>
                        </td>
                        {(['remate', 'bloqueo', 'envergadura'] as const).map(k => (
                          <td key={k} className={`px-5 py-4 border-l border-[#E8EDF2] text-center font-mono-num font-bold text-lg ${sortBy === k ? 'text-[#4CAF82]' : 'text-[#1A2B3C]'}`}>
                            {fmt(latest?.[k])}
                          </td>
                        ))}
                        <td className="px-5 py-4 border-l border-[#E8EDF2] text-center">
                          {history.length > 0 ? (
                            <button onClick={() => setExpandedProfile(isExpanded ? null : p.id)}
                              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${isExpanded ? 'bg-[#4CAF82]/10 text-[#4CAF82]' : 'bg-[#F8FAFB] text-[#64748B] hover:bg-[#E8EDF2]'}`}>
                              {history.length} reg. <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'} text-[9px] ml-1`}></i>
                            </button>
                          ) : (
                            <span className="text-xs text-[#CBD5E1]">Sin datos</span>
                          )}
                        </td>
                        <td className="px-5 py-4 border-l border-[#E8EDF2] text-center">
                          <button onClick={() => setAddTarget(p)}
                            className="w-8 h-8 rounded-lg bg-[#4CAF82]/10 text-[#4CAF82] hover:bg-[#4CAF82]/20 transition-colors">
                            <i className="fa-solid fa-plus text-xs"></i>
                          </button>
                        </td>
                      </tr>
                      {isExpanded && history.map(rec => (
                        <tr key={rec.id} className="bg-[#F8FAFB] border-t border-[#E8EDF2]/60">
                          <td className="px-5 py-2.5 text-[#CBD5E1]"><i className="fa-solid fa-turn-down-right ml-3 text-xs"></i></td>
                          <td className="px-5 py-2.5 border-l border-[#E8EDF2] text-xs text-[#64748B]">
                            {new Date(rec.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          {(['remate', 'bloqueo', 'envergadura'] as const).map(k => (
                            <td key={k} className="px-5 py-2.5 border-l border-[#E8EDF2] text-center text-sm font-mono-num text-[#64748B]">
                              {fmt(rec[k])}
                            </td>
                          ))}
                          <td className="border-l border-[#E8EDF2]" colSpan={2}></td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
                {sortedProfiles.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-8 text-center text-[#64748B]">No hay perfiles registrados</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {sortedProfiles.map((p, idx) => {
              const latest = getLatestRecord(p.id);
              const isTop = idx === 0 && latest != null;
              const history = performanceMap.get(p.id) ?? [];
              const isExpanded = expandedProfile === p.id;

              return (
                <div key={p.id} className={`bg-white rounded-2xl p-5 shadow-sm border relative overflow-hidden ${isTop ? 'border-[#4CAF82] ring-1 ring-[#4CAF82]/50' : 'border-[#E8EDF2]'}`}>
                  {isTop && (
                    <div className="absolute top-0 right-0 w-16 h-16 bg-[#4CAF82]/10 rounded-bl-full">
                      <i className="fa-solid fa-trophy absolute top-3 right-3 text-amber-400"></i>
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3 relative z-10">
                      <div className="font-bold text-[#64748B] text-xl w-6">{idx + 1}.</div>
                      <div>
                        <h3 className={`font-bold text-lg ${isTop ? 'text-[#4CAF82]' : 'text-[#1A2B3C]'}`}>{p.nombre}</h3>
                        <p className="text-xs text-[#64748B]">{p.edad} años · {p.estatura_cm} cm</p>
                      </div>
                    </div>
                    <button onClick={() => setAddTarget(p)}
                      className="w-9 h-9 rounded-xl bg-[#4CAF82]/10 text-[#4CAF82] flex items-center justify-center relative z-10">
                      <i className="fa-solid fa-plus text-xs"></i>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-[#F8FAFB] p-3 rounded-xl border border-[#E8EDF2] mb-3">
                    {(['remate', 'bloqueo', 'envergadura'] as const).map((k, ki) => (
                      <div key={k} className={`text-center ${ki > 0 ? 'border-l border-[#E8EDF2]' : ''}`}>
                        <p className={`text-[10px] font-bold uppercase mb-1 ${sortBy === k ? 'text-[#4CAF82]' : 'text-[#64748B]'}`}>{k.charAt(0).toUpperCase() + k.slice(1)}</p>
                        <p className={`font-mono-num font-bold text-lg ${sortBy === k ? 'text-[#4CAF82]' : 'text-[#1A2B3C]'}`}>{fmt(latest?.[k])}</p>
                      </div>
                    ))}
                  </div>

                  {history.length > 0 && (
                    <button onClick={() => setExpandedProfile(isExpanded ? null : p.id)}
                      className="w-full text-xs font-bold text-[#64748B] py-2 bg-[#F8FAFB] rounded-lg flex items-center justify-center gap-2 hover:bg-[#E8EDF2] transition-colors">
                      {isExpanded ? 'Ocultar' : `Ver ${history.length} registro${history.length > 1 ? 's' : ''}`}
                      <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'} text-[9px]`}></i>
                    </button>
                  )}

                  {isExpanded && (
                    <div className="mt-3 space-y-2 animate-fade-in">
                      {history.map(rec => (
                        <div key={rec.id} className="grid grid-cols-4 gap-2 text-xs bg-[#F8FAFB] border border-[#E8EDF2] rounded-lg px-3 py-2">
                          <span className="text-[#64748B] col-span-1">{new Date(rec.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
                          <span className="text-center font-mono-num">{fmt(rec.remate)}</span>
                          <span className="text-center font-mono-num">{fmt(rec.bloqueo)}</span>
                          <span className="text-center font-mono-num">{fmt(rec.envergadura)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      <AddPerformanceModal
        isOpen={addTarget !== null}
        onClose={() => setAddTarget(null)}
        profile={addTarget}
        onSaved={handleSaved}
      />

      <ExportPerformanceModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        profiles={profiles}
      />
    </div>
  );
};
