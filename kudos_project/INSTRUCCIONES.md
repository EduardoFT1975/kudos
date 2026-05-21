# 🚀 Cómo arrancar Kudos en tu ordenador

Sigue estos **6 pasos**. Cada paso es un comando que copias y pegas.
No hace falta que entiendas nada de programación.

---

## ✅ PASO 1 — Instalar Python (solo si no lo tienes)

1. Abre **https://www.python.org/downloads/** y pulsa **"Download Python"**.
2. Ejecuta el instalador.
3. **MUY IMPORTANTE**: marca la casilla **"Add Python to PATH"** antes de pulsar Install.
4. Pulsa Install.

Para comprobarlo: abre una terminal (Windows: `Win + R`, escribe `cmd`, Enter) y escribe:

```
python --version
```

Debe mostrar algo como `Python 3.11.x`.

---

## ✅ PASO 2 — Abrir la terminal en la carpeta del proyecto

1. Abre el **Explorador de archivos** y entra en `C:\Users\efert\kudos_project`.
2. En la barra de arriba (donde pone la ruta) borra todo y escribe `cmd`. **Enter**.
3. Se abre una ventana negra dentro de tu carpeta. Esa es la terminal.

A partir de aquí trabajamos siempre en esa ventana.

---

## ✅ PASO 3 — Instalar las dependencias (solo la primera vez)

```
pip install -r requirements.txt
```

Tarda 2–3 minutos. Cuando termine vuelve a salir el `>`.

---

## ✅ PASO 4 — Preparar la base de datos (solo la primera vez)

Tres comandos, uno detrás de otro:

```
python manage.py migrate
```

```
python manage.py createsuperuser
```

El último te pedirá:
- **UID:** `eduardo` (o lo que quieras)
- **Alias:** `Eduardo`
- **Email:** tu email
- **Contraseña:** la que quieras (mín. 6 caracteres) — **APÚNTALA**

⭐ Tu superusuario tendrá acceso al **Panel del Fundador** ⭐ y a **KUDOS MIND** 🧠.

---

## ✅ PASO 5 — Cargar contenido inicial (recomendado, sólo primera vez)

Una sola tanda con todo lo necesario:

```
python manage.py import_massive
python manage.py import_world --enrich
python manage.py setup_organization
python manage.py setup_personal_assistant --user eduardo
```

> Si tu UID no es `eduardo`, cambia esa palabra por el UID que pusiste en el paso 4.

Esto carga:
- **700+ cápsulas** de sabiduría clásica (`import_massive`)
- **+90 cápsulas geolocalizadas** de museos, monumentos, paisajes
  naturales, mercados/negocios y puntos de interés mundiales
  (`import_world`) — Louvre, Coliseo, Machu Picchu, Gran Cañón,
  Harrods, etc. Todas con imagen, atribución y enriquecimiento IA.
- Tu organización completa: 10 departamentos, 40 roles, KPIs, OKRs
  a 4 años, presupuesto multianual, 7 personajes históricos
- Tu vida personal: hábitos, plan de aprendizaje, métricas de salud

---

## ✅ PASO 6 — Arrancar el servidor web

En una terminal (déjala abierta):

```
python manage.py runserver
```

Cuando veas el mensaje verde *"Starting development server at http://127.0.0.1:8000/"*, ya está.

Abre el navegador y ve a:

### 👉 **http://127.0.0.1:8000/**

¡Tu proyecto Kudos ya está vivo! 🎉

---

## 🤖 PASO 7 — Activar la IA interna 24/7 (lo más mágico)

Tienes **un solo comando** que mantiene Kudos vivo sin tu intervención.
En **otra** terminal (deja la del runserver corriendo):

```
python manage.py full_autopilot
```

Esto lanza **todos los agentes a la vez**:
1. **KUDOS MIND** (8 agentes core: importador, curador, moderador, analista, narrador, recomendador, planificador, guardián)
2. **Importación continua** de cápsulas (Wikipedia + datos abiertos)
3. **Multimedia auto** (resumen, voz, clip 10s, calidad)
4. **Departamentos autónomos** (12 departamentos con IA generativa: marketing, producto, tecnología, comunidad, gobernanza, finanzas, legal, impacto, innovación, educación, salud y experiencia)
5. **Tareas diarias** (insignias, KPIs, limpieza)

Para parar: `Ctrl + C`. Para ver todo lo que está haciendo entra
como fundador en **http://127.0.0.1:8000/mind/** — agentes, insights,
acciones registradas y un panel donde puedes darle directivas con tu
propio idioma.

Variantes para los más atrevidos:

```
python manage.py full_autopilot --sleep 600   # macro-ciclo cada 10 min
python manage.py full_autopilot --no-import   # sin importar nada nuevo
python manage.py ai_autopilot --once          # ejecutar UN ciclo MIND y salir
python manage.py multimedia_auto --max 1000   # enriquecer 1000 cápsulas
python manage.py autonomous_ops --dept GROWTH # un departamento concreto
```

> 🌱 Es **eficiente con datos**: no llama a APIs externas. Si pones
> `OPENAI_API_KEY` en el `.env` el sistema lo usa, si no, funciona igual
> con sus heurísticas locales.

---

## 🎯 Direcciones importantes

| URL | Qué es |
|-----|--------|
| `http://127.0.0.1:8000/` | Página de inicio (rediseñada) |
| `http://127.0.0.1:8000/dashboard/` | Tu panel de usuario |
| `http://127.0.0.1:8000/feed/` | 🎯 Tu feed personal generado por la IA |
| `http://127.0.0.1:8000/messages/` | 📨 Mensajes directos |
| `http://127.0.0.1:8000/bookmarks/` | 🔖 Cápsulas que has guardado |
| `http://127.0.0.1:8000/founder/` | ⭐ **PANEL DEL FUNDADOR** |
| `http://127.0.0.1:8000/mind/` | 🧠 **KUDOS MIND · IA interna** |
| `http://127.0.0.1:8000/founder/organization/` | 🏛 Organigrama, roles y KPIs |
| `http://127.0.0.1:8000/founder/strategic/` | 🎯 Plan estratégico 4 años |
| `http://127.0.0.1:8000/founder/tactical/` | ⚙ Plan táctico trimestral |
| `http://127.0.0.1:8000/founder/financial/` | 💰 Plan financiero multi-año |
| `http://127.0.0.1:8000/personal/` | 🌿 Tu vida (hábitos, diario, salud, libros, cripto) |
| `http://127.0.0.1:8000/assistant/characters/` | 🎭 Consejero histórico |
| `http://127.0.0.1:8000/map/` | 🌍 Mapa mundial de cápsulas |
| `http://127.0.0.1:8000/about/` | ℹ Acerca de |
| `http://127.0.0.1:8000/admin/` | Admin de Django |

---

## 📌 Cómo lo apago / arranco mañana

- **Apagar:** en la terminal pulsa **Ctrl + C** (en cada terminal abierta).
- **Mañana:** sólo necesitas el **Paso 2** y el **Paso 6**. Si quieres
  que la IA siga trabajando, repite también el **Paso 7** en otra terminal.

---

## 🌐 Quiero hacerlo público en internet

Lee **`DESPLIEGUE.md`** — tienes 3 rutas (Render gratis, PythonAnywhere
gratis, o servidor propio).

---

## ❓ Si algo falla

### `'python' no se reconoce como comando`
Vuelve al Paso 1 y reinstala Python marcando "Add Python to PATH".

### Error al instalar dependencias en Windows (psycopg2)
Es normal: `psycopg2` solo se usa en producción. Instala lo demás:
```
pip install Django python-dotenv whitenoise reportlab markdown
```

### `port already in use`
Otro programa usa el puerto 8000. Usa otro:
```
python manage.py runserver 8001
```

### Quiero empezar de cero
Borra `db.sqlite3`, repite Pasos 4 y 5.

---

## 🎁 Funcionalidades incluidas

✨ **Cápsulas multidimensionales** — contenido + lugar + tiempo + temas
🌍 **Mapa interactivo** — tus cápsulas geolocalizadas
🗳️ **Comité de Sabios** — propuestas y votaciones globales
🛍️ **Mercado descentralizado** — operaciones virtuales
🌐 **Espacios sociales** — comunidades temáticas
🏆 **Competiciones deportivas** — virtuales y físicas
💚 **Salud mental** — registro emocional con estadísticas
🕊️ **Espiritualidad** — reflexiones y crecimiento interior
🎭 **Consejeros históricos** — Aristóteles, Séneca, Newton, Cleopatra…
🔮 **Simulador del futuro** — escenarios proyectados
🎨 **Arte y festivales** — galería creativa
📜 **Legado eterno** — preservación multidimensional
🔍 **Búsqueda global** — encuentra cualquier cosa
🔔 **Notificaciones** — al día con tu actividad
🏅 **Sistema de logros** — XP, niveles e insignias
🌓 **Modo oscuro** — con persistencia
📤 **Exportación CSV** — tus datos siempre tuyos
👤 **Perfiles** — públicos y privados
📨 **Mensajes directos** — entre usuarios (estilo X / Meta)
🔖 **Marcadores** — guarda cápsulas favoritas
🎯 **Feed personalizado** — generado por la IA cada día
⭐ **Panel del Cofundador** — control total con un click
🤖 **KUDOS MIND** — IA multi-agente que trabaja sin parar 24/7

---

## 📞 ¿Necesitas algo más?

Cuando quieras añadir funcionalidades, mejorar diseño, o cualquier otra
cosa, simplemente dímelo y lo hago. No tienes que tocar el código.

🌟 **¡Disfruta tu Kudos!**
