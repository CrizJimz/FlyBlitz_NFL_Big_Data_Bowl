# Tareas: 02-dashboard

Basadas en `requirements.md` y `design.md`. Rama `frontend`; solo se toca `dashboard/` y esta spec. Cada tarea termina con `npm run build` sin errores (desde `dashboard/`) y un commit pequeño.

## Fase 1

- [ ] 1. Configuración base
  - Agregar a `vite.config.ts` el proxy `/api` → `http://localhost:8000` y conservar `base: './'`.
  - Agregar a `package.json` el script `"dev:mock": "vite --mode mock"`, sin cambiar dependencias ni versiones.
  - Cambiar el título de `index.html` a "FlyBlitz · Sideline".
  - _Requisitos: 1.4, 1.5, 5.4_

- [ ] 2. Tema Sideline Navy
  - Definir en `tailwind.config.js` los tokens de color del diseño (sección 3), con sintaxis Tailwind 3.
  - Agregar a `index.css` las clases de componente (`.panel`, `.boton`, `.chip`, `.kpi-valor`) con un área mínima de 44 px.
  - Verificar con el cálculo WCAG que las combinaciones de texto y fondo superan 4.5:1.
  - _Requisitos: 1.2, 2.1, 2.3, 2.4_

- [ ] 3. Capa de API
  - [ ] 3.1 Escribir `api/tipos.ts` copiando las llaves de `contrato-api.md`.
  - [ ] 3.2 Escribir `api/cliente.ts` con `getFiltros`, `getAnalisis`, `getJugada`, `ErrorApi` y `usarMocks`. Rutas sin diagonal inicial; parámetros armados solo con los filtros que tienen valor; lectura de `detail` en 404, 422 y 503; en el 503 de `api/analisis`, leer `Retry-After` en segundos (5 s si falta o no es un número).
  - [ ] 3.3 Escribir `api/usePeticion.ts`: estados cargando (con mensaje y segundos para el reintento), error y listo; descartar respuestas viejas; conservar el último resultado válido; `reintentar()`; ante un 503, quedarse en cargando y reintentar con `setTimeout`, que se cancela al cambiar los filtros o desmontar.
  - _Requisitos: 1.6, 4.5, 4.8, 5.1, 5.2, 5.8, 6.2, 6.5-6.8_

- [ ] 4. Mocks
  - Escribir `api/mocks/filtros.mock.ts`, `analisis.mock.ts` y `jugada.mock.ts`, con la forma exacta del contrato y el comentario `// MOCK: datos de ejemplo de forma, no son hallazgos.`
  - Cumplir en los valores: `n_con_pase + n_sin_pase + n_sin_snap = n_jugadas`, `exitosas ≤ n` y tasas entre 0 y 1.
  - Jugada de unos 30 cuadros (11 contra 11 más el balón, con `equipo = "football"` y `lado = "balon"`) con un evento repetido, más una variante sin snap y con `receptor_objetivo: null`.
  - `api/analisis` mock: un 503 "Precalculando datos" con reintento en 3 s en la primera llamada de la sesión, y después la respuesta normal.
  - Verificar: `npm run build` y luego buscar "mock" y "DATOS DE EJEMPLO" en `dashboard/dist` da cero resultados.
  - _Requisitos: 5.3, 5.5, 5.7_

- [ ] 5. Componentes comunes
  - `MarcoTablet`, `BarraSuperior` (chips de `filtros_aplicados` e indicador de Modo_Mock), `BarraLateral` (5 secciones; las de fase 2 como "Próximamente"), `TarjetaKpi`, `ChipSituacion`, `AvisoMock`, `Estado` (Cargando, ErrorPanel, SinDatos, MuestraPequena), `ErrorBoundary` e `iconos.tsx` (SVG inline).
  - `utilidades/formato.ts`: `pct`, `entero`, `dec1`, `chipDown` y `MUESTRA_PEQUENA = 20`.
  - _Requisitos: 1.8, 2.2, 2.5, 3.1, 3.4, 5.6, 6.1-6.4_

- [ ] 6. App, navegación y filtros
  - `App.tsx`: sección activa sincronizada con `location.hash`; estado de filtros; `getFiltros` al montar y `getAnalisis` cuando cambian los filtros.
  - `PanelFiltros`: ofensiva y defensiva como `<select>` grandes; semana, down y distancia como chips; opción "Todos" y botón "Limpiar filtros"; error 422 junto a los filtros.
  - Etiquetas de distancia a partir de `rangos_distancia` ("Corta (1-3)", "Larga (8+)").
  - Reemplazar el `App.tsx` de ejemplo de la plantilla.
  - _Requisitos: 3.2, 3.3, 4.1-4.8_

- [ ] 7. Pantalla Success Rate
  - KPI global (`tasa` en %, `exitosas` de `n`); tarjetas de `n_jugadas` y `n_excluidas_down_0`.
  - Mapa de calor de 4 × 3 (down por distancia) con % y n en cada celda, escala de 5 colores con leyenda, "Sin jugadas" en las celdas que faltan o tienen n = 0 y "muestra pequeña" si n < 20.
  - `<details>` con la definición del Success Rate.
  - _Requisitos: 7.1-7.7, 6.3, 6.4_

- [ ] 8. Visor 2D
  - [ ] 8.1 `utilidades/eventos.ts`: `primerCuadroPorEvento` y `tieneSnap`.
  - [ ] 8.2 `visor/Campo.tsx`: SVG con `viewBox="-5 -5 130 63.3"`, zonas de anotación, líneas cada 5 yd y números cada 10 yd, eje y invertido solo para dibujar, con `React.memo`.
  - [ ] 8.3 `visor/Jugadores.tsx`: ofensiva en círculo, defensiva en triángulo y balón; dorsal; orientación con módulo 360; receptor objetivo resaltado; tooltip con nombre, dorsal, rol y `s`; campos `null` del balón sin errores.
  - [ ] 8.4 `visor/useReproductor.ts` y `LineaTiempo.tsx`: reproducir y pausar a `frames_por_segundo`, ±1 cuadro, inicio y fin, barra de tiempo, teclas ←/→ y espacio; eventos marcados en su primer cuadro; "Sin snap registrado".
  - [ ] 8.5 `visor/FichaJugada.tsx` y la pantalla `Visor2D.tsx`: búsqueda por `game_id` y `play_id` (enteros positivos), accesos rápidos tomados de `auditoria-datos.md`, 404 con su `detail`, receptor objetivo con `separacion_yd` "al lanzar el pase" o "Receptor no identificado", línea punteada al defensor más cercano en el cuadro del pase y nota de 0.5 s.
  - _Requisitos: 8.1-8.14_

- [ ] 9. Cierre de fase 1
  - `npm run build` sin errores.
  - Buscar `'/api` y `localhost` en `dashboard/src`: cero resultados.
  - Buscar "mock" en `dashboard/dist`: cero resultados.
  - Recorrido manual con `npm run dev:mock`: las 5 secciones, carga, 503 con reintento, error, sin snap, receptor `null` y n = 0.
  - Avisar al usuario antes de hacer merge a `main`.
  - _Requisitos: 1.3, 1.7, 5.5, 12.1, 12.3_

## Fase 2

- [ ] 10. Pantalla Coberturas
  - Selector de down y distancia; tarjetas por `tipo_cobertura` con `success_rate`, `yardas_promedio` y n; `BarChart` apilado de Recharts con `resultado_pase` y leyenda en español.
  - Agregación ponderada por n cuando el filtro deja varias filas; si no se puede agregar con exactitud, mostrar el desglose.
  - _Requisitos: 9.1-9.4_

- [ ] 11. Pantalla Bolsillo
  - Barra de 100% con los tres grupos y su n; `n_con_respaldo_autoevent` aparte; aviso naranja si la suma no da `n_jugadas`.
  - Matriz de 2 × 2 (play action por presión) con tiempo promedio y mediana, success rate y n.
  - _Requisitos: 10.1-10.5_

- [ ] 12. Pantalla Separación
  - Título con `etiquetaMomento(momento)`; tarjetas por `resultado_pase`; `BarChart` de separación promedio; nota con `n` y `n_sin_receptor_identificado`.
  - _Requisitos: 11.1-11.4_

- [ ] 13. Integración con la API real
  - Con el backend corriendo y `npm run dev`: comparar `n_jugadas` sin filtros con 8,557 y la suma del bolsillo con 7,541 + 992 + 24.
  - Abrir 2021091200-4367 (sin snap) y confirmar "Sin snap registrado".
  - Arrancar el backend en frío y confirmar que la pantalla muestra "Precalculando datos", reintenta sola y carga sin recargar la página.
  - Probar un filtro inexistente (por ejemplo, editando el hash o la petición) y confirmar que el 422 se muestra junto a los filtros.
  - Validar a ojo la orientación `o` y `dir` en una jugada real.
  - Quitar la etiqueta "Próximamente" de las secciones terminadas.
  - `npm run build` y merge de `frontend` a `main` solo si pasa.
  - _Requisitos: 12.1, 12.2_
