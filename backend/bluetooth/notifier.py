import asyncio
import json
import time
from bleak import BleakClient
from bleak.exc import BleakError

# MAC Address de la báscula FEMMTO BCS15
FEMMTO_MAC = "F8:F2:F0:B9:B4:E5"

# Características según el protocolo detectado en el paso anterior
CHAR_WRITE_FFB1  = "0000ffb1-0000-1000-8000-00805f9b34fb" # Para enviar comandos
CHAR_NOTIFY_FFB2 = "0000ffb2-0000-1000-8000-00805f9b34fb" # Para recibir datos

# Variables globales para almacenar la captura
raw_data_capturada = []
tiempo_inicio = 0

def notificacion_handler(sender, data: bytearray):
    """Callback que captura y procesa las notificaciones (paquetes crudos) recibidas."""
    timestamp = time.time() - tiempo_inicio
    
    # Formateamos en hexadecimal (separado por espacios) y decimal
    hex_data = data.hex(" ").upper()
    dec_data = list(data)
    
    print(f"\n[+{timestamp:.2f}s] 📥 PAQUETE RECIBIDO:")
    print(f"   Hexadecimal : {hex_data}")
    print(f"   Decimal     : {dec_data}")
    print(f"   Longitud    : {len(data)} bytes")
    
    # Agregar a lista global para guardar posteriormente
    paquete = {
        "timestamp_relativo_s": round(timestamp, 3),
        "hex": hex_data,
        "decimal": dec_data,
        "longitud": len(data)
    }
    raw_data_capturada.append(paquete)

async def enviar_comando(client, char_uuid, comando_bytes, descripcion):
    """Envía un comando a la báscula de forma segura sin abortar la ejecución si falla."""
    print(f"📤 Enviando comando ({descripcion}): {comando_bytes.hex(' ').upper()}")
    try:
        # En la mayoría de básculas chinas funciona mejor mandar write sin esperar respuesta
        await client.write_gatt_char(char_uuid, comando_bytes)
        print("   ✅ Comando enviado.")
        await asyncio.sleep(1.0) # Pequeña pausa entre comandos
    except Exception as e:
         print(f"   ⚠️ Error al enviar comando: {e}")

async def capturar_medicion():
    global tiempo_inicio
    
    print("=" * 75)
    print("Iniciando captura de datos crudos de la báscula FEMMTO BCS15...")
    print("⚠️ IMPORTANTE: Súbase a la báscula para activarla AHORA MISMO.")
    print("=" * 75 + "\n")
    
    try:
        # Nos conectamos a la báscula
        async with BleakClient(FEMMTO_MAC, timeout=15.0) as client:
            if client.is_connected:
                print("✅ ¡Conectado exitosamente a la báscula!\n")
                
                # 1. Suscribirse a las notificaciones PRIMERO, para no perder primeros paquetes
                print("🎧 Suscribiéndose a notificaciones en FFB2...")
                await client.start_notify(CHAR_NOTIFY_FFB2, notificacion_handler)
                print("✅ Suscripción exitosa. Escuchando paquetes...\n")
                
                tiempo_inicio = time.time()
                
                # 2. Enviar comandos de inicialización secuenciales
                print("📡 Enviando secuencia de comandos de iniciación a FFB1...\n")
                comandos_a_probar = [
                    (bytearray([0xFD, 0x15, 0x01]), "Inicio de medición típico"),
                    (bytearray([0x10, 0x00]), "Comando 0x10 0x00"),
                    (bytearray([0xFF, 0xFD]), "Comando 0xFF 0xFD")
                ]
                
                for comando, desc in comandos_a_probar:
                    await enviar_comando(client, CHAR_WRITE_FFB1, comando, desc)
                
                # 3. Esperar la medición durante 30 segundos
                print("\n⏳ Permanezca en la báscula... Analizando datos por 30 segundos.")
                await asyncio.sleep(30.0)
                
                # 4. Detener notificaciones y desconectar
                print("\n🛑 Tiempo finalizado. Deteniendo captura...")
                await client.stop_notify(CHAR_NOTIFY_FFB2)
                
                # 5. Guardar el archivo JSON local
                nombre_archivo = "raw_data.json"
                with open(nombre_archivo, "w", encoding="utf-8") as f:
                    json.dump(raw_data_capturada, f, indent=4, ensure_ascii=False)
                    
                print(f"\n✅ ¡Éxito! Se han capturado y guardado {len(raw_data_capturada)} paquetes.")
                print(f"📁 Los datos crudos están disponibles en: {nombre_archivo}")
                
            else:
                print("❌ No se pudo mantener la conexión con la báscula.")
                
    except asyncio.TimeoutError:
         print("\n❌ Tiempo de espera agotado.")
         print("La báscula no respondió en 15 segundos. Asegúrese de estar subido en ella.")
    except BleakError as e:
        print("\n❌ Error del adaptador Bluetooth al conectar o leer.")
        print(f"Detalle técnico: {e}")
    except Exception as e:
        print(f"\n❌ Ocurrió un error inesperado: {e}")

if __name__ == "__main__":
    try:
        asyncio.run(capturar_medicion())
    except KeyboardInterrupt:
        print("\nEjecución cancelada manualmente.")
        # Guardado de emergencia si se cancela a la mitad
        if raw_data_capturada:
            with open("raw_data_partial.json", "w", encoding="utf-8") as f:
                json.dump(raw_data_capturada, f, indent=4)
            print(f"⚠️ Se guardaron parciales: {len(raw_data_capturada)} paquetes en 'raw_data_partial.json'")
