import type { Filtros, JugadaListada, RespuestaAnalisis, RespuestaFiltros, RespuestaJugada } from './tipos'

/** Error de la API con el formato de FastAPI ({"detail": ...}). estado 0 = sin conexión. */
export class ErrorApi extends Error {
  constructor(
    public estado: number,
    public detalle: string,
    /** Solo en 503 de api/analisis: segundos para reintentar (encabezado Retry-After). */
    public reintentarEnS?: number,
  ) {
    super(detalle)
  }
}

/**
 * true solo con `npm run dev:mock`. En `npm run build` (modo production) Vite reemplaza
 * import.meta.env.DEV por false, así que nunca hay mocks en la entrega.
 */
export const usarMocks = import.meta.env.DEV && import.meta.env.MODE === 'mock'

/** Reintento por defecto si Retry-After falta o no es un número de segundos. */
const REINTENTO_POR_DEFECTO_S = 5

// Mocks: cada función usa la condición literal `import.meta.env.DEV && import.meta.env.MODE === 'mock'`.
// En el build queda `false && ...`, así que Rollup elimina la rama completa (import y llamada) y nada
// de los mocks llega a dist. No se puede mover a una función auxiliar sin perder esa eliminación.

/** Arma la cadena de consulta solo con los filtros que tienen valor. */
export function parametrosFiltros(f: Filtros): string {
  const p = new URLSearchParams()
  for (const [clave, valor] of Object.entries(f)) {
    if (valor !== null && valor !== undefined) p.set(clave, String(valor))
  }
  const texto = p.toString()
  return texto ? `?${texto}` : ''
}

/** Convierte el `detail` de FastAPI (texto o lista de errores de validación) en un texto legible. */
function resumirDetail(detail: unknown): string | null {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    const partes = detail.map((d) => {
      const item = d as { msg?: string; loc?: unknown[] }
      const campo = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : undefined
      return campo !== undefined ? `${String(campo)}: ${item.msg ?? 'inválido'}` : (item.msg ?? 'Parámetro inválido')
    })
    return partes.join('; ')
  }
  return null
}

/** Lee Retry-After como segundos enteros positivos; si no, usa el valor por defecto. */
function leerRetryAfter(valor: string | null): number {
  const n = valor === null ? NaN : Number(valor.trim())
  return Number.isInteger(n) && n > 0 ? n : REINTENTO_POR_DEFECTO_S
}

/** GET a una ruta relativa (sin diagonal inicial) y devuelve el JSON o lanza ErrorApi. */
async function pedirJson<T>(ruta: string, aceptaReintento503 = false): Promise<T> {
  let respuesta: Response
  try {
    respuesta = await fetch(ruta, { headers: { Accept: 'application/json' } })
  } catch {
    throw new ErrorApi(0, 'No se pudo conectar con la API')
  }
  if (!respuesta.ok) {
    let detalle = `Error del servidor (${respuesta.status})`
    try {
      const cuerpo = (await respuesta.json()) as { detail?: unknown }
      detalle = resumirDetail(cuerpo.detail) ?? detalle
    } catch {
      // cuerpo vacío o no JSON: se queda el mensaje genérico
    }
    const reintento =
      aceptaReintento503 && respuesta.status === 503 ? leerRetryAfter(respuesta.headers.get('Retry-After')) : undefined
    throw new ErrorApi(respuesta.status, detalle, reintento)
  }
  return (await respuesta.json()) as T
}

/** GET api/filtros: opciones de los filtros (responde desde el arranque). */
export async function getFiltros(): Promise<RespuestaFiltros> {
  if (import.meta.env.DEV && import.meta.env.MODE === 'mock') return (await import('./mocks/index.mock')).mockFiltros()
  return pedirJson<RespuestaFiltros>('api/filtros')
}

/** GET api/analisis: métricas. Puede responder 503 mientras el backend precalcula. */
export async function getAnalisis(f: Filtros): Promise<RespuestaAnalisis> {
  if (import.meta.env.DEV && import.meta.env.MODE === 'mock') return (await import('./mocks/index.mock')).mockAnalisis(f)
  return pedirJson<RespuestaAnalisis>(`api/analisis${parametrosFiltros(f)}`, true)
}

/** GET api/jugadas: lista de jugadas con los filtros (nunca 503). */
export async function getJugadas(f: Filtros): Promise<JugadaListada[]> {
  if (import.meta.env.DEV && import.meta.env.MODE === 'mock') return (await import('./mocks/index.mock')).mockJugadas(f)
  return pedirJson<JugadaListada[]>(`api/jugadas${parametrosFiltros(f)}`)
}

/** GET api/jugada/{game_id}/{play_id}: una jugada con sus cuadros (404 si no existe). */
export async function getJugada(gameId: number, playId: number): Promise<RespuestaJugada> {
  if (import.meta.env.DEV && import.meta.env.MODE === 'mock') return (await import('./mocks/index.mock')).mockJugada(gameId, playId)
  return pedirJson<RespuestaJugada>(`api/jugada/${gameId}/${playId}`)
}
