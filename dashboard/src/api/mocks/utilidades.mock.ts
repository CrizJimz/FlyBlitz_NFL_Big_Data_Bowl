// MOCK: datos de ejemplo de forma, no son hallazgos.
// Utilidades compartidas por los mocks. Solo se cargan con `npm run dev:mock`.
import { ErrorApi } from '../cliente'
import type { Filtros } from '../tipos'
import { mockFiltros } from './filtros.mock'

/** Simula la latencia de red para ver los estados de carga. */
export function esperar(ms = 350): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/** Imita los 422 del backend: equipo, semana, down o distancia inexistentes. */
export async function validarFiltros(f: Filtros): Promise<void> {
  const op = await mockFiltros()
  const malos: string[] = []
  if (f.ofensiva !== null && !op.equipos.includes(f.ofensiva)) malos.push(`ofensiva: equipo inexistente (${f.ofensiva})`)
  if (f.defensiva !== null && !op.equipos.includes(f.defensiva)) malos.push(`defensiva: equipo inexistente (${f.defensiva})`)
  if (f.semana !== null && !op.semanas.includes(f.semana)) malos.push(`semana: inexistente (${f.semana})`)
  if (f.down !== null && !op.downs.includes(f.down)) malos.push(`down: inexistente (${f.down})`)
  if (f.distancia !== null && !op.rangos_distancia.some((r) => r.clave === f.distancia)) {
    malos.push(`distancia: inexistente (${f.distancia})`)
  }
  if (malos.length) throw new ErrorApi(422, malos.join('; '))
}
