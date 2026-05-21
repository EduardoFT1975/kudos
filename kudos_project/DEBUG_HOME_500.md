# KUDOS · Debug 500 en `/` · Aislamiento runtime

**Fecha:** 2026-05-17
**Estado:** Render LIVE · infra OK · `/` devuelve 500 con DEBUG=True (custom page).

---

## 1. Auditoría inicial

Ruta `/` resuelve a:
- `kudos_project/urls.py:36` → `include('kudos_app.urls')`
- `kudos_app/urls.py:13` → `path('', views.home, name='home')`
- `views.home` (línea 64) ejecuta:
  1. 2 queries `Capsule.objects.filter(privacy='publico')`
  2. `_site_stats()` helper
  3. `render(request, 'home.html', context)`
- **Context processor** `kudos_app.context_processors.global_context` ejecuta **siempre**:
  - Define `PROJECT_NAME`, `PROJECT_TAGLINE`, `PROJECT_PHASES` (3 items hardcoded).
  - Si `request.user.is_authenticated`: query `Notification.objects.filter(user, read=False).count()` y lee `request.user.dark_mode`.
- **Middleware activo**: stack Django estándar + WhiteNoise + `kudos_project.middleware.DormantRouteMiddleware`.
- **handler500 / handler404**: no custom → defaults Django/Render.

---

## 2. Fix temporal aplicado

### Cambios en `kudos_app/views.py`

Añadida vista `healthcheck` ANTES de `home`:

```python
def healthcheck(request):
    """AXÓN · debug-home · Ruta minimal sin DB, sin template, sin context."""
    from django.http import HttpResponse
    return HttpResponse(
        "KUDOS LIVE · v0.9-axon-core · healthcheck OK\n…",
        content_type="text/plain; charset=utf-8",
    )
```

**Características clave:**
- No toca base de datos
- No renderiza template
- No depende de context processor
- Sólo importa `HttpResponse` localmente
- 7 líneas de código total

### Cambios en `kudos_app/urls.py`

**Antes (línea 13):**
```python
path('', views.home, name='home'),
```

**Después (líneas 16-17):**
```python
path('', views.healthcheck, name='home'),
path('home/', views.home, name='home_full'),   # home original accesible aquí
```

> **Importante:** `name='home'` se preserva en healthcheck para que ningún `{% url 'home' %}` rompa en templates. La home original sigue disponible en `/home/` con `name='home_full'`.

---

## 3. Cómo interpretar el resultado tras deploy

| Resultado en `/` (productivo) | Diagnóstico |
|---|---|
| **200 con texto "KUDOS LIVE …"** | Infra está bien. Problema está EN `home` view o `home.html` template. Pasar al §4. |
| **Sigue 500** | Problema NO está en `home`. Está en middleware, context processor, settings o DB connection. Pasar al §5. |

---

## 4. Si healthcheck=200 → diagnosticar `home`

Posibles causas del 500 en `home`:

| Causa | Síntoma | Test |
|---|---|---|
| BD productiva no migrada (tabla `kudos_app_capsule` no existe) | `ProgrammingError: relation does not exist` | `python manage.py migrate --plan` |
| `_site_stats()` falla | excepción dentro del helper | revisar logs Render para el traceback exacto |
| `home.html` referencia `{% static 'css/X.css' %}` que no resuelve en ManifestStaticFilesStorage | `ValueError: Missing staticfiles manifest entry for X` | `python manage.py findstatic css/X.css` (local) |
| `home.html` usa `{% url 'Y' %}` con `Y` que no existe | `NoReverseMatch: 'Y' is not a valid view function` | `grep -n "{% url" kudos_app/templates/home.html` |
| Template `home.html` extends `base.html` que tiene refs rotas | mismas que arriba | revisar `base.html` |
| Privacy field `'publico'` no existe en BD productiva nueva | `Capsule.objects.filter(privacy='publico')` retorna vacío sin error, NO causa 500 | irrelevante |

**Acción siguiente recomendada tras leer logs:**

Visitar `/home/` (la ruta nueva con `name='home_full'`) y ver el error exacto. El log de Render mostrará el traceback completo.

---

## 5. Si healthcheck también = 500 → problema NO en home

Posibles causas:

| Causa | Test |
|---|---|
| `DormantRouteMiddleware` falla al cargar `features.py` | `KUDOS_GATING_OFF=1` en env vars de Render, redeploy, retest healthcheck |
| Context processor `global_context` falla porque `Notification` no migró | en logs aparece `ProgrammingError: relation "kudos_app_notification" does not exist` |
| `settings.SECRET_KEY` no se valida | excepción `RuntimeError: SECRET_KEY no está definida` |
| `STATIC_ROOT` o `MEDIA_ROOT` no escribibles | excepción en `collectstatic` (ya pasó, fue resuelta) |
| `DATABASE_URL` mal formado / DB inaccesible | excepción `OperationalError: could not connect to server` |
| `ALLOWED_HOSTS` no incluye `*.onrender.com` o tu dominio | `DisallowedHost: Invalid HTTP_HOST header` |

**Acción siguiente recomendada:**

1. En Render dashboard → service kudos → tab **Logs**. Buscar el traceback completo del 500.
2. Pegar el traceback aquí y diagnosticamos quirúrgicamente.

---

## 6. Comandos para el fundador

### Aplicar fix y desplegar:

```bash
cd /ruta/local/a/kudos_project

# Verificar cambios (debe listar 2 archivos modificados):
git status -sb

# Stage solo los cambios del debug:
git add kudos_app/views.py kudos_app/urls.py

git commit -m "Temporary healthcheck route for production debugging

Aísla el bug 500 en /. La home original sigue disponible en /home/
(con name='home_full'). El name='home' se preserva en healthcheck para
no romper {% url 'home' %} en templates.

Sin cambios en settings, middleware, render.yaml, whitenoise."

git push origin master
```

Render desplegará automáticamente en ~3-5 min. Probar `https://kudos-XXX.onrender.com/`.

### Tras diagnosticar y resolver, revertir:

```bash
# Opción A · revertir solo urls.py (más limpio):
cp kudos_app/urls.py.snapshot.debug-home.20260517T140529Z kudos_app/urls.py

# Opción B · revertir ambos archivos (recomendado):
cp kudos_app/urls.py.snapshot.debug-home.20260517T140529Z kudos_app/urls.py
cp kudos_app/views.py.snapshot.debug-home.20260517T140529Z kudos_app/views.py
# Esto elimina también la función healthcheck (que ya no se necesita)

# Verificar sintaxis:
python -c "import ast; ast.parse(open('kudos_app/urls.py').read()); print('urls OK')"
python -c "import ast; ast.parse(open('kudos_app/views.py').read()); print('views OK')"

# Commit del revert:
git add kudos_app/urls.py kudos_app/views.py
git commit -m "Revert temporary healthcheck route · / vuelve a home"
git push origin master
```

---

## 7. Verificación inmediata sandbox-side

```
Cambios aplicados:
  kudos_app/urls.py:    209 líneas (antes 205, +4 líneas comentadas + nueva ruta /home/)
  kudos_app/views.py:  2356 líneas (antes 2337, +19 líneas función healthcheck)
  Null bytes: 0 en ambos
  Parse AST: OK ambos
  URLs → views: 110 refs todas resuelven
  healthcheck definida: ✓
  home preservada: ✓
```

Snapshots de reversión:
- `kudos_app/urls.py.snapshot.debug-home.20260517T140529Z`
- `kudos_app/views.py.snapshot.debug-home.20260517T140529Z`

---

## 8. Cero alteración prohibida

- `kudos_project/settings.py` · sin tocar
- `kudos_project/middleware.py` · sin tocar
- `kudos_project/features.py` · sin tocar
- `render.yaml` · sin tocar
- `build.sh` · sin tocar
- `requirements.txt` · sin tocar
- WhiteNoise config · sin tocar
- DB schema · sin tocar
- Cualquier template HTML · sin tocar

Sólo dos archivos modificados, cada uno con cambios atómicos reversibles en 1 comando.
