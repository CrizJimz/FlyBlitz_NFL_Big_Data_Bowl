// MOCK: datos de ejemplo de forma, no son hallazgos.
// Punto de entrada de los mocks. api/cliente.ts lo importa de forma dinámica solo con `npm run dev:mock`;
// en `npm run build` esa rama se elimina y nada de esta carpeta llega a dist.
export { mockFiltros } from './filtros.mock'
export { mockAnalisis } from './analisis.mock'
export { mockJugadas } from './jugadas.mock'
export { mockJugada } from './jugada.mock'
