# Implementation Plan: 01-motor-datos

## Overview

El plan construye el motor de datos y la API de `backend/` en incrementos pequeños. El sistema responde pronto (`/health` y `/api/filtros` en la tarea 3) y crece hasta `/api/analisis`, `/api/jugada` y el servicio de `dashboard/dist`. Los puntos de sincronización con el equipo son los checkpoints 4, 11 y 14.

Reglas que aplican a TODAS las tareas de código (de `rules.md`, `dominio-nfl.md` y `design.md`):

- Funciones pequeñas, de una sola responsabilidad, con docstrings y comentarios en español.
- Cálculos puros en `backend/motor/` sin importar FastAPI; las rutas viven en `backend/api.py`.
- Sin escribir archivos en disco. `data/` es de solo lectura. Rutas relativas a la raíz del proyecto (`config.RAIZ`).
- Ninguna dependencia nueva: solo FastAPI 0.115.14, Uvicorn, Pydantic, pandas 2.2.3, numpy 2.1.3, y para pruebas pytest 8.3.5 y httpx 0.28.1 (`TestClient`). Prohibido hypothesis.
- Llaves JSON exactas de `contrato-api.md`; `NaN` se serializa como `null`.
- Toda cifra sale de código pandas sobre los CSV. Antes de usar una columna se verifica que existe en `df.columns`. Si una columna resulta ambigua, se marca "sin confirmar" y se avisa al usuario.
- Pruebas en `backend/tests/`. Las pruebas de propiedades usan `numpy.random.default_rng(semilla)` con semilla fija y al menos 100 iteraciones, y llevan el comentario `# Feature: 01-motor-datos, Property N: <título>`. Cada propiedad va en su propio archivo de prueba.
- Fuera de alcance: `dashboard/`, IA/Bedrock y despliegue manual.

## Tasks

- [ ] 1. Esqueleto de `backend/motor/` y carga de tablas base
  - [ ] 1.1 Crear el paquete `backend/motor/` y `config.py`
    - Crear `backend/motor/__init__.py` y `config.py` con `RAIZ`, `DIR_DATOS`, `FPS`, `LARGO`, `ANCHO`, `RANGOS_DISTANCIA`, `RESULTADOS_PASE`, `PASE_CON_BALON`, `SNAP` y `PASE` según el diseño.
    - Crear `backend/tests/__init__.py` vacío.
    - _Requirements: 1.1, 10.2, 10.3, 11.3_

  - [ ] 1.2 Implementar `carga.py` con las tablas base y el tracking de un partido
    - `ArchivoFaltante`, `leer_tablas_base`, `listar_partidos` y `leer_tracking_partido` con `usecols` y dtypes reducidos; solo lectura.
    - Verificar con `df.columns` y `unique()` las columnas usadas (`passResult`, `pff_role`, `playDirection`, `event`) antes de fijarlas.
    - Contrastar los `gameId` de los `tracking_*.csv` con `games.gameId` (122 partidos).
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6, 1.7, 9.1, 9.2_

  - [ ]* 1.3 Escribir pruebas de ejemplo de la carga
    - `leer_tablas_base` sobre datos reales devuelve 8,557 jugadas; `ArchivoFaltante` nombra el archivo si se apunta a una ruta inexistente; el tracking de un partido trae solo las columnas pedidas.
    - _Requirements: 1.1, 1.2, 1.7_

- [ ] 2. Normalización por `playDirection`
  - [ ] 2.1 Implementar `normalizacion.py`
    - `normalizar_tracking(df)` vectorizada con la máscara `playDirection == "left"`: `x=120-x`, `y=53.3-y`, `o`/`dir` con `(ang+180) % 360`; "right" solo aplica `% 360`.
    - Conservar filas fuera del campo y los nulos de `o`/`dir` del balón. Excluir las filas sin `playDirection` y devolverlas en un segundo valor para registrarlas con `logging` (sin asumir dirección). No mutar la entrada.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ]* 2.2 Escribir prueba de propiedad para la normalización
    - **Property 1: Normalización según playDirection**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

  - [ ]* 2.3 Escribir prueba de propiedad para la conservación de filas y nulos del balón
    - **Property 2: Conservación de filas y nulos del balón**
    - **Validates: Requirements 2.5, 2.6**

  - [ ]* 2.4 Escribir prueba de propiedad para la involución
    - **Property 3: Involución de la normalización**
    - **Validates: Requirements 2.8**

- [ ] 3. Router `/api` con `GET /api/filtros` y `/health` intacto
  - [ ] 3.1 Implementar `filtros.py` con `construir_catalogo`
    - Valores únicos reales de `equipos`, `semanas`, `downs`, `tipos_cobertura`, `coberturas` y `formaciones` (sin nulos) más `rangos_distancia` fijos (`larga` con `max` nulo).
    - _Requirements: 4.6, 7.1, 7.2, 9.2_

  - [ ] 3.2 Crear `esquemas.py` con los modelos de `/api/filtros`
    - `RangoDistancia` y `FiltrosRespuesta` con las llaves exactas de `contrato-api.md`, y la función que convierte `NaN` a `None` antes de serializar.
    - _Requirements: 7.1, 7.2, 7.9_

  - [ ] 3.3 Crear `EstadoMotor`, `api.py` y el `lifespan` en `main.py`
    - `EstadoMotor` mínimo en `precalculo.py` (`estado`, `mensaje`, `tablas`, `catalogo`). El `lifespan` carga las tablas base de forma síncrona y deja el estado en `app.state.motor`; si falta un archivo, registra su nombre con `logging.error` y pasa a `error`.
    - `APIRouter(prefix="/api")` con `GET /api/filtros` y dependencia `obtener_estado` (503 si el estado es `error`). `GET /health` sigue respondiendo `{"status": "ok"}`. Conservar `cargar_env()` al inicio de `main.py` tal como indican las reglas.
    - _Requirements: 1.1, 1.7, 7.1, 7.9, 11.1, 11.2, 11.4_

  - [ ]* 3.4 Escribir pruebas de ejemplo de `/health` y `/api/filtros`
    - `/health` responde `{"status": "ok"}` también con `estado = error` (ruta inexistente); `/api/filtros` trae las siete llaves y valores iguales a `unique()` de los CSV; todas las rutas de datos cuelgan de `/api`.
    - _Requirements: 1.7, 7.1, 7.2, 7.9, 11.2_

- [ ] 4. Checkpoint - GET /health y GET /api/filtros responden: merge de backend a main y avisar al compañero de frontend
  - Ejecutar las pruebas (`pytest backend/tests`) y confirmar que `GET /health` y `GET /api/filtros` responden con datos reales.
  - Preguntar al usuario si hay dudas. No ejecutar git (merge, push) sin confirmación explícita; si el usuario confirma, hacer el merge de `backend` a `main` y avisar al compañero de frontend.

- [ ] 5. Success Rate y coberturas
  - [ ] 5.1 Implementar `exito.py`
    - `rango_distancia`, `es_exitosa` con aritmética entera (`5*pre >= 2*ytg` en down 1, `5*pre >= 3*ytg` en down 2, `pre >= ytg` en downs 3-4; `IN` siempre falso) y `resumen_tasa` (con `n == 0` devuelve `tasa 0.0` sin dividir).
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.7, 3.10_

  - [ ]* 5.2 Escribir prueba de propiedad para la clasificación de éxito
    - **Property 4: Clasificación de éxito frente a un oráculo independiente**
    - Oráculo con `fractions.Fraction`.
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

  - [ ]* 5.3 Escribir prueba de propiedad para el rango de distancia
    - **Property 5: Rango de distancia es una partición**
    - **Validates: Requirements 3.7**

  - [ ] 5.4 Implementar `construir_tabla_base` en `precalculo.py`
    - Una fila por jugada (8,557) con las columnas que no requieren tracking: `semana`, `ofensiva`, `defensiva`, `down`, `yardas_por_avanzar`, `formacion`, `cobertura`, `tipo_cobertura`, `play_action` (de `pff_playAction`, no del tracking), `resultado_pase`, `yardas_sin_castigo`, `rango_distancia`, `down_valido` y `exitosa`.
    - Unir por `gameId` y `nflId`, nunca por nombre. Conservar las filas con nulos estructurales.
    - _Requirements: 3.1, 3.6, 3.7, 5.9, 9.1, 9.2, 9.4, 9.5, 9.6_

  - [ ] 5.5 Implementar `bloque_success_rate` y `bloque_coberturas` en `agregados.py`
    - Success Rate global y `por_down_distancia` (se omiten combinaciones sin jugadas), con `n_excluidas_down_0`. Coberturas por `tipo_cobertura`, `down` y `rango_distancia` con `n`, `success_rate`, `yardas_promedio` y `resultado_pase` (C, I, S, R, IN, con ceros).
    - _Requirements: 3.6, 3.8, 3.9, 4.1, 4.2, 4.3, 4.4, 7.5, 7.6_

  - [ ]* 5.6 Escribir prueba de propiedad para los invariantes del Success Rate
    - **Property 6: Invariantes del resumen de Success Rate**
    - **Validates: Requirements 3.6, 3.8, 3.9, 3.10, 7.6, 9.5**

  - [ ]* 5.7 Escribir prueba de propiedad para la conservación en coberturas
    - **Property 7: Conservación en el bloque de coberturas**
    - **Validates: Requirements 4.1, 4.3, 4.4, 4.5**

- [ ] 6. Eventos de snap/pase, bolsillo y presión
  - [ ] 6.1 Implementar `bolsillo.py`
    - `primer_cuadro_evento`, `elegir_cuadro` (respaldo solo si falta el primario), `categoria_bolsillo` (`con_pase`/`sin_pase`/`sin_snap` según `passResult`, no según la presencia del evento), `tiempo_bolsillo` (`(pase - snap) * 0.1` solo para `con_pase`) y `presion_pff` (nulos = 0).
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.11, 5.12, 9.3, 9.6_

  - [ ]* 6.2 Escribir prueba de propiedad para la selección del primer cuadro
    - **Property 8: Selección del primer cuadro con respaldo**
    - **Validates: Requirements 5.2, 5.3, 5.11, 6.1**

  - [ ]* 6.3 Escribir prueba de propiedad para la fórmula del tiempo de bolsillo
    - **Property 10: Fórmula del tiempo de bolsillo**
    - **Validates: Requirements 5.1, 5.12**

  - [ ]* 6.4 Escribir prueba de propiedad para la presión PFF
    - **Property 11: Presión PFF**
    - **Validates: Requirements 5.8, 9.3**

  - [ ] 6.5 Agregar `presion` a la tabla base
    - Añadir la columna `presion` en `construir_tabla_base` (`precalculo.py`) con `presion_pff` sobre `pffScoutingData`, por `(gameId, playId)`.
    - _Requirements: 5.8, 9.2, 9.3_

- [ ] 7. Receptor objetivo y separación
  - [ ] 7.1 Implementar `receptor.py`
    - `RE_RECEPTOR` exactamente como en el diseño, `extraer_nombre_receptor`, `partir_nombre`, `apellido_oficial` (ignora sufijos jr, sr, ii, iii, iv, v) y `resolver_receptores` vectorizada con `merge` y `groupby`: asigna el `nflId` solo si queda un candidato tras desempatar por inicial; si no, `NaN`.
    - _Requirements: 6.2, 6.4, 9.1_

  - [ ]* 7.2 Escribir prueba de propiedad para la resolución del receptor
    - **Property 12: Resolución del receptor objetivo**
    - **Validates: Requirements 6.2, 6.4**

  - [ ] 7.3 Implementar `separacion.py`
    - `separacion_en_cuadro(jugadores_cuadro, receptor_id, ids_cobertura)` devuelve separación mínima y velocidades `s` del receptor y del defensor más cercano. `separaciones_partido` vectorizada con `merge` receptor × defensores y `idxmin` por `playId`.
    - _Requirements: 6.1, 6.3, 6.5, 6.6, 6.8_

  - [ ]* 7.4 Escribir prueba de propiedad para la separación
    - **Property 13: Separación igual a la búsqueda por fuerza bruta**
    - **Validates: Requirements 6.3, 6.6, 6.8**

- [ ] 8. Precálculo de tracking en hilo de fondo
  - [ ] 8.1 Implementar `procesar_partido` y `construir_tabla_jugadas` en `precalculo.py`
    - Por partido: leer tracking con `usecols`, quedarse con eventos de snap y pase, calcular `cuadro_snap`, `cuadro_pase`, `usa_respaldo`, `categoria_bolsillo`, `tiempo_bolsillo_s`, `receptor_nfl_id`, `separacion_yd`, `vel_receptor` y `vel_defensor`, y liberar el DataFrame.
    - Nunca concatenar los 8,314,178 registros. Si falta un tracking, lanzar `ArchivoFaltante` (estado `error`). Registrar `gameId` y `playId` sin `playDirection`.
    - _Requirements: 1.2, 1.3, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.1, 6.4, 6.5, 9.4, 9.7_

  - [ ] 8.2 Completar `EstadoMotor`, `construir_motor` e hilo de fondo
    - `EstadoMotor` con `estado` (`cargando|listo|error`), `tabla_jugadas`, `catalogo` y `tiempos`; `construir_motor(dir_datos)` síncrono (usado por pruebas e hilo) con tiempos medidos con `time.perf_counter()` y `logging`.
    - `iniciar_motor_en_segundo_plano(app)` desde el `lifespan` en `main.py`: las tablas base se cargan antes del `yield` y el tracking en un hilo; `/health` y `/api/filtros` responden de inmediato.
    - _Requirements: 1.2, 1.3, 1.7, 10.3, 11.2_

  - [ ] 8.3 Responder 503 en `/api/analisis` mientras el precálculo no termina
    - En `api.py`, dependencia que exige `estado == "listo"` para `/api/analisis`: 503 `{"detail": "Precalculando datos"}` con cabecera `Retry-After: 5`; en `error`, 503 con `Motor de datos no disponible: falta <archivo>`. La ruta queda registrada y su cuerpo completo llega en la tarea 9.3.
    - _Requirements: 1.7, 7.3, 7.9_

  - [ ] 8.4 Escribir la prueba de integración con datos reales (no opcional)
    - `conftest.py` con un fixture `scope="session"` que ejecuta `construir_motor()` una vez, mide y muestra la duración, y asigna el estado a `app.state.motor` sin ejecutar el `lifespan`.
    - Verificar sobre `tabla_jugadas`: 8,557 jugadas sin llaves duplicadas; `con_pase + sin_pase + sin_snap = 7,541 + 992 + 24` (`sin_pase` = 542 S, 447 R, 3 C/I); 35 jugadas con `down 0`; 7,240 con separación medida y 325 en `n_sin_receptor_identificado` (322 sin receptor identificable y 3 sin cuadro de pase).
    - Verificar `tiempo_bolsillo_s >= 0` en las `con_pase`; si alguna incumple, reportar el hallazgo al usuario antes de decidir cómo tratarla. Verificar velocidad máxima de jugadores 11.18 yd/s sin balón.
    - _Requirements: 1.2, 1.3, 5.4, 5.5, 5.6, 5.7, 5.12, 6.4, 9.4, 9.7, 10.1, 10.5_

  - [ ]* 8.5 Escribir pruebas de ejemplo del estado de carga
    - `/api/analisis` responde 503 con `Retry-After` y `{"detail": "Precalculando datos"}` con `EstadoMotor` en `cargando`; `/health` responde ok en `cargando` y `error`; construir el motor no crea archivos nuevos en el árbol del proyecto.
    - _Requirements: 1.6, 1.7, 11.2_

- [ ] 9. `GET /api/analisis` completo con filtros y 422
  - [ ] 9.1 Implementar `filtrar_jugadas` en `filtros.py`
    - Máscara con todos los filtros enviados (`ofensiva`, `defensiva`, `semana`, `down`, `distancia`). Filtrar por `down` o `distancia` deja fuera las jugadas de `down 0`.
    - _Requirements: 7.4, 7.7_

  - [ ] 9.2 Implementar `bloque_bolsillo`, `bloque_separacion` y `analizar` en `agregados.py`
    - Bolsillo: `n_con_pase`, `n_sin_pase`, `n_sin_snap`, `n_con_respaldo_autoevent` (jugadas `con_pase` con snap o pase de respaldo) y `por_grupo` por `play_action` y `presion` solo sobre `con_pase` (promedio, mediana, `success_rate` sobre `down_valido`; grupos vacíos omitidos).
    - Separación: por `resultado_pase` C, I, IN con `n`, promedio, mediana y velocidades, `n_sin_receptor_identificado` y `momento = "pass_forward"`.
    - `analizar(tabla, filtros)` con la forma de `contrato-api.md`; con subconjunto vacío devuelve `n_jugadas = 0`, listas vacías y contadores en 0, sin dividir entre cero.
    - _Requirements: 5.3, 5.7, 5.10, 6.4, 6.5, 6.6, 6.7, 7.3, 7.5, 7.7, 7.10_

  - [ ] 9.3 Completar los esquemas y el endpoint `GET /api/analisis`
    - Modelos Pydantic con `response_model=` para `FiltrosAplicados`, `Tasa`, `TasaDownDistancia`, `GlobalYPorDownDistancia`, `ResultadoPase`, `GrupoCobertura`, `GrupoBolsillo`, `Bolsillo`, `GrupoSeparacion`, `Separacion` y `AnalisisRespuesta`.
    - Parámetros: `down` con `Query(ge=1, le=4)`, `distancia` como `Literal["corta","media","larga"]`; 422 con el formato de FastAPI para `semana`, `ofensiva` o `defensiva` fuera del catálogo. Endpoint `def` síncrono. `filtros_aplicados` devuelve los valores enviados.
    - _Requirements: 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9_

  - [ ] 9.4 Escribir la prueba de integración del endpoint con cifras de referencia (no opcional)
    - `GET /api/analisis` sin filtros por `TestClient`: `n_jugadas = 8557`, `n_excluidas_down_0 = 35`, `bolsillo` con 7,541 / 992 / 24, y `separacion` con 7,240 medidas y `n_sin_receptor_identificado = 325`. Llaves exactas del contrato; `tasa` entre 0 y 1; con `down=1` y `distancia=corta` las cifras coinciden con un cálculo pandas independiente.
    - _Requirements: 7.3, 7.5, 7.6, 7.10, 9.4, 10.1, 10.5_

  - [ ]* 9.5 Escribir prueba de propiedad para la partición de jugadas del bolsillo
    - **Property 9: Partición de jugadas del bolsillo**
    - **Validates: Requirements 5.4, 5.5, 5.6, 5.7, 7.10, 9.6**

  - [ ]* 9.6 Escribir prueba de propiedad para los filtros
    - **Property 14: Los filtros equivalen a analizar el subconjunto**
    - **Validates: Requirements 7.4, 7.7**

  - [ ]* 9.7 Escribir pruebas de ejemplo de errores 422
    - 422 en `down=0`, `down=abc`, `semana=99`, `distancia=xyz`, equipo inexistente; 200 con ceros cuando ningún dato cumple los filtros.
    - _Requirements: 7.7, 7.8_

- [ ] 10. `GET /api/jugada/{game_id}/{play_id}`
  - [ ] 10.1 Implementar `jugada.py` con `detalle_jugada`
    - Leer bajo demanda solo el tracking del partido pedido (`tracking_partido_normalizado` con `lru_cache(maxsize=4)`, sin modificar lo cacheado), unir `displayName` y `pff_role` por `nflId`, asignar `lado` (`ofensiva`, `defensiva`, `balon`), `eventos` con el primer cuadro de cada tipo ordenado por `frame_id`, `frames_por_segundo = 10` y `receptor_objetivo` con separación en `pass_forward` (o `None`).
    - El balón lleva `equipo = "football"` y `nfl_id`, `nombre`, `dorsal`, `rol`, `o` y `dir` nulos. Devuelve `None` si la jugada no existe. No depende del precálculo completo.
    - _Requirements: 1.4, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 9.1_

  - [ ] 10.2 Agregar esquemas y endpoint de detalle de jugada
    - Modelos `Evento`, `ReceptorObjetivo`, `JugadorFrame`, `Frame` y `JugadaRespuesta` con las llaves exactas del contrato. 404 `{"detail": "Jugada no encontrada"}` si no existe; 422 si `game_id` o `play_id` no son enteros. Responde cuando las tablas base están cargadas, aunque el precálculo siga en curso.
    - _Requirements: 8.1, 8.9, 8.10, 8.11_

  - [ ]* 10.3 Escribir prueba de propiedad para la integridad del detalle de jugada
    - **Property 15: Integridad del detalle de jugada**
    - Muestra aleatoria de jugadas reales con semilla fija.
    - **Validates: Requirements 8.2, 8.3, 8.4, 8.5, 8.6, 9.1**

  - [ ]* 10.4 Escribir pruebas de ejemplo del detalle de jugada
    - Jugada sin snap `2021091200` / `4367`: 200 y `eventos` sin snap. Jugada con sack: `receptor_objetivo = null`. 404 en jugada inexistente. Un espía confirma que `leer_tracking_partido` se llama una vez, con un solo `gameId`, por petición.
    - _Requirements: 1.4, 8.7, 8.9, 8.10_

- [ ] 11. Checkpoint - GET /api/jugada funciona: merge a main y avisar
  - Ejecutar las pruebas (`pytest backend/tests`) y confirmar que `GET /api/analisis` y `GET /api/jugada/{game_id}/{play_id}` responden con datos reales.
  - Preguntar al usuario si hay dudas. No ejecutar git sin confirmación explícita; si el usuario confirma, hacer el merge de `backend` a `main` y avisar al compañero de frontend.

- [ ] 12. Servir `dashboard/dist` y 404 JSON para `/api`
  - [ ] 12.1 Montar `StaticFiles` en `main.py`
    - Después de `/health` y del router `/api`, montar `StaticFiles(directory="dashboard/dist", html=True)` en `/` solo si `dashboard/dist` existe (ruta relativa a la raíz). Registrar antes un manejador de 404 en JSON para rutas `/api/...` inexistentes, de modo que el montaje estático no las capture. No tocar `dashboard/`.
    - _Requirements: 7.9, 11.1, 11.2_

  - [ ]* 12.2 Escribir pruebas de ejemplo del servicio estático
    - Con `dist` ausente la app arranca sin montar nada; una ruta `/api/inexistente` responde 404 JSON; `/health` y las rutas `/api` no cambian con el montaje.
    - _Requirements: 7.9, 11.2_

- [ ] 13. Medición del arranque y documentación en `README.md`
  - [ ] 13.1 Medir el tiempo de arranque con datos reales
    - Ejecutar el fixture de `conftest.py` con `pytest -s` y anotar duración de la carga base, por partido y total del precálculo. La referencia de trabajo es menos de 60 s; si se supera, reportar al usuario antes de evaluar `ThreadPoolExecutor`.
    - _Requirements: 1.2, 10.1_

  - [ ] 13.2 Documentar hallazgos y cifras en `README.md`
    - Documentar la identidad `7,541 + 992 + 24 = 8,557` (`sin_pase` = 542 S, 447 R y 3 C/I), las 35 jugadas de `down 0`, la separación 7,240 medidas y 325 sin receptor, y el tiempo de arranque medido. Cada cifra cita la función del repo que la reproduce y su `n`. Sin credenciales.
    - _Requirements: 10.1, 10.4, 10.5_

  - [ ]* 13.3 Escribir prueba de que el motor no escribe a disco
    - Comparar el árbol del proyecto antes y después de `construir_motor()` y de una petición a `/api/jugada`.
    - _Requirements: 1.5, 1.6_

- [ ] 14. Checkpoint final - verificar el entorno antes de entregar
  - Ejecutar todas las pruebas y `sh .hackathon/setup.sh --check` (en Windows: `.\.hackathon\setup.cmd --check`).
  - Preguntar al usuario si hay dudas. No ejecutar `--entregar`, merge ni push sin confirmación explícita.

## Notes

- Las tareas con `*` son opcionales (pruebas de propiedades y de ejemplo) y se pueden omitir para un MVP. Las pruebas de integración con cifras de referencia (8.4 y 9.4) no son opcionales.
- Cada propiedad del diseño tiene su propio archivo de prueba, con al menos 100 iteraciones y semilla fija de `numpy.random.default_rng`.
- Los checkpoints 4, 11 y 14 coinciden con los puntos de sincronización del equipo; ninguna tarea ejecuta git sin confirmación.
- Decisiones cerradas P1-P7 del diseño aplican tal cual (503 durante la carga, `StaticFiles` condicional, 422 por catálogo, grupos de bolsillo solo `con_pase`, `equipo = "football"`).

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3", "2.1", "3.1", "3.2"] },
    { "id": 3, "tasks": ["2.2", "2.3", "2.4", "3.3"] },
    { "id": 4, "tasks": ["3.4"] },
    { "id": 5, "tasks": ["4"] },
    { "id": 6, "tasks": ["5.1", "6.1", "7.1"] },
    { "id": 7, "tasks": ["5.2", "5.3", "5.4", "6.2", "6.3", "6.4", "7.2", "7.3"] },
    { "id": 8, "tasks": ["5.5", "6.5", "7.4"] },
    { "id": 9, "tasks": ["5.6", "5.7", "8.1"] },
    { "id": 10, "tasks": ["8.2"] },
    { "id": 11, "tasks": ["8.3"] },
    { "id": 12, "tasks": ["8.4", "8.5"] },
    { "id": 13, "tasks": ["9.1", "9.2", "10.1"] },
    { "id": 14, "tasks": ["9.3"] },
    { "id": 15, "tasks": ["9.4", "9.5", "9.6", "9.7", "10.2"] },
    { "id": 16, "tasks": ["10.3", "10.4"] },
    { "id": 17, "tasks": ["11"] },
    { "id": 18, "tasks": ["12.1"] },
    { "id": 19, "tasks": ["12.2", "13.1", "13.3"] },
    { "id": 20, "tasks": ["13.2"] },
    { "id": 21, "tasks": ["14"] }
  ]
}
```
