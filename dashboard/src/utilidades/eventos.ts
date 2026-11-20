import type { EventoJugada } from '../api/tipos'

/** El evento manual es la fuente; el autoevent solo es respaldo (auditoria-datos.md, trampa 10). */
export const EVENTOS_SNAP = ['ball_snap', 'autoevent_ballsnap']
export const EVENTOS_PASE = ['pass_forward', 'autoevent_passforward']

/** Etiquetas cortas para la línea de tiempo. Los eventos no listados muestran su nombre crudo. */
const ETIQUETAS: Record<string, string> = {
  ball_snap: 'Snap',
  autoevent_ballsnap: 'Snap (auto)',
  pass_forward: 'Pase',
  autoevent_passforward: 'Pase (auto)',
  pass_arrived: 'Llegada',
  play_action: 'Play action',
  qb_sack: 'Sack',
  qb_strip_sack: 'Sack + fumble',
  run: 'Scramble',
  line_set: 'Formación',
  man_in_motion: 'Motion',
  shift: 'Shift',
  pass_tipped: 'Pase tocado',
  first_contact: 'Contacto',
  autoevent_passinterrupted: 'Pase interrumpido',
  fumble: 'Fumble',
  handoff: 'Entrega',
}

export function etiquetaEvento(evento: string): string {
  return ETIQUETAS[evento] ?? evento
}

/** Un elemento por nombre de evento, con su primer cuadro (hay eventos repetidos, trampa 9), en orden. */
export function primerCuadroPorEvento(eventos: EventoJugada[]): EventoJugada[] {
  const primero = new Map<string, number>()
  for (const e of eventos) {
    const previo = primero.get(e.evento)
    if (previo === undefined || e.frame_id < previo) primero.set(e.evento, e.frame_id)
  }
  return [...primero.entries()].map(([evento, frame_id]) => ({ evento, frame_id })).sort((a, b) => a.frame_id - b.frame_id)
}

/** ¿La jugada tiene algún snap (manual o respaldo)? Si no, nunca se supone el cuadro 1. */
export function tieneSnap(eventos: EventoJugada[]): boolean {
  return eventos.some((e) => EVENTOS_SNAP.includes(e.evento))
}

/** Primer cuadro del pase: el manual si existe; si no, el autoevent. null si no hay pase. */
export function cuadroPase(eventos: EventoJugada[]): number | null {
  for (const nombre of EVENTOS_PASE) {
    const cuadros = eventos.filter((e) => e.evento === nombre).map((e) => e.frame_id)
    if (cuadros.length) return Math.min(...cuadros)
  }
  return null
}
