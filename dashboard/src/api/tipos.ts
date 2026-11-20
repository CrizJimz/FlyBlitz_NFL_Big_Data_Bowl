/**
 * Tipos copiados de .kiro/specs/01-motor-datos/contrato-api.md.
 * Si el contrato cambia, este es el único archivo que se actualiza; `tsc --noEmit` marca lo afectado.
 * La API omite las combinaciones sin jugadas en por_down_distancia, coberturas, por_grupo y por_resultado.
 */

export type ClaveDistancia = 'corta' | 'media' | 'larga'
export type ResultadoPase = 'C' | 'I' | 'S' | 'R' | 'IN'
export type Lado = 'ofensiva' | 'defensiva' | 'balon'

// ---------- GET api/filtros ----------
export interface RangoDistancia {
  clave: ClaveDistancia
  min: number
  max: number | null
}

export interface RespuestaFiltros {
  equipos: string[]
  semanas: number[]
  downs: number[]
  rangos_distancia: RangoDistancia[]
  tipos_cobertura: string[]
  coberturas: string[]
  formaciones: string[]
}

/** Parámetros opcionales de api/analisis y api/jugadas. `null` = "Todos" (no se envía). */
export interface Filtros {
  ofensiva: string | null
  defensiva: string | null
  semana: number | null
  down: number | null
  distancia: ClaveDistancia | null
}

export const FILTROS_VACIOS: Filtros = { ofensiva: null, defensiva: null, semana: null, down: null, distancia: null }

// ---------- GET api/analisis ----------
export interface Tasa {
  n: number
  exitosas: number
  tasa: number
}

export interface CeldaSuccess extends Tasa {
  down: number
  distancia: ClaveDistancia
}

export interface FilaCobertura {
  tipo_cobertura: string
  down: number
  distancia: ClaveDistancia
  n: number
  success_rate: number
  yardas_promedio: number
  resultado_pase: Record<ResultadoPase, number>
}

export interface GrupoBolsillo {
  play_action: boolean
  presion: boolean
  n: number
  tiempo_promedio_s: number
  tiempo_mediana_s: number
  success_rate: number
}

export interface FilaSeparacion {
  resultado_pase: ResultadoPase
  n: number
  separacion_promedio_yd: number
  separacion_mediana_yd: number
  vel_receptor_promedio: number
  vel_defensor_promedio: number
}

export interface RespuestaAnalisis {
  filtros_aplicados: Filtros
  n_jugadas: number
  n_excluidas_down_0: number
  success_rate: { global: Tasa; por_down_distancia: CeldaSuccess[] }
  coberturas: FilaCobertura[]
  bolsillo: {
    n_con_pase: number
    n_sin_pase: number
    n_sin_snap: number
    n_con_respaldo_autoevent: number
    por_grupo: GrupoBolsillo[]
  }
  separacion: {
    n: number
    n_sin_receptor_identificado: number
    momento: string
    por_resultado: FilaSeparacion[]
  }
}

// ---------- GET api/jugadas ----------
export interface JugadaListada {
  game_id: number
  play_id: number
  descripcion: string
  down: number
  yardas_por_avanzar: number
  resultado_pase: ResultadoPase
}

// ---------- GET api/jugada/{game_id}/{play_id} ----------
/** En el balón (lado "balon", equipo "football"): nfl_id, nombre, dorsal, rol, o y dir son null. */
export interface JugadorCuadro {
  nfl_id: number | null
  nombre: string | null
  dorsal: number | null
  equipo: string
  lado: Lado
  rol: string | null
  x: number
  y: number
  s: number
  o: number | null
  dir: number | null
}

export interface Cuadro {
  frame_id: number
  jugadores: JugadorCuadro[]
}

export interface EventoJugada {
  frame_id: number
  evento: string
}

export interface ReceptorObjetivo {
  nfl_id: number
  nombre: string
  separacion_yd: number
}

export interface RespuestaJugada {
  game_id: number
  play_id: number
  descripcion: string
  semana: number
  down: number
  yardas_por_avanzar: number
  ofensiva: string
  defensiva: string
  resultado_pase: ResultadoPase
  resultado_yardas: number
  cobertura: string
  tipo_cobertura: string
  play_action: boolean
  frames_por_segundo: number
  eventos: EventoJugada[]
  receptor_objetivo: ReceptorObjetivo | null
  frames: Cuadro[]
}
