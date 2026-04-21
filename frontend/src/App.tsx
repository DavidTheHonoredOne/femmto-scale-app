import './index.css'
import BluetoothScale from './components/BluetoothScale'
import { ProfileList } from './components/profiles/ProfileList'

function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <main className="pb-16">
        <ProfileList />
        
        <div className="mt-8 border-t border-slate-800 pt-8">
          <div className="w-full max-w-6xl mx-auto px-4 mb-4">
            <h2 className="text-2xl font-bold text-white mb-2">Báscula Bluetooth</h2>
            <p className="text-slate-400">Conecta tu báscula y realiza una medición.</p>
          </div>
          <BluetoothScale />
        </div>
      </main>
    </div>
  )
}

export default App
