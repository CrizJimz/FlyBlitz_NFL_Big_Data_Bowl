import { SECCIONES, type Seccion } from '../secciones'
import { IconoSeccion } from './iconos'

interface Props {
  activa: Seccion
  onCambiar: (s: Seccion) => void
}

/** Barra lateral con una entrada grande por pantalla. La activa se resalta con el acento. */
export function BarraLateral({ activa, onCambiar }: Props) {
  return (
    <nav aria-label="Secciones" className="flex w-60 shrink-0 flex-col gap-2 border-r border-navy-700 bg-navy-900 p-3">
      {SECCIONES.map((s) => {
        const esActiva = s.id === activa
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onCambiar(s.id)}
            aria-current={esActiva ? 'page' : undefined}
            className={`flex min-h-14 items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-acento ${
              esActiva
                ? 'bg-acento/15 text-acento ring-1 ring-acento'
                : 'text-texto-suave hover:bg-navy-800 hover:text-texto'
            }`}
          >
            <IconoSeccion seccion={s.id} />
            <span className="flex flex-col">
              <span className="font-bold">{s.etiqueta}</span>
              <span className="text-xs">{s.lista ? s.descripcion : 'Próximamente'}</span>
            </span>
          </button>
        )
      })}
    </nav>
  )
}
