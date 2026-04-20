import sys

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except AttributeError:
        pass


class FemmtoDecoder:
    """
    Clase reutilizable para decodificar los paquetes crudos de 20 bytes
    provenientes de la báscula Bluetooth FEMMTO BCS15.
    """

    def decodificar(self, paquete: list) -> dict:
        """
        Recibe una lista o bytearray de 20 bytes y retorna un diccionario
        con el estado, el peso en kg y la validez del paquete.
        """
        if len(paquete) != 20:
            return {
                "valido": False,
                "error": f"Longitud incorrecta. Se esperaban 20 bytes, se recibieron {len(paquete)}",
                "raw_bytes": list(paquete),
            }

        # Extraemos los bytes clave
        b2 = paquete[2]
        b3 = paquete[3]
        b4 = paquete[4]
        b5 = paquete[5]

        # 1. Identificar el tipo de paquete (Estado de estabilización)
        estado = "desconocido"
        impedancia_ohms = 0
        if b2 == 0x00:
            estado = "midiendo"
        elif b2 == 0x80:
            estado = "estabilizado"
        elif b2 == 0x01:
            estado = "final"
            impedancia_ohms = (paquete[6] << 8) | paquete[7]

        # 2. Calcular peso exacto usando B3, B4 y B5
        # Bit 17 está en el bit menos significativo de B3
        peso_gramos = ((b3 & 0x01) << 16) | (b4 << 8) | b5
        peso_kg = peso_gramos / 1000.0

        return {
            "valido": True,
            "estado": estado,
            "peso_kg": peso_kg,
            "impedancia_ohms": impedancia_ohms,
            "raw_bytes": list(paquete),
        }

    def imprimir_analisis(self, resultado_decodificado: dict):
        """
        Imprime en consola de manera clara el resultado del análisis del paquete.
        """
        if not resultado_decodificado.get("valido"):
            print(f"❌ [PAQUETE INVÁLIDO] {resultado_decodificado.get('error')}")
            return

        estado = resultado_decodificado["estado"]
        peso_kg = resultado_decodificado["peso_kg"]
        raw_bytes = resultado_decodificado["raw_bytes"]

        if estado == "midiendo":
            print(f"⚖️  [ MIDIENDO ] Peso inestable: {peso_kg:.2f} kg ...")
        elif estado == "estabilizado":
            print(f"✅ [ESTABILIZADO] Peso bloqueado: {peso_kg:.2f} kg")
        elif estado == "final":
            print("\n🎉 [PAQUETE FINAL] Composición Corporal Recibida")
            impedancia = resultado_decodificado.get("impedancia_ohms", 0)
            print(f"   (Impedancia extraída: {impedancia} Ω)")
            print("   Mapeo de los 20 bytes para ingeniería inversa:")
            print("   -------------------------------------------------")
            for i, byte_val in enumerate(raw_bytes):
                hex_val = f"{byte_val:02X}"
                # Destacamos los bytes que ya conocemos
                anotacion = ""
                if i == 2:
                    anotacion = " <-- FLAG ESTADO (0x01 = Final)"
                elif i in [3, 4, 5]:
                    anotacion = " <-- DATOS PESO / BIOMETRÍA"

                print(f"   B{i:02d}: Hex {hex_val} | Dec {byte_val:3d}{anotacion}")
            print("   -------------------------------------------------\n")
        else:
            print(
                f"❓ [DESCONOCIDO] (Byte 2 = 0x{raw_bytes[2]:02X}) Peso calculado: {peso_kg:.2f} kg"
            )


# Bloque de pruebas integrado si ejecutas únicamente este archivo
if __name__ == "__main__":
    decoder = FemmtoDecoder()

    print("\n--- PRUEBA DE DECODIFICADOR FEMMTO BCS15 ---\n")

    # 1. Paquete midiendo (Inestable) B2 = 0x00
    midiendo = [
        172,
        41,
        0,
        105,
        57,
        222,
        2,
        0,
        1,
        1,
        0,
        255,
        0,
        0,
        0,
        0,
        0,
        36,
        213,
        28,
    ]
    print("Prueba: Persona subiéndose e inestable")
    decoder.imprimir_analisis(decoder.decodificar(midiendo))

    # 2. Paquete estabilizado B2 = 0x80
    estabilizado = [
        172,
        41,
        128,
        105,
        57,
        22,
        2,
        0,
        1,
        1,
        0,
        255,
        0,
        0,
        0,
        0,
        0,
        36,
        213,
        20,
    ]
    print("Prueba: Persona estabilizada (Debe ser 80.15 kg)")
    decoder.imprimir_analisis(decoder.decodificar(estabilizado))

    # 3. Paquete final B2 = 0x01
    final = [172, 41, 1, 0, 1, 251, 2, 0, 1, 1, 0, 255, 0, 0, 0, 0, 0, 36, 214, 26]
    print("Prueba: Paquete final de impedancia (Composición)")
    decoder.imprimir_analisis(decoder.decodificar(final))
