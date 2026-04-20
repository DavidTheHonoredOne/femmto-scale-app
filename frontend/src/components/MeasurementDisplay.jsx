import { Save, Clock } from 'lucide-react'
import { getMetricStatus } from '../utils/bodyMetrics'

const METRIC_DEFS = [
  { key: 'weight',          label: 'Weight',           unit: 'kg'   },
  { key: 'bmi',             label: 'BMI',               unit: ''     },
  { key: 'body_fat',        label: 'Body Fat',          unit: '%'    },
  { key: 'muscle_mass',     label: 'Muscle Mass',       unit: 'kg'   },
  { key: 'skeletal_muscle', label: 'Skeletal Muscle',   unit: '%'    },
  { key: 'visceral_fat',    label: 'Visceral Fat',      unit: ''     },
  { key: 'subcutaneous_fat',label: 'Subcutaneous Fat',  unit: '%'    },
  { key: 'protein',         label: 'Protein',           unit: '%'    },
  { key: 'body_water',      label: 'Body Water',        unit: '%'    },
  { key: 'bmr',             label: 'BMR',               unit: 'kcal' },
  { key: 'body_age',        label: 'Body Age',          unit: 'yr'   },
  { key: 'standard_weight', label: 'Ideal Weight',      unit: 'kg'   },
  { key: 'fat_mass',        label: 'Fat Mass',          unit: 'kg'   },
  { key: 'fat_loss',        label: 'Fat Loss Target',   unit: 'kg'   },
  { key: 'muscle_frequency',label: 'Muscle Frequency',  unit: 'Ω'    },
  { key: 'skeletal_mass',   label: 'Skeletal Mass',     unit: 'kg'   },
]

const STATUS_STYLES = {
  normal:  { card: 'bg-green-50  border-green-200',  value: 'text-green-700',  badge: 'bg-green-100 text-green-700'  },
  warning: { card: 'bg-yellow-50 border-yellow-200', value: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700' },
  danger:  { card: 'bg-red-50    border-red-200',    value: 'text-red-700',    badge: 'bg-red-100 text-red-700'     },
}

function MetricCard({ def, value, gender }) {
  if (value === null || value === undefined) return null

  const status = getMetricStatus(def.key, value, gender)
  const s = STATUS_STYLES[status]

  return (
    <div className={`border rounded-xl p-3 flex flex-col gap-1 ${s.card}`}>
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide leading-none">
        {def.label}
      </span>
      <div className="flex items-end gap-1">
        <span className={`text-2xl font-bold leading-none ${s.value}`}>{value}</span>
        {def.unit && <span className="text-xs text-gray-400 mb-0.5">{def.unit}</span>}
      </div>
      <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full self-start ${s.badge} capitalize`}>
        {status}
      </span>
    </div>
  )
}

export default function MeasurementDisplay({ measurement, profile, onSave, saving }) {
  if (!measurement) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <Clock size={28} className="text-gray-300" />
        </div>
        <p className="text-sm">No measurement yet.</p>
        <p className="text-xs mt-1">Connect the scale and step on to begin.</p>
      </div>
    )
  }

  const measuredAt = measurement.measured_at
    ? new Date(measurement.measured_at).toLocaleString()
    : new Date().toLocaleString()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock size={14} />
          <span>Measured at {measuredAt}</span>
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Save size={15} />
          {saving ? 'Saving…' : 'Save Measurement'}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {METRIC_DEFS.map((def) => (
          <MetricCard
            key={def.key}
            def={def}
            value={measurement[def.key]}
            gender={profile?.gender}
          />
        ))}
      </div>
    </div>
  )
}
