import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { FilaCobertura, ResultadoPase, RespuestaAnalisis } from '../api/tipos'
import { MuestraPequena, SinDatos } from '../componentes/Estado'
import { TarjetaKpi } from '../componentes/TarjetaKpi'
import { dec1, entero, NOMBRE_RESULTADO, pct } from '../utilidades/formato'

const RESULTADOS: ResultadoPase[] = ['C', 'I', 'S', 'R', 'IN']
const COLOR: Record<ResultadoPase, string> = { C: '#00A3FF', I: '#94A3B8', S: '#F43F5E', R: '#FACC15', IN: '#FF8A00' }

interface Agregado {
  tipo: string
  n: number
  success_rate: number
  yardas_promedio: number
  resultado_pase: Record<ResultadoPase, number>
}

/** Suma los conteos y pondera tasas y promedios por n (los filtros globales ya recortan down y distancia). */
function agregar(filas: FilaCobertura[]): Agregado[] {
  const grupos = new Map<string, FilaCobertura[]>()
  for (const f of filas) grupos.set(f.tipo_cobertura, [...(grupos.get(f.tipo_cobertura) ?? []), f])
  return [...grupos.entries()].map(([tipo, fs]) => {
    const n = fs.reduce((s, f) => s + f.n, 0)
    const resultado = Object.fromEntries(RESULTADOS.map((r) => [r, fs.reduce((s, f) => s + (f.resultado_pase[r] ?? 0), 0)])) as Record<ResultadoPase, number>
    return {
      tipo,
      n,
      success_rate: fs.reduce((s, f) => s + f.success_rate * f.n, 0) / n,
      yardas_promedio: fs.reduce((s, f) => s + f.yardas_promedio * f.n, 0) / n,
      resultado_pase: resultado,
    }
  })
}

export function PantallaCoberturas({ datos }: { datos: RespuestaAnalisis }) {
  const grupos = agregar(datos.coberturas.filter((f) => f.n > 0))
  if (grupos.length === 0) return <div className="panel"><SinDatos /></div>

  const grafica = grupos.map((g) => ({ tipo: g.tipo, ...Object.fromEntries(RESULTADOS.map((r) => [NOMBRE_RESULTADO[r], g.resultado_pase[r]])) }))

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-texto-suave">Usa los filtros de down y distancia para comparar coberturas en una situación concreta. Tasas y yardas ponderadas por n.</p>
      <div className="grid grid-cols-3 gap-4">
        {grupos.map((g) => (
          <TarjetaKpi
            key={g.tipo}
            titulo={g.tipo}
            valor={pct(g.success_rate)}
            detalle={`Success Rate · ${dec1(g.yardas_promedio)} yd promedio · n = ${entero(g.n)}`}
            extra={<MuestraPequena n={g.n} />}
          />
        ))}
      </div>
      <div className="panel">
        <h2 className="mb-4 text-lg font-bold">Resultado del pase por tipo de cobertura</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={grafica} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid stroke="#22365F" strokeDasharray="3 3" />
            <XAxis dataKey="tipo" stroke="#94A3B8" />
            <YAxis stroke="#94A3B8" allowDecimals={false} />
            <Tooltip contentStyle={{ background: '#111D35', border: '1px solid #22365F', color: '#E6EDF7' }} />
            <Legend />
            {RESULTADOS.map((r) => (
              <Bar key={r} dataKey={NOMBRE_RESULTADO[r]} stackId="r" fill={COLOR[r]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
