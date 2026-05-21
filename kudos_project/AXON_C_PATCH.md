# AXÓN · Edición C aplicada · Eliminación de funciones zombie

**Fecha:** $(date -u +%Y-%m-%dT%H:%M:%SZ)
**Archivo:** `kudos_app/views.py`
**Snapshot:** `kudos_app/views.py.snapshot.20260515T192057Z` (sha256 `d58c7a8b…`)

## Criterio

Eliminar únicamente la **primera** definición de cualquier función top-level que esté
definida más de una vez en `views.py`. Python carga el módulo de arriba abajo: la
segunda definición sobrescribe a la primera, por lo que las primeras son código
**zombie**: ocupan líneas, complican lectura, pueden confundir refactors — pero **no
afectan al comportamiento runtime**.

## Descubrimiento

`grep -E "^def "` inicial detectó **6** duplicados visibles. El análisis con AST
(`ast.parse` + recuento por nombre) descubrió **12** duplicados — incluye helpers
privados (`_create_version_snapshot`, `_ai_validate_aport`) y vistas tiny
(`about`, `terms`, `privacy`) que el grep pasó por alto.

Las 12 cumplen idéntico criterio Python-overwrite → todas son zombies seguras.

## Zombies eliminados (líneas en el snapshot original)

| # | Función | Rango eliminado | Líneas | Definición ACTIVA (preservada) |
|---|---|---|---|---|
| 1  | `ai_insight_accept`       | L1346–L1406 |  61 | L1475–L1535 |
| 2  | `ai_chat`                 | L1538–L1613 |  76 | L1628–L1637 |
| 3  | `_create_version_snapshot`| L1975–L1986 |  12 | L2322–L2329 |
| 4  | `capsule_versions`        | L1989–L1998 |  10 | L2332–L2338 |
| 5  | `capsule_version_revert`  | L2001–L2018 |  18 | L2343–L2354 |
| 6  | `_ai_validate_aport`      | L2021–L2048 |  28 | L2357–L2364 |
| 7  | `capsule_aport_create`    | L2051–L2103 |  53 | L2368–L2398 |
| 8  | `capsule_aport_validate`  | L2106–L2152 |  47 | L2403–L2427 |
| 9  | `capsule_dialog`          | L2155–L2168 |  14 | L2431–L2438 |
| 10 | `about`                   | L2171–L2172 |   2 | L2441–L2442 |
| 11 | `terms`                   | L2175–L2176 |   2 | L2445–L2446 |
| 12 | `privacy`                 | L2179–L2180 |   2 | L2449–L2450 |

**Total: 12 funciones · 325 líneas borradas · 0 lógica alterada.**

## Métricas

- `views.py`: **2 450 → 2 125 líneas** (-13.3%)
- Funciones top-level únicas: **116** (antes había 116 únicas + 12 zombies = 128 defs)
- Duplicados restantes: **0**
- Parse AST: **OK**

## Reversión

```
cp kudos_app/views.py.snapshot.20260515T192057Z kudos_app/views.py
```
