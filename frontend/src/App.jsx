import { useState, useEffect, useCallback } from 'react'
import { Scale, Download, AlertCircle, Loader2, Menu, X } from 'lucide-react'
import ProfileList from './components/ProfileList'
import ProfileForm from './components/ProfileForm'
import BluetoothConnect from './components/BluetoothConnect'
import MeasurementDisplay from './components/MeasurementDisplay'
import HistoryTable from './components/HistoryTable'
import ExportModal from './components/ExportModal'
import {
  getProfiles,
  createProfile,
  updateProfile,
  deleteProfile,
  getMeasurements,
  saveMeasurement,
  deleteMeasurement,
} from './utils/api'

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  const bg = type === 'error' ? 'bg-red-600' : 'bg-green-600'
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 ${bg} text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium`}>
      {type === 'error' ? <AlertCircle size={16} /> : null}
      {message}
      <button onClick={onClose} className="ml-2 hover:opacity-70"><X size={14} /></button>
    </div>
  )
}

export default function App() {
  const [profiles, setProfiles] = useState([])
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [measurements, setMeasurements] = useState([])
  const [lastMeasurement, setLastMeasurement] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loadingProfiles, setLoadingProfiles] = useState(true)
  const [loadingMeasurements, setLoadingMeasurements] = useState(false)

  const [profileFormOpen, setProfileFormOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState(null)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [toast, setToast] = useState(null)

  function showToast(message, type = 'success') {
    setToast({ message, type })
  }

  // Load profiles on mount
  useEffect(() => {
    loadProfiles()
  }, [])

  async function loadProfiles() {
    try {
      const data = await getProfiles()
      setProfiles(data)
    } catch (err) {
      showToast('Failed to load profiles. Is the backend running?', 'error')
    } finally {
      setLoadingProfiles(false)
    }
  }

  async function loadMeasurements(profileId) {
    setLoadingMeasurements(true)
    try {
      const data = await getMeasurements(profileId)
      setMeasurements(data)
    } catch {
      showToast('Failed to load measurements.', 'error')
    } finally {
      setLoadingMeasurements(false)
    }
  }

  function handleSelectProfile(profile) {
    setSelectedProfile(profile)
    setLastMeasurement(null)
    loadMeasurements(profile.id)
    setSidebarOpen(false)
  }

  async function handleSaveProfile(data) {
    try {
      if (editingProfile) {
        const updated = await updateProfile(editingProfile.id, data)
        setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
        if (selectedProfile?.id === updated.id) setSelectedProfile(updated)
        showToast('Profile updated.')
      } else {
        const created = await createProfile(data)
        setProfiles((prev) => [...prev, created])
        showToast('Profile created.')
      }
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Failed to save profile.', 'error')
    }
    setProfileFormOpen(false)
    setEditingProfile(null)
  }

  async function handleDeleteProfile(profile) {
    if (!confirm(`Delete profile "${profile.name}"? This will remove all their measurements.`)) return
    try {
      await deleteProfile(profile.id)
      setProfiles((prev) => prev.filter((p) => p.id !== profile.id))
      if (selectedProfile?.id === profile.id) {
        setSelectedProfile(null)
        setMeasurements([])
        setLastMeasurement(null)
      }
      showToast('Profile deleted.')
    } catch {
      showToast('Failed to delete profile.', 'error')
    }
  }

  async function handleSaveMeasurement() {
    if (!lastMeasurement || !selectedProfile) return
    setSaving(true)
    try {
      const saved = await saveMeasurement(selectedProfile.id, {
        ...lastMeasurement,
        measured_at: new Date().toISOString(),
      })
      setMeasurements((prev) => [saved, ...prev])
      setLastMeasurement((prev) => ({ ...prev, measured_at: saved.measured_at, id: saved.id }))
      showToast('Measurement saved.')
    } catch {
      showToast('Failed to save measurement.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteMeasurement(id) {
    if (!confirm('Delete this measurement?')) return
    try {
      await deleteMeasurement(id)
      setMeasurements((prev) => prev.filter((m) => m.id !== id))
      showToast('Measurement deleted.')
    } catch {
      showToast('Failed to delete measurement.', 'error')
    }
  }

  const handleMeasurement = useCallback((metrics) => {
    setLastMeasurement({ ...metrics, measured_at: new Date().toISOString() })
  }, [])

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-72 bg-white shadow-xl flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center gap-3 px-4 py-4 border-b bg-gradient-to-r from-blue-600 to-blue-700">
          <Scale className="text-white" size={24} />
          <div>
            <h1 className="text-white font-bold text-lg leading-none">FEMMTO</h1>
            <p className="text-blue-200 text-xs">BCS15 Smart Scale</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto text-white/80 hover:text-white lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {loadingProfiles ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <ProfileList
              profiles={profiles}
              selectedId={selectedProfile?.id}
              onSelect={handleSelectProfile}
              onAdd={() => { setEditingProfile(null); setProfileFormOpen(true) }}
              onEdit={(p) => { setEditingProfile(p); setProfileFormOpen(true) }}
              onDelete={handleDeleteProfile}
            />
          </div>
        )}

        <div className="p-4 border-t">
          <button
            onClick={() => setExportModalOpen(true)}
            disabled={profiles.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-green-600 text-white font-medium py-2.5 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <Download size={16} />
            Export to Excel
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b px-4 py-3 flex items-center gap-4 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <Menu size={22} />
          </button>

          {selectedProfile ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                {selectedProfile.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="font-semibold text-gray-800">{selectedProfile.name}</h2>
                  <span className={`text-sm font-bold ${selectedProfile.gender === 'male' ? 'text-blue-500' : 'text-pink-500'}`}>
                    {selectedProfile.gender === 'male' ? '♂' : '♀'}
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  {selectedProfile.height} cm · {selectedProfile.age} yr · {selectedProfile.gender}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-400">
              <Scale size={18} />
              <span className="text-sm">Select a profile to begin</span>
            </div>
          )}
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {!selectedProfile ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
              <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                <Scale size={40} className="text-blue-300" />
              </div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No Profile Selected</h3>
              <p className="text-gray-400 text-sm max-w-xs">
                Choose a profile from the sidebar, or create a new one to start measuring body composition.
              </p>
            </div>
          ) : (
            <>
              {/* BLE Section */}
              <section className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Scale Connection
                </h3>
                <BluetoothConnect
                  profile={selectedProfile}
                  onMeasurement={handleMeasurement}
                />
              </section>

              {/* Measurement Display */}
              <section className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Latest Measurement
                </h3>
                <MeasurementDisplay
                  measurement={lastMeasurement}
                  profile={selectedProfile}
                  onSave={handleSaveMeasurement}
                  saving={saving}
                />
              </section>

              {/* History */}
              <section className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Measurement History
                  {measurements.length > 0 && (
                    <span className="ml-2 bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
                      {measurements.length}
                    </span>
                  )}
                </h3>
                {loadingMeasurements ? (
                  <div className="flex justify-center py-8">
                    <Loader2 size={24} className="animate-spin text-blue-500" />
                  </div>
                ) : (
                  <HistoryTable
                    measurements={measurements}
                    onDelete={handleDeleteMeasurement}
                  />
                )}
              </section>
            </>
          )}
        </div>
      </main>

      {/* Modals */}
      {profileFormOpen && (
        <ProfileForm
          profile={editingProfile}
          onSave={handleSaveProfile}
          onClose={() => { setProfileFormOpen(false); setEditingProfile(null) }}
        />
      )}

      {exportModalOpen && (
        <ExportModal
          profiles={profiles}
          onClose={() => setExportModalOpen(false)}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
