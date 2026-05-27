# PROYECTO.md — KUDOS

**Documento maestro del proyecto.** Si abres una sesión nueva con Cowork (Claude),
lee este documento primero. Aquí está todo lo que define qué es KUDOS, qué se está
construyendo y por qué.

Última actualización: 2026-05-25 · responsable de ejecución técnica: **Cowork (Claude)**
· responsable de producto: **Eduardo**.

---

## 1. Qué es KUDOS

> KUDOS es una capa de descubrimiento, mérito y memoria sobre el mundo real.

No es un mapa, ni una guía turística, ni una red social, ni una wiki.
**Es un sistema que organiza lo que merece ser descubierto en el mundo y por qué.**

Tagline oficial: **Mérito · Descubrimiento · Memoria**.

## 2. Producto wedge

La unidad de producto es la **Cápsula KUDOS**. Cada punto de interés (POI) del mundo
genera una cápsula compuesta por:

- Clip corto (~15 segundos)
- Hook narrativo (frase inicial que para el scroll)
- Resumen breve
- Mérito contextual (por qué este lugar lo merece)
- Fuentes verificadas

Objetivo de cada cápsula: **parar el scroll → sorprender → guardar → explorar**.

## 3. Pantallas

### HOME (Feed + Mapa toggle)
- **Feed** (modo principal): vídeo-first, clips de cápsulas, scroll vertical, discovery puro.
- **Mapa**: misma data en exploración espacial, POIs filtrados por mérito.

### MI MUNDO (destino del guardar)
- Mapa personal del usuario
- Colecciones automáticas
- Timeline
- Afinidad temática
- (Futuro: grafo personal)

### DETALLE DE LUGAR (Coliseo Romano etc.)
- Hero con cápsula destacada
- Galería de cápsulas múltiples del mismo lugar (Historia, Ingeniería, Curiosidades, etc.)
- Línea de tiempo del lugar
- Información rápida (construido, capacidad, estilo, material, dimensiones, mejor época)
- KUDOS MIND (chat con preguntas sugeridas)
- Resumen histórico
- Galería de imágenes
- Cápsulas cercanas

### MÉRITO (sistema de gamification)
- Merit Score (725/1000) + nivel + posición en comunidad
- 5 Pilares: Creación · Inspiración · Descubrimiento · Comunidad · Integridad
- Contribuciones recientes con puntos
- Logros desbloqueables
- Multiplicadores activos (racha, contenido validado, impacto social, invitar)
- Historial de mérito 30 días (gráfico)

### COMPARTIR CÁPSULA (modal)
- Share sheet con Instagram/WhatsApp/Facebook/TikTok/X/Mensajes/Correo
- Enlace directo + vista previa OG
- Personalización (qué campos incluir: título, descripción, ubicación, valoración, clip, comentario, hashtags)
- +25 mérito al compartir

## 4. Loop nuclear

```
Discover → Surprise → Save → Explore more
```

**Acción principal: GUARDAR.** Acciones secundarias: compartir · abrir mapa · ruta · abrir nodo.

## 5. Viral loop

```
Cápsula → Share → Curiosity → Nuevo usuario
```

Las cápsulas se comparten en redes como **artefactos sociales**. No se comparten posts.
Se comparten cápsulas de descubrimiento.

## 6. Content Engine — 3 niveles

- **Nivel 1 (POIs premium)**: vídeo IA completo, cápsula premium.
- **Nivel 2 (POIs medios)**: cápsula ligera / semi-dinámica.
- **Nivel 3 (long tail)**: ficha básica.

Asignación decidida por **algoritmo de mérito**.

## 7. Algoritmo fundacional

Variables:
- Curiosidad (dominante)
- Mérito objetivo
- Contexto
- Señal personal
- Señal social (futuro)

El algoritmo NO decide lo mejor universal. Decide **qué merece atención en este contexto**.

---

## 8. MVP 30 días — SÍ entra

- Feed de clips
- Mapa con POI nodes
- Cápsulas KUDOS (~15s, hook, resumen, mérito, fuentes)
- Save → Mi Mundo
- Share capsule
- Merit Engine básico
- Vídeo con voz contextual opcional

## 9. NO entra al MVP

- Huellas humanas públicas
- Ecos del pasado
- Social graph
- Amigos
- Comentarios
- Moderación compleja
- Time travel avanzado
- Cápsulas personales generadas por IA

## 10. Visión futura (Fase 2+)

- Huella humana ligera + cápsulas híbridas
- Human Trace Graph + Ecos del pasado + emotional intelligence contextual

KUDOS aspira a convertirse en: **Merit + Memory Graph of the World**.

---

## 11. Stack técnico actual (lo que ya existe)

### Backend: Django + PostgreSQL
- Repositorio principal `/kudos_project/` con `kudos_app/` (app principal) y `kudos_project/` (settings)
- Modelos clave: `User`, `Capsule`, `Place`, `Like`, `Activity`, `Bookmark`, `UserPreference`, `CapsuleVersion`, `Follow`, `DirectMessage`, `Notification`, `Badge`, `Certificate`
- Vistas: `kudos_app/views.py` (2.448 líneas, working tree íntegro)
- URLs: `kudos_app/urls.py` (215 líneas)
- 1.458 cápsulas en BD · 20 badges · 4 TemporalLandmark (Roma seed)
- Desplegado: `https://kudos-40cq.onrender.com` (Render free tier, HTTPS, PostgreSQL)

### Content Engine: `/content_engine/`
- Modelos: `PlaceCapsule`, `TemporalLandmark`, `WikidataGeoCache`, `GenerationAttempt`
- `echo_synthesis.py` (342 L): Anthropic Claude Haiku 4.5, tool-use enforced JSON, caché 30 días, fallback procedural Wikipedia + región-DNA
- `pipeline.py` (37 KB), `ranking.py` (19 KB), `truth_gate.py`, `media_generation.py`, `confidence.py`, `landmarks.py`
- 39 PlaceCapsule en BD
- Endpoints: `/api/capsules/viewport/`, `/api/landmarks/viewport/`, `/api/local-capsules/`, `/api/echo/synthesize/`

### Frontend: Next.js 15 (Experience)
- Carpeta `/experience/`
- Rutas: `inicio`, `mapa`, `merito`, `mi-mundo`, `places/[slug]`, `capsules/[slug]`, `mind`, `studio`, `echo/[id]`, `poi/[id]`, `perfil`, `time/rome`, `linea-tiempo`, `mis-memorias`, `momentos`, `notificaciones`, `ajustes`, `conexiones`, `invitar`
- Componentes shell-v4: `AppBottomNavV4`, `AppBrandV4`, `AppShellV4`, `AppTopBarV4`, `MeritToast`, `ShareCapsuleModal`, `VideoCapsule`, `HomeMapPanel`
- `strict TS errors = 0`, 99 archivos, 11.400+ líneas, Next 15

### Infraestructura
- `render.yaml` blueprint multi-servicio (kudos backend + frontend + DB)
- `build.sh` idempotente con migraciones + seed automático en cada deploy
- `requirements.txt` (2.6 KB) reproducible Render Linux
- HTTPS activo
- Backups pre-deploy

### Identidad visual (cerrada, no se toca)
- Logo principal + secundario + vertical
- Colores: `#1A1333` (fondo) · `#6C3CFF` (primary morado) · `#FF3CAC` (pink) · `#FF9A00` (orange) · `#FFD23F` (yellow) · `#F2F2F7` (white)
- Tipografía: **Poppins**
- Regla de oro: KUDOS representa mérito, autenticidad y conexión con el mundo

---

## 12. Roadmap MVP 30 días

Sobre la base existente, este es el plan honesto para tener un MVP coincidente con las maquetas:

### Semana 1 · días 1-7 · Limpieza + verificación operativa
- ✅ **Día 1 (HOY)** · Limpieza quirúrgica del repo (archivar AXÓN, snapshots, scripts viejos, docs históricos)
- ✅ **Día 1** · Crear PROYECTO.md y ESTADO.md
- Día 2 · Verificar `ANTHROPIC_API_KEY` en Render (Eduardo)
- Día 2 · Verificar HOME 200 en producción
- Día 3 · Auditar `experience/features/` real (qué de las maquetas ya está implementado)
- Día 4 · Smoke navegacional físico mobile (Eduardo)
- Día 5 · Lighthouse Mobile real (Cowork puede automatizar la captura)
- Día 6-7 · Inventario de gaps reales entre código y maquetas, ajustar plan

### Semana 2 · días 8-14 · Sistema de Mérito + Mi Mundo
- Modelos Django: `MeritEvent`, `MeritScore`, `Achievement`, `Multiplier`, `Streak`, `Route`, `Collection`, `CheckIn`
- API REST para Mérito + Mi Mundo
- Conectar pantallas `/merito` y `/mi-mundo` Experience al backend real
- Lógica de mérito en acciones (+25 share, +18 inspirar, +10 descubrir, +8 responder MIND, +15 validar)
- Multiplicadores activos según racha, validación, impacto, invitar

### Semana 3 · días 15-21 · Cápsulas vídeo 0:15 + Galería por lugar
- Modelo `VideoCapsule` con categorías (Historia, Ingeniería, Curiosidades, Reconstrucción 3D, Eventos)
- Pipeline de generación: imágenes Wikimedia + texto Anthropic + audio gTTS/ElevenLabs + montaje ffmpeg
- 6 cápsulas iniciales del Coliseo (Así luchaban los gladiadores, Cómo se construyó, El lado oscuro, En su máximo esplendor, Qué ocurrió exactamente aquí, Secretos escondidos)
- Galería en `/places/[slug]` con hero + carrusel
- Player vertical 0:15 fullscreen con subtítulos

### Semana 4 · días 22-30 · Share + KUDOS MIND + Pulido
- Share sheet enriquecido (Instagram/WhatsApp/Facebook/TikTok/X/Mensajes/Correo + personalización + +25 mérito toast)
- KUDOS MIND con preguntas sugeridas (las 3 que muestra la maqueta)
- Capas de mapa Presente/Historia/Experiencia/Comercio/Amigos + filtros Monumentos/Museos/Gastronomía/Naturaleza/Eventos
- Weather widget en mapa
- Onboarding + perfil con datos reales del sistema de Mérito
- Smoke final + Lighthouse + previews redes + tag `v1.0-mvp`

---

## 13. Cadena de mando y régimen de trabajo

- **Eduardo**: founder, máxima autoridad de producto. Decide qué se hace y qué no.
- **Cowork (Claude)**: cofundador técnico, responsable de ejecución 100% hasta MVP.
- **GPT-5**: fuera del equipo de ejecución (decisión 2026-05-25).

Régimen:
- Cowork trabaja autónomamente. No interrumpe a Eduardo salvo para decisiones que solo él puede tomar.
- Cada mensaje de Cowork lleva cabecera con número correlativo: `Msg N / ~35`.
- ESTADO.md se actualiza al final de cada mensaje (la bitácora viva del proyecto).
- Cuando hay que pedirle algo a Eduardo, va al final del mensaje en una sección clara `→ Necesito de Eduardo`.

---

## 14. Reglas de oro (no negociables)

1. **Las maquetas son la verdad del producto.** Si surge duda entre maquetas y código, mandan las maquetas.
2. **El Documento Estratégico Maestro (este, sección 1-10) es la verdad estratégica.**
3. **No abrir frentes nuevos.** Lo que NO entra al MVP (sección 9) no se construye ahora.
4. **No tocar identidad visual** (sección 11 · cerrada).
5. **Honestidad operativa.** Si algo no funciona, se dice. No optimismo artificial.
6. **El silencio es respuesta válida.** Eduardo no necesita responder a cada mensaje.
