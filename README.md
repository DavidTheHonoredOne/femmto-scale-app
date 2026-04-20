# Femmto Scale App

Este proyecto permite la conexión y lectura de datos de la báscula inteligente **FEMMTO BCS15** a través de Bluetooth de Baja Energía (BLE) en Windows.

## Estructura del Proyecto

Esta es la estructura inicial del proyecto:

```text
femmto-scale-app/
│
├── backend/
│   ├── __init__.py                # Indica que 'backend' es un módulo de Python
│   ├── main.py                    # (Vacío) Punto de entrada futuro para la API o Core de la app
│   └── bluetooth/
│       ├── __init__.py            # Indica que 'bluetooth' es un sub-módulo
│       └── scanner.py             # Script principal de este commit para escanear dispositivos BLE
│
├── requirements.txt               # Dependencias de Python del proyecto (actualmente: bleak)
└── README.md                      # Documentación del proyecto (este archivo)
```

### Descripción de Archivos
- **`backend/bluetooth/scanner.py`**: El script principal que debes ejecutar. Escanea el entorno buscando dispositivos Bluetooth durante 10 segundos, manejando posibles errores si el Bluetooth está apagado, e identifica a la báscula FEMMTO resaltando su MAC, Nombre y nivel de señal.
- **`backend/main.py`** y archivos **`__init__.py`**: Archivos creados como base estructural para la futura implementación del servidor y la lógica de negocio.

## Requisitos Previos

1. Computadora con **Windows 11** (o Windows 10 actualizado).
2. Tener el **Bluetooth encendido** en Windows.
3. Tener instalado **Python 3.10 o superior**.

## Instrucciones de Instalación en Windows

1. **Abre PowerShell o Símbolo del Sistema** (CMD) y ubícate en la carpeta del proyecto.
   
2. **Crea un entorno virtual** para evitar conflictos de librerías (recomendado):
   ```cmd
   python -m venv venv
   ```

3. **Activa el entorno virtual** usando uno de estos comandos según tu terminal:
   - En **Símbolo del Sistema (CMD)**:
     ```cmd
     .\venv\Scripts\activate.bat
     ```
   - En **PowerShell**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
     *(Si PowerShell te da error de permisos, ejecuta primero: `Set-ExecutionPolicy Unrestricted -Scope CurrentUser`)*

4. **Instala las dependencias necesarias**:
   ```cmd
   pip install -r requirements.txt
   ```

## Instrucciones de Uso

1. Asegúrate de que el **Bluetooth de tu computadora está encendido**.
2. **Enciende la báscula** FEMMTO BCS15 (puedes presionarla ligeramente con el pie para que la pantalla encienda y se active su señal Bluetooth).
3. Estando en la carpeta del proyecto y con tu entorno virtual activado, ejecuta el simulador:
   ```cmd
   python backend/bluetooth/scanner.py
   ```
4. Verás en tu consola cómo el script busca dispositivos en tu entorno durante 10 segundos y **destacará visualmente** si encuentra la báscula, mostrando un mensaje de éxito.
