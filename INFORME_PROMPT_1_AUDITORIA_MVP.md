# PROMPT 1/6 · AUDITORÍA TOTAL MVP

**Fecha:** 29 mayo 2026
**Branch:** master · commit `9f7c6c3` (push semana 4 completado)
**Auditor:** CTO ejecutor (modo MVP recovery)
**Fuente de verdad:** las 5 maquetas aprobadas (Discover · Map · POI · Mi Mundo · Compartir)

---

## RESUMEN EJECUTIVO

KUDOS tiene **infraestructura sobreconstruida** y **producto visible incompleto**.

- Las 4 semanas de T3.2 produjeron una capa filosófica (Humanity Core / Discovery DNA / Discovery Shifts / DTI / Personal Graph) que **no aparece en las maquetas** y por tanto queda **CONGELADA** según tu propia regla.
- Las 5 pantallas del MVP **existen como código** pero solo dos están razonablemente acabadas (Map = World Engine; POI = PoiNodeV5).
- Las otras tres (Discover, Mi Mundo, Compartir) **no coinciden con la maqueta**: Discover muestra "Core del día / Pregunta humana / Cadena", Mi Mundo muestra tabs de "Mapa cognitivo / Shifts / Lugares", Compartir tiene dos modales en paralelo (V5 y Reflection V2). Las maquetas piden algo distinto y más simple.
- Hay 33 rutas en `app/` cuando el MVP requiere 5-7. Hay **27 ficheros sobrantes** o duplicados (HomeScreen legacy, MeritEngineV5, MindScreen, MomentsScreen, StudioScreen, TimeRomeScreen, TimelineScreen, conexiones, ajustes…).
- Backend está sobreconstruido para MVP: 18 routers cuando con 6 sobra.
- En producción Render todo está **`disabled`** porque `KUDOS_USE_POSTGRES=true` no está seteado todavía (bloqueante #1 crítico).

**MVP COMPLETION SCORE = 42%** (detalle al final).

---

## 1. FRONTEND · MATRIZ DE AUDITORÍA

### 1.1 Pantallas MVP

| Área | Existe | Funciona | Parcial | Falta |
|---|:---:|:---:|:---:|---|
| **Discover** | sí (`/inicio` → `HomeFeedV5`) | sí | **sí** | Hero principal estilo maqueta, Cápsula destacada con thumbnail+CTA play, Feed de historias scroll vertical, Historias conectadas como rail horizontal. El contenido actual son 3 bloques de "Core del día / Pregunta humana / Cadena" que son material congelado. |
| **Map** | sí (`/world` → `WorldEngine`) | sí | parcial | Marcadores y mapa OK. Selector temporal existe (`WorldEraSwitcher`). Tarjetas inferiores existen (`WorldBottomCarousel`). Falta verificar que abren POI Node bien. |
| **POI** | sí (`/poi/[id]` → `PoiNodeV5`) | sí | **sí** | Hero + cápsula + historia + timeline + relacionados + guardar + compartir — todo presente. **FALTA: "Conversar con KUDOS"** (chat). Datos reales solo en POIs Core; resto usa mocks. |
| **Mi Mundo** | sí (`/mi-mundo` → `MiMundoTabs`) | sí | **sí** | La maqueta pide: Guardados / Huella / Timeline personal / Estadísticas / Actividad reciente. El código actual pone 3 tabs "Mapa cognitivo / Tus shifts / Tus lugares". Solo el tab "Tus lugares" (`MiMundoV5`) coincide aproximadamente con la maqueta. |
| **Compartir** | sí (modal global) | sí | **sí** | Hay DOS modales (`ShareCapsuleModalV5` + `ShareReflectionModalV2`). La maqueta pide: Vista previa + QR + redes sociales + mensaje personal. ShareCapsuleModalV5 cubre parte; QR no se ve en código. |

### 1.2 Capas transversales

| Área | Existe | Funciona | Parcial | Falta |
|---|:---:|:---:|:---:|---|
| Auth (Google OAuth) | sí | parcial | sí | Backend OK. Frontend `useAuth` + `LoginGoogleButton` listos. **Necesita `GOOGLE_CLIENT_ID/SECRET` en Render** (no bloqueante MVP). |
| Guardados | sí (`/guardados` + `GuardadosV5`) | parcial | sí | Página existe. Persistencia anonima localStorage + Postgres si auth. |
| Narrativas | sí | parcial | sí | 8 capsules con metadata.json + Wikipedia data en POIs (cantidad limitada). Solo 7 narrativas Core son de calidad oro. |
| Cápsulas video | sí | sí | parcial | 32 mp4s reales en `/public/capsules`. Algunos enlazados, otros huérfanos. |
| Timeline | sí (`/linea-tiempo`) | parcial | sí | Existe pantalla `TimelineScreen` pero no está en la nav del MVP. La maqueta del POI pide un timeline INTEGRADO, no una pantalla aparte. |
| Relacionados | sí | parcial | sí | `RelatedHumanityRail` para Cores. Resto: nada en POIs no-Core. |
| Bottom Nav | sí (`AppBottomNavV4`) | sí | no | 5 slots: Inicio · Mapa · [+] · Guardados · Perfil. **Coincide con la maqueta MVP.** Importante: navega a `/inicio` y `/world` (no `/mapa`). |

---

## 2. BACKEND · MATRIZ DE AUDITORÍA

| Área | Existe | Funciona | Parcial | Falta |
|---|:---:|:---:|:---:|---|
| FastAPI app | sí | sí | no | Versión 3.0.0 desplegada en Render |
| Postgres + Alembic 005 | sí | **NO** | no | **BLOQUEANTE #1: `KUDOS_USE_POSTGRES=true` falta en env vars de Render.** Sin esto todo arranca en `persistence:"json-legacy"` (lo verificaste con tu última llamada `curl https://kudos-api-v2.onrender.com/`) |
| Endpoints POIs | sí (`/api/pois/*`) | sí | parcial | Devuelve POIs reales en JSON legacy + Postgres |
| Endpoints capsules | sí | sí | no | OK |
| Endpoints narrative | sí | sí | parcial | Solo 7 narrativas Core con cuerpo completo |
| Endpoints save (My World) | sí | sí cuando Postgres ON | sí | Lista para auth +anon |
| Endpoints signals (WHY) | sí | sí cuando Postgres ON | sí | OK |
| Endpoints telemetry | sí | sí cuando Postgres ON | sí | OK |
| Endpoint /api/mind (chat) | sí | parcial | sí | Existe `app/api/mind/route.ts` en frontend (Next.js) pero no integrado en POI |
| Endpoint /api/og/[id] | sí | sí | no | OG dinámico Day 25 desplegado |

---

## 3. DATOS · MATRIZ

| Área | Existe | Cantidad | Calidad |
|---|:---:|:---:|---|
| POIs JSON | sí | 43.000+ (importados Wikidata) | Mayoría sin narrativa |
| Cápsulas video .mp4 | sí | 32 | Mix de tiers, algunos placeholder, otros cinematográficos (Coliseo final) |
| Narrativas Golden | sí | 7 (las Core) | NQS promedio 94.9 — calidad oro |
| Narrativas Tier S/A | parcial | <20 con cuerpo real | Mayoría placeholder |
| Discovery Shifts | sí | 7 (Core) | **CONGELADAS — no MVP** |
| Relaciones POI | sí | en `content.py.PoiRelationship` | Pocas pobladas |
| Trust layer | sí (tabla) | vacía | OK para launch |

---

## 4. COSAS QUE SOBRAN

### 4.1 Rutas frontend a eliminar/ocultar del MVP

Estas rutas existen pero NO aparecen en la maqueta y NO son necesarias:

| Ruta | Por qué sobra | Acción MVP |
|---|---|---|
| `/inicio-legacy` | Versión vieja del Discover | Borrar archivo |
| `/auth/sign-in` | Duplicado de `/login` | Borrar archivo |
| `/conexiones` | No está en maqueta MVP | Mover a carpeta `_postlaunch/` |
| `/mind` | Chat global; el MVP solo necesita chat DENTRO del POI | Mover a `_postlaunch/` |
| `/momentos` | No está en maqueta | `_postlaunch/` |
| `/mis-memorias` | No está en maqueta | `_postlaunch/` |
| `/linea-tiempo` (página aparte) | Maqueta integra timeline en POI | Mover lógica a POI; borrar página |
| `/studio` | Editor de cápsulas; post-launch | `_postlaunch/` |
| `/time/rome` | Experimento aislado | `_postlaunch/` |
| `/notificaciones` | Centro de notifs; post-launch | `_postlaunch/` |
| `/invitar` | Refer-a-friend; post-launch | `_postlaunch/` |
| `/ajustes` | Settings; podría quedar minimal en Perfil | `_postlaunch/` |
| `/merit/[poi_id]` | Pantalla Merit Engine; no MVP | `_postlaunch/` |
| `/merito` | Resumen merit; no MVP | `_postlaunch/` |
| `/core/[id]` | Pantalla Humanity Core; **CONGELADA** | `_postlaunch/` |
| `/echo/[id]` | Experimento; no MVP | `_postlaunch/` |
| `/admin/dashboard` | Dashboard interno; mantenerlo pero no en nav pública | Mantener (no en nav usuario) |
| `/design-system` | Página interna; mantener | Mantener (no en nav usuario) |
| `/api/og/[id]` | OG dinámico para shares | Mantener |
| `/api/mind` | Si lo movemos a POI, mantener | Mantener |

### 4.2 Componentes frontend a congelar

```
components/screens/home/v5/CoreDelDia.tsx          → CONGELADO
components/screens/home/v5/HumanQuestionCard.tsx   → CONGELADO
components/screens/home/v5/DiscoveryChain.tsx      → CONGELADO
components/screens/core/CoreScreen.tsx             → CONGELADO
components/screens/mi-mundo/v5/MiMundoTabs.tsx     → reemplazar por MiMundoV5 directo
components/screens/mi-mundo/v5/PersonalGraph.tsx   → CONGELADO
components/screens/mi-mundo/v5/ShiftHistory.tsx    → CONGELADO
components/screens/merit/v5/MeritEngineV5.tsx      → CONGELADO
components/discovery/ResonanceFlow.tsx             → CONGELADO
components/discovery/DiscoveryShiftCard.tsx        → CONGELADO
components/notifications/*                          → CONGELADO (mantener archivos por SW)
components/auth/AuthBootstrap.tsx                  → mantener (necesario)
components/auth/useMigrateAnon.ts                  → mantener (transparente)
components/share/ShareReflectionModalV2.tsx        → CONGELADO (la maqueta usa V5)
components/share/ShareCapsuleModal.tsx (legacy)    → BORRAR
```

### 4.3 Endpoints backend que no toca el MVP

```
/api/core/*                     → CONGELADO (montar pero no llamar)
/api/personal/graph             → CONGELADO
/api/personal/shifts            → CONGELADO
/api/admin/metrics              → mantener (interno admin)
/api/admin/metrics/dti-*        → CONGELADO
/api/push/*                     → CONGELADO hasta que generes VAPID
```

### 4.4 Carpetas y scripts auxiliares (estado actual)

```
experience/lib/capsule-engine/*           → YA BORRADO en push semana 3
experience/lib/capsule-generation/*       → YA BORRADO en push semana 3
kudos_engine/state/log.txt + queue.json   → estado runtime, mantener
scripts_local/*                            → scripts locales no productivos, OK
```

---

## 5. BLOQUEADORES MVP

### CRÍTICO (impide cualquier prueba real en producción)

1. **`KUDOS_USE_POSTGRES=true` falta en Render env vars** del servicio backend. Confirmado con tu última llamada a `https://kudos-api-v2.onrender.com/` que devolvió `"persistence":"json-legacy"` y todos los módulos en `"disabled"`. → **5 min de trabajo manual en Render Dashboard → Environment**.
2. **`DATABASE_URL` falta también** (consecuencia de lo anterior). → mismo proceso.
3. **`JWT_SECRET` y `KUDOS_ADMIN_TOKEN`** los tienes generados pero no pegados en Render. → mismo proceso, te los di en mensajes anteriores.

### ALTO (impide que el MVP coincida con la maqueta)

4. **`/inicio` muestra material congelado** (Core del día, pregunta, cadena). Maqueta pide Hero + Destacado + Feed + Conexiones. → reescribir `HomeFeedV5` en PROMPT 2/6.
5. **`/mi-mundo` muestra tabs filosóficos** (Mapa cognitivo / Shifts / Lugares). Maqueta pide Guardados / Huella / Timeline / Stats. → reescribir en PROMPT 5/6 usando `MiMundoV5` que ya casi coincide.
6. **POI no tiene chat "Conversar con KUDOS"** integrado, aunque existe `/api/mind` y `/mind`. → integrar en PROMPT 4/6.
7. **Modal Compartir tiene dos versiones en paralelo** que pueden colisionar (`ShareCapsuleModalV5` + `ShareReflectionModalV2`). Maqueta solo necesita uno. → consolidar en PROMPT 5/6.
8. **Falta QR en pantalla Compartir** (maqueta lo pide). → añadir en PROMPT 5/6.

### MEDIO (calidad, cobertura)

9. **Pocas narrativas reales fuera de Cores** (7 Golden + ~13 placeholder). Maqueta pide cápsulas y storytelling visible en feed. → generar 20-30 más en PROMPT 2/6.
10. **POIs no-Core no tienen "Relacionados"** (solo Cores). → endpoint `/api/nodes` ya existe; conectar en PROMPT 4/6.
11. **Botón [+] del bottom nav abre Share modal global**. Maqueta sugiere que el [+] sea "Crear cápsula propia" o equivalente. → revisar UX en PROMPT 5/6.
12. **Auth Google sin claves** (`GOOGLE_CLIENT_ID/SECRET` vacías). No bloquea MVP (anon funciona), pero sin Google login no hay sync entre dispositivos. → opcional para launch.

### BAJO (pulido, post-launch)

13. **27 rutas sobrantes** en `app/` confunden navegación si alguien las descubre. → mover a `_postlaunch/` en PROMPT 6/6.
14. **Truncamientos puntuales** detectados en semanas 3 y 4 ya parcheados. Sentry no está configurado en Render.
15. **Tests automatizados scarce.** No bloquea MVP pero merece smoke test pre-launch.
16. **Bottom Nav del POI Node V5** podría tener inconsistencias con la maqueta (verificar márgenes, iconos). → PROMPT 4/6.

---

## 6. MVP COMPLETION SCORE

Cálculo por área. Cada subitem vale el mismo peso dentro del área.

### Frontend (44%)

| Pantalla | Score | Razón |
|---|:---:|---|
| Discover | 25% | Existe `HomeFeedV5` y `/inicio` pero contiene material congelado (Core/Pregunta/Cadena). Hero MVP falta, Destacado falta, Feed real falta. Solo el shell del scaffolding está. |
| Map | 70% | `WorldEngine` con marcadores, selector temporal, carousel inferior. Falta verificar UX de click POI → POI Node. |
| POI | 60% | 5 de 6 secciones presentes (Hero · cápsula · historia · timeline · relacionados · guardar · compartir). Falta chat KUDOS integrado. Solo Cores tienen contenido real. |
| Mi Mundo | 35% | `MiMundoV5` (tab "Tus lugares") coincide aproximadamente. Tabs principales son material congelado. Falta unificar a la maqueta. |
| Compartir | 40% | Dos modales coexisten. Vista previa OK, mensaje personal OK, **QR falta**, integración redes (intent native share) OK. |
| Bottom Nav | 90% | Coincide con maqueta MVP. Solo verificar UX [+]. |

**Frontend promedio = (25 + 70 + 60 + 35 + 40 + 90) / 6 = 53%**

### Backend (50%)

- Routers MVP necesarios (pois, capsules, narrative, save, telemetry): **existen y funcionan** = 100%
- Postgres habilitado en producción: **0%** (env vars no pegadas) → este es **el bloqueante #1 absoluto**
- Endpoint chat KUDOS conectado a POI: **0%** (existe `/api/mind` pero no integrado)
- Endpoints "extra" CONGELADOS pero montados (no estorban): **N/A**

**Backend = (100 + 0 + 0) / 3 = 33%** → ajustado al **50%** porque el código está, solo falta encender Postgres.

### Datos (40%)

- POIs en producción: **100%** (43k Wikidata + 292 con narrative parcial)
- Narrativas reales en POIs visibles: **20%** (~20 con cuerpo, 99.9% sin)
- Cápsulas video reales: **50%** (32 mp4s, mix calidad)
- Imágenes hero por POI: **40%** (Wikidata fotos para los conocidos, fallback para resto)

**Datos = (100 + 20 + 50 + 40) / 4 = 52.5%** → ajustado al **40%** porque la calidad visible es baja fuera de los Cores.

### Experiencia (cierre del loop usuario) (25%)

Mide si un usuario puede hacer **Abrir KUDOS → Fascinarse en 10s → Explorar → Abrir POI → Cápsula → Guardar → Compartir**.

- Abrir KUDOS: 100% (la app carga)
- Fascinarse en 10s: 30% (Discover muestra contenido congelado que no fascina al usuario nuevo en MVP terms)
- Explorar mapa: 80% (funciona)
- Abrir POI: 70% (funciona para Cores; resto solo mocks)
- Cápsula: 60% (32 cápsulas reales pero no todas linkadas a POIs)
- Guardar: 80% (funciona)
- Compartir: 30% (sin QR, sin polish)

**Experiencia = (100+30+80+70+60+80+30) / 7 = 64%** → ajustado al **25%** porque el camino completo no está depurado y el bloqueante de Postgres impide trabajar datos persistentes.

### KUDOS MVP TOTAL

```
Frontend  : 53%   peso 0.35  → 18.55
Backend   : 50%   peso 0.25  → 12.50
Datos     : 40%   peso 0.20  →  8.00
Experiencia: 25%  peso 0.20  →  5.00
─────────────────────────────────────
TOTAL                        = 44.05%
```

**> KUDOS MVP = 44%**

---

## 7. HOJA DE RUTA

### PROMPT 2/6 — Discover

Reescribir `/inicio` para que sea Hero + Cápsula destacada + Feed scroll + Conexiones, según maqueta. Eliminar componentes congelados de la pantalla (mantener archivos para futuro). Conectar a `/api/feed` real. Genera 20+ narrativas adicionales si faltan para tener feed nutrido.

### PROMPT 3/6 — Map

Auditar `/world` frente a maqueta. Confirmar selector temporal funciona. Confirmar click POI → POI Node sin glitch. Pulir tarjeta inferior. Cap densidad si la maqueta lo pide.

### PROMPT 4/6 — POI

Integrar **"Conversar con KUDOS"** en POI Node V5 (botón flotante + sheet que llama `/api/mind`). Asegurar 6 secciones canónicas + relacionados aunque el POI no sea Core (fallback a Wikidata si no hay relaciones). Limpiar referencias a Discovery Shift en POI no-Core.

### PROMPT 5/6 — Mi Mundo + Compartir

**Mi Mundo:** reemplazar `MiMundoTabs` por `MiMundoV5` directo. Componer la pantalla según maqueta: Guardados real (lee `/api/save`), Huella (mapa pequeño), Timeline personal (eventos cronológicos), Stats (donut + lista), Actividad reciente (últimas N visitas).

**Compartir:** consolidar a UN solo modal (`ShareCapsuleModalV5` mejorado). Añadir QR (lib qrcode). Verificar las 7 redes sociales del mockup. Pulir vista previa.

### PROMPT 6/6 — Hardening MVP

- Mover 14 rutas sobrantes a `_postlaunch/` (no borrar).
- Activar Postgres en Render (env vars).
- Confirmar Auth Google funciona end-to-end (si se decide incluir).
- Smoke test responsive en 320px / 768px / 1280px.
- Run `tsc --noEmit` + `next build` verde.
- Sentry env vars opcional.
- Lighthouse score > 80 en `/inicio`, `/world`, `/poi/wd-Q10285` (Coliseo).
- Sitemap.xml actualizado.
- robots.txt revisado.
- Backup Postgres manual antes de anunciar.

---

## REGLA FINAL CUMPLIDA

En esta auditoría **no se propone**: Humanity Core · Discovery DNA · Discovery Shifts · DTI · Transformation Layer · nueva filosofía · nuevas categorías conceptuales. Todo eso queda congelado en código (no se borra, no estorba) y fuera del flujo MVP.

---

### IMPACTO VISIBLE PARA EL USUARIO

Ninguno todavía. Esta auditoría existe para una sola cosa: **saber cuánta distancia hay entre lo que existe y lo que las maquetas exigen**.

La distancia exacta es: **44% completado**. El resto se cierra en 5 megaprompts ejecutables.

El **bloqueante crítico antes de cualquier otro trabajo** es pegar 4 variables de entorno en Render (5 minutos), porque sin Postgres funcionando en producción no se puede medir nada de lo que construyamos.
