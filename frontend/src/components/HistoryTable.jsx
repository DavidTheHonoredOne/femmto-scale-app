import { Trash2, CalendarDays, ChevronUp, ChevronDown } from 'lucide-react'
import { useState } from 'react'

const COLUMNS = [
  { key: 'measured_at',  label: 'Date'         },
  { key: 'weight',       label: 'Weight (kg)'  },
  { key: 'bmi',          label: 'BMI'          },
  { key: 'body_fat',     label: 'Body Fat (%)'  },
  { key: 'muscle_mass',  label: 'Muscle (kg)'  },
  { key: 'body_water',   label: 'Water (%)'    },
  { key: 'bmr',          label: 'BMR (kcal)'   },
]

function fmt(key, val) {
  if (val === null || val === undefined) return '—'
  if (key === 'measured_at') return new Date(val).toLocaleString()
  return val
}

export default function HistoryTable({ measurements, onDelete }) {
  const [sortAsc, setSortAsc] = useState(false)

  const sorted = [...measurements].sort((a, b) => {
    const ta = new Date(a.measured_at).getTime()
    const tb = new Date(b.measured_at).getTime()
    return sortAsc ? ta - tb : tb - ta
  })

  if (measurements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <CalendarDays size={36} className="text-gray-200 mb-3" />
        <p className="text-sm">No measurement history yet.</p>
        <p className="text-xs mt-1">Saved measurements will appear here.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
              >
                {col.key === 'measured_at' ? (
                  <button
                    onClick={() => setSortAsc(!sortAsc)}
                    className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                  >
                    {col.label}
                    {sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                ) : (
                  col.label
                )}
              </th>
            ))}
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sorted.map((m) => (
            <tr key={m.id} className="hover:bg-gray-50 transition-colors">
              {COLUMNS.map((col) => (
                <td key={col.key} className="px-4 py-3 text-gray-700 whitespace-nowrap">
                  {fmt(col.key, m[col.key])}
                </td>
              ))}
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => onDelete(m.id)}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete measurement"
                >
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
