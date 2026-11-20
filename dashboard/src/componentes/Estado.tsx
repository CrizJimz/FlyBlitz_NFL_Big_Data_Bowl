import type { ReactNode } from 'react'
import type { ErrorApi } from '../api/cliente'
import { MUESTRA_PEQUENA } from '../utilidades/formato'

/** Estado de carga. Con `reintentoEnS` explica que el backend está precalculando (503). */
export function Cargando({ mensaje, reintentoEnS }: { mensaje?: string; reintentoEnS?: number }) {
  return (
    <div role="status" aria-live="polite" className="panel flex min-h-40 flex-col items-center justify-center gap-3 text-center">
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-navy-700 border-t-acento" aria-hidden />
      <p className="text-lg font-bold">{mensaje ? `${mensaje}…` : 'Cargando…'}</p>
      {reintentoEnS !== undefined && (
        <p className="text-sm text-texto-suave">El servidor está preparando los datos. Reintento automático en {reintentoEnS} s.</p>
      )}
    </div>
  )
}

/** Error con opción de reintentar. No cae en silencio a los mocks. */
export function ErrorPanel({ error, onReintentar, titulo = 'No se pudieron cargar los datos' }: {
  error: ErrorApi
  onReintentar?: () => void
  titulo?: string
}) {
  return (
    <div role="alert" className="panel flex min-h-40 flex-col items-center justify-center gap-3 border-alerta/60 text-center">
      <p className="text-lg font-bold text-alerta">{titulo}</p>
      <p className="text-texto-suave">{error.detalle}</p>
      {onReintentar && (
        <button type="button" className="boton-primario" onClick={onReintentar}>
          Reintentar
        </button>
      )}
    </div>
  )
}

/** Mensaje para combinaciones sin jugadas (la API las omite). */
export function SinDatos({ texto = 'Sin jugadas para estos filtros' }: { texto?: string }) {
  return <p className="text-sm font-semibold text-texto-suave">{texto}</p>
}

/** Etiqueta "muestra pequeña" si n está por debajo del umbral. */
export function MuestraPequena({ n }: { n: number }) {
  if (n >= MUESTRA_PEQUENA) return null
  return (
    <span className="rounded-full border border-dashed border-alerta px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-alerta">
      muestra pequeña
    </span>
  )
}

/** Envoltorio de sección con título. */
export function Seccion({ titulo, children, extra }: { titulo: string; children: ReactNode; extra?: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold">{titulo}</h2>
        {extra}
      </div>
      {children}
    </section>
  )
}
