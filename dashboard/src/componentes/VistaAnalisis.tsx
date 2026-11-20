import type { ReactNode } from 'react'
import type { RespuestaAnalisis } from '../api/tipos'
import type { ResultadoPeticion } from '../api/usePeticion'
import { Cargando, ErrorPanel } from './Estado'

/**
 * Decide qué mostrar con el resultado de api/analisis:
 * - datos listos → children(datos)
 * - 422 → últimos datos válidos (el error se muestra junto a los filtros)
 * - cargando o 503 → estado de carga
 * - otro error → panel de error con reintento
 */
export function datosVisibles(r: ResultadoPeticion<RespuestaAnalisis>): RespuestaAnalisis | null {
  if (r.estado.tipo === 'listo') return r.estado.datos
  if (r.estado.tipo === 'error' && r.estado.error.estado === 422) return r.ultimo
  return null
}

export function VistaAnalisis({ resultado, children }: {
  resultado: ResultadoPeticion<RespuestaAnalisis>
  children: (datos: RespuestaAnalisis) => ReactNode
}) {
  const datos = datosVisibles(resultado)
  if (datos) return <>{children(datos)}</>
  const { estado } = resultado
  if (estado.tipo === 'error') return <ErrorPanel error={estado.error} onReintentar={resultado.reintentar} />
  if (estado.tipo === 'cargando') return <Cargando mensaje={estado.mensaje} reintentoEnS={estado.reintentoEnS} />
  return null
}
