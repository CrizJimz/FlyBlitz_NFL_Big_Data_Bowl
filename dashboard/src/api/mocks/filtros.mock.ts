// MOCK: datos de ejemplo de forma, no son hallazgos.
// Forma de GET api/filtros según contrato-api.md. El backend real ya responde este endpoint.
import type { RespuestaFiltros } from '../tipos'

export async function mockFiltros(): Promise<RespuestaFiltros> {
  return {
    equipos: ['ARI', 'BAL', 'BUF', 'DAL', 'KC', 'TB'],
    semanas: [1, 2, 3, 4, 5, 6, 7, 8],
    downs: [1, 2, 3, 4],
    rangos_distancia: [
      { clave: 'corta', min: 1, max: 3 },
      { clave: 'media', min: 4, max: 7 },
      { clave: 'larga', min: 8, max: null },
    ],
    // El backend los manda en orden alfabético.
    tipos_cobertura: ['Man', 'Other', 'Zone'],
    coberturas: ['Cover-0', 'Cover-1', 'Cover-2', 'Cover-3', 'Quarters'],
    formaciones: ['EMPTY', 'SHOTGUN', 'SINGLEBACK'],
  }
}
