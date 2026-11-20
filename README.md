# FlyBlitz: inteligencia táctica del juego aéreo para el Coach

Dashboard y API que ayudan al Coach de NFL a preparar el plan de juego aéreo (ofensivo y defensivo) con Success Rate, tiempo de bolsillo y separación receptor-defensor, sobre el tracking de la temporada 2021.

## Cómo ejecutar (Windows)
El dataset es un submódulo: clona con `git clone --recurse-submodules <repo>` o, si ya clonaste, `git submodule update --init`.

- Backend (desde la raíz, puerto 8000): `.venv\Scripts\python.exe -m uvicorn backend.main:app --reload`
- Dashboard en desarrollo: `cd dashboard && npm run dev` (Vite hace proxy de `/api` al puerto 8000).
- Producción: `npm run build` en `dashboard/` genera `dashboard/dist` y FastAPI lo sirve en la misma URL que la API.
- Pruebas: `.venv\Scripts\python.exe -m pytest backend/tests -q` (32 pruebas).

## Endpoints
- `GET /health`
- `GET /api/filtros`
- `GET /api/analisis` (responde 503 "Precalculando datos" con `Retry-After` mientras se procesa el tracking)
- `GET /api/jugadas`
- `GET /api/jugada/{game_id}/{play_id}`

Contrato completo en `.kiro/specs/01-motor-datos/contrato-api.md`.

## Datos
- Temporada 2021, semanas 1-8: 122 partidos, 8,557 jugadas de pase (dropbacks), 1,679 jugadores.
- 8,314,178 filas de tracking (~818 MB en 122 archivos). Se leen partido por partido, nunca concatenados.
- Frecuencia 10 Hz (verificado: 26,707 de 26,713 segundos completos tienen 10 cuadros).

## Hallazgos verificados con código
- **Success Rate global** (umbral 40/60/100 % de `yardsToGo` según el down, con `prePenaltyPlayResult`; IN siempre fracaso): 4,008 exitosas de 8,522 jugadas = 0.4703.
  - Por down: 1.º 1,641/3,071; 2.º 1,374/2,826; 3.º 896/2,394; 4.º 97/231.
  - Se excluyen 35 jugadas de down 0 (conversiones de 2 puntos).
  - Reproduce: `backend/motor/agregados.py::bloque_success_rate` y `backend/motor/exito.py::es_exitosa`.
- **Bolsillo**: 7,541 jugadas con pase + 992 sin pase (542 S, 447 R, 3 C/I sin evento de pase) + 24 sin snap = 8,557. Ningún tiempo negativo (mínimo 0.6 s). 3,216 jugadas con presión PFF.
  - Reproduce: `backend/motor/bolsillo.py` y `agregados.py::bloque_bolsillo`.
- **Separación al lanzar** (`pass_forward`): de 7,565 pases C/I/IN, 7,240 medidos y 325 sin receptor identificado (322 sin receptor en la descripción, 3 sin cuadro de pase). El receptor objetivo coincide 99.2% con el más cercano al balón en `pass_arrived` (n = 362).
  - Reproduce: `backend/motor/receptor.py`, `separacion.py` y `agregados.py::bloque_separacion`.
- **Velocidad máxima de un jugador**: 11.18 yd/s (las 30,073 filas con `s > 12` son del balón).
- **Precálculo del tracking**: entre 13 y 20 s en el equipo de desarrollo (medido en `construir_motor`, `backend/motor/precalculo.py`).

El resto de métricas por cobertura (Zone vs Man) y por grupo se consultan en vivo en `/api/analisis` con filtros.

## Trampas de datos manejadas
Detalle en `.kiro/specs/01-motor-datos/auditoria-datos.md`.
- El tracking termina 0.5 s después del pase: la separación se mide en `pass_forward`, no en `pass_arrived`.
- `playResult` mezcla castigos de forma no aditiva (253 jugadas): el Success Rate usa `prePenaltyPlayResult`.
- Las intercepciones tienen `playResult = 0`: IN cuenta siempre como fracaso.
- 24 jugadas sin snap: se reportan aparte (`n_sin_snap`) y no se supone el cuadro 1.
- Sacks y scrambles con evento de pase: `passResult` define el tipo de jugada.
- 8 pares de nombres repetidos: las uniones van siempre por `nflId`.
- Eventos repetidos o con desfase manual/automático: se toma el primer cuadro y el manual es la fuente.
- Velocidades extremas del balón: no se filtran outliers mezclando balón y jugadores.

## Estructura
- `backend/`: `main.py`, `api.py`, `esquemas.py`, `motor/` (cálculos puros) y `tests/`.
- `dashboard/`: frontend React.
- `data/`: datos del dataset, solo lectura.
- `.kiro/specs/`: `01-motor-datos` (backend) y `02-dashboard` (frontend).

## Stack
FastAPI 0.115.14, pandas 2.2.3, numpy 2.1.3, React 18 + Vite 5 + Tailwind 3 + Recharts. Sin IA en esta versión.
