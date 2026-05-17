# MVP_GAPS.md — KUDOS

Última actualización: 2026-05-15
Objetivo del documento: listar lo que **falta** para que KUDOS sea lanzable. No tareas futuristas, no scope creep — solo gaps reales del MVP definido en `MVP_DEFINITION.md.txt`.

---

## 1. Identidad y acceso
- [ ] `django-allauth` instalado y configurado.
- [ ] Login con Google funcionando end-to-end.
- [ ] Login con Facebook, Instagram, X, TikTok (al menos uno adicional para validar el flujo multi-proveedor).
- [ ] Pantalla unificada de registro/login (sin formularios duplicados).
- [ ] Modelo `users` extraído a su propia app, con perfil y preferencias.

## 2. Mapa multidimensional
- [ ] Mapa Leaflet + OpenStreetMap renderizando en `/map/`.
- [ ] Slider temporal (máquina del tiempo) funcional sobre las cápsulas.
- [ ] Geolocalización del usuario con consentimiento (HTML5 Geolocation API).
- [ ] Marcador del usuario en el mapa.
- [ ] Notificaciones de cápsulas cercanas (al menos in-app; push opcional).
- [ ] Hover en cápsula → tooltip básico.
- [ ] Click en cápsula → modal con clip + info + fuente + compartir.

## 3. Repositorio temático de Sabiduría
- [ ] Navegación desde el mapa a un repositorio temático (Arte, Historia, Filosofía, Ciencia…).
- [ ] Categorías y subcategorías organizadas y navegables.
- [ ] Buscador básico de artículos/cápsulas.

## 4. Contenido (importación masiva)
- [ ] Comando estable `import_wikipedia` con rate-limit y reintentos.
- [ ] Comando estable `import_poi` (Overpass / OSM) con licencia preservada.
- [ ] Comando estable `import_unesco`.
- [ ] Importación por lotes con métricas (cápsulas insertadas, errores).
- [ ] Objetivo Fase 1: ≥ 50 000 cápsulas públicas con fuente y licencia.

## 5. IA generativa de clips
- [ ] Pipeline local mínimo reproducible: texto → resumen → voz (gTTS) → imágenes (Wikimedia) → clip (moviepy) 15s y 60s.
- [ ] Versionado de prompts para poder regenerar clips.
- [ ] Cola controlada (sin bucles 24/7 incontrolados).
- [ ] Fallback: si falla la generación, mostrar tarjeta estática con texto + imagen.

## 6. Personalización
- [ ] Modelo de preferencias por usuario (temas, épocas, geografías).
- [ ] Feed personal en `/feed/` que use esas preferencias.
- [ ] Marcadores (`/bookmarks/`) ya existen — verificar que funcionan en el flujo final.

## 7. Notificaciones
- [ ] `django-webpush` instalado.
- [ ] Suscripción push desde el navegador.
- [ ] Notificación de proximidad (cuando hay cápsula relevante cerca).

## 8. Compartir
- [ ] Botón compartir en la ficha de cápsula (URL canónica + OpenGraph + Twitter cards).
- [ ] Página pública de cápsula accesible sin login (con metadatos sociales).

## 9. Calidad y operación
- [ ] Smoke tests: home, dashboard, mapa, feed, login social, ficha de cápsula.
- [ ] `SECRET_KEY` y `DEBUG` solo desde `.env`.
- [ ] Activar `Pillow` y `requests` en `requirements.txt`.
- [ ] Sacar `db.sqlite3` del repo y del despliegue.
- [ ] Migración a PostgreSQL antes del despliegue público.
- [ ] WhiteNoise validado para servir estáticos en Render/Railway.
- [ ] `full_autopilot` deshabilitado por defecto en producción (o reemplazado por scheduler controlado).

## 10. Despliegue
- [ ] Deploy en Render o Railway (plan gratuito) con dominio temporal.
- [ ] HTTPS activo.
- [ ] Variables de entorno documentadas en `.env.example`.
- [ ] Backup básico de la base de datos.

---

## Fuera del MVP (Fase 2+, no tocar ahora)
Blockchain, IPFS, token $TIME, AR/VR, DAO, marketplace, hogares 5D, salud predictiva, comité de sabios global, ligas deportivas virtuales.
Estas funciones aparecen en `INSTRUCCIONES.md` y en partes del código (carpetas `blockchain/`, `ar_vr/`, `ipfs/`), pero **no entran al lanzamiento inicial**. Mantener desactivadas o sin promover hasta que el núcleo esté consolidado.
