# Enfoque Coach: guía maestra de las specs

Base de datos: `esquema-oficial.md` y `auditoria-datos.md`. Reglas: `rules.md` y `dominio-nfl.md`.

## Rol y alcance
- Usuario: Coach de NFL que prepara el plan de juego aéreo (ofensivo y defensivo).
- Alcance: solo juego aéreo. Las 8,557 jugadas de `plays.csv` son dropbacks (`passResult` C, I, S, R, IN).
- Fuera de alcance: jugadas de carrera diseñadas, equipos especiales y datos externos.
- Límite del tracking: termina 5 cuadros (0.5 s) después de `pass_forward` en 7,590 de 7,604 pases. No hay atrapada ni carrera tras recepción.

## Historias invariantes (obligatorias)
1. **Normalización `playDirection`**: con "left", `x = 120 - x`, `y = 53.3 - y`, `o` y `dir` rotan `(ang + 180) % 360`. Todas las demás historias consumen los datos ya normalizados.
2. **Success Rate por down y distancia** (convención del equipo, no viene del dataset):
   - Exitosa si `prePenaltyPlayResult` alcanza 40% de `yardsToGo` en 1er down, 60% en 2do y 100% en 3er y 4to. Se usa la yarda sin castigo porque `playResult` mezcla castigos de forma no aditiva (253 jugadas).
   - `passResult == "IN"` siempre es fracaso (su `playResult` vale 0 aunque haya retorno).
   - Se excluye `down == 0` (35 conversiones de 2 puntos, confirmadas en `playDescription`) y se reporta cuántas.
   - Distancia por rangos de `yardsToGo`: corta 1-3, media 4-7, larga 8+.
3. **Visor 2D**: campo de 120 x 53.3 con jugadores y balón por `frameId` para una jugada (`gameId` + `playId`).
   - Ofensiva, defensiva y balón (`team = "football"`) se distinguen por color. Los eventos de `event` se marcan en la línea de tiempo.

## Historias especiales (hallazgos a analizar)
A. **Zone vs Man por situación**: comparar `pff_passCoverageType` y `pff_passCoverage` por down y distancia con Success Rate, `passResult` y yardas. Pregunta: ¿qué cobertura conviene enfrentar o usar en cada situación?
B. **Tiempo de bolsillo**
   - Tiempo = (primer `frameId` de pase - primer `frameId` de snap) x 0.1 s. Frecuencia confirmada: 10 Hz (26,707 de 26,713 segundos completos tienen 10 cuadros).
   - `autoevent_ballsnap` y `autoevent_passforward` solo como respaldo cuando falte el evento manual.
   - Las 24 jugadas sin ningún snap se excluyen y se reportan. Las jugadas sin pase (sacks, scrambles) se reportan aparte.
   - Cruzar con presión PFF (`pff_hit`, `pff_hurry`, `pff_sack` de cualquier defensor) y con `pff_playAction` (no con el evento `play_action` del tracking).
C. **Separación receptor-defensor al lanzar**
   - Momento de medición: primer cuadro de `pass_forward` (respaldo `autoevent_passforward`). Es el momento de decisión del QB y existe en casi todos los pases; `pass_arrived` solo existe en 367 jugadas y sesgaría el análisis.
   - Receptor objetivo: el jugador `Pass Route` nombrado en `playDescription` ("to X" o "intended for X"), cruzado por apellido con los `Pass Route` de esa jugada. Validado: identifica 7,240 de 7,562 pases C, I e IN, y coincide 99.2% con el más cercano al balón en `pass_arrived` (n = 362). Los no identificados se excluyen y se reportan.
   - Separación = distancia euclidiana (`x`, `y`) del receptor objetivo al defensor `Coverage` más cercano. Se comparan las velocidades `s` de ambos y se relaciona con `passResult` (C, I, IN).

## Criterios comunes
- Toda cifra sale de pandas sobre `data/`; nada inventado. Se reporta n junto a cada porcentaje.
- Los conteos de `event` son filas; se deduplican por `gameId + playId` y se toma el primer cuadro del evento.
- Las uniones con jugadores van siempre por `nflId` (hay 8 pares de nombres repetidos).
- Se calcula en memoria al arrancar o al responder, sin escribir a disco. La API vive bajo `api/...`.
- Cada hallazgo se documenta en el `README.md` con el código que lo reproduce.
