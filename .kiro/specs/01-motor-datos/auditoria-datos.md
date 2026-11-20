# Auditoría del dataset (pandas 2.2.3 en `.venv`, datos sin modificar)

Commit del dataset: `85da22e` (última versión del repo público). Cada cifra salió de código ejecutado sobre `data/`.

## Integridad verificada (sin problemas)
- 0 llaves duplicadas en `plays`, `pffScoutingData` y `tracking`. Todas las uniones cruzan sin huecos.
- PFF: 22 jugadores por jugada (11 ofensivos, 11 defensivos, exactamente 1 `Pass`). Tracking: 23 filas por cuadro.
- Los jugadores del tracking son exactamente los de PFF en cada jugada. `jerseyNumber` y `team` no cambian por jugador dentro de un partido.
- `playDirection` es constante por jugada. `frameId` empieza en 1 y no tiene huecos (19 a 203 cuadros por jugada).
- `possessionTeam` y `defensiveTeam` coinciden siempre con los equipos de `games`. Ningún equipo juega dos veces en una semana.
- `pff_passCoverageType` es consistente con `pff_passCoverage` (Cover-1 siempre Man, Cover-3 siempre Zone, etc.).
- `passResult == "S"` coincide con `pff_sack = 1` en 536 de 543 sacks; ningún C, I, IN o R tiene sack PFF.

## Trampas y cómo se manejan
| # | Trampa | Evidencia | Manejo |
|---|---|---|---|
| 1 | El tracking termina 0.5 s después del pase | 7,590 de 7,604 pases tienen exactamente 5 cuadros tras `pass_forward`; `pass_arrived` solo en 367 jugadas | Separación medida en `pass_forward` |
| 2 | Receptor objetivo no está en ninguna columna | Validación con `playDescription` | Receptor nombrado en la descripción (7,240 de 7,562 pases; 99.2% de coincidencia con `pass_arrived`, n = 362) |
| 3 | Velocidades extremas | Las 30,073 filas con `s > 12` son del balón; jugador máx. 11.18 yd/s | No filtrar outliers mezclando balón y jugadores |
| 4 | `playResult` incluye castigos de forma no aditiva | 253 jugadas con `playResult != prePenaltyPlayResult + penaltyYards` (214 con castigo, 39 sin) | Success Rate con `prePenaltyPlayResult` |
| 5 | Castigos sin nombre | 20 jugadas con `penaltyYards` y sin `foulName1` (rechazados o de formación) | No usar `foulName1` para detectar castigo |
| 6 | Intercepciones valen 0 yardas | Las 190 IN tienen `playResult = 0` aunque haya retorno | IN siempre es fracaso |
| 7 | `down = 0` | 35 jugadas, todas "TWO-POINT" | Excluir de métricas por down |
| 8 | Snaps faltantes | 24 jugadas sin `ball_snap` ni `autoevent_ballsnap` (C 15, I 5, R 2, S 1, IN 1; 21 con pase); 1 depende del respaldo | `n_sin_snap` separado de `n_sin_pase`; no suponer el cuadro 1 |
| 9 | Eventos repetidos | `autoevent_ballsnap` en >1 cuadro en 10 jugadas, `pass_forward` en 1, `line_set` en 26 | Tomar el primer cuadro de cada evento |
| 10 | Eventos manual y automático no coinciden | `ball_snap` vs `autoevent_ballsnap` difieren 1-4 cuadros; igual con el pase | El manual es la fuente; el autoevent solo es respaldo |
| 11 | Eventos de pase en jugadas sin pase | 30 sacks y 12 scrambles con evento de pase; 3 C/I sin evento | `passResult` define el tipo de jugada |
| 12 | Play action en dos fuentes | Evento `play_action` en 1,971 jugadas vs `pff_playAction = 1` en 2,038 | Usar `pff_playAction` |
| 13 | Nombres repetidos | 8 pares (ej. Josh Allen QB 46076 y Josh Allen OLB 47790) | Unir siempre por `nflId` |
| 14 | Formato de fecha mixto | 14 `birthDate` en mm/dd/yyyy | Parsear ambos formatos si se usa |
| 15 | Fuera del campo y ángulos 360 | x fuera de 0-120 en 112 filas, y fuera de 0-53.3 en 1,061; `o = 360` en 87, `dir = 360` en 78 | Conservar las filas; aplicar módulo 360 |
| 16 | Línea de golpeo vs balón | En 104 jugadas, x del balón al snap difiere >2 yd de `absoluteYardlineNumber` | Usar `absoluteYardlineNumber` para la situación |
| 17 | Sacks sin crédito PFF | 7 jugadas S sin ningún `pff_sack = 1` | La presión usa `pff_hit`, `pff_hurry` o `pff_sack` |

## Jugadas sin snap (gameId-playId, passResult)
2021091200-4367 C, 2021091202-3606 C, 2021091206-1296 C, 2021091904-1614 I, 2021091907-1836 R, 2021091907-1857 C, 2021091909-3565 C, 2021091912-1868 C, 2021092605-1911 C, 2021092611-1641 C, 2021100302-775 C, 2021100302-3688 I, 2021100307-4668 I, 2021100308-4330 I, 2021100313-1878 C, 2021100700-2963 C, 2021101004-3595 R, 2021101004-3861 C, 2021101706-1932 C, 2021101800-3505 S, 2021102405-4101 I, 2021102408-1872 C, 2021102410-3833 C, 2021103101-4401 IN.
