import type { RespuestaJugada } from '../../api/tipos'
import { chipDown, NOMBRE_RESULTADO } from '../../utilidades/formato'

/** Ficha de la jugada: situación, equipos, resultado y cobertura. */
export function FichaJugada({ j }: { j: RespuestaJugada }) {
  const datos: [string, string][] = [
    ['Equipos', `${j.ofensiva} vs ${j.defensiva}`],
    ['Semana', String(j.semana)],
    ['Resultado', `${NOMBRE_RESULTADO[j.resultado_pase] ?? j.resultado_pase} · ${j.resultado_yardas >= 0 ? '+' : ''}${j.resultado_yardas} yd`],
    ['Cobertura', `${j.cobertura} (${j.tipo_cobertura})`],
    ['Play action', j.play_action ? 'Sí' : 'No'],
  ]
  return (
    <div className="panel flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="chip-activo text-lg">{chipDown(j.down, j.yardas_por_avanzar)}</span>
        {datos.map(([k, v]) => (
          <span key={k} className="chip">
            <span className="text-texto-suave">{k}:</span> {v}
          </span>
        ))}
        <span className="ml-auto text-xs tabular-nums text-texto-suave">
          {j.game_id} · {j.play_id}
        </span>
      </div>
      <p className="text-sm text-texto-suave">{j.descripcion}</p>
    </div>
  )
}
