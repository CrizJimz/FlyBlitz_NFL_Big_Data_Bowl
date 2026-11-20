import { memo } from 'react'
import { ANCHO_CAMPO, LARGO_CAMPO } from './geometria'

const LINEAS = Array.from({ length: 21 }, (_, i) => 10 + i * 5) // x = 10, 15, ..., 110
const NUMEROS = Array.from({ length: 9 }, (_, i) => 20 + i * 10) // x = 20, ..., 100

/** Número de yarda que se lee en el campo: 10, 20, 30, 40, 50, 40, ... */
function numeroYarda(x: number): number {
  return x <= 60 ? x - 10 : 110 - x
}

/** Campo de 120 x 53.3 yardas. Estático, por eso va memorizado. Se dibuja dentro del <svg> del visor. */
export const Campo = memo(function Campo() {
  return (
    <g>
      <rect x={0} y={0} width={LARGO_CAMPO} height={ANCHO_CAMPO} className="fill-campo" />
      {/* Zonas de anotación */}
      <rect x={0} y={0} width={10} height={ANCHO_CAMPO} className="fill-navy-800" opacity={0.85} />
      <rect x={110} y={0} width={10} height={ANCHO_CAMPO} className="fill-navy-800" opacity={0.85} />
      {LINEAS.map((x) => (
        <line key={x} x1={x} x2={x} y1={0} y2={ANCHO_CAMPO} stroke="white" strokeOpacity={x % 10 === 0 ? 0.45 : 0.2} strokeWidth={0.15} />
      ))}
      {NUMEROS.map((x) => (
        <g key={x} className="fill-white" opacity={0.5} fontSize={2.6} fontWeight={700} textAnchor="middle">
          <text x={x} y={ANCHO_CAMPO - 9}>{numeroYarda(x)}</text>
          <text x={x} y={11}>{numeroYarda(x)}</text>
        </g>
      ))}
      <rect x={0} y={0} width={LARGO_CAMPO} height={ANCHO_CAMPO} fill="none" stroke="white" strokeOpacity={0.8} strokeWidth={0.3} />
      <text x={5} y={ANCHO_CAMPO / 2} className="fill-white" opacity={0.35} fontSize={2.4} fontWeight={800} textAnchor="middle" transform={`rotate(-90 5 ${ANCHO_CAMPO / 2})`}>
        PROPIA
      </text>
      <text x={115} y={ANCHO_CAMPO / 2} className="fill-white" opacity={0.35} fontSize={2.4} fontWeight={800} textAnchor="middle" transform={`rotate(90 115 ${ANCHO_CAMPO / 2})`}>
        ATAQUE →
      </text>
    </g>
  )
})
