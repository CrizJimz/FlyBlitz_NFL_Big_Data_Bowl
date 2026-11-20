// MOCK: datos de ejemplo de forma, no son hallazgos.
// Forma de GET api/jugadas según contrato-api.md. Las descripciones son inventadas.
// 2021091200-4367 es una de las 24 jugadas sin snap de auditoria-datos.md; aquí se usa para la variante sin snap.
import type { Filtros, JugadaListada } from '../tipos'
import { esperar, validarFiltros } from './utilidades.mock'

export const JUGADA_SIN_SNAP = { game_id: 2021091200, play_id: 4367 }

const JUGADAS: JugadaListada[] = [
  { game_id: 2021090900, play_id: 97, descripcion: '(EJEMPLO) Pase corto a la derecha al receptor 1, completo.', down: 3, yardas_por_avanzar: 2, resultado_pase: 'C' },
  { game_id: 2021090900, play_id: 140, descripcion: '(EJEMPLO) Pase profundo por el centro, incompleto.', down: 1, yardas_por_avanzar: 10, resultado_pase: 'I' },
  { game_id: 2021090900, play_id: 211, descripcion: '(EJEMPLO) Capturado el QB en su yarda 30.', down: 2, yardas_por_avanzar: 7, resultado_pase: 'S' },
  { game_id: 2021090900, play_id: 305, descripcion: '(EJEMPLO) Pase interceptado por el profundo.', down: 3, yardas_por_avanzar: 9, resultado_pase: 'IN' },
  { ...JUGADA_SIN_SNAP, descripcion: '(EJEMPLO) Jugada sin snap registrado en el tracking.', down: 2, yardas_por_avanzar: 5, resultado_pase: 'C' },
]

export async function mockJugadas(f: Filtros): Promise<JugadaListada[]> {
  await esperar(200)
  await validarFiltros(f)
  // Solo el filtro de down recorta la lista de ejemplo.
  return JUGADAS.filter((j) => f.down === null || j.down === f.down)
}

export function existeJugada(gameId: number, playId: number): JugadaListada | undefined {
  return JUGADAS.find((j) => j.game_id === gameId && j.play_id === playId)
}
