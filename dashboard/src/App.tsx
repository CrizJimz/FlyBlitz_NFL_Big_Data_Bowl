import { useEffect, useState } from 'react'
import { BarraLateral } from './componentes/BarraLateral'
import { BarraSuperior } from './componentes/BarraSuperior'
import { MarcoTablet } from './componentes/MarcoTablet'
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

export default function App() {
  const [seccion, cambiarSeccion] = useSeccionHash()
  const actual = SECCIONES.find((s) => s.id === seccion)!

  return (
    <MarcoTablet>
      <BarraSuperior />
      <div className="flex min-h-0 flex-1">
        <BarraLateral activa={seccion} onCambiar={cambiarSeccion} />
        <main className="min-w-0 flex-1 overflow-y-auto p-6">
          <h1 className="text-3xl font-extrabold">{actual.etiqueta}</h1>
          <p className="mt-1 text-texto-suave">{actual.descripcion}</p>
          {!actual.lista && (
            <div className="panel mt-6 flex min-h-64 flex-col items-center justify-center gap-2 text-center">
              <p className="text-xl font-bold">Próximamente</p>
              <p className="text-texto-suave">Esta pantalla corresponde a la fase {actual.fase} del plan.</p>
            </div>
          )}
        </main>
      </div>
    </MarcoTablet>
  )
}
