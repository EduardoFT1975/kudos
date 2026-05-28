# KUDOS · Panel del Fundador

Una página única en tu PC desde la que controlas todo el sistema KUDOS sin tocar línea de código.

## Instalación (una vez)

```powershell
cd C:\Users\efert\kudos_project
python -m pip install fastapi "uvicorn[standard]" pydantic
```

## Arrancar el panel

```powershell
cd C:\Users\efert\kudos_project
python -m kudos_engine.control_panel
```

Abre en el navegador: **http://localhost:3001**

## Qué controlas desde el panel

| Sección | Acciones |
|---------|----------|
| **🎬 Worker** | Arrancar / Detener / Ver logs · contador POIs hechos/pendientes |
| **📍 POIs** | Regenerar cola (TOP 85) · Importar OSM por país (15 países pre-config) |
| **🔑 APIs** | Estado de Anthropic / OpenAI / Kling / ElevenLabs · pegar clave nueva |
| **🎥 Cápsulas** | Lista de MP4 generados · ver tamaño · borrar |
| **🚀 Git** | Branch · HEAD · commits pendientes push · push manual |
| **📊 Métricas** | Totales del sistema |

Refresca cada 5 segundos automáticamente.

## Atajo: arrancar al login de Windows

Crea `start_panel.bat` en `C:\Users\efert\kudos_project\`:

```bat
@echo off
cd C:\Users\efert\kudos_project
start "" /min python -m kudos_engine.control_panel
```

Y crea un acceso directo en `shell:startup` (Win+R → shell:startup → pega el .bat).

## Seguridad

- Solo escucha en `127.0.0.1` → nadie de fuera de tu PC puede entrar
- Las claves de API se guardan SOLO en memoria del proceso → se pierden al cerrar
  (intencional: nada de claves en disco sin tu permiso explícito)
- Para persistirlas: añádelas como variables de entorno de Windows:
  `[Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY", "sk-...", "User")`
