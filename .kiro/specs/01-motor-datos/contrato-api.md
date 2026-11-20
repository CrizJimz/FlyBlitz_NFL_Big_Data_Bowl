# Contrato API (motor de datos a dashboard)

Llaves en snake_case y en español. Coordenadas ya normalizadas por `playDirection`. Tiempos en segundos (10 Hz). El dashboard llama sin diagonal inicial: `fetch('api/filtros')`. Los errores usan el formato de FastAPI: 404 `{"detail": "Jugada no encontrada"}`, 422 para parámetros inválidos.

## GET /api/filtros
```json
{ "equipos": ["ARI"], "semanas": [1], "downs": [1, 2, 3, 4],
  "rangos_distancia": [{"clave": "corta", "min": 1, "max": 3}, {"clave": "media", "min": 4, "max": 7}, {"clave": "larga", "min": 8, "max": null}],
  "tipos_cobertura": ["Man", "Zone", "Other"], "coberturas": ["Cover-3"], "formaciones": ["SHOTGUN"] }
```
Los rangos de distancia son una convención del equipo (no vienen del dataset). Las listas salen de valores únicos reales.

## GET /api/analisis
Parámetros opcionales: `ofensiva`, `defensiva`, `semana`, `down`, `distancia` (clave de rango).
```json
{ "filtros_aplicados": {"ofensiva": null, "defensiva": null, "semana": null, "down": null, "distancia": null},
  "n_jugadas": 0, "n_excluidas_down_0": 0,
  "success_rate": { "global": {"n": 0, "exitosas": 0, "tasa": 0.0},
    "por_down_distancia": [{"down": 1, "distancia": "corta", "n": 0, "exitosas": 0, "tasa": 0.0}] },
  "coberturas": [{"tipo_cobertura": "Zone", "down": 1, "distancia": "corta", "n": 0, "success_rate": 0.0,
    "yardas_promedio": 0.0, "resultado_pase": {"C": 0, "I": 0, "S": 0, "R": 0, "IN": 0}}],
  "bolsillo": { "n_con_pase": 0, "n_sin_pase": 0, "n_con_respaldo_autoevent": 0,
    "por_grupo": [{"play_action": true, "presion": false, "n": 0, "tiempo_promedio_s": 0.0, "tiempo_mediana_s": 0.0, "success_rate": 0.0}] },
  "separacion": { "n": 0, "n_sin_receptor_identificado": 0, "momento": "pass_forward", "por_resultado": [{"resultado_pase": "C", "n": 0, "separacion_promedio_yd": 0.0,
    "separacion_mediana_yd": 0.0, "vel_receptor_promedio": 0.0, "vel_defensor_promedio": 0.0}] } }
```
- `tasa` y `success_rate` van de 0 a 1. Cada métrica viaja con su `n`.
- `presion` = algún defensor con `pff_hit`, `pff_hurry` o `pff_sack` igual a 1 en la jugada.
- `n_sin_pase` = jugadas sin `pass_forward` ni respaldo (sacks, scrambles). `success_rate` usa `prePenaltyPlayResult` y cuenta IN como fracaso.

## GET /api/jugada/{game_id}/{play_id}
```json
{ "game_id": 2021090900, "play_id": 97, "descripcion": "texto", "semana": 1, "down": 3, "yardas_por_avanzar": 2,
  "ofensiva": "TB", "defensiva": "DAL", "resultado_pase": "C", "resultado_yardas": 0,
  "cobertura": "Cover-1", "tipo_cobertura": "Man", "play_action": false, "frames_por_segundo": 10,
  "eventos": [{"frame_id": 11, "evento": "ball_snap"}],
  "receptor_objetivo": {"nfl_id": 0, "nombre": "texto", "separacion_yd": 0.0},
  "frames": [{"frame_id": 1, "jugadores": [{"nfl_id": 0, "nombre": "texto", "dorsal": 0, "equipo": "TB",
    "lado": "ofensiva", "rol": "Pass Route", "x": 0.0, "y": 0.0, "s": 0.0, "o": 0.0, "dir": 0.0}]}] }
```
- Los valores son ejemplos de forma, no cifras reales.
- `lado`: "ofensiva", "defensiva" o "balon". En el balón, `nfl_id`, `nombre`, `dorsal`, `rol`, `o` y `dir` son `null`.
- `receptor_objetivo`: receptor nombrado en `playDescription`; `separacion_yd` se mide en el cuadro de `pass_forward`. Es `null` si no hay pase o no se identifica el receptor.

## Flujo de trabajo (dos Kiros)
- Ramas: `backend` toca solo `backend/` y `frontend` toca solo `dashboard/`. Nadie programa directo en `main`.
- `.kiro/` (specs, steering y este contrato) se cambia solo en `main`. Cada rama lo trae con `git merge main`. Si un lado necesita cambiar el contrato, avisa al otro antes.
- Mientras el backend no responda, el frontend usa los ejemplos de este contrato como mocks marcados como tales. Ningún mock llega a la entrega.
- Integración: merge de la rama a `main` solo si funciona (`GET /health` para backend, `vite build` para frontend). Después, el otro lado hace `git merge main`.
- Antes de empezar: `git pull`. Commits pequeños y con mensaje claro.
