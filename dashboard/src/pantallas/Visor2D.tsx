import { useEffect, useState, type FormEvent } from 'react'
import { getJugada, getJugadas } from '../api/cliente'
import type { Filtros, JugadaListada, RespuestaJugada } from '../api/tipos'
import { usePeticion } from '../api/usePeticion'
import { Cargando, ErrorPanel, SinDatos } from '../componentes/Estado'
import { chipDown, dec1, entero, NOMBRE_RESULTADO } from '../utilidades/formato'
import { cuadroPase } from '../utilidades/eventos'
import { Campo } from './visor/Campo'
import { FichaJugada } from './visor/FichaJugada'
import { ANCHO_CAMPO, LARGO_CAMPO, MARGEN } from './visor/geometria'
import { defensorMasCercano, Jugadores, LineaSeparacion } from './visor/Jugadores'
import { LineaTiempo } from './visor/LineaTiempo'
import { useReproductor } from './visor/useReproductor'

/** Máximo de filas en la lista; con más, se pide usar los filtros. */
const MAX_LISTA = 200

interface Seleccion {
  gameId: number
  playId: number
}

/** Entero positivo o null. */
function enteroPositivo(texto: string): number | null {
  const n = Number(texto.trim())
  return Number.isInteger(n) && n > 0 ? n : null
}

/** Columna izquierda: búsqueda manual y lista de api/jugadas con los filtros globales. */
function ListaJugadas({ filtros, seleccion, onElegir }: { filtros: Filtros; seleccion: Seleccion | null; onElegir: (s: Seleccion) => void }) {
  const lista = usePeticion(() => getJugadas(filtros), [JSON.stringify(filtros)])
  const [gameId, setGameId] = useState('')
  const [playId, setPlayId] = useState('')
  const [errorIds, setErrorIds] = useState<string | null>(null)

  const buscar = (e: FormEvent) => {
    e.preventDefault()
    const g = enteroPositivo(gameId)
    const p = enteroPositivo(playId)
    if (g === null || p === null) {
      setErrorIds('game_id y play_id deben ser enteros positivos')
      return
    }
    setErrorIds(null)
    onElegir({ gameId: g, playId: p })
  }

  const filas: JugadaListada[] = lista.estado.tipo === 'listo' ? lista.estado.datos : []

  return (
    <aside className="flex w-80 shrink-0 flex-col gap-3">
      <form onSubmit={buscar} className="panel flex flex-col gap-2 p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-texto-suave">Buscar por id</p>
        <div className="flex gap-2">
          <input aria-label="game_id" placeholder="game_id" inputMode="numeric" value={gameId} onChange={(e) => setGameId(e.target.value)}
            className="min-h-11 w-full rounded-xl border border-navy-700 bg-navy-900 px-3 tabular-nums focus:border-acento focus:outline-none" />
          <input aria-label="play_id" placeholder="play_id" inputMode="numeric" value={playId} onChange={(e) => setPlayId(e.target.value)}
            className="min-h-11 w-28 rounded-xl border border-navy-700 bg-navy-900 px-3 tabular-nums focus:border-acento focus:outline-none" />
        </div>
        <button type="submit" className="boton-primario">Cargar jugada</button>
        {errorIds && <p className="text-sm font-semibold text-alerta">{errorIds}</p>}
      </form>

      <div className="panel flex min-h-0 flex-1 flex-col gap-2 p-3">
        <p className="px-1 text-xs font-bold uppercase tracking-widest text-texto-suave">Jugadas con los filtros</p>
        {lista.estado.tipo === 'cargando' && <p className="px-1 text-sm text-texto-suave">Cargando…</p>}
        {lista.estado.tipo === 'error' && (
          lista.estado.error.estado === 422
            ? <p className="px-1 text-sm font-semibold text-alerta">{lista.estado.error.detalle}</p>
            : <ErrorPanel titulo="No se pudo cargar la lista" error={lista.estado.error} onReintentar={lista.reintentar} />
        )}
        {lista.estado.tipo === 'listo' && filas.length === 0 && <div className="px-1"><SinDatos /></div>}
        {filas.length > MAX_LISTA && (
          <p className="px-1 text-xs text-alerta">Mostrando {MAX_LISTA} de {entero(filas.length)}; usa los filtros para acotar.</p>
        )}
        <ul className="flex max-h-[34rem] flex-col gap-1 overflow-y-auto pr-1">
          {filas.slice(0, MAX_LISTA).map((j) => {
            const activa = seleccion?.gameId === j.game_id && seleccion?.playId === j.play_id
            return (
              <li key={`${j.game_id}-${j.play_id}`}>
                <button type="button" onClick={() => onElegir({ gameId: j.game_id, playId: j.play_id })}
                  className={`flex w-full flex-col gap-1 rounded-xl px-3 py-2 text-left transition-colors ${activa ? 'bg-acento/15 ring-1 ring-acento' : 'hover:bg-navy-700'}`}>
                  <span className="flex items-center gap-2 text-sm font-bold">
                    <span className="text-acento">{chipDown(j.down, j.yardas_por_avanzar)}</span>
                    <span className="text-texto-suave">·</span>
                    <span>{NOMBRE_RESULTADO[j.resultado_pase] ?? j.resultado_pase}</span>
                    <span className="ml-auto text-[11px] font-normal tabular-nums text-texto-suave">{j.game_id}-{j.play_id}</span>
                  </span>
                  <span className="line-clamp-2 text-xs text-texto-suave">{j.descripcion}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </aside>
  )
}

/** Campo + reproducción de una jugada cargada. */
function Reproduccion({ jugada }: { jugada: RespuestaJugada }) {
  const llave = `${jugada.game_id}-${jugada.play_id}`
  const r = useReproductor(jugada.frames.length, jugada.frames_por_segundo, llave)
  const cuadro = jugada.frames[r.indice]
  const framePase = cuadroPase(jugada.eventos)
  const receptor = jugada.receptor_objetivo
  const enPase = framePase !== null && cuadro?.frame_id === framePase
  const guia = enPase && receptor ? defensorMasCercano(cuadro.jugadores, receptor.nfl_id) : null
  const indicePase = framePase === null ? -1 : jugada.frames.findIndex((f) => f.frame_id === framePase)

  // Teclado: ← → mueven un cuadro, espacio reproduce o pausa (sin interferir con los inputs).
  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      const destino = e.target as HTMLElement
      if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(destino.tagName)) return
      if (e.key === 'ArrowRight') r.paso(1)
      else if (e.key === 'ArrowLeft') r.paso(-1)
      else if (e.key === ' ') {
        e.preventDefault()
        r.alternar()
      } else return
    }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [r])

  return (
    <div className="flex flex-col gap-4">
      <FichaJugada j={jugada} />
      <div className="panel p-3">
        <svg
          viewBox={`${-MARGEN} ${-MARGEN} ${LARGO_CAMPO + MARGEN * 2} ${ANCHO_CAMPO + MARGEN * 2}`}
          className="w-full rounded-xl bg-navy-900"
          role="img"
          aria-label={`Jugada ${llave}, cuadro ${cuadro?.frame_id ?? ''}`}
        >
          <Campo />
          {guia && <LineaSeparacion receptor={guia.receptor} defensor={guia.defensor} />}
          {cuadro && <Jugadores jugadores={cuadro.jugadores} receptorId={receptor?.nfl_id ?? null} />}
        </svg>
        <div className="mt-2 flex flex-wrap items-center gap-4 px-2 text-xs text-texto-suave">
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-acento" /> Ofensiva {jugada.ofensiva}</span>
          <span className="flex items-center gap-1"><span className="h-0 w-0 border-x-[6px] border-b-[10px] border-x-transparent border-b-defensa" /> Defensiva {jugada.defensiva}</span>
          <span className="flex items-center gap-1"><span className="h-2 w-3 rounded-full bg-balon" /> Balón</span>
          <span className="ml-auto">Ataque hacia la derecha (coordenadas normalizadas por el backend)</span>
        </div>
      </div>

      <div className="panel">
        <LineaTiempo frames={jugada.frames} eventos={jugada.eventos} fps={jugada.frames_por_segundo} r={r} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="panel">
          <p className="text-xs font-bold uppercase tracking-widest text-texto-suave">Receptor objetivo</p>
          {receptor ? (
            <>
              <p className="mt-1 text-2xl font-extrabold">{receptor.nombre}</p>
              <p className="text-texto-suave">
                <span className="text-xl font-bold text-acento tabular-nums">{dec1(receptor.separacion_yd)} yd</span> de separación al lanzar el pase
              </p>
              {indicePase >= 0 && !enPase && (
                <button type="button" className="boton-secundario mt-3" onClick={() => r.irA(indicePase)}>
                  Ir al cuadro del pase
                </button>
              )}
              {enPase && <p className="mt-2 text-xs text-texto-suave">La línea punteada es solo una guía visual al defensor más cercano; la cifra es la de la API.</p>}
            </>
          ) : (
            <p className="mt-1 text-lg font-bold text-texto-suave">Receptor no identificado</p>
          )}
        </div>
        <div className="panel text-sm text-texto-suave">
          <p className="text-xs font-bold uppercase tracking-widest">Nota del tracking</p>
          <p className="mt-1">El tracking termina unos 0.5 s después del pase, así que la animación no muestra la atrapada. No es un error.</p>
          <p className="mt-2">Pasa el cursor sobre un jugador para ver nombre, dorsal, rol y velocidad. Teclas: ← → y espacio.</p>
        </div>
      </div>
    </div>
  )
}

export function PantallaVisor2D({ filtros }: { filtros: Filtros }) {
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null)
  const llave = seleccion ? `${seleccion.gameId}-${seleccion.playId}` : 'ninguna'
  const jugada = usePeticion<RespuestaJugada | null>(
    () => (seleccion ? getJugada(seleccion.gameId, seleccion.playId) : Promise.resolve(null)),
    [llave],
  )

  return (
    <div className="flex items-start gap-4">
      <ListaJugadas filtros={filtros} seleccion={seleccion} onElegir={setSeleccion} />
      <div className="min-w-0 flex-1">
        {!seleccion && (
          <div className="panel flex min-h-64 flex-col items-center justify-center gap-2 text-center">
            <p className="text-xl font-bold">Elige una jugada</p>
            <p className="text-texto-suave">Selecciónala en la lista o escribe su game_id y play_id.</p>
          </div>
        )}
        {seleccion && jugada.estado.tipo === 'cargando' && <Cargando mensaje="Cargando jugada" />}
        {seleccion && jugada.estado.tipo === 'error' && (
          <ErrorPanel
            titulo={jugada.estado.error.estado === 404 ? 'Jugada no encontrada' : 'No se pudo cargar la jugada'}
            error={jugada.estado.error}
            onReintentar={jugada.estado.error.estado === 404 ? undefined : jugada.reintentar}
          />
        )}
        {jugada.estado.tipo === 'listo' && jugada.estado.datos && <Reproduccion jugada={jugada.estado.datos} />}
      </div>
    </div>
  )
}
