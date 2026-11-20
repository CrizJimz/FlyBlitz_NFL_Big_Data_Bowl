# FlyBlitz: inteligencia táctica del juego aéreo para el Coach

<!-- captura: docs/dashboard.png -->

FlyBlitz es una app (API FastAPI + dashboard React) que convierte el tracking de la temporada 2021 (semanas 1-8) en decisiones para el plan de juego aéreo. El dashboard ofrece filtros, Success Rate, comparación de coberturas, tiempo de bolsillo, separación receptor-defensor y un visor 2D de jugadas.
Todas las cifras de este documento salen de código pandas del repo ejecutado sobre `data/`. Son asociaciones observadas, no causas.

## Hallazgos principales

1. **La presión es el factor que más separa un pase exitoso de uno fallido.** Success Rate 31.9 % con presión (n = 3,201) contra 56.1 % sin ella (n = 5,321); yardas promedio 3.93 contra 8.09. *Recomendación:* ofensiva, priorizar protección y salidas rápidas; defensiva, invertir en pass rush antes que en cobertura. Ojo: los sacks (S) siempre cuentan como presión, y eso baja el Success Rate con presión (16.9 % de esas jugadas son S, n = 3,201).
2. **Cuanto más se espera, peor.** El Success Rate cae de 59.4 % (<2.0 s, n = 818) a 39.6 % (≥3.5 s, n = 1,629). Sin presión la caída es menor (60.3 % → 50.5 %); con presión baja de 51.8 % (n = 83) a 31.5 % (n = 936). *Recomendación:* diseñar rutas que se resuelvan antes de 2.5 s cuando la línea no sostiene el bolsillo. Tiempo largo y presión se solapan, así que no se separa el efecto de cada uno.
3. **Zone rinde mejor que Man para la ofensiva.** Success Rate 49.0 % contra Zone (n = 5,587) y 43.8 % contra Man (n = 2,465), 5.2 puntos de diferencia. *Recomendación:* la defensa que quiera bajar el Success Rate rival tiene en Man una ligera ventaja; la ofensiva debe esperar más separación (y más completos) contra Zone.
4. **La separación al lanzar se asocia fuertemente con completar.** Completo 22.6 % con menos de 1 yd (n = 598) y 80.5 % con 5 yd o más (n = 2,175). Contra Man la separación mediana es 1.98 yd (n = 2,083) y contra Zone 4.17 yd (n = 4,782). *Recomendación:* contra Man, buscar rutas que generen separación (cruces, picks); contra Zone, atacar espacios abiertos.
5. **Play action ayuda, pero el efecto es moderado.** Success Rate 52.2 % con play action (n = 2,024) contra 45.4 % sin él (n = 6,498), +6.8 puntos, y 7.78 contra 6.14 yardas promedio. *Recomendación:* usarlo como complemento y no como sustituto de protección; con play action el bolsillo es más largo (mediana 3.3 s contra 2.6 s).
6. **Entre coberturas, Cover-3 concede el mayor Success Rate y Cover-0 y Cover-1 el menor.** Success Rate rival 50.1 % contra Cover-3 (n = 2,664), 43.5 % contra Cover-1 (n = 2,005) y 43.5 % contra Cover-0 (n = 260). *Recomendación:* la ofensiva puede atacar Cover-3; la defensa puede apoyarse en Cover-1 (7.7 % de sacks) y usar Cover-0 con cautela por su muestra pequeña. La mayor diferencia Man−Zone con ambos n ≥ 30 aparece en 2.º down y distancia corta (−22.1 puntos), con Man en solo 71 jugadas.

## A. Coberturas: Zone vs Man

Solo jugadas con `down_valido` (sin down 0). IN = intercepción, S = sack.

| Tipo | n | Success Rate | Yardas prom. | % IN | % S |
|---|---|---|---|---|---|
| Zone | 5,587 | 49.0 % | 6.84 | 2.3 % | 5.8 % |
| Man | 2,465 | 43.8 % | 6.45 | 1.8 % | 7.6 % |
| Other | 470 | 40.6 % | 3.26 | 3.8 % | 7.2 % |

Contra Man hay más sacks (7.6 % contra 5.8 %) y menos intercepciones (1.8 % contra 2.3 %), pero son diferencias pequeñas.

| Cobertura | n | Success Rate | % IN | % S |
|---|---|---|---|---|
| Cover-3 | 2,664 | 50.1 % | 2.0 % | 6.0 % |
| Cover-6 | 805 | 49.1 % | 3.0 % | 5.2 % |
| Cover-2 | 1,085 | 48.5 % | 2.5 % | 6.0 % |
| Quarters | 1,033 | 46.7 % | 2.3 % | 5.3 % |
| 2-Man | 200 | 46.5 % | 2.0 % | 9.5 % |
| Cover-0 | 260 | 43.5 % | 1.9 % | 4.6 % |
| Cover-1 | 2,005 | 43.5 % | 1.8 % | 7.7 % |

Situaciones con ambos n ≥ 30, las de mayor diferencia Man−Zone en Success Rate:

| Situación | Man (n) | Zone (n) | Dif. Man−Zone |
|---|---|---|---|
| 2.º y corta | 42.3 % (71) | 64.4 % (160) | −22.1 pts |
| 2.º y media | 52.0 % (221) | 61.3 % (560) | −9.2 pts |
| 1.º y larga | 48.5 % (592) | 55.6 % (2,309) | −7.1 pts |
| 3.º y larga | 29.1 % (347) | 23.7 % (612) | +5.4 pts |

En 3.º y larga la ofensiva rinde mejor contra Man; en el resto de situaciones comparables, contra Zone. Las celdas de 1.º y 4.º down con n < 30 en alguno de los dos lados (por ejemplo 1.º y corta: Man 18, Zone 2; 4.º y larga: Man 16) son **muestra pequeña** y no se interpretan.

## B. Tiempo de bolsillo y presión

Tiempo de bolsillo solo en jugadas con pase (`categoria_bolsillo = con_pase`, n = 7,541).

| Grupo | n | Media | Mediana |
|---|---|---|---|
| Sin presión | 5,132 | 2.69 s | 2.6 s |
| Con presión | 2,409 | 3.48 s | 3.2 s |
| Sin play action | 5,766 | 2.81 s | 2.6 s |
| Con play action | 1,775 | 3.37 s | 3.3 s |

Success Rate por tiempo de bolsillo, separando presión:

| Tiempo | Sin presión (n) | Con presión (n) |
|---|---|---|
| <2.0 s | 60.3 % (735) | 51.8 % (83) |
| 2.0-2.5 s | 55.4 % (1,415) | 41.6 % (346) |
| 2.5-3.0 s | 54.8 % (1,381) | 38.0 % (582) |
| 3.0-3.5 s | 58.0 % (888) | 36.6 % (448) |
| ≥3.5 s | 50.5 % (693) | 31.5 % (936) |

Todas las jugadas con `down_valido`:

| Grupo | n | Success Rate | % IN | % S |
|---|---|---|---|---|
| Sin presión | 5,321 | 56.1 % | 2.2 % | 0.0 % |
| Con presión | 3,201 | 31.9 % | 2.3 % | 16.9 % |
| Sin play action | 6,498 | 45.4 % | 2.3 % | 6.3 % |
| Con play action | 2,024 | 52.2 % | 2.0 % | 6.5 % |

La presión no cambia el % IN (2.2 % contra 2.3 %); su efecto pasa por los sacks y las yardas. El tramo 3.0-3.5 s sin presión (58.0 %) rompe la tendencia descendente, una irregularidad que no se explica con estos datos.

## C. Separación al lanzar

Separación en `pass_forward` entre pases C/I/IN con receptor medido (n = 7,240).

| Resultado | n | Media | Mediana |
|---|---|---|---|
| Completo (C) | 4,576 | 4.84 yd | 4.11 yd |
| Incompleto (I) | 2,481 | 2.93 yd | 2.11 yd |
| Intercepción (IN) | 183 | 3.16 yd | 2.66 yd |

| Separación | n | % completo |
|---|---|---|
| <1 yd | 598 | 22.6 % |
| 1-2 yd | 1,480 | 47.1 % |
| 2-3 yd | 1,146 | 59.3 % |
| 3-5 yd | 1,841 | 71.4 % |
| ≥5 yd | 2,175 | 80.5 % |

| Cobertura | n | Separación media | Mediana | % completo |
|---|---|---|---|---|
| Man | 2,083 | 2.66 yd | 1.98 yd | 54.9 % |
| Zone | 4,782 | 4.85 yd | 4.17 yd | 67.3 % |

Las intercepciones ocurren con separación similar a las incompletas (mediana 2.66 yd contra 2.11 yd, n = 183 en IN). La separación es la del momento del pase; el defensor puede cerrar durante el vuelo del balón.

## D. Equipos

Success Rate ofensivo, equipos con n ≥ 150 (los 32 cumplen). Diferencia entre el mejor y el peor: 15.3 puntos.

| Posición | Equipo | Success Rate | n |
|---|---|---|---|
| Top 1 | LA | 54.6 % | 251 |
| Top 2 | KC | 53.7 % | 339 |
| Top 3 | TB | 52.4 % | 309 |
| Bottom 3 | CAR | 42.5 % | 294 |
| Bottom 2 | PIT | 41.4 % | 237 |
| Bottom 1 | IND | 39.3 % | 257 |

Con 8 semanas, 237-339 jugadas por equipo dan un margen de error amplio. Las posiciones intermedias no son distinguibles con confianza.

## Metodología y decisiones

- **Success Rate**: éxito si el pase logra 40 % (1.º), 60 % (2.º) o 100 % (3.º y 4.º) de `yardsToGo`, con `prePenaltyPlayResult`. IN siempre es fracaso. Se excluyen 35 jugadas de down 0. Global: 4,008 de 8,522 = 0.4703.
- **Normalización**: si `playDirection` es "left", `x = 120 − x`, `y = 53.3 − y` y los ángulos `o` y `dir` suman 180 mod 360.
- **Frecuencia**: 10 Hz verificado (26,707 de 26,713 segundos completos tienen 10 cuadros).
- **Receptor objetivo**: se extrae de `playDescription` (7,243 de 7,565 pases identificados). Coincide 99.2 % con el jugador más cercano al balón en `pass_arrived` (n = 362).
- **Separación en `pass_forward`**: el tracking termina 0.5 s después del pase (7,590 de 7,604 pases) y `pass_arrived` solo existe en 367 jugadas.
- **Bolsillo**: 7,541 jugadas con pase + 992 sin pase (542 S, 447 R, 3 C/I) + 24 sin snap = 8,557.
- **Presión**: bandera de presión de PFF (`presion`); 3,216 de 8,557 jugadas.

## Calidad de datos y trampas evitadas

Detalle en `.kiro/specs/01-motor-datos/auditoria-datos.md`.
- El tracking termina 0.5 s después del pase: la separación se mide en `pass_forward`, no en `pass_arrived`.
- `playResult` mezcla castigos de forma no aditiva (253 jugadas): el Success Rate usa `prePenaltyPlayResult`.
- Las intercepciones tienen `playResult = 0`: IN cuenta siempre como fracaso.
- 24 jugadas sin snap: se reportan aparte (`n_sin_snap`) y no se supone el cuadro 1.
- Sacks y scrambles con evento de pase: `passResult` define el tipo de jugada.
- 8 pares de nombres repetidos: las uniones van siempre por `nflId`.
- Eventos repetidos o con desfase manual/automático: se toma el primer cuadro y el manual es la fuente.
- Velocidades extremas del balón: no se filtran outliers mezclando balón y jugadores (velocidad máxima de un jugador 11.18 yd/s; las 30,073 filas con `s > 12` son del balón).

## Limitaciones

- Solo jugadas de pase (dropbacks), semanas 1-8 de 2021; no hay datos de carrera.
- La separación es al lanzar, no a la llegada del balón.
- Celdas con n pequeño (marcadas como "muestra pequeña") no sostienen conclusiones.
- Todo es asociación, no causalidad: presión, tiempo de bolsillo, tipo de cobertura y calidad del equipo se mezclan entre sí.
- Los equipos no se ajustan por rival ni por situación de marcador.

## Reproducibilidad

- Módulos: `backend/motor/exito.py` (Success Rate), `bolsillo.py`, `receptor.py`, `separacion.py`, `agregados.py` (tablas por grupo) y `precalculo.py` (`construir_motor`, 13-20 s).
- Pruebas: `.venv\Scripts\python.exe -m pytest backend/tests -q` (32 pruebas).
- El dashboard muestra las mismas cifras vía `GET /api/analisis`.
- Cobertura por tipo y por nombre, y las demás tablas de este documento, salen de `tabla_jugadas` (`construir_motor().tabla_jugadas`) filtrada por `down_valido`.

## Cómo ejecutar (Windows)

El dataset es un submódulo: clona con `git clone --recurse-submodules <repo>` o, si ya clonaste, `git submodule update --init`.

- Backend (desde la raíz, puerto 8000): `.venv\Scripts\python.exe -m uvicorn backend.main:app --reload`
- Dashboard en desarrollo: `cd dashboard && npm run dev` (Vite hace proxy de `/api` al puerto 8000).
- Producción: `npm run build` en `dashboard/` genera `dashboard/dist` y FastAPI lo sirve en la misma URL que la API.
- Pruebas: `.venv\Scripts\python.exe -m pytest backend/tests -q`.

## Endpoints

- `GET /health`
- `GET /api/filtros`
- `GET /api/analisis` (503 "Precalculando datos" con `Retry-After` mientras se procesa el tracking)
- `GET /api/jugadas`
- `GET /api/jugada/{game_id}/{play_id}`

Contrato en `.kiro/specs/01-motor-datos/contrato-api.md`.

## Estructura y stack

- `backend/` (`main.py`, `api.py`, `esquemas.py`, `motor/`, `tests/`), `dashboard/` (React), `data/` (solo lectura), `.kiro/specs/`.
- Datos: 122 partidos, 8,557 jugadas de pase, 1,679 jugadores, 8,314,178 filas de tracking leídas partido por partido.
- FastAPI 0.115.14, pandas 2.2.3, numpy 2.1.3, React 18 + Vite 5 + Tailwind 3 + Recharts. Sin IA en esta versión.
