# Requirements Document

## Introduction

Motor de datos y API del backend para el Coach de NFL que prepara el plan de juego aéreo. El motor lee los CSV de `data/nfl-big-data-bowl-regional-event-data/data/` (8,557 jugadas de dropback, 122 partidos, semanas 1-8 de 2021), normaliza las coordenadas por `playDirection`, calcula en memoria el Success Rate, la comparación de coberturas, el tiempo de bolsillo y la separación receptor-defensor, y los expone bajo `/api/...` con las llaves JSON exactas de `contrato-api.md`. Fuentes de verdad: `enfoque-coach.md`, `contrato-api.md`, `esquema-oficial.md` y `auditoria-datos.md`. El frontend (`dashboard/`, spec 02-dashboard), la IA/Bedrock, las jugadas de carrera diseñadas y los datos externos quedan fuera de esta spec.

## Glossary

- **Motor_Datos**: Módulo Python de `backend/` que carga, normaliza y calcula métricas con pandas y numpy.
- **API**: Aplicación FastAPI `app` expuesta por `backend/main.py`.
- **Cargador**: Componente del Motor_Datos que lee los CSV de `data/`.
- **Normalizador**: Componente del Motor_Datos que transforma coordenadas según `playDirection`.
- **Calculador_Metricas**: Componente del Motor_Datos que calcula Success Rate, coberturas, bolsillo y separación.
- **Jugada**: Fila de `plays.csv` identificada por `gameId` + `playId`.
- **Jugada_Con_Pase**: Jugada con evento `pass_forward` (o `autoevent_passforward` como respaldo) en el tracking.
- **Success_Rate**: Proporción de jugadas exitosas según la convención del equipo (Requisito 3).
- **Rango_Distancia**: Clave `corta` (`yardsToGo` 1-3), `media` (4-7) o `larga` (8 o más).
- **Evento_Primario**: Evento manual `ball_snap` o `pass_forward` del tracking.
- **Evento_Respaldo**: Evento `autoevent_ballsnap` o `autoevent_passforward`, usado solo si falta el Evento_Primario.
- **Primer_Cuadro_Evento**: Menor `frameId` en que aparece un evento dentro de una jugada.
- **Presion**: Condición de una jugada en que algún defensor tiene `pff_hit`, `pff_hurry` o `pff_sack` igual a 1.
- **Receptor_Objetivo**: Jugador con `pff_role` "Pass Route" nombrado en `playDescription` y cruzado por apellido con los "Pass Route" de la jugada.
- **Separacion**: Distancia euclidiana (`x`, `y`) del Receptor_Objetivo al defensor "Coverage" más cercano en el cuadro de `pass_forward`.
- **Ejemplo_Contrato**: Valor de muestra de `contrato-api.md`, que indica la forma y no una cifra real.

## Requirements

### Requirement 1: Carga de datos al arrancar

**User Story:** Como integrante de frontend, quiero que el backend cargue los datos al arrancar sin tocar el disco, para que la API responda en el servidor efímero.

#### Acceptance Criteria

1. WHEN la API arranca, THE Cargador SHALL leer `games.csv`, `plays.csv`, `players.csv` y `pffScoutingData.csv` desde rutas relativas a la raíz del proyecto.
2. WHEN la API arranca, THE Cargador SHALL leer los 122 archivos `tracking_[gameId].csv` uno por uno, sin concatenar los 8,314,178 registros en un único DataFrame en memoria.
3. WHEN el Cargador termina de leer un archivo de tracking, THE Calculador_Metricas SHALL conservar solo las métricas por jugada y liberar el DataFrame de ese partido.
4. WHEN el endpoint de jugada recibe una solicitud válida, THE Cargador SHALL leer bajo demanda solo el archivo de tracking del partido solicitado.
5. THE Cargador SHALL abrir los archivos de `data/` solo en modo lectura.
6. THE Motor_Datos SHALL operar sin escribir archivos en disco.
7. IF falta un archivo de `data/` al arrancar, THEN THE API SHALL registrar un error que nombre el archivo faltante y GET /health SHALL seguir respondiendo `{"status": "ok"}`.

### Requirement 2: Normalización por playDirection

**User Story:** Como Coach, quiero que todas las jugadas se vean con la ofensiva en la misma dirección, para comparar posiciones entre jugadas.

#### Acceptance Criteria

1. WHEN `playDirection` de una jugada es "left", THE Normalizador SHALL calcular `x = 120 - x` y `y = 53.3 - y`.
2. WHEN `playDirection` de una jugada es "left", THE Normalizador SHALL calcular `o` y `dir` como `(ang + 180) % 360`.
3. WHEN `playDirection` de una jugada es "right", THE Normalizador SHALL conservar `x`, `y`, `o` y `dir` sin cambios, salvo el módulo 360 del criterio 4.
4. THE Normalizador SHALL expresar `o` y `dir` en el rango [0, 360) aplicando módulo 360, de modo que los valores 360 queden en 0.
5. WHEN una fila corresponde al balón (`team` igual a "football"), THE Normalizador SHALL conservar `o` y `dir` como nulos.
6. THE Normalizador SHALL conservar las filas con `x` fuera de 0-120 o `y` fuera de 0-53.3.
7. IF una jugada no tiene `playDirection`, THEN THE Normalizador SHALL excluir esa jugada de la normalización y registrar su `gameId` y `playId`, sin asumir una dirección.
8. FOR ALL jugadas, aplicar la normalización dos veces a una jugada "left" SHALL devolver las coordenadas originales (propiedad de involución, módulo 360).

### Requirement 3: Success Rate por down y distancia

**User Story:** Como Coach, quiero saber qué proporción de jugadas aéreas son exitosas por down y distancia, para identificar las situaciones favorables.

#### Acceptance Criteria

1. THE Calculador_Metricas SHALL clasificar cada jugada con `down` entre 1 y 4 como exitosa o fallida usando `prePenaltyPlayResult` y no `playResult`.
2. WHEN `down` es 1, THE Calculador_Metricas SHALL clasificar la jugada como exitosa si `prePenaltyPlayResult` es mayor o igual a 0.4 por `yardsToGo`.
3. WHEN `down` es 2, THE Calculador_Metricas SHALL clasificar la jugada como exitosa si `prePenaltyPlayResult` es mayor o igual a 0.6 por `yardsToGo`.
4. WHEN `down` es 3 o 4, THE Calculador_Metricas SHALL clasificar la jugada como exitosa si `prePenaltyPlayResult` es mayor o igual a `yardsToGo`.
5. WHEN `passResult` es "IN", THE Calculador_Metricas SHALL clasificar la jugada como fallida.
6. WHEN `down` es 0, THE Calculador_Metricas SHALL excluir la jugada de las métricas por down y contarla en `n_excluidas_down_0`.
7. THE Calculador_Metricas SHALL asignar a cada jugada el Rango_Distancia `corta` si `yardsToGo` está entre 1 y 3, `media` entre 4 y 7, y `larga` si es 8 o más.
8. THE Calculador_Metricas SHALL reportar `n`, `exitosas` y `tasa` (entre 0 y 1) para el global y para cada combinación de `down` y `distancia`.
9. IF una combinación no tiene jugadas, THEN THE Calculador_Metricas SHALL omitir esa combinación en `por_down_distancia` en lugar de reportar una tasa.
10. FOR ALL conjuntos de jugadas, `exitosas` SHALL ser menor o igual a `n` y `tasa` SHALL ser igual a `exitosas / n`.

### Requirement 4: Coberturas por situación (historia A)

**User Story:** Como Coach, quiero comparar coberturas Zone, Man y Other por down y distancia, para decidir qué cobertura enfrentar o usar.

#### Acceptance Criteria

1. THE Calculador_Metricas SHALL agrupar las jugadas con `down` entre 1 y 4 por `pff_passCoverageType`, `down` y Rango_Distancia.
2. THE Calculador_Metricas SHALL reportar por grupo `n`, `success_rate`, `yardas_promedio` y el conteo de `resultado_pase` para las claves C, I, S, R e IN.
3. THE Calculador_Metricas SHALL calcular `yardas_promedio` como el promedio de `prePenaltyPlayResult` del grupo.
4. THE Calculador_Metricas SHALL calcular `success_rate` del grupo con las reglas del Requisito 3.
5. FOR ALL grupos, la suma de los conteos de `resultado_pase` SHALL ser igual a `n`.
6. THE API SHALL incluir en `GET /api/filtros` los valores únicos reales de `pff_passCoverage` bajo `coberturas` y de `pff_passCoverageType` bajo `tipos_cobertura`.

### Requirement 5: Tiempo de bolsillo (historia B)

**User Story:** Como Coach, quiero conocer el tiempo de bolsillo según presión y play action, para evaluar la protección y el diseño de la jugada.

#### Acceptance Criteria

1. THE Calculador_Metricas SHALL calcular el tiempo de bolsillo como (Primer_Cuadro_Evento de pase menos Primer_Cuadro_Evento de snap) multiplicado por 0.1 s.
2. THE Calculador_Metricas SHALL tomar el Evento_Primario de snap y pase, y usar el Evento_Respaldo solo cuando falte el Evento_Primario correspondiente.
3. WHEN una jugada usa un Evento_Respaldo, THE Calculador_Metricas SHALL contarla en `n_con_respaldo_autoevent`.
4. IF una jugada no tiene `ball_snap` ni `autoevent_ballsnap`, THEN THE Calculador_Metricas SHALL contarla en `n_sin_snap`, excluirla del tiempo de bolsillo y no suponer el cuadro 1 como snap.
5. WHEN una jugada tiene snap y no tiene evento de pase, THE Calculador_Metricas SHALL contarla en `n_sin_pase`.
6. WHEN `passResult` es "S" o "R", THE Calculador_Metricas SHALL ignorar un evento de pase presente y contar la jugada como `n_sin_pase`.
7. THE Calculador_Metricas SHALL reportar `n_con_pase`, `n_sin_pase` y `n_sin_snap` de modo que `n_con_pase + n_sin_pase + n_sin_snap` sea igual a `n_jugadas`.
8. THE Calculador_Metricas SHALL marcar `presion` como verdadero cuando algún defensor de la jugada tenga `pff_hit`, `pff_hurry` o `pff_sack` igual a 1.
9. THE Calculador_Metricas SHALL marcar `play_action` con `pff_playAction` de `plays.csv` y no con el evento `play_action` del tracking.
10. THE Calculador_Metricas SHALL reportar por grupo de `play_action` y `presion` los campos `n`, `tiempo_promedio_s`, `tiempo_mediana_s` y `success_rate`.
11. THE Calculador_Metricas SHALL tomar el Primer_Cuadro_Evento cuando un evento aparezca en más de un cuadro de la jugada.
12. FOR ALL jugadas con tiempo de bolsillo calculado, el tiempo SHALL ser mayor o igual a 0.

### Requirement 6: Separación receptor-defensor al lanzar (historia C)

**User Story:** Como Coach, quiero medir la separación entre el receptor objetivo y el defensor más cercano al momento del pase, para relacionarla con el resultado del pase.

#### Acceptance Criteria

1. THE Calculador_Metricas SHALL medir la Separacion en el Primer_Cuadro_Evento de `pass_forward`, con `autoevent_passforward` como respaldo.
2. THE Calculador_Metricas SHALL identificar el Receptor_Objetivo extrayendo el nombre que sigue a "to" o "intended for" en `playDescription` y cruzando el apellido con los jugadores "Pass Route" de la jugada, unidos por `nflId`.
3. THE Calculador_Metricas SHALL calcular la Separacion como la distancia euclidiana mínima, en yardas, entre el Receptor_Objetivo y los defensores con `pff_role` igual a "Coverage".
4. IF el Receptor_Objetivo no puede identificarse o la jugada no tiene cuadro de pase, THEN THE Calculador_Metricas SHALL excluir la jugada de la Separacion y contarla en `n_sin_receptor_identificado`.
5. THE Calculador_Metricas SHALL restringir el cálculo a jugadas con `passResult` igual a C, I o IN.
6. THE Calculador_Metricas SHALL reportar por `resultado_pase` los campos `n`, `separacion_promedio_yd`, `separacion_mediana_yd`, `vel_receptor_promedio` y `vel_defensor_promedio`, con velocidades `s` del Receptor_Objetivo y del defensor más cercano en el mismo cuadro.
7. THE Calculador_Metricas SHALL devolver `momento` igual a "pass_forward" en el bloque `separacion`.
8. FOR ALL jugadas medidas, la Separacion SHALL ser mayor o igual a 0.

### Requirement 7: Endpoints de filtros y análisis

**User Story:** Como integrante de frontend, quiero endpoints con las llaves exactas del contrato, para construir el dashboard sin adivinar la forma de los datos.

#### Acceptance Criteria

1. WHEN llega `GET /api/filtros`, THE API SHALL responder 200 con las llaves `equipos`, `semanas`, `downs`, `rangos_distancia`, `tipos_cobertura`, `coberturas` y `formaciones`, calculadas con los valores únicos de los datos.
2. THE API SHALL devolver en `rangos_distancia` las claves `corta`, `media` y `larga` con `min` y `max` según `contrato-api.md`, y `max` nulo para `larga`.
3. WHEN llega `GET /api/analisis` sin parámetros, THE API SHALL responder 200 con las llaves `filtros_aplicados`, `n_jugadas`, `n_excluidas_down_0`, `success_rate`, `coberturas`, `bolsillo` y `separacion`, con la estructura de `contrato-api.md`.
4. WHERE se envían los parámetros `ofensiva`, `defensiva`, `semana`, `down` o `distancia`, THE API SHALL calcular todas las métricas solo sobre las jugadas que cumplan todos los filtros enviados y devolver los valores en `filtros_aplicados`.
5. THE API SHALL devolver cada porcentaje o promedio junto con su `n`.
6. THE API SHALL devolver `tasa` y `success_rate` como números entre 0 y 1.
7. IF ningún dato cumple los filtros, THEN THE API SHALL responder 200 con `n_jugadas` igual a 0 y listas vacías, sin dividir entre cero.
8. IF un parámetro tiene un valor inválido (por ejemplo `down` no numérico o fuera de 1-4, `semana` fuera de las semanas existentes, `distancia` fuera de las claves de rango), THEN THE API SHALL responder 422 con el formato de error de FastAPI.
9. THE API SHALL registrar todas las rutas de datos bajo el prefijo `/api/`.
10. FOR ALL combinaciones de filtros, `n_con_pase + n_sin_pase + n_sin_snap` SHALL ser igual a `n_jugadas`.

### Requirement 8: Endpoint de detalle de jugada

**User Story:** Como integrante de frontend, quiero el detalle cuadro a cuadro de una jugada con coordenadas normalizadas, para dibujar el visor 2D.

#### Acceptance Criteria

1. WHEN llega `GET /api/jugada/{game_id}/{play_id}` de una jugada existente, THE API SHALL responder 200 con las llaves `game_id`, `play_id`, `descripcion`, `semana`, `down`, `yardas_por_avanzar`, `ofensiva`, `defensiva`, `resultado_pase`, `resultado_yardas`, `cobertura`, `tipo_cobertura`, `play_action`, `frames_por_segundo`, `eventos`, `receptor_objetivo` y `frames`.
2. THE API SHALL devolver en `frames` las coordenadas `x`, `y`, `o` y `dir` normalizadas según el Requisito 2, con `s` en yardas por segundo.
3. THE API SHALL devolver `lado` como "ofensiva", "defensiva" o "balon", y `nfl_id`, `nombre`, `dorsal`, `rol`, `o` y `dir` nulos para el balón.
4. THE API SHALL unir el `nombre` y el `rol` de cada jugador por `nflId` con `players.csv` y `pffScoutingData.csv`.
5. THE API SHALL devolver `frames_por_segundo` igual a 10.
6. THE API SHALL listar en `eventos` cada evento con su `frame_id` usando el Primer_Cuadro_Evento de cada tipo de evento.
7. WHEN la jugada no tiene snap, THE API SHALL responder 200 con `eventos` sin evento de snap.
8. WHEN el Receptor_Objetivo se identifica, THE API SHALL devolver `receptor_objetivo` con `nfl_id`, `nombre` y `separacion_yd` medida en el cuadro de `pass_forward`.
9. IF no hay pase o no se identifica el Receptor_Objetivo, THEN THE API SHALL devolver `receptor_objetivo` igual a `null`.
10. IF la combinación `game_id` y `play_id` no existe, THEN THE API SHALL responder 404 con `{"detail": "Jugada no encontrada"}`.
11. IF `game_id` o `play_id` no son enteros, THEN THE API SHALL responder 422 con el formato de error de FastAPI.

### Requirement 9: Integridad de datos

**User Story:** Como Coach, quiero que las cifras respeten las trampas conocidas del dataset, para confiar en los hallazgos.

#### Acceptance Criteria

1. THE Motor_Datos SHALL unir jugadores siempre por `nflId` y nunca por nombre.
2. THE Motor_Datos SHALL conservar las filas con nulos estructurales: `nflId` nulo en filas del balón, `yardlineSide` nulo con `yardlineNumber` igual a 50, `penaltyYards` nulo sin castigo y `pff_hit`, `pff_hurry` y `pff_sack` nulos fuera de Coverage y Pass Rush.
3. THE Motor_Datos SHALL tratar `pff_hit`, `pff_hurry` y `pff_sack` nulos como ausencia de presión al calcular Presion.
4. THE Motor_Datos SHALL conservar las 8,557 jugadas de `plays.csv`, incluidas las 24 jugadas sin snap y las jugadas con `absoluteYardlineNumber` nulo.
5. THE Motor_Datos SHALL excluir del Success Rate solo las jugadas con `down` igual a 0.
6. THE Motor_Datos SHALL usar `passResult` como definición del tipo de jugada y no la presencia de eventos de pase.
7. THE Motor_Datos SHALL calcular los máximos de velocidad de jugadores sin incluir las filas del balón.

### Requirement 10: Trazabilidad y reproducibilidad

**User Story:** Como integrante del equipo, quiero que cada hallazgo se reproduzca con el código del repo, para sustentarlo en la entrega.

#### Acceptance Criteria

1. THE Motor_Datos SHALL calcular toda estadística con código pandas o numpy ejecutado sobre los CSV de `data/`.
2. THE Motor_Datos SHALL exponer funciones pequeñas de una sola responsabilidad, con docstrings y comentarios en español.
3. THE Motor_Datos SHALL mantener los cálculos separados de las rutas FastAPI, de modo que puedan ejecutarse sin levantar el servidor.
4. WHEN se documenta un hallazgo en `README.md`, THE README.md SHALL indicar la función o consulta del repo que lo reproduce y la cifra `n` correspondiente.
5. THE README.md SHALL documentar la identidad `n_con_pase + n_sin_pase + n_sin_snap = n_jugadas` con los valores 7,541 + 992 + 24 = 8,557 reproducibles con el código (`n_sin_pase` = 542 S, 447 R y 3 pases C o I sin evento de pase).

### Requirement 11: Compatibilidad con la plantilla

**User Story:** Como integrante del equipo, quiero que el backend respete el contrato de despliegue de AWS, para que la app se publique sin cambios.

#### Acceptance Criteria

1. THE API SHALL exponer `app` (FastAPI) en `backend/main.py`.
2. WHEN llega `GET /health`, THE API SHALL responder `{"status": "ok"}`.
3. THE API SHALL usar solo las dependencias del stack fijo (FastAPI, Uvicorn, Pydantic, pandas, numpy).
4. THE API SHALL responder sin depender de IA ni de servicios de AWS.
