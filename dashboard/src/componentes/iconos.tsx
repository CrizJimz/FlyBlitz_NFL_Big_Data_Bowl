import type { Seccion } from '../secciones'

/** Íconos SVG inline (sin CDN). Usan currentColor para tomar el color del texto. */
const base = {
  width: 28,
  height: 28,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

/** Gráfica de barras ascendentes: Success Rate. */
function IconoSuccess() {
  return (
    <svg {...base}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  )
}

/** Escudo: coberturas defensivas. */
function IconoCoberturas() {
  return (
    <svg {...base}>
      <path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z" />
    </svg>
  )
}

/** Cronómetro: tiempo de bolsillo. */
function IconoBolsillo() {
  return (
    <svg {...base}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l3 2M9 2h6" />
    </svg>
  )
}

/** Dos puntos con distancia: separación. */
function IconoSeparacion() {
  return (
    <svg {...base}>
      <circle cx="5" cy="12" r="3" />
      <circle cx="19" cy="12" r="3" />
      <path d="M8 12h8" strokeDasharray="2 2" />
    </svg>
  )
}

/** Campo con jugada: visor 2D. */
function IconoVisor() {
  return (
    <svg {...base}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M7 5v14M17 5v14" />
      <circle cx="10" cy="12" r="1.5" />
      <path d="M13 10l2 2-2 2" />
    </svg>
  )
}

const ICONOS: Record<Seccion, () => JSX.Element> = {
  'success-rate': IconoSuccess,
  coberturas: IconoCoberturas,
  bolsillo: IconoBolsillo,
  separacion: IconoSeparacion,
  visor: IconoVisor,
}

export function IconoSeccion({ seccion }: { seccion: Seccion }) {
  const Icono = ICONOS[seccion]
  return <Icono />
}

/** Balón de fútbol americano: logo de la app. */
export function IconoLogo() {
  return (
    <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <ellipse cx="12" cy="12" rx="10" ry="6" transform="rotate(-35 12 12)" />
      <path d="M9 15l6-6M10 11l1 1M12 9l1 1M11 13l1 1" strokeLinecap="round" />
    </svg>
  )
}
