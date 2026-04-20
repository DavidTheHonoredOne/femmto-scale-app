import { useState } from 'react'
import { Bluetooth, BluetoothOff, BluetoothSearching, Zap } from 'lucide-react'
import { connectToScale, disconnectFromScale } from '../utils/bleParser'
import { calculateMetrics } from '../utils/bodyMetrics'

export default function BluetoothConnect({ profile, onMeasurement, disabled }) {
  const [device, setDevice] = useState(null)
  const [status, setStatus] = useState('disconnected') // disconnected | connecting | connected | measuring
  const [scaleName, setScaleName] = useState('')
  const [error, setError] = useState('')

  const isConnected = status === 'connected' || status === 'measuring'

  async function handleConnect() {
    if (isConnected) {
      disconnectFromScale(device)
      setDevice(null)
      setStatus('disconnected')
      setScaleName('')
      return
    }

    if (!navigator.bluetooth) {
      setError('Web Bluetooth is not supported in this browser. Try Chrome or Edge.')
      return
    }

    if (!profile) {
      setError('Please select a profile before connecting.')
      return
    }

    setError('')
    setStatus('connecting')

    try {
      const dev = await connectToScale(
        (data) => handleData(data),
        () => {
          setStatus('disconnected')
          setScaleName('')
          setDevice(null)
        }
      )
      setDevice(dev)
      setScaleName(dev.name || 'Unknown Scale')
      setStatus('connected')
    } catch (err) {
      setStatus('disconnected')
      if (err.name !== 'NotFoundError') {
        setError(err.message || 'Failed to connect to scale.')
      }
    }
  }

  function handleData(data) {
    if (!data.weight || data.weight <= 0) return

    setStatus('measuring')

    if (data.complete) {
      const metrics = calculateMetrics(data.weight, profile, data.impedance || null)
      onMeasurement(metrics)
      setStatus('connected')
    }
  }

  const buttonConfig = {
    disconnected: {
      bg: 'bg-blue-600 hover:bg-blue-700',
      icon: <Bluetooth size={20} />,
      label: 'Connect to Scale',
    },
    connecting: {
      bg: 'bg-yellow-500 cursor-wait',
      icon: <BluetoothSearching size={20} className="animate-pulse" />,
      label: 'Connecting…',
    },
    connected: {
      bg: 'bg-green-600 hover:bg-green-700',
      icon: <Bluetooth size={20} />,
      label: 'Disconnect',
    },
    measuring: {
      bg: 'bg-green-600 hover:bg-green-700',
      icon: <Zap size={20} className="animate-bounce" />,
      label: 'Measuring…',
    },
  }

  const cfg = buttonConfig[status]

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleConnect}
          disabled={status === 'connecting' || disabled}
          className={`flex items-center gap-2 ${cfg.bg} text-white font-medium px-5 py-2.5 rounded-xl shadow transition-all disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          {cfg.icon}
          {cfg.label}
        </button>

        <div className="flex items-center gap-2 text-sm">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isConnected ? 'bg-green-500' : status === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-300'
            }`}
          />
          <span className="text-gray-600">
            {isConnected
              ? `Connected to ${scaleName}`
              : status === 'connecting'
              ? 'Searching for scale…'
              : 'Not connected'}
          </span>
        </div>

        {status === 'measuring' && (
          <span className="text-sm text-green-600 font-medium animate-pulse flex items-center gap-1">
            <Zap size={14} />
            Receiving measurement…
          </span>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
          <BluetoothOff size={14} />
          {error}
        </div>
      )}

      {!navigator.bluetooth && !error && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
          ⚠ Web Bluetooth requires Chrome or Edge browser on a supported platform.
        </p>
      )}
    </div>
  )
}
