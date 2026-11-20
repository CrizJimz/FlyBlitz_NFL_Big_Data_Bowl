import type { RespuestaAnalisis } from '../api/tipos'
import { MuestraPequena, SinDatos } from '../componentes/Estado'
import { TarjetaKpi } from '../componentes/TarjetaKpi'
import { dec1, entero, pct } from '../utilidades/formato'

export function PantallaBolsillo({ datos }: { datos: RespuestaAnalisis }) {
  const b = datos.bolsillo
  const suma = b.n_con_pase + b.n_sin_pase + b.n_sin_snap
  const cuadra = suma === datos.n_jugadas
  const partes = [
    { etiqueta: 'Con pase', n: b.n_con_pase, clase: 'bg-acento', ayuda: 'C, I o IN con evento de pase' },
    { etiqueta: 'Sin pase', n: b.n_sin_pase, clase: 'bg-defensa', ayuda: 'sacks, scrambles y pases sin evento' },
    { etiqueta: 'Sin snap', n: b.n_sin_snap, clase: 'bg-alerta', ayuda: 'sin snap registrado; fuera del tiempo' },
  ]
  const grupo = (pa: boolean, pr: boolean) => b.por_grupo.find((g) => g.play_action === pa && g.presion === pr)

  return (
    <div className="flex flex-col gap-6">
      {!cuadra && (
        <p role="alert" className="rounded-xl border border-alerta bg-alerta/10 px-4 py-2 font-semibold text-alerta">
          La suma no cuadra: con pase + sin pase + sin snap = {entero(suma)}, pero n_jugadas = {entero(datos.n_jugadas)}.
        </p>
      )}
      <div className="panel">
        <h2 className="mb-3 text-lg font-bold">Jugadas por tipo ({entero(datos.n_jugadas)})</h2>
        <div className="flex h-10 overflow-hidden rounded-xl">
          {partes.map((p) =>
            p.n > 0 ? <div key={p.etiqueta} className={p.clase} style={{ width: `${(p.n / Math.max(1, suma)) * 100}%` }} title={`${p.etiqueta}: ${entero(p.n)}`} /> : null,
          )}
        </div>
        <div className="mt-3 grid grid-cols-4 gap-4 text-sm">
          {partes.map((p) => (
            <div key={p.etiqueta} className="flex gap-2">
              <span className={`mt-1 h-3 w-3 shrink-0 rounded ${p.clase}`} />
              <span><b>{p.etiqueta}: {entero(p.n)}</b><br /><span className="text-texto-suave">{p.ayuda}</span></span>
            </div>
          ))}
          <div className="text-texto-suave">Con respaldo autoevent: <b className="text-texto">{entero(b.n_con_respaldo_autoevent)}</b></div>
        </div>
      </div>

      <div className="panel">
        <h2 className="mb-1 text-lg font-bold">Tiempo del snap al pase</h2>
        <p className="mb-4 text-sm text-texto-suave">Presión = algún defensor con hit, hurry o sack de PFF. Play action según PFF.</p>
        <div className="grid grid-cols-[8rem_1fr_1fr] gap-3">
          <div />
          <div className="text-center text-sm font-bold uppercase text-texto-suave">Sin presión</div>
          <div className="text-center text-sm font-bold uppercase text-texto-suave">Con presión</div>
          {[false, true].map((pa) => (
            <div key={String(pa)} className="contents">
              <div className="flex items-center"><span className="chip-activo">{pa ? 'Play action' : 'Sin PA'}</span></div>
              {[false, true].map((pr) => {
                const g = grupo(pa, pr)
                return (
                  <div key={String(pr)} className="rounded-xl border border-navy-700 bg-navy-900 p-4 text-center">
                    {g && g.n > 0 ? (
                      <>
                        <p className="text-3xl font-extrabold tabular-nums text-acento">{dec1(g.tiempo_promedio_s)} s</p>
                        <p className="text-sm text-texto-suave">mediana {dec1(g.tiempo_mediana_s)} s · SR {pct(g.success_rate)}</p>
                        <p className="text-xs text-texto-suave">n = {entero(g.n)} <MuestraPequena n={g.n} /></p>
                      </>
                    ) : (
                      <SinDatos texto="Sin jugadas" />
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <TarjetaKpi titulo="Con pase" valor={entero(b.n_con_pase)} detalle="base del tiempo de bolsillo" acento />
        <TarjetaKpi titulo="Sin pase" valor={entero(b.n_sin_pase)} detalle="S y R siempre van aquí" />
        <TarjetaKpi titulo="Sin snap" valor={entero(b.n_sin_snap)} detalle="excluidas del tiempo; nunca se supone el cuadro 1" />
      </div>
    </div>
  )
}
