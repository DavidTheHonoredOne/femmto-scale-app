import asyncio
from bleak import BleakScanner
from bleak.exc import BleakError

# MAC Address exacta de la báscula FEMMTO BCS15
FEMMTO_MAC = "F8:F2:F0:B9:B4:E5"

async def scanble():
    print("Iniciando escaneo de dispositivos Bluetooth BLE por 10 segundos...")
    print("Asegúrese de tener el Bluetooth encendido y la báscula activa.\n")
    
    try:
        # Se escaneará el entorno durante 10 segundos para encontrar dispositivos
        dispositivos = await BleakScanner.discover(timeout=10.0, return_adv=True)
        
        femmto_encontrada = False
        
        print("-" * 65)
        print(f"{'NOMBRE DEL DISPOSITIVO':<35} | {'MAC ADDRESS':<17} | {'RSSI'}")
        print("-" * 65)
        
        # Al usar return_adv=True, dispositivos es un diccionario: {mac: (BLEDevice, AdvertisementData)}
        for mac, (d, adv) in dispositivos.items():
            nombre_dispositivo = d.name if d.name else "Desconocido/Sin Nombre"
            rssi = adv.rssi
            
            # Verificamos si encontramos la báscula coincidiendo la MAC Address
            if d.address.upper() == FEMMTO_MAC.upper():
                femmto_encontrada = True
                print("\n" + "⭐" * 32)
                print("✅ ¡BÁSCULA FEMMTO BCS15 ENCONTRADA!")
                print(f"   Nombre: {nombre_dispositivo}")
                print(f"   MAC Address: {d.address}")
                print(f"   Señal (RSSI): {rssi} dBm")
                print("⭐" * 32 + "\n")
            else:
                # Mostrar otros dispositivos Bluetooth cercanos para confirmación de que funciona
                if nombre_dispositivo != "Desconocido/Sin Nombre":
                    print(f"{nombre_dispositivo[:33]:<35} | {d.address:<17} | {rssi} dBm")
                
        if not femmto_encontrada:
            print("\n❌ No se encontró la báscula FEMMTO.")
            print("Asegúrese de que esté encendida (písela para activar la pantalla) y a poca distancia.")
            
    except BleakError as e:
        print("\n❌ Error de acceso al Bluetooth.")
        print("Por favor, verifique que el Bluetooth de su computadora (Windows) esté ENCENDIDO.")
        print(f"Detalle técnico: {e}")
    except Exception as e:
        print("\n❌ Ocurrió un error inesperado al intentar usar el Bluetooth:")
        print(f"Detalle: {e}")

if __name__ == "__main__":
    try:
        # Ejecutamos el loop asíncrono
        asyncio.run(scanble())
    except KeyboardInterrupt:
        print("\nEscaneo cancelado manualmente.")
