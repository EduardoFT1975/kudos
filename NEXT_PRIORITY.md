# NEXT_PRIORITY.md — KUDOS

Última actualización: 2026-05-15
Pregunta de oro: *“¿Cuál es la acción más importante para acercar KUDOS a un lanzamiento real?”*

---

## Próximo paso exacto (esta semana)

**Endurecer seguridad y desbloquear el login social.**
Sin login social no hay MVP, y sin `SECRET_KEY` segura no podemos desplegar nada público.

### Tareas concretas (en orden)

1. **Saneamiento de configuración (1–2 h)**
   - Forzar `SECRET_KEY` y `DEBUG` desde `.env` en `kudos_project/settings.py`.
   - Si falta `SECRET_KEY`, abortar arranque con error claro.
   - Verificar que `.env` está en `.gitignore` y que no contiene secretos reales subidos al repo.

2. **Limpieza mínima del repo (30 min)**
   - Añadir `db.sqlite3` y `__pycache__/` a `.gitignore`.
   - Activar `Pillow` y `requests` en `requirements.txt` (siguen comentados).

3. **Crear app `users` (½ día)**
   - Generar app Django `users`.
   - Mover modelo de usuario custom + preferencias.
   - Actualizar `AUTH_USER_MODEL` y migraciones.
   - Smoke test: `python manage.py migrate` limpio y arranque OK.

4. **Instalar y configurar `django-allauth` con Google (½ día)**
   - `pip install django-allauth` y añadir a `INSTALLED_APPS`.
   - Configurar `SocialApp` para Google (credenciales en `.env`).
   - Plantilla unificada `/accounts/login/`.
   - Probar login end-to-end con una cuenta real de Google.

5. **Smoke tests mínimos (2 h)**
   - Tests para: `/`, `/dashboard/`, `/map/`, `/feed/`, `/accounts/login/`.
   - Que pasen en CI local (`python manage.py test`).

### Criterio de “hecho”
- El proyecto **no arranca** sin `.env` con `SECRET_KEY`.
- Un usuario nuevo puede registrarse vía Google y aterrizar en `/dashboard/`.
- `python manage.py test` ejecuta ≥ 5 tests y todos verdes.
- `git status` limpio (sin `db.sqlite3` ni `__pycache__`).

---

## Después de esto (orden sugerido)
1. Mapa Leaflet + slider temporal + geolocalización del usuario.
2. Pipeline local de clips (gTTS + Wikimedia + moviepy).
3. Importación masiva controlada (Wikipedia → Overpass → UNESCO).
4. Migración a PostgreSQL.
5. Deploy en Render (gratuito) con dominio temporal.

---

## Regla
No abrir ningún frente nuevo (blockchain, AR/VR, DAO, comité de sabios, etc.) hasta que **el paso 1 de esta lista** esté completo y verificado.
