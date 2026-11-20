// MOCK: datos de ejemplo de forma, no son hallazgos.
// Forma de GET api/jugada/{game_id}/{play_id} según contrato-api.md. Los cuadros son sintéticos
// (movimiento generado con fórmulas simples), sin nombres reales.
// Casos que cubre:
//   - evento repetido (autoevent_ballsnap en dos cuadros) para probar "solo el primer cuadro"
//   - variante sin snap y con receptor_objetivo null (JUGADA_SIN_SNAP)
//   - 404 para ids que no están en la lista de ejemplo
import { ErrorApi } from '../cliente'
import type { Cuadro, EventoJugada, JugadorCuadro, RespuestaJugada } from '../tipos'
import { esperar } from './utilidades.mock'
import { existeJugada, JUGADA_SIN_SNAP } from './jugadas.mock'

const N_CUADROS = 30
const CUADRO_SNAP = 11
const CUADRO_PASE = 25
const LINEA = 35 // línea de golpeo de ejemplo (x)

/** Posiciones iniciales (x, y) y desplazamiento por cuadro (dx, dy) de cada jugador. */
interface Plan {
  rol: string
  x: number
  y: number
  dx: number
  dy: number
}

const OFENSIVA: Plan[] = [
  { rol: 'Pass', x: LINEA - 5, y: 26.6, dx: -0.15, dy: 0 },
  { rol: 'Pass Block', x: LINEA - 1, y: 22.6, dx: -0.05, dy: 0 },
  { rol: 'Pass Block', x: LINEA - 1, y: 24.6, dx: -0.05, dy: 0 },
  { rol: 'Pass Block', x: LINEA - 1, y: 26.6, dx: -0.05, dy: 0 },
  { rol: 'Pass Block', x: LINEA - 1, y: 28.6, dx: -0.05, dy: 0 },
  { rol: 'Pass Block', x: LINEA - 1, y: 30.6, dx: -0.05, dy: 0 },
  { rol: 'Pass Route', x: LINEA - 1, y: 5, dx: 0.7, dy: 0.05 },
  { rol: 'Pass Route', x: LINEA - 1, y: 48, dx: 0.75, dy: -0.1 },
  { rol: 'Pass Route', x: LINEA - 1.5, y: 14, dx: 0.5, dy: 0.25 },
  { rol: 'Pass Route', x: LINEA - 1.5, y: 33, dx: 0.45, dy: 0.3 },
  { rol: 'Pass Route', x: LINEA - 6, y: 24, dx: 0.3, dy: -0.4 },
]

const DEFENSIVA: Plan[] = [
  { rol: 'Pass Rush', x: LINEA + 1, y: 23.5, dx: -0.2, dy: 0 },
  { rol: 'Pass Rush', x: LINEA + 1, y: 25.6, dx: -0.2, dy: 0 },
  { rol: 'Pass Rush', x: LINEA + 1, y: 27.6, dx: -0.2, dy: 0 },
  { rol: 'Pass Rush', x: LINEA + 1, y: 29.7, dx: -0.2, dy: 0 },
  { rol: 'Coverage', x: LINEA + 5, y: 5.5, dx: 0.6, dy: 0.05 },
  { rol: 'Coverage', x: LINEA + 5, y: 47.5, dx: 0.65, dy: -0.1 },
  { rol: 'Coverage', x: LINEA + 6, y: 15, dx: 0.4, dy: 0.2 },
  { rol: 'Coverage', x: LINEA + 6, y: 33, dx: 0.4, dy: 0.25 },
  { rol: 'Coverage', x: LINEA + 4, y: 24, dx: 0.1, dy: -0.2 },
  { rol: 'Coverage', x: LINEA + 14, y: 18, dx: 0.3, dy: 0.1 },
  { rol: 'Coverage', x: LINEA + 14, y: 36, dx: 0.3, dy: -0.1 },
]

/** Ángulo en grados (convención NGS: 0° = +y, sentido horario) a partir del desplazamiento. */
function angulo(dx: number, dy: number): number {
  const grados = (Math.atan2(dx, dy) * 180) / Math.PI
  return (grados + 360) % 360
}

/** Antes del snap nadie se mueve; después cada jugador avanza según su plan. */
function posicion(p: Plan, cuadro: number) {
  const t = Math.max(0, cuadro - CUADRO_SNAP)
  return { x: p.x + p.dx * t, y: p.y + p.dy * t, s: cuadro > CUADRO_SNAP ? Math.hypot(p.dx, p.dy) * 10 : 0 }
}

function jugadores(cuadro: number): JugadorCuadro[] {
  const lista: JugadorCuadro[] = []
  OFENSIVA.forEach((p, i) => {
    const { x, y, s } = posicion(p, cuadro)
    lista.push({ nfl_id: 1000 + i, nombre: `Ofensivo ${i + 1}`, dorsal: 10 + i, equipo: 'TB', lado: 'ofensiva', rol: p.rol, x, y, s, o: angulo(p.dx || 1, p.dy), dir: angulo(p.dx || 1, p.dy) })
  })
  DEFENSIVA.forEach((p, i) => {
    const { x, y, s } = posicion(p, cuadro)
    lista.push({ nfl_id: 2000 + i, nombre: `Defensivo ${i + 1}`, dorsal: 20 + i, equipo: 'DAL', lado: 'defensiva', rol: p.rol, x, y, s, o: angulo(-1, 0), dir: angulo(p.dx, p.dy) })
  })
  // Balón: con el QB hasta el pase; después vuela hacia el receptor 1 (índice 6).
  const qb = posicion(OFENSIVA[0], cuadro)
  let balon = { x: qb.x + 0.3, y: qb.y, s: qb.s }
  if (cuadro > CUADRO_PASE) {
    const avance = (cuadro - CUADRO_PASE) / (N_CUADROS - CUADRO_PASE)
    const origen = posicion(OFENSIVA[0], CUADRO_PASE)
    const destino = posicion(OFENSIVA[6], N_CUADROS + 3)
    balon = { x: origen.x + (destino.x - origen.x) * avance, y: origen.y + (destino.y - origen.y) * avance, s: 18 }
  }
  lista.push({ nfl_id: null, nombre: null, dorsal: null, equipo: 'football', lado: 'balon', rol: null, x: balon.x, y: balon.y, s: balon.s, o: null, dir: null })
  return lista
}

function cuadros(): Cuadro[] {
  return Array.from({ length: N_CUADROS }, (_, i) => ({ frame_id: i + 1, jugadores: jugadores(i + 1) }))
}

const EVENTOS_CON_SNAP: EventoJugada[] = [
  { frame_id: 1, evento: 'line_set' },
  { frame_id: CUADRO_SNAP, evento: 'ball_snap' },
  { frame_id: CUADRO_SNAP + 1, evento: 'autoevent_ballsnap' },
  { frame_id: CUADRO_SNAP + 2, evento: 'autoevent_ballsnap' }, // repetido a propósito
  { frame_id: CUADRO_PASE, evento: 'pass_forward' },
  { frame_id: CUADRO_PASE + 1, evento: 'autoevent_passforward' },
]

export async function mockJugada(gameId: number, playId: number): Promise<RespuestaJugada> {
  await esperar(400)
  const listada = existeJugada(gameId, playId)
  if (!listada) throw new ErrorApi(404, 'Jugada no encontrada')

  const sinSnap = gameId === JUGADA_SIN_SNAP.game_id && playId === JUGADA_SIN_SNAP.play_id
  return {
    game_id: gameId,
    play_id: playId,
    descripcion: listada.descripcion,
    semana: 1,
    down: listada.down,
    yardas_por_avanzar: listada.yardas_por_avanzar,
    ofensiva: 'TB',
    defensiva: 'DAL',
    resultado_pase: listada.resultado_pase,
    resultado_yardas: listada.resultado_pase === 'C' ? 12 : 0,
    cobertura: 'Cover-1',
    tipo_cobertura: 'Man',
    play_action: false,
    frames_por_segundo: 10,
    eventos: sinSnap ? EVENTOS_CON_SNAP.filter((e) => !e.evento.includes('snap')) : EVENTOS_CON_SNAP,
    receptor_objetivo: sinSnap ? null : { nfl_id: 1006, nombre: 'Ofensivo 7', separacion_yd: 2.4 },
    frames: cuadros(),
  }
}
