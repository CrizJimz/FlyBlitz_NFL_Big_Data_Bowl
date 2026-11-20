# Diseño: 02-dashboard (frontend del Coach)

Basado en `requirements.md` (misma carpeta) y en `contrato-api.md`. Stack fijo: React 18.3.1, TypeScript 5.7.3, Vite 5.4.21, Tailwind CSS 3.4.19 y Recharts 3.10.1. No se agregan dependencias.

## 1. Vista general

```
Navegador (laptop ≥ 1366 px)
└── App (marco de tablet)
    ├── BarraSuperior   nombre, chips de filtros aplicados, indicador "DATOS DE EJEMPLO"
    ├── BarraLateral    Success Rate · Coberturas · Bolsillo · Separación · Visor 2D
    ├── PanelFiltros    ofensiva, defensiva, semana, down, distancia, "Limpiar"
    └── Pantalla activa
        ├── PantallaSuccessRate   (fase 1)
        ├── PantallaVisor2D       (fase 1)
        ├── PantallaCoberturas    (fase 2)
        ├── PantallaBolsillo      (fase 2)
        └── PantallaSeparacion    (fase 2)
            │
            ▼
       api/cliente.ts ──(real)──► fetch('api/...') ──► FastAPI (proxy /api → :8000 en desarrollo)
                     └─(mock)──► import() dinámico de api/mocks/*.mock.ts (solo en desarrollo)
```

Decisiones:
- **Sin router.** No hay dependencia de rutas en el stack. La sección activa vive en estado de React y se refleja en `location.hash` (`#success-rate`, `#visor`, etc.) para que el link se pueda compartir y funcione con el botón de atrás. El hash es relativo y no rompe la subruta `/evento/equipo/`.
- **Sin librería de estado.** Los Filtros y la sección activa viven en `App` y bajan por props. El estado de cada petición lo maneja el hook `usePeticion`.
- **Recharts** solo para las gráficas de barras de fase 2. El mapa de calor y el visor son SVG o grid de Tailwind propios, porque Recharts no los cubre bien.

## 2. Estructura de archivos

```
dashboard/
├── index.html                    título "FlyBlitz · Sideline"
├── vite.config.ts                base './' + proxy /api → http://localhost:8000
├── tailwind.config.js            paleta Sideline Navy
├── package.json                  script nuevo "dev:mock": "vite --mode mock"
└── src/
    ├── main.tsx
    ├── App.tsx                   marco, navegación, filtros
    ├── index.css                 @tailwind base/components/utilities + clases de componente
    ├── api/
    │   ├── tipos.ts              tipos copiados del contrato
    │   ├── cliente.ts            getFiltros, getAnalisis, getJugada, ErrorApi
    │   ├── usePeticion.ts        hook de carga/error/datos
    │   └── mocks/
    │       ├── filtros.mock.ts
    │       ├── analisis.mock.ts
    │       └── jugada.mock.ts
    ├── componentes/
    │   ├── MarcoTablet.tsx  BarraSuperior.tsx  BarraLateral.tsx  PanelFiltros.tsx
    │   ├── TarjetaKpi.tsx   ChipSituacion.tsx  AvisoMock.tsx
    │   ├── Estado.tsx       (Cargando, ErrorPanel, SinDatos, MuestraPequena)
    │   └── iconos.tsx       íconos SVG inline
    ├── pantallas/
    │   ├── SuccessRate.tsx  Visor2D.tsx  Coberturas.tsx  Bolsillo.tsx  Separacion.tsx
    │   └── visor/
    │       ├── Campo.tsx         SVG del campo (estático)
    │       ├── Jugadores.tsx     marcadores del cuadro actual
    │       ├── LineaTiempo.tsx   barra con eventos
    │       ├── FichaJugada.tsx
    │       └── useReproductor.ts
    └── utilidades/
        ├── formato.ts        porcentajes, decimales, miles, chips "3rd & 7"
        └── eventos.ts        primer cuadro por evento, detección de snap
```

`index.html` mantiene `src="/src/main.tsx"`: Vite lo reescribe a ruta relativa en el build porque `base: './'`. No es una ruta del código de la app.

## 3. Tema Sideline Navy

`tailwind.config.js` (sintaxis Tailwind 3, `theme.extend`):

| Token | Valor | Uso |
|---|---|---|
| `navy-950` | `#0B1426` | fondo de la app |
| `navy-900` | `#111D35` | marco de tablet |
| `navy-800` | `#18284A` | paneles y tarjetas |
| `navy-700` | `#22365F` | bordes, celdas vacías |
| `acento` | `#00A3FF` | sección activa, ofensiva, botones primarios |
| `alerta` | `#FF8A00` | Modo_Mock, avisos, suma que no cuadra |
| `defensa` | `#F43F5E` | defensiva en el visor |
| `balon` | `#A0522D` | balón |
| `campo` | `#14532D` | césped del visor |
| `texto` | `#E6EDF7` | texto principal |
| `texto-suave` | `#94A3B8` | texto secundario |

- El texto `#E6EDF7` sobre `#18284A` y `#94A3B8` sobre `#0B1426` superan 4.5:1. Se verifica al implementar con el cálculo de contraste de WCAG.
- Fuente: `font-sans` del sistema (`ui-sans-serif, system-ui, "Segoe UI", ...`). Los números grandes usan `tabular-nums` para que no bailen.
- Clases de componente en `index.css` con `@layer components`: `.panel`, `.boton`, `.chip`, `.kpi-valor`. Todo botón o chip tiene `min-h-11 min-w-11` (44 px).
- Escala del mapa de calor: 5 pasos de `navy-700` a `acento`, por cubetas de 0-20%, 20-40%, 40-60%, 60-80% y 80-100%, con una leyenda.

## 4. Capa de API

### 4.1 Tipos (`api/tipos.ts`)
Copia literal de las llaves del contrato. Extracto:

```ts
export type ClaveDistancia = 'corta' | 'media' | 'larga'
export type ResultadoPase = 'C' | 'I' | 'S' | 'R' | 'IN'
export type Lado = 'ofensiva' | 'defensiva' | 'balon'

export interface RangoDistancia { clave: ClaveDistancia; min: number; max: number | null }
export interface RespuestaFiltros {
  equipos: string[]; semanas: number[]; downs: number[]; rangos_distancia: RangoDistancia[]
  tipos_cobertura: string[]; coberturas: string[]; formaciones: string[]
}
export interface Filtros {            // parámetros de api/analisis; null = "Todos"
  ofensiva: string | null; defensiva: string | null; semana: number | null
  down: number | null; distancia: ClaveDistancia | null
}
export interface Tasa { n: number; exitosas: number; tasa: number }
export interface CeldaSuccess extends Tasa { down: number; distancia: ClaveDistancia }
export interface RespuestaAnalisis {
  filtros_aplicados: Filtros; n_jugadas: number; n_excluidas_down_0: number
  success_rate: { global: Tasa; por_down_distancia: CeldaSuccess[] }
  coberturas: { tipo_cobertura: string; down: number; distancia: ClaveDistancia; n: number
    success_rate: number; yardas_promedio: number; resultado_pase: Record<ResultadoPase, number> }[]
  bolsillo: { n_con_pase: number; n_sin_pase: number; n_sin_snap: number; n_con_respaldo_autoevent: number
    por_grupo: { play_action: boolean; presion: boolean; n: number; tiempo_promedio_s: number
      tiempo_mediana_s: number; success_rate: number }[] }
  separacion: { n: number; n_sin_receptor_identificado: number; momento: string
    por_resultado: { resultado_pase: ResultadoPase; n: number; separacion_promedio_yd: number
      separacion_mediana_yd: number; vel_receptor_promedio: number; vel_defensor_promedio: number }[] }
}
export interface JugadorCuadro {
  nfl_id: number | null; nombre: string | null; dorsal: number | null; equipo: string
  lado: Lado; rol: string | null; x: number; y: number; s: number; o: number | null; dir: number | null
}
export interface JugadaListada {      // elemento de GET api/jugadas
  game_id: number; play_id: number; descripcion: string; down: number
  yardas_por_avanzar: number; resultado_pase: ResultadoPase
}
export interface RespuestaJugada {
  game_id: number; play_id: number; descripcion: string; semana: number; down: number
  yardas_por_avanzar: number; ofensiva: string; defensiva: string; resultado_pase: ResultadoPase
  resultado_yardas: number; cobertura: string; tipo_cobertura: string; play_action: boolean
  frames_por_segundo: number; eventos: { frame_id: number; evento: string }[]
  receptor_objetivo: { nfl_id: number; nombre: string; separacion_yd: number } | null
  frames: { frame_id: number; jugadores: JugadorCuadro[] }[]
}
```

Si el contrato cambia, este archivo es el único lugar donde se actualizan los tipos. `tsc --noEmit` marca cada pantalla afectada.

### 4.2 Cliente (`api/cliente.ts`)

```ts
export class ErrorApi extends Error {
  constructor(public estado: number, public detalle: string, public reintentarEnS?: number) { super(detalle) }
}

export const usarMocks = import.meta.env.DEV && import.meta.env.MODE === 'mock'

export async function getFiltros(): Promise<RespuestaFiltros>
export async function getAnalisis(f: Filtros): Promise<RespuestaAnalisis>
export async function getJugadas(f: Filtros): Promise<JugadaListada[]>
export async function getJugada(gameId: number, playId: number): Promise<RespuestaJugada>
```

- Rutas: `fetch('api/filtros')`, `fetch('api/analisis?' + params)`, `fetch('api/jugadas?' + params)` y `fetch(\`api/jugada/${gameId}/${playId}\`)`, siempre sin diagonal inicial.
- `params` se arma con `URLSearchParams` y solo incluye los filtros distintos de `null`.
- Respuesta no OK: se lee `detail` del JSON (formato FastAPI) y se lanza `ErrorApi(estado, detalle)`. En un error 422 de validación, `detail` es una lista y se resume en un texto. Si el JSON no se puede leer, el mensaje es "Error del servidor (estado)".
- Error de red: `ErrorApi(0, 'No se pudo conectar con la API')`.
- **503 en `api/analisis` (precálculo):** el cliente lanza `ErrorApi(503, detail)` con un campo extra `reintentarEnS`. Ese campo se lee de `Retry-After`: si el valor es un entero positivo se usa, y si falta o no es un número se usa 5 s. El contrato solo promete segundos, así que el formato de fecha HTTP también cae en 5 s. Como la API está en el mismo origen (o pasa por el proxy en desarrollo), el navegador deja leer el encabezado sin CORS. `api/filtros` y `api/jugada` no tratan el 503 de forma especial: si llegara a pasar, se muestra como un error normal.
- **Nunca se cae en silencio al mock.** Si `usarMocks` es falso y la API falla, se muestra el error con un botón "Reintentar".

### 4.3 Mocks fuera de la entrega
- Cada función del cliente hace `if (usarMocks) return (await import('./mocks/x.mock')).default`.
- En el build de producción, Vite reemplaza `import.meta.env.DEV` por `false`. La condición queda en `false && ...`, Rollup elimina esa rama y el `import()` dinámico no genera ningún chunk. **Verificación:** después de `npm run build`, buscar "mock" y "DATOS DE EJEMPLO" en `dashboard/dist` debe dar cero resultados.
- Activación en desarrollo: `npm run dev:mock` (`vite --mode mock`). Con API real: `npm run dev`. No hace falta ningún archivo `.env`, lo cual es importante porque `.gitignore` ignora `.env.*` y no se puede versionar una plantilla. `npm run build` usa el modo `production`, así que `usarMocks` siempre es `false` en la entrega.
- `dev:mock` es un script nuevo en `package.json`, no una dependencia. Las versiones no cambian.
- Contenido: forma exacta del contrato y valores de ejemplo coherentes entre sí. Se cumplen `n_con_pase + n_sin_pase + n_sin_snap = n_jugadas`, `exitosas ≤ n` y tasas entre 0 y 1. Cada archivo empieza con `// MOCK: datos de ejemplo de forma, no son hallazgos.`
- Para probar el precálculo, el mock de `api/analisis` responde una vez 503 (`detail` "Precalculando datos" y reintento en 3 s) la primera vez que se llama en la sesión, y después responde normal. Esto solo pasa en `npm run dev:mock`.
- El mock de jugada es un caso sintético corto (unos 30 cuadros, 11 contra 11 más el balón) e incluye un evento repetido. Se puede cambiar a un segundo mock sin snap y con `receptor_objetivo: null` para probar esos estados.

### 4.4 Hook `usePeticion`

```ts
type EstadoPeticion<T> =
  | { tipo: 'cargando'; mensaje?: string; reintentoEnS?: number }
  | { tipo: 'error'; error: ErrorApi } | { tipo: 'listo'; datos: T }
function usePeticion<T>(fn: () => Promise<T>, deps: unknown[]): EstadoPeticion<T> & { reintentar(): void }
```

- Cancela respuestas viejas: si cambian los filtros mientras una petición está en curso, se ignora la respuesta anterior (bandera `vigente` en el efecto).
- **Reintento por 503:** si el error es `ErrorApi` con estado 503, el hook no pasa a `error`. Se queda en `{ tipo: 'cargando', mensaje: detalle }` y programa un `setTimeout(reintentarEnS * 1000)` que vuelve a llamar a `fn`. No hay límite de intentos, porque el backend termina el precálculo en algún momento, y el mensaje muestra cuánto falta para el siguiente intento. El `setTimeout` se limpia en la función de limpieza del efecto, así que al cambiar los filtros o desmontar la pantalla se cancela el reintento pendiente.
- Error 422 en `api/analisis`: la pantalla conserva los últimos `datos` válidos y muestra el `detalle` junto a los filtros (requisito 4.8). Por eso el hook guarda `ultimoListo` aparte del estado actual.

## 5. App, navegación y filtros

- `App` tiene el estado `seccion: Seccion` (inicializado desde `location.hash`, con valor por defecto `success-rate`) y `filtros: Filtros` (todo en `null`).
- `getFiltros()` se llama una vez al montar `App`. Si falla, el panel de filtros muestra el error con un botón para reintentar, y la app sigue mostrando los análisis sin filtros.
- `getAnalisis(filtros)` se llama en `App` y el resultado se pasa a las cuatro pantallas de análisis. Es una sola petición por cambio de filtros.
- El Visor 2D hace su propia petición con `getJugada` y no depende de los filtros.
- Las secciones de fase 2 sin terminar quedan en la barra con la etiqueta "Próximamente" y se muestran deshabilitadas. Al terminarlas se cambia una bandera en el arreglo de secciones.
- Los chips de la barra superior se arman con `analisis.filtros_aplicados` (lo que la API dice que aplicó), no con el estado local.
- Opciones: ofensiva y defensiva salen de `equipos`. Semana, down y distancia se muestran como grupos de chips (botones de 44 px) en lugar de selects pequeños. Los equipos, que son 32, van en un `<select>` grande.
- Etiqueta de distancia: `max === null` se muestra como "Larga (8+)" y en los demás casos como "Corta (1-3)".

## 6. Pantallas

### 6.1 Success Rate (fase 1)
```
┌ KPI global ───────────┐ ┌ Jugadas ─────────┐ ┌ Excluidas ──────────────┐
│  47.3%                │ │  8,522           │ │  35 conversiones de 2   │
│  4,031 de 8,522       │ │  analizadas      │ │  puntos (down 0)        │
└───────────────────────┘ └──────────────────┘ └─────────────────────────┘
          Corta (1-3)     Media (4-7)     Larga (8+)
 1st      [ 55.0% n=120 ] [ ...        ] [ ...        ]
 2nd      ...
 3rd      ...
 4th      ...
 [?] Cómo se calcula el Success Rate
```
(Las cifras del boceto son de forma, no reales.)

- La cuadrícula se arma como un mapa de 4 × 3 con llave `${down}-${distancia}`. La API omite las combinaciones sin jugadas, así que las celdas que faltan muestran "Sin jugadas" (también si llegara `n = 0`).
- Las celdas con `n < 20` llevan la etiqueta "muestra pequeña" y un borde punteado.
- El texto de ayuda es un `<details>` con la definición: umbrales 40/60/100%, uso de `prePenaltyPlayResult`, IN cuenta como fracaso y es una convención del equipo.

### 6.2 Visor 2D (fase 1)
```
┌ Buscar: game_id [2021090900] play_id [97] [Cargar] ───────────────────┐
├ Ficha: 3rd & 2 · TB vs DAL · Sem 1 · C +12 yd · Cover-1 (Man) · PA no ┤
│ ┌───────────────────── campo SVG 120 × 53.3 ─────────────────────┐   │
│ │ EZ |10|20|30|40|50|40|30|20|10| EZ     ● ofensiva  ▲ defensiva │   │
│ └────────────────────────────────────────────────────────────────┘   │
│ [⏮][◀][▶ Play][▶][⏭]  ──●────|snap──────|pase─────  cuadro 34 / 52  │
│ Receptor objetivo: M. Evans · 2.4 yd al lanzar el pase               │
│ Nota: el tracking termina ~0.5 s después del pase.                   │
└───────────────────────────────────────────────────────────────────────┘
```

- **Campo (`Campo.tsx`):** `viewBox="-5 -5 130 63.3"`, con 5 yd de margen en cada lado para cubrir x de -3.55 a 121.15 y y de -4.53 a 57.72. El eje y se invierte (`y_svg = 53.3 - y`) para que y = 0 quede abajo, igual que la figura del README. Solo es un cambio de dibujo, no una normalización de datos. Zonas de anotación de 0 a 10 y de 110 a 120, líneas cada 5 yd y números cada 10. Va memorizado con `React.memo` porque no cambia.
- **Jugadores (`Jugadores.tsx`):** la ofensiva es un círculo `acento` con el dorsal, la defensiva un triángulo `defensa` con el dorsal y el balón una elipse pequeña `balon`. El balón se identifica por `lado = "balon"` (trae `equipo = "football"`). La orientación es una línea corta desde el centro con ángulo `((o % 360) + 360) % 360`. La conversión a SVG sigue la convención NGS (0° apunta al eje y positivo y el ángulo crece en sentido horario): `dx = sin(θ)` y `dy = cos(θ)` en coordenadas del campo, y luego se aplica la inversión de y. Se valida visualmente con una jugada real cuando haya API: los jugadores deben "mirar" hacia donde corren. El receptor objetivo lleva un anillo blanco y su nombre. Al pasar el cursor aparece un `<title>` con nombre, dorsal, rol y `s`.
- **Reproductor (`useReproductor.ts`):** guarda el índice del cuadro y si está reproduciendo, y avanza con `setInterval(1000 / frames_por_segundo)`. Botones: inicio, -1, reproducir/pausa, +1 y fin. Hay un `<input type="range">` de 1 a `frames.length`. Las teclas ←/→ mueven un cuadro y la barra espaciadora reproduce o pausa. Al llegar al final se pausa.
- **Eventos (`utilidades/eventos.ts`):**
  - `primerCuadroPorEvento(eventos)` agrupa por nombre y se queda con el `frame_id` mínimo.
  - `tieneSnap(eventos)` revisa si hay `ball_snap` o `autoevent_ballsnap`.
  - En la línea de tiempo se marcan los eventos en su posición. Las etiquetas se acortan ("snap", "pase", "sack") y el nombre completo va en un tooltip.
  - Si no hay snap, aparece la etiqueta "Sin snap registrado" y no se marca ningún cuadro como snap.
- **Separación:** si `receptor_objetivo` existe, se muestra "{nombre} · {separacion_yd} yd al lanzar el pase". En el cuadro del primer evento de pase (`pass_forward` o, si falta, `autoevent_passforward`) se dibuja una línea punteada del receptor a su defensor `defensiva` más cercano de ese mismo cuadro. Esta línea solo sirve de guía visual; la cifra mostrada es la `separacion_yd` de la API, no un cálculo propio. Si es `null`, se muestra "Receptor no identificado".
- **Lista de jugadas:** columna izquierda del visor con `getJugadas(filtros)`. Cada fila muestra el chip "3rd & 2", el resultado y la descripción recortada. Al hacer clic se carga esa jugada. La entrada manual de ids queda arriba de la lista como respaldo.
- **Errores:** si la jugada no existe, la API responde 404 y se muestra el `detail` ("Jugada no encontrada"). `game_id` y `play_id` se validan como enteros positivos antes de llamar a la API.
- **Rendimiento:** con un máximo de 203 cuadros × 23 marcadores, el SVG con React alcanza 10 fps sin problema. Solo se renderiza el cuadro actual.

### 6.3 Coberturas (fase 2)
- Selector de down y distancia con chips, o "Todas".
- Una tarjeta por `tipo_cobertura` (Zone, Man, Other) con `success_rate`, `yardas_promedio` y n.
- Debajo, un `BarChart` apilado de Recharts con `resultado_pase` en C, I, S, R e IN, y una leyenda en español.
- Si el filtro de down o distancia deja varias filas para un mismo `tipo_cobertura`, se agregan los conteos y se ponderan las tasas por n. Si no se puede agregar con exactitud (por ejemplo, la mediana), se muestra el desglose sin agregar.

### 6.4 Bolsillo (fase 2)
- Barra de 100% con los tres grupos (con pase, sin pase y sin snap), cada uno con su n y su explicación. `n_con_respaldo_autoevent` va aparte, como dato informativo.
- `sumaCuadra = n_con_pase + n_sin_pase + n_sin_snap === n_jugadas`. Si no cuadra, aparece un aviso `alerta` con las dos cifras.
- Matriz de 2 × 2: play action (sí/no) por presión (sí/no). Cada celda muestra el tiempo promedio y la mediana en s, el success rate y el n.

### 6.5 Separación (fase 2)
- Título: `etiquetaMomento(momento)`, que tiene un mapa `{ pass_forward: 'al lanzar el pase', pass_arrived: 'al llegar el pase' }` y, si el valor no está, muestra el valor crudo.
- Una tarjeta por `resultado_pase` con la separación promedio y mediana en yd y las velocidades del receptor y del defensor en yd/s. Debajo, un `BarChart` de Recharts con la separación promedio por resultado.
- Nota con `n` y `n_sin_receptor_identificado`.

## 7. Formato (`utilidades/formato.ts`)
- `pct(0.4731)` da "47.3%", con un decimal.
- `entero(8522)` da "8,522" (`toLocaleString('en-US')`, igual que las specs del equipo).
- `dec1(2.37)` da "2.4".
- `chipDown(3, 7)` da "3rd & 7". Siempre se muestra el número, porque el contrato no trae la yarda de gol y no se puede saber si es "& Goal".
- `MUESTRA_PEQUENA = 20`, una sola constante que se puede ajustar.

## 8. Manejo de errores y estados

| Situación | Dónde | Qué se muestra |
|---|---|---|
| Cargando | cualquier petición | skeleton del panel con el texto "Cargando…" |
| Red caída o 5xx | api/filtros, api/analisis, api/jugada | `ErrorPanel` con el mensaje y "Reintentar" |
| 503 (precálculo) | api/analisis | estado de carga con "Precalculando datos" y "reintento en N s"; los filtros y el visor siguen funcionando |
| 404 | api/jugada | `detail` de la API |
| 422 | api/analisis | `detail` junto a los filtros (incluye equipo, semana o distancia inexistentes); se conservan los últimos datos |
| Combinación omitida o n = 0 | cualquier métrica | "Sin jugadas" |
| `api/jugadas` devuelve `[]` | Visor 2D | "Sin jugadas para estos filtros" |
| n < 20 | celdas y tarjetas | etiqueta "muestra pequeña" |
| Modo_Mock | global | chip naranja "DATOS DE EJEMPLO" en la barra superior y en cada pantalla |
| Suma de bolsillo no cuadra | Bolsillo | aviso naranja con las dos cifras |

Una pantalla que falla no tumba a las demás. Cada pantalla va envuelta en un `ErrorBoundary` simple (componente de clase propio) y la barra lateral sigue funcionando, para que Success Rate se vea aunque falle otra sección (requisito 12.3).

## 9. Estrategia de pruebas

El stack no incluye pruebas de frontend (pytest y httpx son del backend) y la regla es no agregar dependencias. Por eso:
- **Tipos:** `tsc --noEmit` dentro de `npm run build` valida que las pantallas usen las llaves del contrato.
- **Build:** `npm run build` sin errores es el criterio de integración a `main`.
- **Mocks fuera:** después del build, `Select-String -Path dashboard/dist -Pattern 'mock','DATOS DE EJEMPLO'` debe dar cero resultados.
- **Rutas:** buscar `'/api` y `localhost` en `dashboard/src` debe dar cero resultados (salvo `vite.config.ts`).
- **Manual con mocks (`npm run dev:mock`):** recorrer las cinco secciones y los estados (carga, error, sin snap, receptor `null`, n = 0).
- **Manual con API real:** cuando el backend responda, comparar `n_jugadas` sin filtros contra 8,557 y la suma del bolsillo (7,541 + 992 + 24). Abrir una de las 24 jugadas sin snap de `auditoria-datos.md`, por ejemplo 2021091200-4367, y confirmar que dice "Sin snap registrado".

## 10. Riesgos
- **Convención de ángulos `o` y `dir`:** se valida visualmente con datos reales (sección 6.2). Si se ve al revés, el ajuste es una sola función.
- **Peso de `api/jugada`:** son hasta 203 × 23 objetos (unos 4,700). Es aceptable, aunque si el backend tarda se muestra el estado de carga.
- **Lista de jugadas larga:** sin filtros, `api/jugadas` trae las 8,557 jugadas. La lista muestra las primeras 200 con un aviso "Mostrando 200 de N; usa los filtros", sin paginar en el cliente.
