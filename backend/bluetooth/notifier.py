import asyncio
import json
import time
from bleak import BleakClient
from bleak.exc import BleakError

try:
    from backend.bluetooth.decoder import FemmtoDecoder
    from backend.bluetooth.algorithms import BodyMetricsCalculator
except ModuleNotFoundError:
    from decoder import FemmtoDecoder
    from algorithms import BodyMetricsCalculator

# PERFIL MOCK PARA CALCULAR EN ESTE COMMIT
PERFIL_USUARIO = {"height_cm": 170, "age": 19, "gender": "M"}

# MAC Address de la báscula FEMMTO BCS15
FEMMTO_MAC = "F8:F2:F0:B9:B4:E5"

# Características según el protocolo detectado en el paso anterior
CHAR_WRITE_FFB1 = "0000ffb1-0000-1000-8000-00805f9b34fb"  # Para enviar comandos
CHAR_NOTIFY_FFB2 = "0000ffb2-0000-1000-8000-00805f9b34fb"  # Para recibir datos

# Variables globales para almacenar la captura y controlar el estado UI
raw_data_capturada = []
tiempo_inicio = 0
decodificador = FemmtoDecoder()
calculadora = BodyMetricsCalculator()
ultimo_peso_estable = 0.0
_estado_anterior = None      # Para detectar transiciones de estado
_ya_bloqueo = False         # Para imprimir "Peso bloqueado" solo una vez


def notificacion_handler(sender, data: bytearray):
    global ultimo_peso_estable, _estado_anterior, _ya_bloqueo
    """Callback que procesa notificaciones mostrando solo transiciones relevantes."""
    timestamp = time.time() - tiempo_inicio

    resultado = decodificador.decodificar(list(data))
    estado = resultado.get("estado")
    peso_kg = resultado.get("peso_kg", 0)

    # --- 1. PESO INESTABLE ---
    if estado == "midiendo":
        # Solo imprimir si es la primera vez o si el peso cambia
        if _estado_anterior != "midiendo":
            print("\n" + "=" * 45)
            print("  ⏳ Subiendo a la báscula... peso detectado")
        print(f"\r  ⚖️  Peso inestable: {peso_kg:.2f} kg ...", end="", flush=True)
        _estado_anterior = "midiendo"

    # --- 2. PESO LLEGADO / BLOQUEADO ---
    elif estado == "estabilizado":
        if not _ya_bloqueo:
            # Primera vez que se estabiliza: nuevo mensaje limpio
            print(f"\n\n  ✅ Peso llegado:  {peso_kg:.2f} kg")
            print(f"  🔒 Peso bloqueado: {peso_kg:.2f} kg")
            print("  ⏳ Esperando impedancia corporal...")
            _ya_bloqueo = True
        ultimo_peso_estable = peso_kg
        _estado_anterior = "estabilizado"

    # --- 3. PAQUETE FINAL → BIOMETRÍA ---
    elif estado == "final":
        impedancia = resultado.get("impedancia_ohms", 0)
        if impedancia > 0 and ultimo_peso_estable > 0:
            metricas = calculadora.calculate_metrics(
                peso_kg=ultimo_peso_estable,
                altura_cm=PERFIL_USUARIO["height_cm"],
                edad_anos=PERFIL_USUARIO["age"],
                impedancia_ohms=impedancia,
                es_hombre=(PERFIL_USUARIO["gender"].upper() == "M"),
            )
            print("\n" + "=" * 45)
            print("  🧬 RESULTADO DE COMPOSICIÓN CORPORAL")
            print("=" * 45)
            print(f"  Peso:             {metricas['peso_kg']} kg")
            print(f"  IMC:              {metricas['imc']}")
            print(f"  Grasa Corporal:   {metricas['grasa_corporal_porcentaje']} %")
            print(f"  Masa Muscular:    {metricas['masa_muscular_kg']} kg")
            print(f"  Agua Corporal:    {metricas['agua_corporal_porcentaje']} %")
            print(f"  BMR:              {metricas['bmr_kcal']} kcal")
            print(f"  Edad Corporal:    {metricas['edad_corporal']} años")
            print(f"  Peso Estándar:    {metricas['peso_estandar_kg']} kg")
            print(f"  Impedancia BLE:   {impedancia} Ω")
            print("=" * 45 + "\n")
            resultado["metricas_calculadas"] = metricas
        else:
            print("\n  ⚠️ No se pudo calcular biometría (impedancia inválida).")

    # Guardar paquete crudo en JSON independientemente del estado
    paquete = {
        "timestamp_relativo_s": round(timestamp, 3),
        "hex": data.hex(" ").upper(),
        "decimal": list(data),
        "peso_kg_calculado": peso_kg,
        "estado": estado,
        "metricas": resultado.get("metricas_calculadas", None),
    }
    raw_data_capturada.append(paquete)


async def enviar_comando(client, char_uuid, comando_bytes, descripcion):
    """Envía un comando a la báscula de forma segura sin abortar la ejecución si falla."""
    print(f"📤 Enviando comando ({descripcion}): {comando_bytes.hex(' ').upper()}")
    try:
        # En la mayoría de básculas chinas funciona mejor mandar write sin esperar respuesta
        await client.write_gatt_char(char_uuid, comando_bytes)
        print("   ✅ Comando enviado.")
        await asyncio.sleep(1.0)  # Pequeña pausa entre comandos
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
                    (bytearray([0xFF, 0xFD]), "Comando 0xFF 0xFD"),
                ]

                for comando, desc in comandos_a_probar:
                    await enviar_comando(client, CHAR_WRITE_FFB1, comando, desc)

                # 3. Esperar la medición durante 30 segundos
                print(
                    "\n⏳ Permanezca en la báscula... Analizando datos por 30 segundos."
                )
                await asyncio.sleep(30.0)

                # 4. Detener notificaciones y desconectar
                print("\n🛑 Tiempo finalizado. Deteniendo captura...")
                await client.stop_notify(CHAR_NOTIFY_FFB2)

                # 5. Guardar el archivo JSON local
                nombre_archivo = "raw_data.json"
                with open(nombre_archivo, "w", encoding="utf-8") as f:
                    json.dump(raw_data_capturada, f, indent=4, ensure_ascii=False)

                print(
                    f"\n✅ ¡Éxito! Se han capturado y guardado {len(raw_data_capturada)} paquetes."
                )
                print(f"📁 Los datos crudos están disponibles en: {nombre_archivo}")

            else:
                print("❌ No se pudo mantener la conexión con la báscula.")

    except asyncio.TimeoutError:
        print("\n❌ Tiempo de espera agotado.")
        print(
            "La báscula no respondió en 15 segundos. Asegúrese de estar subido en ella."
        )
    except BleakError as e:
        print("\n❌ Error del adaptador Bluetooth al conectar o leer.")
        print(f"Detalle técnico: {e}")
    except Exception as e:
        print(f"\n❌ Ocurrió un error inesperado: {e}")


if __name__ == "__main__":
    try:
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop and loop.is_running():
            import nest_asyncio

            nest_asyncio.apply()
            print("✅ nest_asyncio aplicado para soportar Jupyter/Notebooks.")

        asyncio.run(capturar_medicion())

    except ImportError:
        print(
            "\n⚠️ Estás ejecutando esto dentro de un entorno interactivo (Jupyter/VSCode Interactive)."
        )
        print("En estos entornos ya existe un 'event loop' corriendo en segundo plano.")
        print("\nPara solucionarlo inmediatamente tienes 2 opciones:")
        print(
            "  1) Ejecuta la celda ingresando directamente: await capturar_medicion()"
        )
        print("  2) Abre la terminal y ejecuta: pip install nest_asyncio")

    except KeyboardInterrupt:
        print("\nEjecución cancelada manualmente.")
        # Guardado de emergencia si se cancela a la mitad
        if raw_data_capturada:
            with open("raw_data_partial.json", "w", encoding="utf-8") as f:
                json.dump(raw_data_capturada, f, indent=4)
            print(
                f"⚠️ Se guardaron parciales: {len(raw_data_capturada)} paquetes en 'raw_data_partial.json'"
            )
