# KPIs de Kudos · 2026

Cada departamento tiene métricas-norte que se actualizan automáticamente con los datos reales de la base de datos cuando ejecutas:

```
python manage.py daily_tasks
```

## Tabla de KPIs

| Departamento | KPI | Unidad | Objetivo 2026 | Cálculo |
|---|---|---|---|---|
| ⚙ TECH | Uptime mensual | % | 99.9% | Monitor externo |
| ⚙ TECH | Despliegues por mes | deploys | 8 | Pushes a main |
| 📚 CONTENT | Cápsulas totales | cápsulas | 100.000 | `count(Capsule)` |
| 📚 CONTENT | Cápsulas oficiales | cápsulas | 10.000 | `count(Capsule, source∈oficial)` |
| 📚 CONTENT | Idiomas | idiomas | 5 | distinct |
| 🌱 GROWTH | Usuarios registrados | personas | 100.000 | `count(User)` |
| 🌱 GROWTH | DAU (usuarios activos diarios) | personas | 1.000 | distinct con actividad <24h |
| 🌱 GROWTH | Espacios sociales | espacios | 100 | `count(SocialSpace)` |
| 🏛 SAGES | Propuestas activas | propuestas | 50 | `count(Proposal, debate)` |
| 🏛 SAGES | Votos totales | votos | 5.000 | `count(Vote)` |
| 💰 FINANCE | Runway | meses | 18 | tesorería / coste mensual |
| 💰 FINANCE | MRR | €/mes | 5.000 | suma suscripciones activas |
| 📢 MARKETING | Apariciones en prensa | menciones | 12 | conteo manual |
| 🎨 DESIGN | NPS Diseño | NPS | 50 | encuesta trimestral |

## Frecuencia de actualización

- **Automáticos (BD)**: cada vez que se ejecuta `daily_tasks` (recomendado: cron diario)
- **Manuales**: NPS, prensa, runway → actualizar mensualmente desde `/admin/`

## Visibilidad

Todos los KPIs son visibles para el fundador en `/founder/organization/`. La comunidad ve los KPIs públicos en el footer / página de transparencia.

## Filosofía de KPIs

> *"Lo que no se mide no se mejora; pero lo que se mide demasiado se distorsiona."* — adaptado de Drucker y Goodhart.

Las métricas de Kudos sirven de termómetro, no de látigo. Si una métrica empieza a empujar al equipo a comportarse mal con la comunidad, se cambia o se elimina.

---

**Versión 1.0 · Mayo 2026 · Revisión trimestral**
