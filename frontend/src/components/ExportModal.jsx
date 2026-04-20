import { useState } from 'react'
import { X, Download, FileSpreadsheet } from 'lucide-react'
import { exportProfiles } from '../utils/api'

function initials(name) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

export default function ExportModal({ profiles, onClose }) {
  const [selected, setSelected] = useState(new Set(profiles.map((p) => p.id)))
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === profiles.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(profiles.map((p) => p.id)))
    }
  }

  async function handleExport() {
    if (selected.size === 0) { setError('Select at least one profile.'); return }
    setError('')
    setExporting(true)
    try {
      const blob = await exportProfiles(Array.from(selected))
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `femmto-export-${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      onClose()
    } catch (err) {
      setError(err?.response?.data?.detail || 'Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="text-green-600" size={20} />
            <h2 className="text-lg font-semibold text-gray-800">Export to Excel</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-3 border-b shrink-0">
          <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={selected.size === profiles.length}
              onChange={toggleAll}
              className="accent-blue-600"
            />
            Select all ({profiles.length} profiles)
          </label>
        </div>

        <ul className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
          {profiles.map((p) => (
            <li key={p.id}>
              <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selected.has(p.id)}
                  onChange={() => toggle(p.id)}
                  className="accent-blue-600"
                />
                <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {initials(p.name)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.height} cm · {p.age} yr · {p.gender}</p>
                </div>
              </label>
            </li>
          ))}
        </ul>

        {error && (
          <p className="px-6 py-2 text-sm text-red-600 bg-red-50 border-t border-red-100">{error}</p>
        )}

        <div className="px-6 py-4 border-t flex gap-3 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || selected.size === 0}
            className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Download size={15} />
            {exporting ? 'Exporting…' : `Export ${selected.size} Profile${selected.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
