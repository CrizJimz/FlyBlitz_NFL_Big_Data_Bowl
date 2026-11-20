import type { JugadorCuadro } from '../../api/tipos'
import { dec1 } from '../../utilidades/formato'
import { vectorSvg, ySvg } from './geometria'

const RADIO = 1.1

/** Texto del tooltip nativo (<title>): nombre, dorsal, rol y velocidad. */
function tooltip(j: JugadorCuadro): string {
  if (j.lado === 'balon') return `Balón · ${dec1(j.s)} yd/s`
  return `${j.nombre ?? 'Sin nombre'} · #${j.dorsal ?? '—'} · ${j.rol ?? 'sin rol'} · ${dec1(j.s)} yd/s`
}

/** Línea corta que indica hacia dónde mira el jugador (o). */
function Orientacion({ j }: { j: JugadorCuadro }) {
  if (j.o === null) return null
  const { dx, dy } = vectorSvg(j.o)
  const x = j.x
  const y = ySvg(j.y)
  return <line x1={x} y1={y} x2={x + dx * 2.2} y2={y + dy * 2.2} stroke="white" strokeWidth={0.25} strokeLinecap="round" opacity={0.9} />
}

function Marcador({ j, esObjetivo }: { j: JugadorCuadro; esObjetivo: boolean }) {
  const x = j.x
  const y = ySvg(j.y)

  if (j.lado === 'balon') {
    // El balón se identifica por lado = "balon" (trae equipo = "football" y campos null).
    return (
      <g>
        <title>{tooltip(j)}</title>
        <ellipse cx={x} cy={y} rx={0.75} ry={0.45} className="fill-balon" stroke="white" strokeWidth={0.15} />
      </g>
    )
  }

  const dorsal = j.dorsal ?? ''
  return (
    <g className="cursor-default">
      <title>{tooltip(j)}</title>
      {esObjetivo && <circle cx={x} cy={y} r={RADIO + 0.9} fill="none" stroke="white" strokeWidth={0.35} />}
      <Orientacion j={j} />
      {j.lado === 'ofensiva' ? (
        <circle cx={x} cy={y} r={RADIO} className="fill-acento" stroke="#0B1426" strokeWidth={0.15} />
      ) : (
        <polygon
          points={`${x},${y - RADIO * 1.15} ${x + RADIO},${y + RADIO * 0.8} ${x - RADIO},${y + RADIO * 0.8}`}
          className="fill-defensa"
          stroke="#0B1426"
          strokeWidth={0.15}
        />
      )}
      <text x={x} y={y + 0.4} fontSize={1.05} fontWeight={800} textAnchor="middle" fill="#0B1426">
        {dorsal}
      </text>
      {esObjetivo && j.nombre && (
        <text x={x} y={y - RADIO - 1.3} fontSize={1.4} fontWeight={700} textAnchor="middle" fill="white">
          {j.nombre}
        </text>
      )}
    </g>
  )
}

/** Marcadores del cuadro actual. El balón se dibuja al final para que quede encima. */
export function Jugadores({ jugadores, receptorId }: { jugadores: JugadorCuadro[]; receptorId: number | null }) {
  const ordenados = [...jugadores].sort((a, b) => Number(a.lado === 'balon') - Number(b.lado === 'balon'))
  return (
    <g>
      {ordenados.map((j, i) => (
        <Marcador key={j.nfl_id ?? `balon-${i}`} j={j} esObjetivo={receptorId !== null && j.nfl_id === receptorId} />
      ))}
    </g>
  )
}

/** Defensor más cercano al receptor en un cuadro. Solo es una guía visual; la cifra es la de la API. */
export function defensorMasCercano(jugadores: JugadorCuadro[], receptorId: number): { receptor: JugadorCuadro; defensor: JugadorCuadro } | null {
  const receptor = jugadores.find((j) => j.nfl_id === receptorId)
  if (!receptor) return null
  let mejor: JugadorCuadro | null = null
  let distancia = Infinity
  for (const j of jugadores) {
    if (j.lado !== 'defensiva') continue
    const d = Math.hypot(j.x - receptor.x, j.y - receptor.y)
    if (d < distancia) {
      distancia = d
      mejor = j
    }
  }
  return mejor ? { receptor, defensor: mejor } : null
}

/** Línea punteada receptor → defensor más cercano. */
export function LineaSeparacion({ receptor, defensor }: { receptor: JugadorCuadro; defensor: JugadorCuadro }) {
  return (
    <line
      x1={receptor.x}
      y1={ySvg(receptor.y)}
      x2={defensor.x}
      y2={ySvg(defensor.y)}
      stroke="white"
      strokeWidth={0.3}
      strokeDasharray="0.8 0.6"
    />
  )
}
