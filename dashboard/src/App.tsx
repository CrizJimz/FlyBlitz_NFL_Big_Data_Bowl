import { useEffect, useState } from 'react'
import { getAnalisis, getFiltros } from './api/cliente'
import { FILTROS_VACIOS, type Filtros } from './api/tipos'
import { usePeticion } from './api/usePeticion'
import { AvisoMock } from './componentes/AvisoMock'
import { BarraLateral } from './componentes/BarraLateral'
import { BarraSuperior } from './componentes/BarraSuperior'
import { ErrorBoundary } from './componentes/ErrorBoundary'
import { Cargando, ErrorPanel } from './componentes/Estado'
import { MarcoTablet } from './componentes/MarcoTablet'
import { SECCIONES, seccionDesdeHash, type Seccion } from './secciones'
import { entero } from './utilidades/formato'

/** Sincroniza la sección activa con location.hash (relativo: funciona en la subruta de despliegue). */
function useSeccionHash(): [Seccion, (s: Seccion) => void] {
  const [seccion, setSeccion] = useState<Seccion>(() => seccionDesdeHash(window.location.hash))

  useEffect(() => {
    const alCambiar = () => setSeccion(seccionDesdeHash(window.location.hash))
    window.addEventListener('hashchange', alCambiar)
    return () => window.removeEventListener('hashchange', alCambiar)
  }, [])

  const cambiar = (s: Seccion) => {
    window.location.hash = s // dispara hashchange y deja historial para el botón de atrás
  }
  return [seccion, cambiar]
}

export default function App() {
  const [seccion, cambiarSeccion] = useSeccionHash()
  const [filtros] = useState<Filtros>(FILTROS_VACIOS)
  const actual = SECCIONES.find((s) => s.id === seccion)!

  // Una sola petición de filtros al arrancar y una de análisis por cambio de filtros.
  const opciones = usePeticion(() => getFiltros(), [])
  const analisis = usePeticion(() => getAnalisis(filtros), [JSON.stringify(filtros)])

  return (
    <MarcoTablet>
      <BarraSuperior>
        <AvisoMock />
      </BarraSuperior>
      <div className="flex min-h-0 flex-1">
        <BarraLateral activa={seccion} onCambiar={cambiarSeccion} />
        <main className="min-w-0 flex-1 overflow-y-auto p-6">
          <h1 className="text-3xl font-extrabold">{actual.etiqueta}</h1>
          <p className="mt-1 text-texto-suave">{actual.descripcion}</p>

          {/* Estado de la conexión (temporal hasta las pantallas de las tareas 3 a 6). */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            {opciones.estado.tipo === 'cargando' && <Cargando />}
            {opciones.estado.tipo === 'error' && (
              <ErrorPanel titulo="No se pudieron cargar los filtros" error={opciones.estado.error} onReintentar={opciones.reintentar} />
            )}
            {opciones.estado.tipo === 'listo' && (
              <div className="panel">
                <p className="text-sm font-semibold uppercase tracking-widest text-texto-suave">api/filtros</p>
                <p className="kpi-valor mt-2">{opciones.estado.datos.equipos.length}</p>
                <p className="text-texto-suave">
                  equipos · {opciones.estado.datos.semanas.length} semanas · {opciones.estado.datos.tipos_cobertura.join(', ')}
                </p>
              </div>
            )}

            {analisis.estado.tipo === 'cargando' && (
              <Cargando mensaje={analisis.estado.mensaje} reintentoEnS={analisis.estado.reintentoEnS} />
            )}
            {analisis.estado.tipo === 'error' && <ErrorPanel error={analisis.estado.error} onReintentar={analisis.reintentar} />}
            {analisis.estado.tipo === 'listo' && (
              <div className="panel">
                <p className="text-sm font-semibold uppercase tracking-widest text-texto-suave">api/analisis</p>
                <p className="kpi-valor mt-2">{entero(analisis.estado.datos.n_jugadas)}</p>
                <p className="text-texto-suave">jugadas analizadas</p>
              </div>
            )}
          </div>

          <ErrorBoundary llave={seccion}>
            {!actual.lista && (
              <div className="panel mt-6 flex min-h-48 flex-col items-center justify-center gap-2 text-center">
                <p className="text-xl font-bold">Próximamente</p>
                <p className="text-texto-suave">Esta pantalla corresponde a la fase {actual.fase} del plan.</p>
              </div>
            )}
          </ErrorBoundary>
        </main>
      </div>
    </MarcoTablet>
  )
}
