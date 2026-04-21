import React, { useState } from 'react';
import type { ProfileCreate } from '../../services/api';

interface CreateProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProfileCreate) => Promise<void>;
}

export const CreateProfileModal: React.FC<CreateProfileModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [nombre, setNombre] = useState('');
  const [edad, setEdad] = useState<number | ''>('');
  const [estatura, setEstatura] = useState<number | ''>('');
  const [genero, setGenero] = useState('masculino');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      await onSubmit({
        nombre,
        edad: Number(edad),
        estatura_cm: Number(estatura),
        genero,
      });
      // Limpiar formulario y cerrar
      setNombre('');
      setEdad('');
      setEstatura('');
      setGenero('masculino');
      onClose();
    } catch (err) {
      setError('Hubo un error al crear el perfil. Por favor intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-md border border-slate-700 mx-4">
        <h2 className="text-2xl font-semibold text-white mb-6">Añadir Nuevo Perfil</h2>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
              placeholder="Ej. Jose David"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Edad</label>
              <input
                type="number"
                value={edad}
                onChange={(e) => setEdad(Number(e.target.value))}
                min="1"
                max="120"
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
                placeholder="Años"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Estatura (cm)</label>
              <input
                type="number"
                step="0.1"
                value={estatura}
                onChange={(e) => setEstatura(Number(e.target.value))}
                min="50"
                max="300"
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
                placeholder="cm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Género</label>
            <select
              value={genero}
              onChange={(e) => setGenero(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors appearance-none"
              required
            >
              <option value="masculino">Hombre</option>
              <option value="femenino">Mujer</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 text-sm font-medium text-slate-300 hover:text-white bg-transparent hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Guardando...' : 'Crear Perfil'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
