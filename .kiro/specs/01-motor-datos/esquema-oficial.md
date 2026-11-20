# Esquema oficial del dataset (perfilado con pandas 2.2.3 en `.venv`)

Ruta base: `data/nfl-big-data-bowl-regional-event-data/` (README.md + `data/`). Temporada 2021, semanas 1-8, del 09/09/2021 al 11/01/2021.

## Archivos
| Archivo | MB | Filas | Columnas |
|---|---|---|---|
| games.csv | 0.01 | 122 | 7 |
| plays.csv | 2.24 | 8,557 | 32 |
| players.csv | 0.10 | 1,679 | 7 |
| pffScoutingData.csv | 12.41 | 188,254 | 15 |
| tracking/tracking_[gameId].csv (122 archivos, uno por partido) | ~818 | 8,314,178 (48,323 a 93,334 por archivo) | 16 |
| **Total `data/`** (127 archivos, incluye README) | **833.17** | | |

Nota de memoria: el tracking se lee archivo por archivo (o con `usecols`); nunca concatenado completo.

## games.csv
| Columna | Tipo | Nulos | Español | Significado oficial |
|---|---|---|---|---|
| gameId | int64 | 0 | id_partido | Identificador único del partido |
| season | int64 | 0 | temporada | Temporada (solo 2021) |
| week | int64 | 0 | semana | Semana (1-8) |
| gameDate | object | 0 | fecha | Fecha mm/dd/yyyy |
| gameTimeEastern | object | 0 | hora_este | Hora de inicio HH:MM:SS (EST) |
| homeTeamAbbr | object | 0 | local | Código de 3 letras del local (32 equipos) |
| visitorTeamAbbr | object | 0 | visitante | Código de 3 letras del visitante |

## plays.csv (llave: gameId + playId, 0 duplicados). Todas son jugadas de pase (dropback).
| Columna | Tipo | Nulos | Español | Significado oficial |
|---|---|---|---|---|
| gameId / playId | int64 | 0 | id_partido / id_jugada | playId no es único entre partidos |
| playDescription | object | 0 | descripcion | Texto de la jugada |
| quarter | int64 | 0 | cuarto | Cuarto (1-5; 5 = tiempo extra, 98 jugadas) |
| down | int64 | 0 | oportunidad | Down 1-4. Hay 35 jugadas con down=0 y yardsToGo=0: **sin confirmar** (posible conversión de 2 puntos; verificar en playDescription) |
| yardsToGo | int64 | 0 | yardas_por_avanzar | Distancia al primer down |
| possessionTeam | object | 0 | ofensiva | Equipo con el balón |
| defensiveTeam | object | 0 | defensiva | Equipo defensivo |
| yardlineSide | object | 125 | lado_yarda | Equipo dueño de la mitad donde está la línea. **Nulo estructural**: los 125 nulos son exactamente las 125 jugadas con yardlineNumber=50 |
| yardlineNumber | int64 | 0 | numero_yarda | Yarda de la línea de golpeo (1-50) |
| gameClock | object | 0 | reloj | Tiempo en el reloj MM:SS |
| preSnapHomeScore / preSnapVisitorScore | int64 | 0 | marcador_local / visitante | Marcador antes de la jugada |
| passResult | object | 0 | resultado_pase | C completo (4,620), I incompleto (2,755), S sack (543), R scramble (449), IN intercepción (190) |
| penaltyYards | float64 | 7,801 | yardas_castigo | Yardas por castigo. **Nulo estructural**: los 7,801 nulos coinciden con foulName1 nulo (sin castigo) |
| prePenaltyPlayResult | int64 | 0 | resultado_sin_castigo | Yardas netas antes del castigo |
| playResult | int64 | 0 | resultado | Yardas netas con castigo |
| foulName1-3 | object | 7,821 / 8,527 / 8,556 | castigo_1-3 | Nombre del i-ésimo castigo (29 tipos distintos en foulName1) |
| foulNFLId1-3 | float64 | 7,821 / 8,527 / 8,556 | id_infractor_1-3 | nflId de quien cometió el castigo |
| absoluteYardlineNumber | float64 | 1 | yarda_absoluta | Distancia a la zona de anotación de la ofensiva. 1 nulo real (gameId 2021091904, playId 3676) |
| offenseFormation | object | 7 | formacion_ofensiva | SHOTGUN 5,481; EMPTY 1,396; SINGLEBACK 1,189; I_FORM 298; PISTOL 154; JUMBO 30; WILDCAT 2 |
| personnelO | object | 1 | personal_ofensivo | Personal ofensivo (30 valores) |
| defendersInBox | float64 | 7 | defensores_en_caja | Defensores cerca de la línea de golpeo |
| personnelD | object | 1 | personal_defensivo | Personal defensivo (29 valores) |
| dropBackType | object | 528 | tipo_dropback | TRADITIONAL, SCRAMBLE, DESIGNED_ROLLOUT_R/L, SCRAMBLE_ROLLOUT_R/L, DESIGNED_RUN, UNKNOWN. Nulos **sin confirmar** (cruzar con passResult) |
| pff_playAction | int64 | 0 | play_action | 1 = hubo finta de carrera (2,038 jugadas) |
| pff_passCoverage | object | 0 | cobertura | Cover-3 2,665; Cover-1 2,011; Cover-2 1,085; Quarters 1,033; Cover-6 805; Red Zone 376; Cover-0 270; 2-Man 200; Bracket 47; Prevent 32; Goal Line 25; Miscellaneous 8 |
| pff_passCoverageType | object | 0 | tipo_cobertura | Zone 5,588; Man 2,481; Other 488 |

## players.csv (llave: nflId)
| Columna | Tipo | Nulos | Español | Significado oficial |
|---|---|---|---|---|
| nflId | int64 | 0 | id_jugador | Identificador único del jugador |
| height | object | 0 | estatura | Texto pies-pulgadas, ej. "6-4" |
| weight | int64 | 0 | peso | Peso (libras) |
| birthDate | object | 232 | fecha_nacimiento | YYYY-MM-DD. Nulos son dato faltante |
| collegeName | object | 224 | universidad | Universidad. Nulos son dato faltante |
| officialPosition | object | 0 | posicion_oficial | 19 posiciones: WR, CB, DE, OLB, RB, T, TE, DT, G, ILB, FS, SS, QB, C, NT, MLB, FB, LB, DB |
| displayName | object | 0 | nombre | Nombre del jugador |

## pffScoutingData.csv (llave: gameId + playId + nflId, 0 duplicados)
| Columna | Tipo | Nulos | Español | Significado oficial |
|---|---|---|---|---|
| gameId / playId / nflId | int64 | 0 | llaves | Partido, jugada y jugador |
| pff_role | object | 0 | rol | Coverage 57,765; Pass Block 46,057; Pass Route 39,513; Pass Rush 36,362; Pass 8,557. El CSV escribe "Block/Route/Rush" con mayúscula, a diferencia del README |
| pff_positionLinedUp | object | 0 | posicion_alineado | Posición al snap (56 valores, ej. QB, LT, SCBoL, TE-iR) |
| pff_hit / pff_hurry / pff_sack | float64 | 94,127 | golpe / presion / captura | Indicador del defensor. **Nulo estructural**: no nulos solo en Coverage y Pass Rush |
| pff_beatenByDefender | float64 | 140,167 | superado | Bloqueador superado sin cargo de hit, hurry o sack. No nulo en Pass Block (46,057) y Pass Route (2,030) |
| pff_hitAllowed / pff_hurryAllowed / pff_sackAllowed | float64 | 140,167 | golpe/presion/captura_permitida | Responsabilidad del bloqueador |
| pff_nflIdBlockedPlayer | float64 | 141,728 | id_bloqueado | nflId del primer defensor bloqueado |
| pff_blockType | object | 140,350 | tipo_bloqueo | PP 24,697; PA 6,331; PT 5,906; SW 3,025; CL 2,595; CH 1,565; NB 1,352; PU 886; SR 501; BH 443; UP 308; PR 295 |
| pff_backFieldBlock | float64 | 140,351 | bloqueo_backfield | Bloqueo dentro del backfield ofensivo |

## tracking_[gameId].csv (llave: gameId + playId + nflId + frameId, 0 duplicados)
| Columna | Tipo | Nulos | Español | Significado oficial |
|---|---|---|---|---|
| gameId / playId | int64 | 0 | llaves | Partido y jugada |
| nflId | float64 | 361,486 | id_jugador | **Nulo estructural**: las 361,486 filas son del balón (team="football") |
| frameId | int64 | 0 | cuadro | Cuadro desde 1 (máximo 203) |
| time | object | 0 | marca_tiempo | Timestamp |
| jerseyNumber | float64 | 361,486 | dorsal | Nulo en filas del balón |
| team | object | 0 | equipo | Equipo o "football" (33 valores) |
| playDirection | object | 0 | direccion | **Presente**: left 4,287,706; right 4,026,472 filas |
| x / y | float64 | 0 | x / y | Yardas. Observado x de -3.55 a 121.15 y y de -4.53 a 57.72 (fuera de 0-120 y 0-53.3: jugadores fuera del campo) |
| s / a / dis | float64 | 0 | velocidad / aceleracion / distancia | yd/s (máx. 29.34), yd/s² (máx. 50.69), yd desde el cuadro previo |
| o / dir | float64 | 361,486 | orientacion / direccion_mov | Grados 0-360. Nulo en filas del balón |
| event | object | 7,673,352 | evento | Etiqueta del cuadro. Nulo en cuadros sin evento |

## Llaves de unión (verificadas)
- `plays` a `games` por `gameId`: todos los gameId existen.
- `pffScoutingData` y `tracking` a `plays` por `gameId + playId`: las 8,557 jugadas cruzan sin huecos en ambas tablas.
- `pffScoutingData` y `tracking` a `players` por `nflId`: los 1,679 nflId existen (excluye el balón).
- `tracking` a `pffScoutingData` por `gameId + playId + nflId`. `foulNFLId1-3` y `pff_nflIdBlockedPlayer` también unen a `players.nflId`.

## Valores únicos de `event` (filas con evento en tracking)
ball_snap 196,236; pass_forward 173,604; autoevent_ballsnap 86,641; autoevent_passforward 85,882; play_action 45,471; run 10,902; qb_sack 10,373; pass_arrived 8,441; autoevent_passinterrupted 4,623; man_in_motion 4,071; line_set 3,220; shift 3,059; pass_tipped 2,553; first_contact 1,840; qb_strip_sack 1,334; pass_outcome_incomplete 920; pass_outcome_caught 529; fumble 391; fumble_offense_recovered 253; handoff 230; huddle_break_offense 69; tackle 69; penalty_flag 46; lateral 23; dropped_pass 23; out_of_bounds 23.
