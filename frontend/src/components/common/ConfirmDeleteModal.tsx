import React from 'react';
import { createPortal } from 'react-dom';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  profileName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen, profileName, onConfirm, onCancel, isDeleting
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative animate-fade-in">
        <div className="p-6 text-center">

          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fa-solid fa-triangle-exclamation text-amber-500 text-3xl"></i>
          </div>

          <h3 className="text-xl font-bold text-[#1A2B3C] mb-2">Eliminar Perfil</h3>
          <p className="text-sm text-[#64748B] mb-6 leading-relaxed">
            ¿Estás seguro de que deseas eliminar el perfil de{' '}
            <strong className="text-[#1A2B3C] font-semibold">{profileName}</strong>?
            <br />
            Esta acción no se puede deshacer y borrará todo el historial de mediciones.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isDeleting}
              className="flex-1 py-3 text-sm font-bold text-[#64748B] hover:text-[#1A2B3C] bg-[#F8FAFB] hover:bg-[#E8EDF2] rounded-xl transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 py-3 text-sm font-bold text-white bg-[#EF5350] hover:bg-[#E53935] active:bg-[#D32F2F] rounded-xl transition-colors shadow-md shadow-[#EF5350]/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isDeleting
                ? <><i className="fa-solid fa-spinner fa-spin"></i> Eliminando...</>
                : <><i className="fa-solid fa-trash"></i> Eliminar</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
