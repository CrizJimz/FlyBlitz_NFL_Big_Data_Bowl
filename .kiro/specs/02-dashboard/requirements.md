# Requisitos: 02-dashboard (frontend del Coach)

Dueño: integrante de frontend. Vive en la rama `frontend` (ver "Flujo de trabajo (dos Kiros)" en `contrato-api.md`).

Fuentes (se leen, no se modifican desde esta spec): `.kiro/steering/rules.md`, `.kiro/steering/dominio-nfl.md`, `.kiro/specs/01-motor-datos/contrato-api.md`, `enfoque-coach.md` y `auditoria-datos.md`. El contrato es la fuente de verdad de las llaves JSON. Si un requisito necesita cambiarlo, se avisa al usuario y no se edita.

## Introducción

El dashboard es la interfaz que usa un Coach de NFL para preparar el plan de juego aéreo. Consume la API del motor de datos (`backend/`) y muestra Success Rate, coberturas, tiempo de bolsillo, separación y un visor 2D de jugadas. Se ve como una tablet de sideline de la NFL ("Sideline Navy") y está pensado para laptop o proyector.

El trabajo se divide en dos fases:
- **Fase 1:** layout y tema, barra lateral, filtros, capa de API con mocks, pantalla Success Rate y Visor 2D.
- **Fase 2:** pantallas Coberturas, Bolsillo y Separación.

Cada requisito indica su fase.

## Glosario

- **Dashboard:** la aplicación React en `dashboard/`.
- **API:** los endpoints de `contrato-api.md` (`api/filtros`, `api/analisis`, `api/jugada/{game_id}/{play_id}`).
- **Capa_API:** el módulo del Dashboard que hace las llamadas a la API y entrega datos tipados a las pantallas.
- **Mock:** respuesta de ejemplo con la forma exacta del contrato. Se usa solo mientras la API no responde. Sus valores son de forma y no son hallazgos.
- **Modo_Mock:** estado del Dashboard en el que al menos una respuesta viene de un Mock.
- **Filtros:** ofensiva, defensiva, semana, down y distancia, con valores que vienen de `api/filtros`.
- **Down:** oportunidad de 1 a 4. Las jugadas con down 0 son conversiones de 2 puntos y la API las excluye de las métricas por down.
- **Distancia:** rango de `yardsToGo` según `rangos_distancia`: corta 1-3, media 4-7, larga 8+. Es una convención del equipo.
- **Success_Rate:** fracción de jugadas exitosas, de 0 a 1. Una jugada es exitosa si `prePenaltyPlayResult` alcanza el 40% de `yardsToGo` en 1er down, el 60% en 2do y el 100% en 3er y 4to. IN siempre es fracaso.
- **n:** número de jugadas detrás de una métrica.
- **Cobertura:** `tipo_cobertura` (Zone, Man, Other) y `cobertura` (Cover-3, Cover-1, etc.).
- **Bolsillo:** tiempo entre el snap y el pase, en segundos, a 10 Hz.
- **Separación:** distancia en yardas del receptor objetivo al defensor más cercano, medida en el momento que indica `momento` (hoy `pass_forward`).
- **Visor_2D:** pantalla que anima una jugada por `frame_id` sobre el campo.
- **Receptor_Objetivo:** receptor nombrado en `playDescription`, entregado por la API en `receptor_objetivo`. Puede ser `null`.
- **Chip_Situacion:** etiqueta de situación estilo TV, por ejemplo "3rd & 7".

## Requisitos

### Requisito 1: Restricciones de stack y despliegue (Fase 1)

**Historia:** Como equipo, quiero que el Dashboard respete el stack y el contrato de despliegue, para que AWS lo publique sin cambios.

#### Criterios de aceptación
1. THE Dashboard SHALL usar solo las dependencias que ya están en `dashboard/package.json` (React 18.3.1, Vite 5.4.21, TypeScript 5.7.3, Tailwind CSS 3.4.19 y Recharts 3.10.1), sin agregar ni cambiar versiones.
2. THE Dashboard SHALL usar la sintaxis de Tailwind 3 (`@tailwind base/components/utilities` y `tailwind.config.js`), sin `@import "tailwindcss"`, `@theme` ni `@tailwindcss/vite`.
3. THE Dashboard SHALL compilar con `npm run build` (`tsc --noEmit && vite build`) sin errores y generar `dashboard/dist`.
4. THE Dashboard SHALL conservar `base: './'` en `vite.config.ts`.
5. THE Dashboard SHALL configurar en `vite.config.ts` un proxy de desarrollo de `/api` hacia `http://localhost:8000`.
6. THE Dashboard SHALL escribir toda ruta (llamadas `fetch`, imágenes, CSS y enlaces) como relativa y sin diagonal inicial, por ejemplo `fetch('api/filtros')`.
7. THE Dashboard SHALL NOT contener `localhost`, `127.0.0.1` ni URLs absolutas en el código que llega al build, salvo el proxy de desarrollo en `vite.config.ts`.
8. THE Dashboard SHALL NOT cargar recursos de CDN externos: usará fuentes del sistema e íconos en SVG dentro del código.
9. THE Dashboard SHALL limitar sus cambios a la carpeta `dashboard/` y a esta spec.

### Requisito 2: Tema Sideline Navy y marco de tablet (Fase 1)

**Historia:** Como Coach, quiero una interfaz con el estilo de una tablet de sideline, para leerla rápido durante la preparación y que se vea profesional en la presentación.

#### Criterios de aceptación
1. THE Dashboard SHALL definir en `tailwind.config.js` la paleta Sideline Navy: fondo `#0B1426`, paneles uno o dos tonos más claros, acento azul eléctrico `#00A3FF` y naranja para alertas.
2. THE Dashboard SHALL presentar el contenido dentro de un marco de tablet con bordes redondeados y una barra superior con el nombre de la app, los filtros activos en forma de chips y el indicador de Modo_Mock cuando aplique.
3. THE Dashboard SHALL mantener un contraste mínimo de 4.5:1 entre el texto y su fondo.
4. THE Dashboard SHALL dar a los controles interactivos (botones, chips de filtro, controles del visor) un área clicable mínima de 44 × 44 px.
5. THE Dashboard SHALL mostrar los KPI principales como tarjetas con el valor grande y su n debajo.
6. THE Dashboard SHALL verse completo, sin scroll horizontal, en pantallas de 1366 × 768 px o más.
7. THE Dashboard SHALL NOT requerir un diseño responsive para tablet o celular.

### Requisito 3: Navegación con barra lateral (Fase 1)

**Historia:** Como Coach, quiero una barra lateral con una sección por pantalla, para cambiar de análisis con un clic.

#### Criterios de aceptación
1. THE Dashboard SHALL mostrar una barra lateral con un ícono grande y una etiqueta para cada sección: Success Rate, Coberturas, Bolsillo, Separación y Visor 2D.
2. WHEN el Coach selecciona una sección, THE Dashboard SHALL mostrar esa pantalla y resaltar su entrada en la barra con el color de acento.
3. WHEN el Coach cambia de sección, THE Dashboard SHALL conservar los Filtros seleccionados.
4. WHILE una sección de Fase 2 no esté implementada, THE Dashboard SHALL mostrarla en la barra como "Próximamente", sin datos inventados.

### Requisito 4: Filtros globales (Fase 1)

**Historia:** Como Coach, quiero filtrar por equipo, semana, down y distancia, para analizar la situación que me interesa.

#### Criterios de aceptación
1. WHEN el Dashboard arranca, THE Capa_API SHALL pedir `GET api/filtros` una sola vez.
2. THE Dashboard SHALL construir las opciones de los Filtros solo con los valores de `api/filtros`: `equipos` para ofensiva y defensiva, `semanas`, `downs` y `rangos_distancia`.
3. THE Dashboard SHALL mostrar cada rango de distancia con su `clave` y sus límites (por ejemplo "Corta (1-3)"), y mostrar `max: null` como "8+".
4. THE Dashboard SHALL ofrecer en cada filtro la opción "Todos", que no envía el parámetro.
5. WHEN el Coach cambia un filtro, THE Capa_API SHALL pedir `GET api/analisis` solo con los parámetros que tienen valor (`ofensiva`, `defensiva`, `semana`, `down`, `distancia`).
6. THE Dashboard SHALL mostrar como chips los filtros de `filtros_aplicados` que tienen valor, usando la respuesta de la API y no el estado local.
7. THE Dashboard SHALL ofrecer un botón "Limpiar filtros" que devuelve todos los filtros a "Todos".
8. IF la API responde 422, THEN THE Dashboard SHALL mostrar el `detail` del error junto a los filtros y conservar los últimos datos válidos.

### Requisito 5: Capa de API y mocks (Fase 1)

**Historia:** Como integrante de frontend, quiero avanzar aunque el backend no esté listo, sin que ningún dato de ejemplo llegue a la entrega.

#### Criterios de aceptación
1. THE Capa_API SHALL definir tipos de TypeScript que copien exactamente las llaves y la estructura de `contrato-api.md` para `api/filtros`, `api/analisis` y `api/jugada`.
2. THE Capa_API SHALL concentrar todas las llamadas a la API en un solo módulo, sin `fetch` sueltos en las pantallas.
3. THE Capa_API SHALL guardar los Mocks en archivos aparte, con "mock" en el nombre y un comentario que diga que son datos de ejemplo de forma.
4. THE Capa_API SHALL usar los Mocks solo cuando el servidor de desarrollo se inicie de forma explícita en modo mock (`npm run dev:mock`).
5. WHEN el Dashboard se construye para entrega (`npm run build`, modo production), THE Capa_API SHALL NOT incluir ni usar los Mocks.
6. WHILE el Dashboard esté en Modo_Mock, THE Dashboard SHALL mostrar en la barra superior y en cada pantalla afectada un indicador naranja visible: "DATOS DE EJEMPLO".
7. THE Mocks SHALL respetar las relaciones del contrato: `n_con_pase + n_sin_pase + n_sin_snap = n_jugadas`, `tasa` y `success_rate` entre 0 y 1, y `exitosas ≤ n`.
8. IF la API no responde o responde con un error distinto de 404 o 422, THEN THE Dashboard SHALL mostrar un mensaje de error con opción de reintentar, sin pasar en silencio al Mock.

### Requisito 6: Estados de carga, error y vacío (Fase 1)

**Historia:** Como Coach, quiero saber si los datos están cargando, fallaron o no existen, para no malinterpretar una pantalla vacía.

#### Criterios de aceptación
1. WHILE una petición está en curso, THE Dashboard SHALL mostrar un indicador de carga en la pantalla afectada.
2. IF la API responde 404, THEN THE Dashboard SHALL mostrar el `detail` de la respuesta (por ejemplo "Jugada no encontrada").
3. WHEN una métrica llega con `n = 0`, THE Dashboard SHALL mostrar "Sin jugadas para estos filtros" en lugar de 0% o una barra vacía.
4. WHEN una métrica se basa en pocas jugadas (n menor que 20), THE Dashboard SHALL marcarla como "muestra pequeña".

### Requisito 7: Pantalla Success Rate (Fase 1)

**Historia:** Como Coach, quiero ver el Success Rate global y por down y distancia, para saber en qué situaciones el juego aéreo funciona.

#### Criterios de aceptación
1. THE Dashboard SHALL mostrar `success_rate.global` como tarjeta KPI con `tasa` en porcentaje y debajo `exitosas` de `n` jugadas.
2. THE Dashboard SHALL mostrar `success_rate.por_down_distancia` como un mapa de calor de downs (filas 1-4) por distancia (columnas corta, media, larga), con el porcentaje y el n en cada celda.
3. THE Dashboard SHALL dar a cada celda un color proporcional a su `tasa`, con una leyenda que explique la escala.
4. THE Dashboard SHALL etiquetar las filas con Chip_Situacion (por ejemplo "1st", "2nd", "3rd", "4th") y las columnas con el rango de distancia.
5. THE Dashboard SHALL mostrar `n_jugadas` y `n_excluidas_down_0` con la explicación "conversiones de 2 puntos excluidas".
6. THE Dashboard SHALL ofrecer un texto de ayuda con la definición del Success_Rate: umbrales 40/60/100%, uso de `prePenaltyPlayResult`, IN cuenta como fracaso y es una convención del equipo.
7. THE Dashboard SHALL mostrar los porcentajes con un decimal y los n como enteros con separador de miles.

### Requisito 8: Visor 2D (Fase 1)

**Historia:** Como Coach, quiero ver una jugada animada en el campo, para entender la posición de receptores y defensores cuando el QB lanza.

#### Criterios de aceptación
1. THE Visor_2D SHALL permitir al Coach escribir `game_id` y `play_id` y cargar la jugada con `GET api/jugada/{game_id}/{play_id}`.
2. THE Visor_2D SHALL dibujar en SVG un campo de 120 × 53.3 yd con zonas de anotación, líneas cada 5 yd y números cada 10 yd, más un margen alrededor para los jugadores que salen del campo.
3. THE Visor_2D SHALL usar `x` y `y` tal como los entrega la API, sin volver a normalizar por dirección de juego.
4. THE Visor_2D SHALL distinguir por color y forma a la ofensiva (círculo con dorsal), la defensiva (otra forma con dorsal) y el balón, según `lado` ("ofensiva", "defensiva", "balon").
5. WHERE un jugador tenga `o` o `dir`, THE Visor_2D SHALL dibujar su orientación aplicando módulo 360 al ángulo.
6. THE Visor_2D SHALL tratar los campos `null` del balón (`nfl_id`, `nombre`, `dorsal`, `rol`, `o`, `dir`) sin errores.
7. THE Visor_2D SHALL ofrecer reproducir, pausar, avanzar y retroceder un cuadro y una barra de tiempo, avanzando a `frames_por_segundo` cuadros por segundo.
8. THE Visor_2D SHALL marcar en la línea de tiempo cada evento de `eventos` en su `frame_id`, con su nombre; si un evento se repite, solo se marca su primer cuadro.
9. IF `eventos` no trae `ball_snap` ni `autoevent_ballsnap`, THEN THE Visor_2D SHALL mostrar "Sin snap registrado" y no marcar ningún cuadro como snap.
10. THE Visor_2D SHALL mostrar una nota fija de que el tracking termina unos 0.5 s después del pase, para que el final de la animación no parezca un error.
11. WHEN `receptor_objetivo` no es `null`, THE Visor_2D SHALL resaltar a ese jugador, mostrar su nombre y `separacion_yd`, y aclarar que la separación se mide al lanzar el pase.
12. IF `receptor_objetivo` es `null`, THEN THE Visor_2D SHALL mostrar "Receptor no identificado" sin resaltar a nadie.
13. THE Visor_2D SHALL mostrar la ficha de la jugada: `descripcion`, Chip_Situacion con `down` y `yardas_por_avanzar`, `ofensiva` contra `defensiva`, `semana`, `resultado_pase`, `resultado_yardas`, `cobertura`, `tipo_cobertura` y `play_action`.
14. WHEN el Coach pasa el cursor sobre un jugador, THE Visor_2D SHALL mostrar su `nombre`, `dorsal`, `rol` y velocidad `s`.

### Requisito 9: Pantalla Coberturas (Fase 2)

**Historia:** Como Coach, quiero comparar Zone, Man y Other por situación, para decidir qué cobertura enfrentar o usar.

#### Criterios de aceptación
1. THE Dashboard SHALL mostrar `coberturas` agrupadas por `tipo_cobertura`, con un selector de down y distancia.
2. THE Dashboard SHALL mostrar para cada grupo `success_rate`, `yardas_promedio` y n.
3. THE Dashboard SHALL mostrar `resultado_pase` (C, I, S, R, IN) como barra apilada con su leyenda: C completo, I incompleto, S sack, R scramble, IN intercepción.
4. THE Dashboard SHALL dibujar las gráficas con Recharts y solo con datos de la API.

### Requisito 10: Pantalla Bolsillo (Fase 2)

**Historia:** Como Coach, quiero ver cuánto tiempo tiene el QB según el play action y la presión, para ajustar la protección y el plan de pases.

#### Criterios de aceptación
1. THE Dashboard SHALL mostrar `n_con_pase`, `n_sin_pase` y `n_sin_snap` como una barra de 100% con su n, y aparte `n_con_respaldo_autoevent`.
2. THE Dashboard SHALL explicar que `n_sin_pase` incluye sacks y scrambles, y que `n_sin_snap` son jugadas sin snap registrado que se excluyen del tiempo.
3. IF `n_con_pase + n_sin_pase + n_sin_snap` es distinto de `n_jugadas`, THEN THE Dashboard SHALL mostrar un aviso naranja visible con ambas cifras.
4. THE Dashboard SHALL mostrar `por_grupo` como una matriz de play action (sí/no) por presión (sí/no) con `tiempo_promedio_s`, `tiempo_mediana_s`, `success_rate` y n en cada celda.
5. THE Dashboard SHALL mostrar los tiempos en segundos con un decimal.

### Requisito 11: Pantalla Separación (Fase 2)

**Historia:** Como Coach, quiero relacionar la separación del receptor con el resultado del pase, para saber cuánto espacio necesita un pase exitoso.

#### Criterios de aceptación
1. THE Dashboard SHALL construir el título del momento de medición a partir de `momento` (por ejemplo "pass_forward" se muestra como "al lanzar el pase"), sin dejarlo fijo en el código.
2. THE Dashboard SHALL mostrar para cada elemento de `por_resultado` `separacion_promedio_yd`, `separacion_mediana_yd`, `vel_receptor_promedio`, `vel_defensor_promedio` y n.
3. THE Dashboard SHALL mostrar `n` y `n_sin_receptor_identificado` con la explicación "pases donde la descripción no nombra un receptor identificable".
4. THE Dashboard SHALL mostrar las distancias en yardas y las velocidades en yd/s, con un decimal.

### Requisito 12: Integración y entrega

**Historia:** Como equipo, quiero integrar el frontend sin romper `main`.

#### Criterios de aceptación
1. THE Dashboard SHALL integrarse a `main` solo cuando `npm run build` termine sin errores.
2. WHEN el backend responda los tres endpoints, THE Dashboard SHALL funcionar sin Mocks y sin cambios en las pantallas, solo iniciando con `npm run dev` en lugar de `npm run dev:mock`.
3. THE Dashboard SHALL mostrar su hallazgo principal (Success Rate) aunque fallen otras secciones.

## Preguntas abiertas para el backend
1. El contrato no tiene un endpoint para listar jugadas. Por eso el Coach debe escribir `game_id` y `play_id` a mano en el Visor_2D. ¿Agregamos algo como `GET api/jugadas?ofensiva=...&semana=...` con `game_id`, `play_id`, `descripcion`, `down` y `yardas_por_avanzar`? Mientras tanto se usa la entrada manual.
2. El contrato no aclara si `api/analisis` devuelve celdas de down por distancia con `n = 0` o las omite. El Dashboard soportará ambos casos y mostrará "Sin jugadas" en las celdas que falten.
