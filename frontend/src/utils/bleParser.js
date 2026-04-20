export async function connectToScale(onData, onDisconnect) {
  if (!navigator.bluetooth) {
    throw new Error('Web Bluetooth API is not supported in this browser.')
  }

  const device = await navigator.bluetooth.requestDevice({
    filters: [
      { namePrefix: 'BCS' },
      { namePrefix: 'FEMMTO' },
      { namePrefix: 'BIA' },
      { services: ['0000181b-0000-1000-8000-00805f9b34fb'] },
      { services: ['0000181d-0000-1000-8000-00805f9b34fb'] },
    ],
    optionalServices: [
      '0000181b-0000-1000-8000-00805f9b34fb',
      '0000181d-0000-1000-8000-00805f9b34fb',
      '0000fff0-0000-1000-8000-00805f9b34fb',
      '0000ffe0-0000-1000-8000-00805f9b34fb',
    ],
  })

  const server = await device.gatt.connect()
  device.addEventListener('gattserverdisconnected', onDisconnect)

  const serviceUUIDs = [
    '0000181b-0000-1000-8000-00805f9b34fb',
    '0000181d-0000-1000-8000-00805f9b34fb',
    '0000fff0-0000-1000-8000-00805f9b34fb',
    '0000ffe0-0000-1000-8000-00805f9b34fb',
  ]

  let subscribedToAny = false

  for (const serviceUUID of serviceUUIDs) {
    try {
      const service = await server.getPrimaryService(serviceUUID)
      const characteristics = await service.getCharacteristics()
      for (const char of characteristics) {
        if (char.properties.notify || char.properties.indicate) {
          await char.startNotifications()
          char.addEventListener('characteristicvaluechanged', (event) => {
            const parsed = parsePacket(event.target.value, serviceUUID)
            if (parsed) onData(parsed)
          })
          subscribedToAny = true
        }
      }
    } catch (_e) {
      // Service not available on this device — try next
    }
  }

  if (!subscribedToAny) {
    throw new Error('No notify characteristics found. The scale may not be supported.')
  }

  return device
}

function parsePacket(dataView, serviceUUID) {
  const bytes = new Uint8Array(dataView.buffer)
  if (bytes.length < 2) return null

  const result = { raw: Array.from(bytes) }

  if (serviceUUID === '0000181b-0000-1000-8000-00805f9b34fb') {
    if (bytes.length < 4) return null
    const flags = dataView.getUint16(0, true)
    const measurementUnits = flags & 0x0001
    const impedancePresent = (flags >> 1) & 0x0001

    let offset = 2
    const rawWeight = dataView.getUint16(offset, true)
    result.weight = rawWeight * (measurementUnits === 0 ? 0.005 : 0.01)
    offset += 2

    if (impedancePresent && bytes.length >= offset + 2) {
      result.impedance = dataView.getUint16(offset, true)
    }
    // Measurement is complete when units are SI (stable GATT reading)
    result.complete = (flags & 0x0001) === 0
    return result
  }

  if (serviceUUID === '0000181d-0000-1000-8000-00805f9b34fb') {
    if (bytes.length < 3) return null
    const flags = dataView.getUint8(0)
    const measurementUnits = flags & 0x0001
    const rawWeight = dataView.getUint16(1, true)
    result.weight = rawWeight * (measurementUnits === 0 ? 0.005 : 0.01)
    result.complete = ((flags >> 5) & 0x01) === 1
    return result
  }

  // Vendor-specific services (0xFFF0, 0xFFE0) — common BCS packet layout
  if (bytes.length >= 3) {
    const flags = bytes[0]
    const rawWeight = bytes[1] | (bytes[2] << 8)
    result.weight = rawWeight / 100.0

    if (bytes.length >= 5) {
      const impedance = bytes[3] | (bytes[4] << 8)
      if (impedance > 0) result.impedance = impedance
    }

    result.complete = (flags & 0x02) !== 0
    return result
  }

  return null
}

export function disconnectFromScale(device) {
  if (device && device.gatt.connected) {
    device.gatt.disconnect()
  }
}
