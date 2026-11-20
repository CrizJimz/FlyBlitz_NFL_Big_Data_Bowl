import type { Cuadro, EventoJugada } from '../../api/tipos'
import { etiquetaEvento, primerCuadroPorEvento, tieneSnap } from '../../utilidades/eventos'
import type { Reproductor } from './useReproductor'

/** Controles de reproducción + barra con los eventos marcados en su primer cuadro. */
export function LineaTiempo({ frames, eventos, fps, r }: { frames: Cuadro[]; eventos: EventoJugada[]; fps: number; r: Reproductor }) {
  const total = frames.length
  const actual = frames[r.indice]
  const marcas = primerCuadroPorEvento(eventos)
  const posicion = (frameId: number) => {
    const i = frames.findIndex((f) => f.frame_id === frameId)
    return total > 1 ? (Math.max(0, i) / (total - 1)) * 100 : 0
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button type="button" className="boton-secundario" onClick={() => r.irA(0)} aria-label="Ir al inicio" title="Inicio">⏮</button>
        <button type="button" className="boton-secundario" onClick={() => r.paso(-1)} aria-label="Cuadro anterior" title="Cuadro anterior (←)">◀</button>
        <button type="button" className="boton-primario min-w-28" onClick={r.alternar} title="Reproducir o pausar (espacio)">
          {r.reproduciendo ? '❚❚ Pausa' : '▶ Play'}
        </button>
        <button type="button" className="boton-secundario" onClick={() => r.paso(1)} aria-label="Cuadro siguiente" title="Cuadro siguiente (→)">▶</button>
        <button type="button" className="boton-secundario" onClick={() => r.irA(total - 1)} aria-label="Ir al final" title="Final">⏭</button>
        <span className="ml-auto text-sm font-semibold tabular-nums text-texto-suave">
          Cuadro {actual?.frame_id ?? '—'} / {frames[total - 1]?.frame_id ?? '—'} · {fps} cuadros/s
        </span>
      </div>

      <div className="relative pb-8 pt-1">
        <input
          type="range"
          min={0}
          max={Math.max(0, total - 1)}
          value={r.indice}
          onChange={(e) => r.irA(Number(e.target.value))}
          aria-label="Cuadro de la jugada"
          className="h-11 w-full cursor-pointer accent-acento"
        />
        {marcas.map((m, i) => (
          <button
            key={m.evento}
            type="button"
            onClick={() => r.irA(frames.findIndex((f) => f.frame_id === m.frame_id))}
            title={`${m.evento} · cuadro ${m.frame_id}`}
            className="absolute -translate-x-1/2 whitespace-nowrap rounded-md bg-navy-700 px-1.5 py-0.5 text-[11px] font-bold text-texto hover:bg-acento hover:text-navy-950"
            style={{ left: `${posicion(m.frame_id)}%`, top: i % 2 === 0 ? '2.6rem' : '4rem' }}
          >
            {etiquetaEvento(m.evento)}
          </button>
        ))}
      </div>

      {!tieneSnap(eventos) && (
        <p className="mt-6 rounded-xl border border-alerta bg-alerta/10 px-4 py-2 text-sm font-semibold text-alerta">
          Sin snap registrado: esta jugada no trae ball_snap ni autoevent_ballsnap. No se supone ningún cuadro como snap.
        </p>
      )}
    </div>
  )
}
