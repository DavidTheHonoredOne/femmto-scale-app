import { useState } from 'react'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'

function initials(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function avatarColor(name) {
  const colors = [
    'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500',
    'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-rose-500',
  ]
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff
  return colors[Math.abs(hash) % colors.length]
}

export default function ProfileList({
  profiles,
  selectedId,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
}) {
  const [search, setSearch] = useState('')

  const filtered = profiles.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          Profiles ({profiles.length})
        </h2>
        <button
          onClick={onAdd}
          className="flex items-center gap-1 bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={14} />
          Add
        </button>
      </div>

      <div className="px-4 pb-2">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search profiles…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
          />
        </div>
      </div>

      <ul className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
        {filtered.length === 0 && (
          <li className="text-center text-gray-400 text-sm py-8">No profiles found.</li>
        )}
        {filtered.map((p) => (
          <li key={p.id}>
            <button
              onClick={() => onSelect(p)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${
                selectedId === p.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'hover:bg-gray-100 text-gray-800'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                  selectedId === p.id ? 'bg-white/20' : avatarColor(p.name)
                }`}
              >
                {initials(p.name)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 truncate">
                  <span className="font-medium text-sm truncate">{p.name}</span>
                  <span className={`text-xs font-bold ${
                    selectedId === p.id
                      ? p.gender === 'male' ? 'text-blue-200' : 'text-pink-200'
                      : p.gender === 'male' ? 'text-blue-400' : 'text-pink-400'
                  }`}>
                    {p.gender === 'male' ? '♂' : '♀'}
                  </span>
                </div>
                <div className={`text-xs ${selectedId === p.id ? 'text-blue-200' : 'text-gray-400'}`}>
                  {p.height} cm · {p.age} yr
                </div>
              </div>

              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(p) }}
                  className={`p-1 rounded hover:bg-white/20 ${selectedId === p.id ? 'text-white' : 'text-gray-500'}`}
                  title="Edit"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(p) }}
                  className={`p-1 rounded hover:bg-white/20 ${selectedId === p.id ? 'text-white' : 'text-red-400'}`}
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
