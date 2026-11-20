import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Cambiar esta llave reinicia el boundary (p. ej. al cambiar de sección). */
  llave?: string
}

interface Estado {
  error: Error | null
}

/** Aísla una pantalla: si falla al dibujarse, las demás secciones y la barra lateral siguen funcionando. */
export class ErrorBoundary extends Component<Props, Estado> {
  state: Estado = { error: null }

  static getDerivedStateFromError(error: Error): Estado {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error en la pantalla:', error, info.componentStack)
  }

  componentDidUpdate(previas: Props) {
    if (previas.llave !== this.props.llave && this.state.error) this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      return (
        <div role="alert" className="panel border-alerta/60">
          <p className="text-lg font-bold text-alerta">Esta pantalla tuvo un error al dibujarse</p>
          <p className="mt-1 text-texto-suave">{this.state.error.message}</p>
          <button type="button" className="boton-secundario mt-4" onClick={() => this.setState({ error: null })}>
            Intentar de nuevo
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
