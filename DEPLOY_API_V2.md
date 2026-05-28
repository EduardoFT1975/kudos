# Desplegar KUDOS API v2 en Render · guía paso a paso

> Para Eduardo · sin conocimientos de programación.
> Tiempo total: ~10 minutos · ~5 clicks.

---

## Qué hace esta API

Es el backend del **Capsule Engine v2** (los 9 módulos: POIs, Capsules, Merit,
Narrative, Media, Feed, Save, Nodes, Telemetry) que ya está construido en
`kudos_engine/apps/`. Hasta ahora solo corría en tu Mac/PC local con
`uvicorn ... --port 8001`. Esta guía lo pone en producción gratis.

---

## Antes de empezar

Necesitas tener:
- Tu cuenta de Render abierta (la misma del frontend KUDOS)
- Estos archivos ya en el repo (yo los he creado y subido):
  - `render.yaml` (raíz)
  - `kudos_engine/Dockerfile`
  - `kudos_engine/requirements.txt`

---

## Paso 1 · Asegúrate de que el push está hecho

En PowerShell:

```powershell
cd C:\Users\efert\kudos_project
git status
```

Debe decir `nothing to commit, working tree clean`. Si dice que hay cambios,
hazme saber.

---

## Paso 2 · Crea el Blueprint en Render (2 clicks)

1. Abre https://dashboard.render.com/blueprints
2. Click en **"New Blueprint Instance"** (botón arriba a la derecha)
3. Elige el repo `EduardoFT1975/kudos`
4. Render detectará `render.yaml` automáticamente
5. Verás 1 nuevo servicio: **kudos-api-v2** (Docker, plan Free)
6. Click **"Apply"** (sin tocar nada más)

Render empezará a construir la imagen. Tarda ~3-5 minutos la primera vez.

---

## Paso 3 · Copia la URL del nuevo servicio

Cuando termine el build, verás algo así:

```
✅ kudos-api-v2 · Live
   https://kudos-api-v2.onrender.com
```

Verifica que funciona abriendo esa URL en el navegador. Debes ver un JSON:

```json
{
  "service": "kudos-capsule-engine-v2",
  "status": "operational",
  "modules_loaded": ["pois", "capsules", "merit", ...]
}
```

Si ves eso → **API en producción** ✅

---

## Paso 4 · Conecta el frontend a la nueva API (1 click + 1 redeploy)

1. Ve al servicio **kudos-frontend** en Render
2. Click **"Environment"** (menú lateral izquierdo)
3. Click **"Add Environment Variable"**
4. Añade:
   - **Key**: `NEXT_PUBLIC_KUDOS_API_URL`
   - **Value**: la URL que copiaste antes, ej. `https://kudos-api-v2.onrender.com`
5. Click **"Save Changes"**
6. Render hará redeploy automático del frontend (~3 min)

---

## Paso 5 · Verifica que funciona

1. Abre tu KUDOS frontend en producción
2. Abre la consola del navegador (F12)
3. Deberías ver mensajes como `[KUDOS] API conectada · https://kudos-api-v2.onrender.com`
4. Cuando guardes un POI desde el bottom sheet → se persistirá en la API
   (no solo en localStorage)

---

## Notas importantes

### Free tier de Render

- El servicio se **duerme tras 15 minutos sin tráfico**
- Primera request tras dormido tarda ~50s en despertar
- Para producción real → upgradear a plan Starter ($7/mes) que no duerme
- Cuando crezcas → migrar el storage de JSON a Postgres (también en Render)

### Persistencia

El backend guarda datos en `kudos_engine/state/apps_v2/*.json`.
**IMPORTANTE**: el disco de Render Free **NO es persistente** — se borra al
redeploy. Para guardar datos de usuarios reales necesitas:
- Plan Starter + Disk attachment, O
- Migrar el `apps/core/db.py` de JSON a Postgres (1 día de trabajo)

Mientras tanto, los datos del backend (saves, visits, reactions, telemetría)
son **efímeros**. Para MVP de demo está bien.

### CORS

La API ya viene con `Access-Control-Allow-Origin: *` para que el frontend
pueda llamarla sin problemas. Cuando vayas a producción real, restringir
a tu dominio en `kudos_engine/apps/main.py`.

---

## Troubleshooting

**Build falla con "ModuleNotFoundError: pydantic"**
→ Render no instaló requirements. Click "Manual Deploy" → "Clear build cache & deploy".

**API responde 404 a /api/pois**
→ Faltan los routers. Verifica que `kudos_engine/apps/main.py` tiene todos los `include_router`.

**Frontend dice "Failed to fetch"**
→ Variable `NEXT_PUBLIC_KUDOS_API_URL` mal escrita o servicio dormido.
   Espera 50s e intenta de nuevo.

---

## Cuando esté todo

Avísame con un screenshot del JSON de `https://kudos-api-v2.onrender.com/`
y arrancamos el plan F3 (HUD lateral · search · weather · selector ciudad · resto del mockup).
