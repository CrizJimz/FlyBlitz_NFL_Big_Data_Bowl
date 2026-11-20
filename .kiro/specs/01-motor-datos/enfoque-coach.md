# Enfoque Coach: guía maestra de las specs

Base de datos: `esquema-oficial.md`. Reglas: `rules.md` y `dominio-nfl.md`.

## Rol y alcance
- Usuario: Coach de NFL que prepara el plan de juego aéreo (ofensivo y defensivo).
- Alcance: solo juego aéreo. Las 8,557 jugadas de `plays.csv` son dropbacks (`passResult` C, I, S, R, IN).
- Fuera de alcance: jugadas de carrera diseñadas, equipos especiales y datos externos.

## Historias invariantes (obligatorias)
1. **Normalización `playDirection`**: con "left", `x = 120 - x`, `y = 53.3 - y`, `o` y `dir` rotan `(ang + 180) % 360`. Todas las demás historias consumen los datos ya normalizados.
2. **Success Rate por down y distancia**: una jugada es exitosa si `playResult` alcanza 40% de `yardsToGo` en 1er down, 60% en 2do y 100% en 3er y 4to.
   - Esta definición es la convención analítica que adopta el equipo, no viene del dataset.
   - Regla: se excluye `down == 0` (35 jugadas) de toda métrica por down; se reporta cuántas se excluyeron.
   - Agrupar la distancia por rangos de `yardsToGo` (corta, media, larga), definidos y documentados en la spec.
3. **Visor 2D**: campo de 120 x 53.3 con jugadores y balón por `frameId` para una jugada (`gameId` + `playId`).
   - Ofensiva, defensiva y balón (`team = "football"`) se distinguen por color.
   - Los eventos clave de `event` se marcan en la línea de tiempo.

## Historias especiales (hallazgos a analizar)
A. **Zone vs Man por situación**
   - Comparar `pff_passCoverageType` (Zone, Man, Other) y `pff_passCoverage` por down y distancia.
   - Métricas: Success Rate, `passResult` y `playResult`.
   - Pregunta del Coach: ¿qué cobertura conviene enfrentar o usar en cada situación?
B. **Tiempo de bolsillo**
   - Tiempo entre `ball_snap` y `pass_forward` por jugada.
   - Cruzar con la presión PFF (`pff_hit`, `pff_hurry`, `pff_sack`) y con `pff_playAction`.
   - Frecuencia confirmada: 10 Hz (0.1 s por cuadro). `time` solo tiene resolución de segundos; el 99.98% de los segundos completos (26,707 de 26,713) tienen 10 cuadros y `frameId` es consecutivo. Tiempo = (`frameId` de pase - `frameId` de snap) x 0.1 s.
   - Regla: `autoevent_ballsnap` y `autoevent_passforward` se usan solo como respaldo cuando falte `ball_snap` o `pass_forward` en la jugada.
   - Las jugadas sin `pass_forward` (sack o scramble) se documentan aparte, no se descartan.
C. **Separación receptor-defensor en `pass_arrived`**
   - En el cuadro `pass_arrived`, calcular la distancia euclidiana (`x`, `y`) de cada receptor (`pff_role = "Pass Route"`) al defensor más cercano (`pff_role = "Coverage"`).
   - Usar `s` para comparar las velocidades de ambos.
   - Regla: el receptor objetivo es el jugador `Pass Route` más cercano en distancia (`x`, `y`) al balón (`team == "football"`) en el cuadro `pass_arrived`.
   - Relacionar la separación con `passResult`.

## Criterios comunes
- Toda cifra sale de pandas sobre `data/`; nada inventado. Se reportan n de jugadas junto a cada porcentaje.
- Los conteos de `event` son filas; se deduplican por `gameId + playId` antes de contar jugadas.
- Se calcula en memoria al arrancar o al responder, sin escribir a disco. La API vive bajo `api/...`.
- Cada hallazgo se documenta en el `README.md` con el código que lo reproduce.
