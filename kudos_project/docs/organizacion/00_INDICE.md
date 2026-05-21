# 📂 Documentos organizacionales de Kudos

Esta carpeta contiene **copias offline** de los documentos fundacionales y operativos del proyecto.
Los mismos documentos están dentro de la app (en `/founder/strategic-docs/`), pero aquí los tienes
como archivos editables que puedes abrir con cualquier editor.

## Índice

| Documento | Propósito | Archivo |
|---|---|---|
| Manifiesto | Declaración fundacional de los principios | [01_MANIFIESTO.md](01_MANIFIESTO.md) |
| Plan Maestro 4 años | Roadmap fase a fase 2026-2029 | [02_PLAN_MAESTRO_4_AÑOS.md](02_PLAN_MAESTRO_4_AÑOS.md) |
| Plan Táctico Q2 2026 | OKRs trimestrales | [03_PLAN_TACTICO_Q2_2026.md](03_PLAN_TACTICO_Q2_2026.md) |
| Plan Financiero 2026 | Presupuesto y captación | [04_PLAN_FINANCIERO_2026.md](04_PLAN_FINANCIERO_2026.md) |
| Organigrama | Estructura de departamentos y roles | [05_ORGANIGRAMA.md](05_ORGANIGRAMA.md) |
| KPIs por departamento | Métricas que se monitorizan | [06_KPIS.md](06_KPIS.md) |
| Personajes asistentes | Guías históricos del asistente | [07_PERSONAJES_HISTORICOS.md](07_PERSONAJES_HISTORICOS.md) |
| Plan Estilo de Vida | Tu plan personal (hábitos, lecturas, salud) | [08_PLAN_ESTILO_VIDA.md](08_PLAN_ESTILO_VIDA.md) |

## Versión PDF

Para tener una **copia en PDF** lista para compartir o imprimir:

```
python manage.py generate_pdfs
```

Esto crea un PDF de cada documento en `docs/organizacion/pdf/`. Diseño limpio, con marca Kudos, listo para enviar.

## Cómo se actualizan

Los documentos se cargan en la base de datos cuando ejecutas:

```
python manage.py setup_organization
```

Si quieres modificarlos:
1. **Para uso interno (BD)**: edita el código del comando o usa `/admin/` para editar `StrategicDocument`.
2. **Para tu archivo físico**: edita los `.md` de esta carpeta directamente.

Cuando ambos estén alineados, vuelve a correr `setup_organization` para sincronizar la BD con tus cambios.

## Versiones

Los documentos llevan versión semántica (`v1.0`, `v1.1`, ...). Subimos versión cuando hay cambio sustantivo, no por correcciones menores.
