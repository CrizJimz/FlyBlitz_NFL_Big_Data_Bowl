# Tareas: 02-dashboard

Basadas en `requirements.md` y `design.md`. Rama `frontend`; solo se toca `dashboard/` y esta spec. Cada tarea termina con `npm run build` sin errores (desde `dashboard/`) y un commit pequeño. Cada tarea deja algo visible en el navegador.

## Fase 1

- [x] 1. Configuración base y marco visible
  - `vite.config.ts`: proxy `/api` → `http://localhost:8000`, conservar `base: './'`.
  - `package.json`: script `"dev:mock": "vite --mode mock"`, sin cambiar dependencias.
  - `index.html`: título "FlyBlitz · Sideline".
  - `tailwind.config.js`: tokens de color Sideline Navy. `index.css`: `.panel`, `.boton`, `.chip`, `.kpi-valor` (mínimo 44 px).
  - `MarcoTablet`, `BarraSuperior`, `BarraLateral` (5 secciones, íconos SVG, fase 2 como "Próximamente"), `App.tsx` con la sección en `location.hash`.
  - Verificar: cero resultados de `'/api` y `localhost` en `src`.
  - _Requisitos: 1.2-1.8, 2.1-2.6, 3.1-3.4, 5.4_

- [ ] 2. Capa de API, mocks e indicador de ejemplo
  - `api/tipos.ts` (incluye `JugadaListada`), `api/cliente.ts` (`getFiltros`, `getAnalisis`, `getJugadas`, `getJugada`, `ErrorApi`, `usarMocks`; 404, 422 y 503 con `Retry-After`), `api/usePeticion.ts` (descarta respuestas viejas, conserva el último resultado válido, reintenta tras 503).
  - Mocks `filtros`, `analisis`, `jugadas` y `jugada` con la forma del contrato, el comentario MOCK, combinaciones omitidas (nunca `n = 0`), `tipos_cobertura` en orden alfabético y un 503 en el primer `analisis` de la sesión.
  - `AvisoMock`, `Estado.tsx` (cargando, error con reintento, sin datos, muestra pequeña), `ErrorBoundary`, `utilidades/formato.ts`.
  - Verificar: después de `npm run build`, cero resultados de "mock" y "DATOS DE EJEMPLO" en `dist`.
  - _Requisitos: 4.5, 5.1-5.8, 6.1-6.8_

- [ ] 3. Filtros globales
  - `PanelFiltros`: ofensiva y defensiva en `<select>`, semana, down y distancia en chips, "Todos" y "Limpiar"; etiquetas de distancia desde `rangos_distancia`; chips de `filtros_aplicados`; 422 junto a los filtros.
  - Probar contra `api/filtros` real (backend en el puerto 8000): 32 equipos, semanas 1-8, downs 1-4.
  - _Requisitos: 4.1-4.8_

- [ ] 4. Pantalla Success Rate
  - KPI global, tarjetas de `n_jugadas` y `n_excluidas_down_0`, mapa de calor de 4 × 3 con escala y leyenda, "Sin jugadas" en celdas omitidas, "muestra pequeña" si n < 20, `<details>` con la definición.
  - _Requisitos: 7.1-7.7, 6.3, 6.4, 12.3_

- [ ] 5. Visor 2D: lista, campo y jugadores (cuadro fijo)
  - `utilidades/eventos.ts`, `visor/Campo.tsx`, `visor/Jugadores.tsx`, `visor/FichaJugada.tsx`.
  - Pantalla `Visor2D.tsx` con la lista de `getJugadas(filtros)` (máximo 200 filas con aviso), entrada manual de ids como respaldo, 404 con su `detail` y "Sin jugadas para estos filtros" si llega `[]`.
  - _Requisitos: 8.1-8.6, 8.13, 8.14_

- [ ] 6. Visor 2D: reproducción y línea de tiempo
  - `useReproductor.ts`, `LineaTiempo.tsx` (primer cuadro por evento, "Sin snap registrado"), separación "al lanzar el pase" o "Receptor no identificado", línea punteada al defensor más cercano en el cuadro del pase y nota de 0.5 s.
  - _Requisitos: 8.7-8.12_

- [ ] 7. Cierre de fase 1
  - `npm run build`; cero resultados de `'/api` y `localhost` en `src` y de "mock" en `dist`.
  - Recorrido con `npm run dev:mock`: 5 secciones, carga, 503 con reintento, error, sin snap, receptor `null`, celdas omitidas y lista vacía.
  - Avisar al usuario antes de hacer merge a `main`.
  - _Requisitos: 1.3, 1.7, 5.5, 12.1_

## Fase 2

- [ ] 8. Pantalla Coberturas
  - Selector de down y distancia, tarjetas por `tipo_cobertura`, `BarChart` apilado de `resultado_pase`, agregación ponderada por n o desglose.
  - _Requisitos: 9.1-9.4_

- [ ] 9. Pantalla Bolsillo
  - Barra de 100% con los tres grupos, `n_con_respaldo_autoevent` aparte, aviso si la suma no da `n_jugadas`, matriz de 2 × 2 con "Sin jugadas" en las celdas omitidas.
  - _Requisitos: 10.1-10.5_

- [ ] 10. Pantalla Separación
  - Título con `etiquetaMomento(momento)`, tarjetas por resultado, `BarChart`, nota con `n_sin_receptor_identificado`.
  - _Requisitos: 11.1-11.4_

- [ ] 11. Integración con la API real
  - Con `npm run dev`: `n_jugadas` sin filtros = 8,557 y bolsillo = 7,541 + 992 + 24; jugada 2021091200-4367 con "Sin snap registrado"; backend en frío con reintento tras el 503; filtro inexistente con 422; orientación `o` y `dir` correcta a ojo.
  - Quitar "Próximamente"; `npm run build`; merge a `main` solo si pasa y el usuario lo aprueba.
  - _Requisitos: 12.1, 12.2_
