import { useState } from 'react'
import { X, User } from 'lucide-react'

const INITIAL = { name: '', height: 170, age: 30, gender: 'male' }

export default function ProfileForm({ profile, onSave, onClose }) {
  const [form, setForm] = useState(profile ? { ...profile } : INITIAL)
  const [errors, setErrors] = useState({})

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required.'
    if (form.height < 100 || form.height > 220) e.height = 'Height must be 100–220 cm.'
    if (form.age < 5 || form.age > 100) e.age = 'Age must be 5–100.'
    if (!['male', 'female'].includes(form.gender)) e.gender = 'Select a gender.'
    return e
  }

  function handleSubmit(e) {
    e.preventDefault()
    const e2 = validate()
    if (Object.keys(e2).length) { setErrors(e2); return }
    onSave({ ...form, height: Number(form.height), age: Number(form.age) })
  }

  function field(key, label, type = 'text', extra = {}) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input
          type={type}
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors[key] ? 'border-red-400' : 'border-gray-300'
          }`}
          {...extra}
        />
        {errors[key] && <p className="text-red-500 text-xs mt-1">{errors[key]}</p>}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <User className="text-blue-600" size={20} />
            <h2 className="text-lg font-semibold text-gray-800">
              {profile ? 'Edit Profile' : 'New Profile'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {field('name', 'Full Name', 'text', { placeholder: 'e.g. Jane Smith' })}
          {field('height', 'Height (cm)', 'number', { min: 100, max: 220 })}
          {field('age', 'Age', 'number', { min: 5, max: 100 })}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
            <div className="flex gap-6">
              {['male', 'female'].map((g) => (
                <label key={g} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="gender"
                    value={g}
                    checked={form.gender === g}
                    onChange={() => setForm({ ...form, gender: g })}
                    className="accent-blue-600"
                  />
                  <span className="text-sm text-gray-700 capitalize">{g}</span>
                </label>
              ))}
            </div>
            {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              {profile ? 'Save Changes' : 'Create Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
