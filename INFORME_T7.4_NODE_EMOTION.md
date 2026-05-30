# INFORME T7.4 · EMOCIONALIZACIÓN DEL NODO

**Fase:** MAPA VIVO KUDOS
**Tarea:** T7.4
**Estado:** ✅ COMPLETADA · TSC VERDE
**Fecha:** 30 de mayo de 2026

---

## RESULTADO EN UNA FRASE

El POI personal pasa de ser un marcador instantáneo a una huella que **nace, respira y dice "esto es tuyo"** sin necesitar leer texto. Cero arquitectura tocada. Solo UX y percepción.

---

## 1. CAMBIOS REALIZADOS

### 1.1 · Aparición emocional del nodo (Tarea 1)

El POI personal ahora nace con animación cinematográfica al ser creado:

```
0%   → scale(0)    opacity 0       (no existe)
35%  → scale(1.55) opacity 1       (explosión cálida)
65%  → scale(0.92)                 (rebote sutil)
100% → scale(1)                    (asiento)
```

Curva: `cubic-bezier(0.16, 1, 0.3, 1)` (overshoot suave). Duración 1.4s. El usuario VE el momento exacto en que la huella queda en el mapa, no aparece de la nada.

### 1.2 · Halo KUDOS diferenciado (Tarea 2)

**POI editorial KUDOS** (Coliseo, Acrópolis, Alhambra...):
- Halo dorado `#E0B86F` con glow + segundo halo morado externo
- Animación `kudos-halo-breathe` 5.4s
- Implementado en `WorldNode.ts` (T7.1)

**POI personal** (creado por el usuario):
- **Doble halo morado orgánico**: capa exterior con `blur(3px)` + capa intermedia más definida
- Dos respiraciones desfasadas (4.2s exterior, 3.2s interior con delay 0.6s) → efecto orgánico no robótico
- Core con doble box-shadow + inset glow blanco
- Color: degradado `#d4b8ff → #8B6BFF` con borde blanco

**Identificación inmediata sin texto:** dorado = KUDOS, morado = tuyo.

### 1.3 · Sheet emocional (Tarea 3)

Eliminado lo que olía a formulario:
- ❌ `EYEBROW` con categoría en mayúsculas (era ruido administrativo)
- ❌ `COORDS` con `40.123, -3.456` (era CAD, no recuerdo)
- ❌ Texto badge "Lugar personal" → ✅ "Solo tuyo"

Quedan: nombre del lugar (gran serif Cormorant), badge "Solo tuyo" si aplica, y la sección de cápsulas.

### 1.4 · Primera cápsula con peso (Tarea 4)

Cuando el POI no tiene cápsulas, en lugar del aviso técnico anterior:

ANTES:
```
"Aún no hay nada esperando aquí.
 Deja una cápsula para ti o para alguien que vuelva."
```

AHORA (caja con borde morado, gradiente sutil, CTA grande):
```
─────────────────────────────────────
   Este lugar todavía no guarda nada.
   Lo que dejes aquí esperará a quien vuelva.

      [ Dejar la primera cápsula ]
─────────────────────────────────────
```

El botón pasa de ser un `+ Dejar cápsula` pequeño en una esquina a un CTA central, en gradiente morado, con sombra y peso visual. Solo aparece grande en estado vacío. Cuando hay cápsulas, se reduce al sutil `+ Dejar otra` en el header.

### 1.5 · Densidad visual (Tarea 5 · solo análisis, sin código)

Riesgos identificados para futuras fases:

1. **Concentración geográfica:** un usuario que usa KUDOS en su barrio creará 20-30 POIs en el mismo km². Sin clustering, el mapa se vuelve un bosque de alfileres morados.
2. **Halo respirando × N:** la animación es preciosa con 5-10 POIs visibles. Con 100 en pantalla simultánea puede agotar visualmente.
3. **Z-fight con POIs editoriales:** si un POI personal cae sobre el Coliseo, los dos alfileres se solapan.

**Mitigación recomendada cuando sea necesario** (no ahora):
- Cluster ligero por proximidad (>50m) a partir del 10º POI del mismo usuario
- Pausar animación del halo si zoom < 11
- Ofset visual mínimo (3-5px) cuando POI personal cae a <30m de POI editorial

**No implementado en T7.4 por restricción explícita.** Documentado como vigilancia.

### 1.6 · Microcopy KUDOS (Tarea 6)

Cambios léxicos aplicados en los 3 modales:

| ANTES (técnico) | AHORA (humano) |
|---|---|
| "Crea tu lugar" | "Marca este lugar" |
| "Esta coordenada solo es tuya. Nadie la verá salvo tú." | "Solo tú sabrás que está aquí. Nadie más lo verá." |
| "¿Qué tipo de lugar es?" | "¿Qué es para ti?" |
| "Crear lugar" | "Dejar huella aquí" |
| "Deja una cápsula" | "Deja algo aquí" |
| "Escribe algo para ti. Para tu yo futuro. O para alguien que vuelva." | "Para ti. Para tu yo futuro. Para quien vuelva a este lugar." |
| "Lo que quieres recordar de este momento..." | "Lo que no quieres olvidar de este momento..." |
| "Cápsulas N" (título sección) | "Lo que se ha dejado aquí N" |
| "+ Dejar cápsula" (botón pequeño) | "+ Dejar otra" (cuando ya hay) / "Dejar la primera cápsula" (cuando no hay) |
| "Lugar personal" (badge) | "Solo tuyo" |
| "Dejada [fecha]" | "La dejaste el [fecha]" |
| Hint inicial "Mantén pulsado el mapa para crear un lugar tuyo" | "Mantén pulsado el mapa para dejar tu primera huella" |

Palabras técnicas eliminadas: ninguna ocurrencia de **nodo**, **registro**, **coordenada**, **elemento** en el flujo visible al usuario. (Las coords técnicas en CreatePoiModal se mantienen pequeñas y en monospace como confirmación discreta de "estás aquí", no como contenido principal.)

---

## 2. ARCHIVOS MODIFICADOS

| Archivo | Cambios |
|---|---|
| `experience/components/screens/poi/universal/WorldUniversalLayer.tsx` | Animación `kudos-user-entrance` 1.4s + doble halo morado orgánico (`-glow-outer` + `-glow` con blur y respiraciones desfasadas) + iconSize 20→22 + hint cambiado |
| `experience/components/screens/poi/universal/PoiUniversalSheet.tsx` | Quitado eyebrow categoría + quitado coords técnicas + estado vacío reescrito (caja morada con CTA grande) + microcopy + nuevos estilos `EMPTY_LINE` `EMPTY_CTA` |
| `experience/components/screens/poi/universal/CreatePoiModal.tsx` | Microcopy: título + sub + label categoría + botón primario |
| `experience/components/screens/poi/universal/CreateCapsuleModal.tsx` | Microcopy: título + sub + placeholder textarea |

**Cero modificaciones a:** WorldEngine v2, world-tokens, WorldNode, backend, lib/poi/universalPoi (modelo), routes, dependencias.

---

## 3. CAPTURAS

No las puedo generar desde sandbox. Las debe ver Eduardo abriendo `/world-v2/` y haciendo:
1. Long-press en zona libre → ver animación nacimiento del alfiler
2. Abrir alfiler sin cápsulas → ver caja "Este lugar todavía no guarda nada" + CTA grande
3. Comparar visual de un POI personal (morado, doble halo orgánico) con uno editorial (dorado, halo respiración)

---

## 4. RESULTADO PERCIBIDO

| Antes | Después |
|---|---|
| Marker que aparece de golpe | Huella que nace, se expande y respira |
| Indistinguible visualmente de los POIs editoriales más allá del color | Doble halo morado orgánico, identificable a 50m de zoom |
| "He creado un dato" | "He dejado algo mío en el mapa" |
| Sheet con eyebrow + coords + título → sensación de ficha técnica | Solo nombre + cápsulas → sensación de recuerdo |
| `+ Dejar cápsula` discreto en esquina con texto técnico debajo | CTA central grande con copy emocional cuando el lugar está vacío |
| "Crear cápsula" / "Crear lugar" / "Lugar personal" | "Dejar huella aquí" / "Marca este lugar" / "Solo tuyo" |

**Criterio de éxito definido por Eduardo:** al crear *"Banco donde conocí a mi mujer"* el usuario debe sentir *"he dejado algo mío en el mapa"*.

Lo que ahora vive en el código va en esa dirección. Validación final requiere ojos humanos.

---

## 5. RIESGOS DETECTADOS

1. **Animación de entrada solo se dispara en `divIcon.iconSize` cambio.** Si Eduardo no fuerza recarga del navegador (Ctrl+F5), el CSS antiguo cacheado puede mostrar el alfiler sin animación. **Mitigación:** Ctrl+F5 la primera vez.

2. **`prefers-reduced-motion`** desactiva todas las animaciones. Es accesibilidad correcta, pero significa que un usuario con esa preferencia verá el alfiler aparecer sin la animación cinematográfica. Esperado.

3. **Doble halo + respiración + 100+ POIs personales:** el navegador puede sufrir en móviles antiguos. No es crítico para Fase 1 (un usuario al inicio tendrá 1-10 POIs). Riesgo a vigilar al cumplir el criterio de 50+ usuarios beta con uso intensivo.

4. **El microcopy "Para mí" en `audienceLabel`** sigue usándose dentro de las cápsulas. Es legible y humano, pero hay otras audiencias (`friends`, `family`, `legacy`) que siguen retornando palabras técnicas. Aún están disabled, así que el usuario no las ve fluir. Cuando se activen, revisar.

5. **`COORDS` técnicas siguen mostrándose en CreatePoiModal** (en pequeño, monospace, gris). Es deliberado como confirmación silenciosa de "el alfiler caerá aquí", pero podría sacarse del flujo principal a una sección de "info técnica" plegable si Eduardo lo prefiere.

---

## 6. DECISIÓN PENDIENTE PARA EDUARDO

Tres preguntas para validar T7.4:

1. ¿La animación de aparición transmite "huella que queda" o se siente exagerada? (Si exagerada, bajamos overshoot 1.55→1.3 y duración 1.4s→1.0s.)
2. ¿La caja morada de "primera cápsula" tiene el peso emocional adecuado, o necesita más serif/menos chrome?
3. ¿El microcopy "Dejar huella aquí" funciona, o prefieres algo más sobrio tipo "Guardar este lugar"?

No toco nada más hasta que valides en local.

---

**Próximo paso:** abrir `/world-v2/` con Ctrl+F5 y vivir el flujo completo:
- long-press en mapa
- crear lugar
- ver el alfiler **nacer**
- abrirlo, ver "Este lugar todavía no guarda nada"
- "Dejar la primera cápsula"
- escribir algo
- "Dejarla aquí"
- cerrar todo
- recargar
- el alfiler sigue ahí, el recuerdo sigue ahí

Si el flujo emociona, T7.4 está validado. Si no, ajustamos en T7.4.B.

---

**Auditor:** Claude (modo CTO, ejecución sin debate)
**Fichero entregable:** `INFORME_T7.4_NODE_EMOTION.md`
