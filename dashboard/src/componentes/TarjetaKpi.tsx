import type { ReactNode } from 'react'

/** Tarjeta de KPI: número grande con su contexto (n) debajo. */
export function TarjetaKpi({ titulo, valor, detalle, extra, acento = false }: {
  titulo: string
  valor: ReactNode
  detalle?: ReactNode
  extra?: ReactNode
  acento?: boolean
}) {
  return (
    <div className={`panel flex flex-col gap-1 ${acento ? 'border-acento/60' : ''}`}>
      <div className="flex items-center gap-2">
        <p className="text-xs font-bold uppercase tracking-widest text-texto-suave">{titulo}</p>
        {extra}
      </div>
      <p className={`kpi-valor ${acento ? 'text-acento' : ''}`}>{valor}</p>
      {detalle && <p className="text-sm text-texto-suave">{detalle}</p>}
    </div>
  )
}
