# 🚀 Cómo lanzar Kudos a internet (3 rutas explicadas)

> **Antes de leer esto**: asegúrate de que el proyecto funciona en tu ordenador siguiendo `INSTRUCCIONES.md`. Si funciona en local, está listo para internet.

---

## 🎯 ¿Qué ruta elegir?

| Ruta | Coste | Dificultad | Tiempo total | Dominio |
|------|-------|------------|--------------|---------|
| **Render.com** | Gratis (con límite) | ⭐⭐ Fácil | ~30 min | `kudos-tunombre.onrender.com` |
| **PythonAnywhere** | Gratis (1 app) | ⭐ Muy fácil | ~20 min | `tunombre.pythonanywhere.com` |
| **VPS propio** | ~5 €/mes | ⭐⭐⭐⭐ Avanzado | ~2 horas | Cualquiera (`kudos.tudominio.com`) |

**Mi recomendación:** empieza con **Render.com**. Es lo que mejor escala y te quita problemas con archivos estáticos y bases de datos.

---

# 🟦 RUTA A · Render.com (recomendada)

Render aloja tu app gratis con auto-renovación a cada cambio. Ya tienes los archivos preparados (`render.yaml`, `Procfile`, `build.sh`).

## A.1 — Crear cuenta (sólo la primera vez)

1. Ve a **https://render.com** y pulsa **"Get Started"**.
2. Regístrate con tu Google o tu email.
3. Confirma el email.

## A.2 — Subir el código a GitHub

Render lee tu código desde GitHub. Sigue estos pasos:

1. Crea cuenta gratis en **https://github.com**.
2. Descarga e instala **GitHub Desktop** desde **https://desktop.github.com** (interfaz visual, no requiere terminal).
3. Abre GitHub Desktop → **File → Add Local Repository → Choose**, y selecciona la carpeta `C:\Users\efert\kudos_project`.
4. Pulsa **Publish repository**:
   - Name: `kudos`
   - Marca "**Keep this code private**" si no quieres que sea público.
   - Pulsa **Publish**.

Listo: tu código está en GitHub.

## A.3 — Conectar Render con GitHub

1. En Render → **New + → Blueprint**.
2. Conecta tu cuenta de GitHub (te pedirá permisos, acepta).
3. Selecciona tu repositorio **`kudos`**.
4. Render detectará automáticamente el archivo `render.yaml` y te mostrará: **1 web service + 1 PostgreSQL database**.
5. Pulsa **Apply**.

Render hará todo: instalar dependencias, ejecutar migraciones, arrancar el servidor. Tarda ~5–10 min la primera vez.

## A.4 — Listo

Cuando veas el estado **"Live"** en verde, tu Kudos ya es público en:

### 👉 `https://kudos-XXXXX.onrender.com`

(la X la genera Render)

## A.5 — Crear superusuario en producción

Para acceder al panel admin online:

1. En el servicio `kudos` de Render → pestaña **"Shell"**.
2. Ejecuta:
   ```
   python manage.py createsuperuser
   ```
3. Inventa UID/alias/contraseña y apúntalos.

## A.6 — Cuando hagas cambios

Cualquier cambio en tu carpeta lo subes con GitHub Desktop:
1. Abre GitHub Desktop.
2. Verás los cambios en la columna izquierda.
3. Escribe un mensaje breve abajo (ej. "Mejora visual").
4. Pulsa **Commit to main → Push origin**.

Render detectará el cambio y desplegará la nueva versión automáticamente en ~3 min.

---

# 🟩 RUTA B · PythonAnywhere (la más fácil)

No requiere GitHub. Subes un ZIP y listo.

## B.1 — Cuenta

1. Ve a **https://www.pythonanywhere.com** → **Pricing & Signup → Beginner (free)**.
2. Crea usuario con tu nombre (será tu dominio: `tunombre.pythonanywhere.com`).
3. Confirma email.

## B.2 — Subir el código

1. Comprime tu carpeta `kudos_project` en un ZIP (clic derecho → Enviar a → Carpeta comprimida).
2. En PythonAnywhere → **Files**.
3. Pulsa **Upload a file** y sube el ZIP.
4. Abre **Consoles → Bash**.
5. Ejecuta:
   ```
   unzip kudos_project.zip
   cd kudos_project
   pip install --user -r requirements.txt
   python manage.py migrate
   python manage.py collectstatic --noinput
   python manage.py createsuperuser
   ```

## B.3 — Crear la web app

1. Pestaña **Web → Add a new web app**.
2. Elige **Manual configuration** → **Python 3.11**.
3. En el formulario que aparece:
   - **Source code:** `/home/tunombre/kudos_project`
   - **Working directory:** `/home/tunombre/kudos_project`
   - **WSGI configuration file:** pulsa el enlace y reemplaza el contenido por:
     ```python
     import os
     import sys
     path = '/home/tunombre/kudos_project'
     if path not in sys.path:
         sys.path.insert(0, path)
     os.environ['DJANGO_SETTINGS_MODULE'] = 'kudos_project.settings'
     os.environ['DJANGO_ENV'] = 'production'
     os.environ['DEBUG'] = 'False'
     os.environ['ALLOWED_HOSTS'] = 'tunombre.pythonanywhere.com'
     from django.core.wsgi import get_wsgi_application
     application = get_wsgi_application()
     ```
   (cambia `tunombre` por el real)
4. En la sección **Static files**:
   - URL: `/static/` → Path: `/home/tunombre/kudos_project/staticfiles`
   - URL: `/media/` → Path: `/home/tunombre/kudos_project/media`
5. Pulsa el botón verde **Reload tunombre.pythonanywhere.com**.

## B.4 — Listo

### 👉 `https://tunombre.pythonanywhere.com`

---

# 🟥 RUTA C · VPS propio (avanzado)

Sólo si ya tienes algún conocimiento o aceptas seguir tutoriales detallados.

## C.1 — Contratar VPS

- **Hetzner** (€4/mes): https://www.hetzner.com/cloud (recomendado, calidad/precio)
- **DigitalOcean** ($6/mes): https://www.digitalocean.com
- **Vultr**, **Linode**, **OVH**, etc.

Elige Ubuntu 22.04 LTS, 2 GB RAM mínimo.

## C.2 — Comprar dominio (opcional)

- Namecheap, Porkbun, Cloudflare Registrar (~$10/año).
- Apunta el dominio (registro A) a la IP del VPS.

## C.3 — Instalación

Conéctate por SSH al VPS y ejecuta:

```bash
sudo apt update && sudo apt install -y python3 python3-pip python3-venv nginx git
git clone TU_REPO kudos_project   # o subes el ZIP
cd kudos_project
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser
```

## C.4 — Servicio systemd

Crear `/etc/systemd/system/kudos.service`:

```
[Unit]
Description=Kudos Gunicorn
After=network.target

[Service]
User=root
WorkingDirectory=/root/kudos_project
Environment="DJANGO_ENV=production"
Environment="DEBUG=False"
Environment="ALLOWED_HOSTS=kudos.tudominio.com"
Environment="SECRET_KEY=cámbialo-por-uno-largo-y-único"
ExecStart=/root/kudos_project/venv/bin/gunicorn kudos_project.wsgi --bind 127.0.0.1:8000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable kudos
systemctl start kudos
```

## C.5 — Nginx + HTTPS

Crea `/etc/nginx/sites-available/kudos`:

```
server {
    listen 80;
    server_name kudos.tudominio.com;
    location /static/ { alias /root/kudos_project/staticfiles/; }
    location /media/ { alias /root/kudos_project/media/; }
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/kudos /etc/nginx/sites-enabled/
systemctl reload nginx
sudo apt install certbot python3-certbot-nginx
certbot --nginx -d kudos.tudominio.com   # HTTPS gratis
```

---

# 🛠️ TROUBLESHOOTING

### "Algo falla en el despliegue"
- En Render → pestaña **Logs**: te dice exactamente qué pasa.
- En PythonAnywhere → **Web → Error log**: igual.
- En VPS: `journalctl -u kudos -n 100`.

### "No me carga el CSS / imágenes"
- Asegúrate de haber ejecutado `python manage.py collectstatic --noinput`.
- En Render se ejecuta automáticamente vía `build.sh`.

### "Error 500"
- Revisa la variable `DEBUG=False` y `ALLOWED_HOSTS` correctos.
- Mira los logs del servidor.

### "Quiero migrar a un dominio propio"
- En Render → Settings del servicio → Custom Domain → añade `kudos.tudominio.com` y sigue las instrucciones.

---

## 📞 Si te atascas

Cualquier paso, dímelo y te ayudo.

🌟 **¡Que disfrutes Kudos público al mundo!**
