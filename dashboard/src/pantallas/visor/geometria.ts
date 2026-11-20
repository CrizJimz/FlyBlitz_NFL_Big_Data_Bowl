/**
 * Conversión de coordenadas del campo (yardas) a SVG.
 * Los datos ya vienen normalizados por playDirection desde el backend: aquí NO se normaliza.
 * Solo se invierte y para dibujar (en el campo y = 0 queda abajo, en SVG arriba).
 */
export const LARGO_CAMPO = 120
export const ANCHO_CAMPO = 53.3
/** Margen alrededor del campo: hay jugadores fuera (x de -3.55 a 121.15, y de -4.53 a 57.72). */
export const MARGEN = 5

export function ySvg(y: number): number {
  return ANCHO_CAMPO - y
}

/** Normaliza un ángulo a [0, 360) (hay valores exactamente 360 en el dataset). */
export function grados360(angulo: number): number {
  return ((angulo % 360) + 360) % 360
}

/**
 * Vector unitario en SVG para un ángulo NGS (0° apunta a +y del campo, crece en sentido horario).
 * En el campo: dx = sin θ, dy = cos θ. En SVG la y se invierte.
 */
export function vectorSvg(angulo: number): { dx: number; dy: number } {
  const rad = (grados360(angulo) * Math.PI) / 180
  return { dx: Math.sin(rad), dy: -Math.cos(rad) }
}
