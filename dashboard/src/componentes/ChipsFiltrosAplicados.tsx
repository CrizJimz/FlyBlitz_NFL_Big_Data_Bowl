import type { Filtros } from '../api/tipos'
import { ordinalDown } from '../utilidades/formato'

/** Chips de la barra superior con lo que la API dice que aplicó (`filtros_aplicados`), no el estado local. */
export function ChipsFiltrosAplicados({ aplicados }: { aplicados: Filtros | null }) {
  if (!aplicados) return null
  const chips: string[] = []
  if (aplicados.ofensiva) chips.push(`OF ${aplicados.ofensiva}`)
  if (aplicados.defensiva) chips.push(`DEF ${aplicados.defensiva}`)
  if (aplicados.semana !== null) chips.push(`Semana ${aplicados.semana}`)
  if (aplicados.down !== null) chips.push(`${ordinalDown(aplicados.down)} down`)
  if (aplicados.distancia) chips.push(`Distancia ${aplicados.distancia}`)
  if (chips.length === 0) chips.push('Todas las jugadas')
  return (
    <>
      {chips.map((c) => (
        <span key={c} className="inline-flex min-h-9 items-center rounded-full border border-acento/50 bg-acento/10 px-3 text-xs font-bold text-acento">
          {c}
        </span>
      ))}
    </>
  )
}
