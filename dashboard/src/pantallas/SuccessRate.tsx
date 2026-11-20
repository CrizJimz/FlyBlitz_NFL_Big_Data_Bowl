import type { CeldaSuccess, ClaveDistancia, RangoDistancia, RespuestaAnalisis } from '../api/tipos'
import { MuestraPequena } from '../componentes/Estado'
import { etiquetaRango } from '../componentes/PanelFiltros'
import { TarjetaKpi } from '../componentes/TarjetaKpi'
import { entero, MUESTRA_PEQUENA, ordinalDown, pct } from '../utilidades/formato'

const DOWNS = [1, 2, 3, 4]

/** Escala de 5 pasos para el mapa de calor (0-20, 20-40, 40-60, 60-80, 80-100 %). */
const ESCALA = [
  { desde: 0, clase: 'bg-navy-700 text-texto', etiqueta: '0-20%' },
  { desde: 0.2, clase: 'bg-acento/25 text-texto', etiqueta: '20-40%' },
  { desde: 0.4, clase: 'bg-acento/45 text-texto', etiqueta: '40-60%' },
  { desde: 0.6, clase: 'bg-acento/75 text-navy-950', etiqueta: '60-80%' },
  { desde: 0.8, clase: 'bg-acento text-navy-950', etiqueta: '80-100%' },
]

function claseTasa(tasa: number): string {
  let clase = ESCALA[0].clase
  for (const paso of ESCALA) if (tasa >= paso.desde) clase = paso.clase
  return clase
}

/** Una celda del mapa: porcentaje y n, o "Sin jugadas" si la API omitió la combinación. */
function Celda({ celda }: { celda: CeldaSuccess | undefined }) {
  if (!celda || celda.n === 0) {
    return (
      <div className="flex min-h-24 items-center justify-center rounded-xl border border-dashed border-navy-700 text-sm font-semibold text-texto-suave">
        Sin jugadas
      </div>
    )
  }
  const pequena = celda.n < MUESTRA_PEQUENA
  return (
    <div
      className={`flex min-h-24 flex-col items-center justify-center gap-1 rounded-xl ${claseTasa(celda.tasa)} ${pequena ? 'border-2 border-dashed border-alerta' : ''}`}
      title={`${entero(celda.exitosas)} exitosas de ${entero(celda.n)} jugadas`}
    >
      <span className="text-2xl font-extrabold tabular-nums">{pct(celda.tasa)}</span>
      <span className="text-xs font-semibold tabular-nums opacity-90">n = {entero(celda.n)}</span>
      {pequena && <span className="text-[11px] font-bold uppercase">muestra pequeña</span>}
    </div>
  )
}

/** Columnas si api/filtros no respondió: mismas claves del contrato, sin límites. */
const COLUMNAS_SIN_RANGOS: { clave: ClaveDistancia; etiqueta: string }[] = [
  { clave: 'corta', etiqueta: 'Corta' },
  { clave: 'media', etiqueta: 'Media' },
  { clave: 'larga', etiqueta: 'Larga' },
]

export function PantallaSuccessRate({ datos, rangos }: { datos: RespuestaAnalisis; rangos: RangoDistancia[] | null }) {
  const { global, por_down_distancia } = datos.success_rate
  const celdas = new Map(por_down_distancia.map((c) => [`${c.down}-${c.distancia}`, c]))
  const columnas = rangos ? rangos.map((r) => ({ clave: r.clave, etiqueta: etiquetaRango(r) })) : COLUMNAS_SIN_RANGOS

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-4">
        <TarjetaKpi
          titulo="Success Rate global"
          acento
          valor={global.n > 0 ? pct(global.tasa) : '—'}
          detalle={global.n > 0 ? `${entero(global.exitosas)} exitosas de ${entero(global.n)} jugadas` : 'Sin jugadas para estos filtros'}
          extra={<MuestraPequena n={global.n} />}
        />
        <TarjetaKpi titulo="Jugadas" valor={entero(datos.n_jugadas)} detalle="dropbacks con los filtros actuales" />
        <TarjetaKpi titulo="Excluidas" valor={entero(datos.n_excluidas_down_0)} detalle="conversiones de 2 puntos (down 0), fuera de las métricas por down" />
      </div>

      <div className="panel">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Por down y distancia</h2>
          <ul className="flex items-center gap-2 text-xs text-texto-suave" aria-label="Escala de colores">
            {ESCALA.map((p) => (
              <li key={p.etiqueta} className="flex items-center gap-1">
                <span className={`h-4 w-6 rounded ${p.clase}`} aria-hidden />
                {p.etiqueta}
              </li>
            ))}
          </ul>
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns: `6rem repeat(${columnas.length}, minmax(0, 1fr))` }}>
          <div />
          {columnas.map((c) => (
            <div key={c.clave} className="text-center text-sm font-bold uppercase tracking-wide text-texto-suave">
              {c.etiqueta}
            </div>
          ))}
          {DOWNS.map((down) => (
            <div key={down} className="contents">
              <div className="flex items-center">
                <span className="chip-activo">{ordinalDown(down)}</span>
              </div>
              {columnas.map((c) => (
                <Celda key={c.clave} celda={celdas.get(`${down}-${c.clave}`)} />
              ))}
            </div>
          ))}
        </div>
      </div>

      <details className="panel">
        <summary className="cursor-pointer font-bold">¿Cómo se calcula el Success Rate?</summary>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-texto-suave">
          <li>Una jugada es exitosa si las yardas sin castigo (`prePenaltyPlayResult`) alcanzan el 40% de las yardas por avanzar en 1er down, el 60% en 2do y el 100% en 3er y 4to.</li>
          <li>Las intercepciones (IN) siempre cuentan como fracaso.</li>
          <li>Las conversiones de 2 puntos (down 0) se excluyen y se reportan aparte.</li>
          <li>Es una convención analítica del equipo, no un dato del dataset. Cada porcentaje va con su n; con n &lt; {MUESTRA_PEQUENA} se marca como muestra pequeña.</li>
        </ul>
      </details>
    </div>
  )
}
