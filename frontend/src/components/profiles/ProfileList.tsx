import React, { useEffect, useState } from 'react';
import { getProfiles, createProfile, updateProfile, deleteProfile, type Profile, type ProfileCreate } from '../../services/api';
import { ProfileFormModal } from './ProfileFormModal';

export const ProfileList: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  
  // Notification state
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getProfiles();
      setProfiles(data);
    } catch (err) {
      setError('Error al cargar la lista de perfiles. Verifica que el servidor esté en ejecución.');
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const openCreateModal = () => {
    setEditingProfile(null);
    setIsModalOpen(true);
  };

  const openEditModal = (profile: Profile) => {
    setEditingProfile(profile);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (profileData: ProfileCreate) => {
    try {
      if (editingProfile) {
        // Modo Edición
        const updated = await updateProfile(editingProfile.id, profileData);
        setProfiles(prev => prev.map(p => p.id === updated.id ? updated : p));
        showNotification('Perfil actualizado con éxito', 'success');
      } else {
        // Modo Creación
        const newProfile = await createProfile(profileData);
        setProfiles(prev => [...prev, newProfile]);
        showNotification('Perfil creado con éxito', 'success');
      }
    } catch (error) {
      // Re-throw for the modal to catch and show internal error, or handle here
      throw error;
    }
  };

  const handleDeleteProfile = async (id: number, nombre: string) => {
    const isConfirmed = window.confirm(`¿Estás seguro que deseas eliminar el perfil de ${nombre}?\nSe eliminarán permanentemente todas sus mediciones BIA.`);
    if (!isConfirmed) return;

    try {
      setIsDeletingId(id);
      await deleteProfile(id);
      setProfiles(prev => prev.filter(p => p.id !== id));
      showNotification('Perfil eliminado correctamente', 'success');
    } catch (err) {
      showNotification('Error al eliminar el perfil', 'error');
    } finally {
      setIsDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm font-medium">Cargando perfiles...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center max-w-lg mx-auto mt-10">
        <p className="text-red-400 mb-4">{error}</p>
        <button 
          onClick={fetchProfiles}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors border border-slate-600"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 relative">
      {/* Sistema de Notificaciones (Toasts) */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg border transition-all transform flex items-center gap-2 ${
          notification.type === 'success' 
            ? 'bg-emerald-900/90 border-emerald-500/50 text-emerald-200' 
            : 'bg-red-900/90 border-red-500/50 text-red-200'
        }`}>
          {notification.type === 'success' ? (
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          ) : (
            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          )}
          <span>{notification.message}</span>
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Perfiles Básicos</h1>
          <p className="text-slate-400">Selecciona o administra los perfiles para tus mediciones.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 px-5 rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
          </svg>
          Añadir Nuevo Perfil
        </button>
      </div>

      {profiles.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-slate-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No hay perfiles</h3>
          <p className="text-slate-400 max-w-md mx-auto">Comienza añadiendo un perfil para poder registrar tus mediciones BIA.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map((profile) => (
            <div 
              key={profile.id} 
              className={`bg-slate-800 border ${isDeletingId === profile.id ? 'border-red-500/50 opacity-50' : 'border-slate-700 hover:border-slate-500'} rounded-2xl p-6 transition-all group hover:shadow-xl hover:shadow-blue-500/10 cursor-pointer relative`}
            >
              {/* Toolbar con Botones de Accion */}
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); openEditModal(profile); }}
                  disabled={isDeletingId === profile.id}
                  className="p-1.5 bg-slate-700/50 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-600/50"
                  title="Editar Perfil"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.89-1.13l-2.8-2.8a4.5 4.5 0 01-1.13-1.89L19.514 4.487zm0 0L19.5 7.125" />
                  </svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteProfile(profile.id, profile.nombre); }}
                  disabled={isDeletingId === profile.id}
                  className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg transition-colors border border-red-500/20"
                  title="Eliminar Perfil"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>

              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xl font-bold uppercase border border-blue-500/20">
                  {profile.nombre.charAt(0)}
                </div>
                <span className="text-xs font-medium px-2.5 py-1 bg-slate-700 text-slate-300 rounded-full mr-16">
                  ID: {profile.id}
                </span>
              </div>
              
              <h3 className="text-xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">
                {profile.nombre}
              </h3>
              
              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-0.5">Edad</span>
                  <span className="text-slate-200">{profile.edad} años</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-0.5">Estatura</span>
                  <span className="text-slate-200">{profile.estatura_cm} cm</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-0.5">Género</span>
                  <span className="text-slate-200 capitalize">{profile.genero}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ProfileFormModal 
        isOpen={isModalOpen} 
        initialData={editingProfile}
        onClose={() => setIsModalOpen(false)} 
        onSubmit={handleModalSubmit} 
      />
    </div>
  );
};
