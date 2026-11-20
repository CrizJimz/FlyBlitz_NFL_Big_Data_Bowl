import { useEffect, useState } from 'react'
import { getAnalisis, getFiltros } from './api/cliente'
import { FILTROS_VACIOS, type Filtros, type RespuestaAnalisis, type RespuestaFiltros } from './api/tipos'
import { usePeticion, type ResultadoPeticion } from './api/usePeticion'
import { AvisoMock } from './componentes/AvisoMock'
import { BarraLateral } from './componentes/BarraLateral'
import { BarraSuperior } from './componentes/BarraSuperior'
import { ChipsFiltrosAplicados } from './componentes/ChipsFiltrosAplicados'
import { ErrorBoundary } from './componentes/ErrorBoundary'
import { Cargando, ErrorPanel } from './componentes/Estado'
import { MarcoTablet } from './componentes/MarcoTablet'
import { PanelFiltros } from './componentes/PanelFiltros'
import { datosVisibles, VistaAnalisis } from './componentes/VistaAnalisis'
import { PantallaSuccessRate } from './pantallas/SuccessRate'
import { PantallaVisor2D } from './pantallas/Visor2D'
import { SECCIONES, seccionDesdeHash, type Seccion } from './secciones'

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

/** Pantalla de una sección. Las de fase 2 sin terminar muestran "Próximamente". */
function ContenidoSeccion({ seccion, opciones, analisis, filtros }: {
  seccion: Seccion
  /** null si api/filtros falló: las pantallas siguen funcionando sin las etiquetas de rango. */
  opciones: RespuestaFiltros | null
  analisis: ResultadoPeticion<RespuestaAnalisis>
  filtros: Filtros
}) {
  const def = SECCIONES.find((s) => s.id === seccion)!
  // El visor no depende de api/analisis: funciona aunque esté en 503 (precálculo).
  if (seccion === 'visor') return <PantallaVisor2D filtros={filtros} />
  if (seccion === 'success-rate') {
    return (
      <VistaAnalisis resultado={analisis}>
        {(d) => <PantallaSuccessRate datos={d} rangos={opciones?.rangos_distancia ?? null} />}
      </VistaAnalisis>
    )
  }
  return (
    <div className="panel flex min-h-48 flex-col items-center justify-center gap-2 text-center">
      <p className="text-xl font-bold">Próximamente</p>
      <p className="text-texto-suave">Esta pantalla corresponde a la fase {def.fase} del plan.</p>
    </div>
  )
}

export default function App() {
  const [seccion, cambiarSeccion] = useSeccionHash()
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS)
  const actual = SECCIONES.find((s) => s.id === seccion)!

  // Una sola petición de filtros al arrancar y una de análisis por cambio de filtros.
  const opciones = usePeticion(() => getFiltros(), [])
  const analisis = usePeticion(() => getAnalisis(filtros), [JSON.stringify(filtros)])

  const visibles = datosVisibles(analisis)
  const error422 = analisis.estado.tipo === 'error' && analisis.estado.error.estado === 422 ? analisis.estado.error.detalle : null

  return (
    <MarcoTablet>
      <BarraSuperior>
        <ChipsFiltrosAplicados aplicados={visibles?.filtros_aplicados ?? null} />
        <AvisoMock />
      </BarraSuperior>
      <div className="flex min-h-0 flex-1">
        <BarraLateral activa={seccion} onCambiar={cambiarSeccion} />
        <main className="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto p-6">
          <div>
            <h1 className="text-3xl font-extrabold">{actual.etiqueta}</h1>
            <p className="mt-1 text-texto-suave">{actual.descripcion}</p>
          </div>

          {opciones.estado.tipo === 'cargando' && <Cargando mensaje="Cargando filtros" />}
          {opciones.estado.tipo === 'error' && (
            <ErrorPanel titulo="No se pudieron cargar los filtros" error={opciones.estado.error} onReintentar={opciones.reintentar} />
          )}
          {opciones.estado.tipo === 'listo' && (
            <PanelFiltros opciones={opciones.estado.datos} filtros={filtros} onCambiar={setFiltros} errorValidacion={error422} />
          )}
          {/* El análisis se muestra aunque api/filtros falle (sin filtros aplicados). */}
          <ErrorBoundary llave={seccion}>
            <ContenidoSeccion
              seccion={seccion}
              opciones={opciones.estado.tipo === 'listo' ? opciones.estado.datos : null}
              analisis={analisis}
              filtros={filtros}
            />
          </ErrorBoundary>
        </main>
      </div>
    </MarcoTablet>
  )
}
