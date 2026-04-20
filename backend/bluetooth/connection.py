import asyncio
from bleak import BleakClient
from bleak.exc import BleakError

# MAC Address exacta de la báscula FEMMTO BCS15
FEMMTO_MAC = "F8:F2:F0:B9:B4:E5"

# UUIDs detectados anteriormente que nos interesan especialmente
UUIDS_IMPORTANTES = {
    "0000ffb0": "Servicio de Datos principal",
    "0000ffb1": "Característica (Posible comando/respuesta)",
    "0000ffb2": "Característica (Posible lectura de datos)"
}

def es_relevante(uuid_str):
    """Devuelve un marcador visual si el UUID proporcionado está en nuestra lista de importantes."""
    for u in UUIDS_IMPORTANTES:
        if u in uuid_str.lower():
            return f" ⭐ [RELEVANTE: {UUIDS_IMPORTANTES[u]}]"
    return ""

async def explorar_bascula():
    print("=" * 75)
    print("Iniciando conexión a la báscula FEMMTO BCS15...")
    print("⚠️ IMPORTANTE: Súbase a la báscula AHORA MISMO para que la pantalla")
    print("   se encienda y el Bluetooth acepte conexiones.")
    print("=" * 75 + "\n")

    print(f"Intentando conectar a {FEMMTO_MAC}...")
    
    try:
        # Aumentamos el timeout a 15 segundos para darle tiempo de respuesta
        async with BleakClient(FEMMTO_MAC, timeout=15.0) as client:
            conectado = client.is_connected
            if conectado:
                print("\n✅ ¡Conectado exitosamente a la báscula!\n")
                print("Obteniendo la lista de servicios y características (GATT)...\n")
                
                servicios = client.services
                
                for servicio in servicios:
                    destacado_svc = es_relevante(servicio.uuid)
                    descripcion = servicio.description or "Desconocido"
                    
                    print(f"📦 Servicio: {servicio.uuid} ({descripcion}){destacado_svc}")
                    
                    for char in servicio.characteristics:
                        destacado_char = es_relevante(char.uuid)
                        props = ", ".join(char.properties)
                        desc_char = char.description or "Desconocida"
                        
                        print(f"   ├─ ⚙️ Característica: {char.uuid}{destacado_char}")
                        print(f"   │  Descripción: {desc_char}")
                        print(f"   │  Propiedades: [{props}]")
                        
                    print("   └" + "─" * 45 + "\n")
                    
            else:
                print("❌ Conexión inicial fallida. La báscula no respondió.")
                
    except asyncio.TimeoutError:
        print("\n❌ Tiempo de espera agotado (Timeout).")
        print("Asegúrese de estar subido en la báscula antes de correr el script.")
    except BleakError as e:
        print("\n❌ Error de conexión Bluetooth.")
        print("La báscula probablemente se bloqueó o se apagó la pantalla.")
        print(f"Detalle técnico: {e}")
    except Exception as e:
        print("\n❌ Ocurrió un error inesperado durante la conexión:")
        print(f"Detalle: {e}")

if __name__ == "__main__":
    try:
        asyncio.run(explorar_bascula())
    except KeyboardInterrupt:
        print("\nConexión cancelada por el usuario.")
