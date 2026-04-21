import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ProfileCreate, Profile } from '../../services/api';

interface ProfileFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProfileCreate) => Promise<void>;
  initialData?: Profile | null;
}

export const ProfileFormModal: React.FC<ProfileFormModalProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [nombre, setNombre] = useState('');
  const [edad, setEdad] = useState<number | ''>('');
  const [estatura, setEstatura] = useState<number | ''>('');
  const [genero, setGenero] = useState('masculino');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!initialData;

  useEffect(() => {
    if (initialData && isOpen) {
      setNombre(initialData.nombre);
      setEdad(initialData.edad);
      setEstatura(initialData.estatura_cm);
      setGenero(initialData.genero);
    } else if (isOpen) {
      setNombre('');
      setEdad('');
      setEstatura('');
      setGenero('masculino');
      setError(null);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !edad || !estatura) {
      setError('Por favor, completa todos los campos requeridos.');
      return;
    }
    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({ nombre, edad: Number(edad), estatura_cm: Number(estatura), genero });
      onClose();
    } catch {
      setError(`Hubo un error al ${isEditing ? 'actualizar' : 'crear'} el perfil.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full bg-[#F8FAFB] border border-[#E8EDF2] text-[#1A2B3C] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#4CAF82]/50 focus:border-[#4CAF82] transition-colors";
  const labelClass = "block text-[11px] font-bold text-[#1A2B3C] mb-1.5 uppercase tracking-wide";

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative animate-fade-in">
        <div className="p-6 max-h-[90vh] overflow-y-auto">

          <h2 className="text-2xl font-bold text-[#1A2B3C] mb-6">
            {isEditing ? 'Editar Perfil' : 'Añadir Nuevo Perfil'}
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm flex items-center gap-2">
              <i className="fa-solid fa-circle-exclamation"></i>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>Nombre</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className={inputClass}
                placeholder="Ej. Ana García"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Edad</label>
                <input
                  type="number"
                  value={edad}
                  onChange={(e) => setEdad(Number(e.target.value))}
                  min="1" max="120"
                  className={inputClass}
                  placeholder="Años"
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Estatura (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={estatura}
                  onChange={(e) => setEstatura(Number(e.target.value))}
                  min="50" max="300"
                  className={inputClass}
                  placeholder="cm"
                  required
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Género</label>
              <select
                value={genero}
                onChange={(e) => setGenero(e.target.value)}
                className={inputClass + " appearance-none cursor-pointer"}
                required
              >
                <option value="masculino">Hombre</option>
                <option value="femenino">Mujer</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-[#E8EDF2]">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 text-sm font-bold text-[#64748B] hover:text-[#1A2B3C] hover:bg-[#F8FAFB] rounded-xl transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 text-sm font-bold text-white bg-[#4CAF82] hover:bg-[#459E75] active:bg-[#3D8C67] rounded-xl transition-all shadow-md shadow-[#4CAF82]/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? <><i className="fa-solid fa-spinner fa-spin"></i> Guardando...</>
                  : (isEditing ? 'Guardar Cambios' : 'Crear Perfil')
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
};
