/** Formatos de presentación. El frontend no recalcula cifras: solo da formato a lo que manda la API. */

/** Debajo de este n una métrica se marca como "muestra pequeña". */
export const MUESTRA_PEQUENA = 20

/** 0.4731 → "47.3%" */
export function pct(tasa: number): string {
  return `${(tasa * 100).toFixed(1)}%`
}

/** 8522 → "8,522" */
export function entero(n: number): string {
  return Math.round(n).toLocaleString('en-US')
}

/** 2.37 → "2.4" */
export function dec1(x: number): string {
  return x.toFixed(1)
}

const ORDINALES: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th' }

/** Down como en TV: 1 → "1st". */
export function ordinalDown(down: number): string {
  return ORDINALES[down] ?? `${down}°`
}

/** Chip de situación: (3, 7) → "3rd & 7". Siempre con número: el contrato no trae la yarda de gol. */
export function chipDown(down: number, yardas: number): string {
  return `${ordinalDown(down)} & ${yardas}`
}

/** Nombre corto de un resultado de pase. */
export const NOMBRE_RESULTADO: Record<string, string> = {
  C: 'Completo',
  I: 'Incompleto',
  S: 'Sack',
  R: 'Scramble',
  IN: 'Intercepción',
}
