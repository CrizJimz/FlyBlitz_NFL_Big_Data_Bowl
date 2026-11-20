import type { ClaveDistancia, Filtros, RangoDistancia, RespuestaFiltros } from '../api/tipos'
import { FILTROS_VACIOS } from '../api/tipos'
import { ordinalDown } from '../utilidades/formato'

interface Props {
  opciones: RespuestaFiltros
  filtros: Filtros
  onCambiar: (f: Filtros) => void
  /** `detail` de un 422 de la API, mostrado junto a los filtros. */
  errorValidacion?: string | null
}

const NOMBRE_RANGO: Record<ClaveDistancia, string> = { corta: 'Corta', media: 'Media', larga: 'Larga' }

/** "Corta (1-3)" o "Larga (8+)" cuando max es null. */
export function etiquetaRango(r: RangoDistancia): string {
  const nombre = NOMBRE_RANGO[r.clave] ?? r.clave
  return r.max === null ? `${nombre} (${r.min}+)` : `${nombre} (${r.min}-${r.max})`
}

/** Grupo de chips táctiles con opción "Todos". */
function GrupoChips<T extends string | number>({ titulo, valor, opciones, etiqueta, onCambiar, textoTodos = 'Todos' }: {
  titulo: string
  valor: T | null
  opciones: T[]
  etiqueta: (v: T) => string
  onCambiar: (v: T | null) => void
  textoTodos?: string
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-xs font-bold uppercase tracking-widest text-texto-suave">{titulo}</legend>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={valor === null ? 'chip-activo' : 'chip'} aria-pressed={valor === null} onClick={() => onCambiar(null)}>
          {textoTodos}
        </button>
        {opciones.map((o) => (
          <button key={String(o)} type="button" className={valor === o ? 'chip-activo' : 'chip'} aria-pressed={valor === o} onClick={() => onCambiar(o)}>
            {etiqueta(o)}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

/** Selector grande de equipo (32 opciones no caben como chips). */
function SelectorEquipo({ titulo, valor, equipos, onCambiar }: {
  titulo: string
  valor: string | null
  equipos: string[]
  onCambiar: (v: string | null) => void
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-bold uppercase tracking-widest text-texto-suave">{titulo}</span>
      <select
        className="min-h-11 rounded-xl border border-navy-700 bg-navy-900 px-3 font-semibold text-texto focus:border-acento focus:outline-none"
        value={valor ?? ''}
        onChange={(e) => onCambiar(e.target.value === '' ? null : e.target.value)}
      >
        <option value="">Todos</option>
        {equipos.map((e) => (
          <option key={e} value={e}>
            {e}
          </option>
        ))}
      </select>
    </label>
  )
}

/** Panel de filtros globales. Las opciones salen solo de api/filtros. */
export function PanelFiltros({ opciones, filtros, onCambiar, errorValidacion }: Props) {
  const cambiar = <K extends keyof Filtros>(clave: K, valor: Filtros[K]) => onCambiar({ ...filtros, [clave]: valor })
  const hayFiltros = Object.values(filtros).some((v) => v !== null)
  const rangos = new Map(opciones.rangos_distancia.map((r) => [r.clave, r]))

  return (
    <div className="panel flex flex-col gap-4">
      <div className="grid grid-cols-[repeat(2,minmax(9rem,12rem))_1fr] items-start gap-4">
        <SelectorEquipo titulo="Ofensiva" valor={filtros.ofensiva} equipos={opciones.equipos} onCambiar={(v) => cambiar('ofensiva', v)} />
        <SelectorEquipo titulo="Defensiva" valor={filtros.defensiva} equipos={opciones.equipos} onCambiar={(v) => cambiar('defensiva', v)} />
        <GrupoChips titulo="Semana" valor={filtros.semana} opciones={opciones.semanas} etiqueta={(s) => `S${s}`} onCambiar={(v) => cambiar('semana', v)} textoTodos="Todas" />
      </div>
      <div className="flex flex-wrap items-end gap-6">
        <GrupoChips titulo="Down" valor={filtros.down} opciones={opciones.downs} etiqueta={ordinalDown} onCambiar={(v) => cambiar('down', v)} />
        <GrupoChips
          titulo="Distancia"
          valor={filtros.distancia}
          opciones={opciones.rangos_distancia.map((r) => r.clave)}
          etiqueta={(c) => etiquetaRango(rangos.get(c)!)}
          onCambiar={(v) => cambiar('distancia', v)}
          textoTodos="Todas"
        />
        <button type="button" className="boton-secundario ml-auto" disabled={!hayFiltros} onClick={() => onCambiar(FILTROS_VACIOS)}>
          Limpiar filtros
        </button>
      </div>
      {errorValidacion && (
        <p role="alert" className="rounded-xl border border-alerta bg-alerta/10 px-4 py-2 text-sm font-semibold text-alerta">
          Filtro no válido: {errorValidacion}. Se muestran los últimos datos válidos.
        </p>
      )}
    </div>
  )
}
