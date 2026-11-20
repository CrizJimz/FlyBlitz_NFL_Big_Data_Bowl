import type { ReactNode } from 'react'
import { IconoLogo } from './iconos'

interface Props {
  /** Chips de filtros aplicados u otros indicadores (p. ej. "DATOS DE EJEMPLO"). */
  children?: ReactNode
}

/** Barra superior de la "tablet": logo, nombre y espacio para chips. */
export function BarraSuperior({ children }: Props) {
  return (
    <header className="flex min-h-16 items-center gap-4 border-b border-navy-700 bg-navy-900 px-5">
      <div className="flex items-center gap-3 text-acento">
        <IconoLogo />
        <div className="leading-tight">
          <p className="text-lg font-extrabold tracking-wide text-texto">FLYBLITZ</p>
          <p className="text-xs font-semibold uppercase tracking-widest text-texto-suave">Sideline · Juego aéreo</p>
        </div>
      </div>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">{children}</div>
    </header>
  )
}
