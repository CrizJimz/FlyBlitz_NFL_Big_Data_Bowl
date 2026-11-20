import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { RespuestaAnalisis } from '../api/tipos'
import { MuestraPequena, SinDatos } from '../componentes/Estado'
import { TarjetaKpi } from '../componentes/TarjetaKpi'
import { dec1, entero, NOMBRE_RESULTADO } from '../utilidades/formato'

/** Texto del momento de medición a partir del valor de la API (no fijo). */
export function etiquetaMomento(momento: string): string {
  const mapa: Record<string, string> = { pass_forward: 'al lanzar el pase', pass_arrived: 'al llegar el pase' }
  return mapa[momento] ?? momento
}

export function PantallaSeparacion({ datos }: { datos: RespuestaAnalisis }) {
  const s = datos.separacion
  const filas = s.por_resultado.filter((f) => f.n > 0)
  const grafica = filas.map((f) => ({ resultado: NOMBRE_RESULTADO[f.resultado_pase] ?? f.resultado_pase, separacion: Number(f.separacion_promedio_yd.toFixed(2)) }))

  return (
    <div className="flex flex-col gap-6">
      <p className="text-texto-suave">
        Distancia del receptor objetivo al defensor más cercano, medida <b className="text-texto">{etiquetaMomento(s.momento)}</b>.
        n = {entero(s.n)} pases · {entero(s.n_sin_receptor_identificado)} sin receptor identificado (la descripción no nombra un receptor reconocible).
      </p>
      {filas.length === 0 ? (
        <div className="panel"><SinDatos /></div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            {filas.map((f) => (
              <TarjetaKpi
                key={f.resultado_pase}
                titulo={NOMBRE_RESULTADO[f.resultado_pase] ?? f.resultado_pase}
                valor={`${dec1(f.separacion_promedio_yd)} yd`}
                detalle={`mediana ${dec1(f.separacion_mediana_yd)} yd · receptor ${dec1(f.vel_receptor_promedio)} yd/s · defensor ${dec1(f.vel_defensor_promedio)} yd/s · n = ${entero(f.n)}`}
                extra={<MuestraPequena n={f.n} />}
                acento={f.resultado_pase === 'C'}
              />
            ))}
          </div>
          <div className="panel">
            <h2 className="mb-4 text-lg font-bold">Separación promedio por resultado (yd)</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={grafica} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid stroke="#22365F" strokeDasharray="3 3" />
                <XAxis dataKey="resultado" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" />
                <Tooltip contentStyle={{ background: '#111D35', border: '1px solid #22365F', color: '#E6EDF7' }} />
                <Bar dataKey="separacion" name="Separación (yd)" fill="#00A3FF" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}
