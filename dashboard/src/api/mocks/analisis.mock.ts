// MOCK: datos de ejemplo de forma, no son hallazgos.
// Forma de GET api/analisis según contrato-api.md. Las cifras son inventadas y solo sirven para
// dibujar las pantallas. Relaciones que sí se respetan:
//   - n_con_pase + n_sin_pase + n_sin_snap = n_jugadas
//   - exitosas <= n y tasas entre 0 y 1
//   - las combinaciones sin jugadas se omiten (nunca llegan con n = 0)
import { ErrorApi } from '../cliente'
import type { CeldaSuccess, ClaveDistancia, Filtros, RespuestaAnalisis } from '../tipos'
import { esperar, validarFiltros } from './utilidades.mock'

/** La primera llamada de la sesión simula el precálculo del backend (503 + Retry-After). */
let precalculoSimulado = false

function celda(down: number, distancia: ClaveDistancia, n: number, exitosas: number): CeldaSuccess {
  return { down, distancia, n, exitosas, tasa: exitosas / n }
}

// 4th & larga se omite a propósito para probar las celdas sin jugadas. 4th & media tiene n < 20.
const CELDAS: CeldaSuccess[] = [
  celda(1, 'corta', 40, 24),
  celda(1, 'media', 60, 33),
  celda(1, 'larga', 300, 138),
  celda(2, 'corta', 50, 30),
  celda(2, 'media', 90, 45),
  celda(2, 'larga', 160, 64),
  celda(3, 'corta', 80, 48),
  celda(3, 'media', 70, 28),
  celda(3, 'larga', 120, 36),
  celda(4, 'corta', 15, 9),
  celda(4, 'media', 10, 4),
]

export async function mockAnalisis(f: Filtros): Promise<RespuestaAnalisis> {
  await esperar()
  if (!precalculoSimulado) {
    precalculoSimulado = true
    throw new ErrorApi(503, 'Precalculando datos', 3)
  }
  await validarFiltros(f)

  // Filtro de ejemplo: down y distancia recortan las celdas; los demás solo se reflejan en filtros_aplicados.
  const celdas = CELDAS.filter((c) => (f.down === null || c.down === f.down) && (f.distancia === null || c.distancia === f.distancia))
  const n = celdas.reduce((s, c) => s + c.n, 0)
  const exitosas = celdas.reduce((s, c) => s + c.exitosas, 0)
  const sinDatos = n === 0

  const nJugadas = n + (f.down === null && f.distancia === null ? 5 : 0)
  const nSinSnap = sinDatos ? 0 : Math.max(1, Math.round(nJugadas * 0.01))
  const nSinPase = sinDatos ? 0 : Math.round(nJugadas * 0.12)
  const nConPase = nJugadas - nSinPase - nSinSnap

  return {
    filtros_aplicados: { ...f },
    n_jugadas: nJugadas,
    n_excluidas_down_0: f.down === null && f.distancia === null ? 5 : 0,
    success_rate: {
      global: { n, exitosas, tasa: sinDatos ? 0 : exitosas / n },
      por_down_distancia: celdas,
    },
    coberturas: sinDatos
      ? []
      : [
          { tipo_cobertura: 'Man', down: 3, distancia: 'media', n: 30, success_rate: 0.43, yardas_promedio: 6.2, resultado_pase: { C: 15, I: 10, S: 3, R: 1, IN: 1 } },
          { tipo_cobertura: 'Zone', down: 3, distancia: 'media', n: 35, success_rate: 0.37, yardas_promedio: 5.1, resultado_pase: { C: 19, I: 11, S: 2, R: 2, IN: 1 } },
          { tipo_cobertura: 'Other', down: 3, distancia: 'media', n: 5, success_rate: 0.4, yardas_promedio: 4.0, resultado_pase: { C: 2, I: 2, S: 1, R: 0, IN: 0 } },
        ],
    bolsillo: {
      n_con_pase: nConPase,
      n_sin_pase: nSinPase,
      n_sin_snap: nSinSnap,
      n_con_respaldo_autoevent: sinDatos ? 0 : 6,
      por_grupo: sinDatos
        ? []
        : [
            { play_action: false, presion: false, n: Math.round(nConPase * 0.55), tiempo_promedio_s: 2.6, tiempo_mediana_s: 2.5, success_rate: 0.5 },
            { play_action: false, presion: true, n: Math.round(nConPase * 0.25), tiempo_promedio_s: 3.1, tiempo_mediana_s: 2.9, success_rate: 0.33 },
            { play_action: true, presion: false, n: Math.round(nConPase * 0.15), tiempo_promedio_s: 3.0, tiempo_mediana_s: 2.9, success_rate: 0.56 },
            { play_action: true, presion: true, n: nConPase - Math.round(nConPase * 0.55) - Math.round(nConPase * 0.25) - Math.round(nConPase * 0.15), tiempo_promedio_s: 3.4, tiempo_mediana_s: 3.3, success_rate: 0.38 },
          ].filter((g) => g.n > 0), // como el backend: sin grupos con n = 0
    },
    separacion: {
      n: sinDatos ? 0 : 800,
      n_sin_receptor_identificado: sinDatos ? 0 : 40,
      momento: 'pass_forward',
      // S y R no tienen pase, así que no llegan (omitidas).
      por_resultado: sinDatos
        ? []
        : [
            { resultado_pase: 'C', n: 500, separacion_promedio_yd: 3.1, separacion_mediana_yd: 2.8, vel_receptor_promedio: 6.4, vel_defensor_promedio: 5.9 },
            { resultado_pase: 'I', n: 280, separacion_promedio_yd: 2.2, separacion_mediana_yd: 1.9, vel_receptor_promedio: 6.8, vel_defensor_promedio: 6.5 },
            { resultado_pase: 'IN', n: 20, separacion_promedio_yd: 1.4, separacion_mediana_yd: 1.2, vel_receptor_promedio: 6.1, vel_defensor_promedio: 6.3 },
          ],
    },
  }
}
