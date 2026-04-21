import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { getMeasurementsByProfile, type Profile, type MeasurementResponse } from '../../services/api';

interface ExportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: Profile[];
}

export const ExportExcelModal: React.FC<ExportExcelModalProps> = ({ isOpen, onClose, profiles }) => {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [search, setSearch] = useState('');

  const filteredProfiles = useMemo(
    () => profiles.filter(p => p.nombre.toLowerCase().includes(search.toLowerCase())),
    [profiles, search]
  );

  if (!isOpen) return null;

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelected(new Set(profiles.map(p => p.id)));
    } else {
      setSelected(new Set());
    }
  };

  const toggleProfile = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExport = async () => {
    if (selected.size === 0) return;
    setIsExporting(true);
    try {
      const workbook = XLSX.utils.book_new();
      const profilesToExport = profiles.filter(p => selected.has(p.id));
      const allRows: { profile: Profile; m: MeasurementResponse }[] = [];

      for (const profile of profilesToExport) {
        try {
          const measurements = await getMeasurementsByProfile(profile.id);
          for (const m of measurements) {
            allRows.push({ profile, m });
          }
        } catch (e) {
          console.error(e);
        }
      }

      // Ordenar: Nombre ASC → Fecha DESC
      allRows.sort((a, b) => {
        const nameComp = a.profile.nombre.localeCompare(b.profile.nombre);
        if (nameComp !== 0) return nameComp;
        return new Date(b.m.created_at).getTime() - new Date(a.m.created_at).getTime();
      });

      // Encabezados
      const headers = [
        'Nombre', 'Edad', 'Estatura (cm)', 'Género',
        'Fecha Medición', 'Peso (kg)', 'IMC',
        'Grasa Corporal (%)', 'Grasa Visceral',
        'Masa Muscular (kg)', 'Agua Corporal (%)',
        'BMR (kcal)', 'Edad Corporal', 'Peso Estándar (kg)'
      ];

      const sheetData: (string | number | null)[][] = [headers];

      // Filas de datos
      for (const row of allRows) {
        const { profile, m } = row;
        sheetData.push([
          profile.nombre,
          profile.edad,
          profile.estatura_cm,
          profile.genero,
          new Date(m.created_at).toLocaleString('es-ES'),
          m.peso_kg ?? null,
          m.imc ?? null,
          m.grasa_corporal_pct ?? null,
          m.grasa_visceral ?? null,
          m.masa_muscular_kg ?? null,
          m.agua_corporal_pct ?? null,
          m.bmr_kcal ?? null,
          m.edad_corporal ?? null,
          m.peso_estandar_kg ?? null,
        ]);
      }

      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

      // Aplicar estilo de cabecera: fondo #4CAF82, texto blanco
      const headerRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
        const cellAddr = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!worksheet[cellAddr]) continue;
        worksheet[cellAddr].s = {
          fill: { patternType: 'solid', fgColor: { rgb: '4CAF82' } },
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            bottom: { style: 'thin', color: { rgb: '3D9E70' } }
          }
        };
      }

      worksheet['!cols'] = [
        { wch: 18 }, { wch: 6 }, { wch: 14 }, { wch: 12 },
        { wch: 20 }, { wch: 10 }, { wch: 8 },
        { wch: 17 }, { wch: 14 },
        { wch: 17 }, { wch: 16 },
        { wch: 12 }, { wch: 14 }, { wch: 18 }
      ];

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Consolidado');

      const dateStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `belus-scale-${dateStr}.xlsx`);
      onClose();
    } catch (err) {
      console.error('Error exportando Excel:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const allSelected = profiles.length > 0 && selected.size === profiles.length;
  const noneSelected = selected.size === 0;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative flex flex-col max-h-[90vh] animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#E8EDF2] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#2196B5]/10 rounded-xl flex items-center justify-center">
              <i className="fa-solid fa-file-excel text-[#2196B5] text-lg"></i>
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1A2B3C]">Exportar a Excel</h2>
              <p className="text-xs text-[#64748B]">Tabla plana · Una hoja · 14 columnas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#F8FAFB] border border-[#E8EDF2] text-[#64748B] hover:text-[#1A2B3C] flex items-center justify-center transition-colors"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Search + Select All */}
        <div className="px-6 pt-4 pb-3 space-y-3 flex-shrink-0">
          <div className="relative">
            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] text-sm pointer-events-none"></i>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar perfil..."
              className="w-full bg-[#F8FAFB] border border-[#E8EDF2] text-[#1A2B3C] rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4CAF82]/50 focus:border-[#4CAF82] transition-colors"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => toggleAll(true)}
              disabled={allSelected}
              className="flex-1 py-2 text-xs font-bold rounded-lg bg-[#4CAF82]/10 text-[#4CAF82] hover:bg-[#4CAF82]/20 disabled:opacity-40 transition-colors"
            >
              <i className="fa-solid fa-check-double mr-1"></i> Seleccionar todos
            </button>
            <button
              onClick={() => toggleAll(false)}
              disabled={noneSelected}
              className="flex-1 py-2 text-xs font-bold rounded-lg bg-[#E8EDF2] text-[#64748B] hover:bg-[#d0d7df] disabled:opacity-40 transition-colors"
            >
              <i className="fa-solid fa-xmark mr-1"></i> Deseleccionar todos
            </button>
          </div>
        </div>

        {/* Lista de perfiles */}
        <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-2">
          {filteredProfiles.length === 0 ? (
            <div className="py-10 text-center text-[#64748B]">
              <i className="fa-solid fa-search text-2xl opacity-30 mb-2 block"></i>
              <p className="text-sm">No se encontraron perfiles con ese nombre</p>
            </div>
          ) : (
            filteredProfiles.map(p => (
              <label
                key={p.id}
                className={`flex items-center gap-4 p-3 rounded-xl border cursor-pointer transition-colors hover:bg-[#F8FAFB]
                  ${selected.has(p.id) ? 'border-[#4CAF82] bg-[#4CAF82]/5' : 'border-[#E8EDF2]'}`}
              >
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-[#4CAF82] rounded flex-shrink-0"
                  checked={selected.has(p.id)}
                  onChange={() => toggleProfile(p.id)}
                />
                <div className="w-9 h-9 bg-[#E8EDF2] rounded-full flex items-center justify-center text-sm font-bold text-[#2196B5] uppercase flex-shrink-0">
                  {p.nombre.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#1A2B3C] truncate">{p.nombre}</p>
                  <p className="text-xs text-[#64748B]">{p.edad} años · {p.estatura_cm} cm · {p.genero}</p>
                </div>
              </label>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#E8EDF2] flex items-center justify-between gap-3 flex-shrink-0">
          <p className="text-sm text-[#64748B] font-medium">
            <span className="text-[#4CAF82] font-bold">{selected.size}</span> perfil{selected.size !== 1 ? 'es' : ''} seleccionado{selected.size !== 1 ? 's' : ''}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-bold text-[#64748B] hover:text-[#1A2B3C] bg-[#F8FAFB] hover:bg-[#E8EDF2] rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleExport}
              disabled={noneSelected || isExporting}
              className="px-5 py-2.5 text-sm font-bold text-white bg-[#2196B5] hover:bg-[#1D819C] rounded-xl transition-all shadow-md shadow-[#2196B5]/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting
                ? <><i className="fa-solid fa-spinner fa-spin"></i> Exportando...</>
                : <><i className="fa-solid fa-download"></i> Exportar Excel</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
