import { useEffect, useState } from 'react'
import { ErrorApi } from './cliente'

export type EstadoPeticion<T> =
  | { tipo: 'cargando'; mensaje?: string; reintentoEnS?: number }
  | { tipo: 'error'; error: ErrorApi }
  | { tipo: 'listo'; datos: T }

export interface ResultadoPeticion<T> {
  estado: EstadoPeticion<T>
  /** Último resultado válido; se conserva cuando una petición nueva falla (p. ej. 422). */
  ultimo: T | null
  reintentar: () => void
}

/**
 * Ejecuta `fn` cuando cambian `deps`.
 * - Ignora respuestas viejas si las dependencias cambiaron mientras tanto.
 * - Ante un 503 con reintento (precálculo), se queda en "cargando" y reintenta solo.
 *   El reintento se cancela al cambiar las dependencias o al desmontar.
 */
export function usePeticion<T>(fn: () => Promise<T>, deps: unknown[]): ResultadoPeticion<T> {
  const [estado, setEstado] = useState<EstadoPeticion<T>>({ tipo: 'cargando' })
  const [ultimo, setUltimo] = useState<T | null>(null)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let vigente = true
    let temporizador: number | undefined

    const ejecutar = () => {
      fn()
        .then((datos) => {
          if (!vigente) return
          setEstado({ tipo: 'listo', datos })
          setUltimo(datos)
        })
        .catch((e: unknown) => {
          if (!vigente) return
          const error = e instanceof ErrorApi ? e : new ErrorApi(-1, e instanceof Error ? e.message : String(e))
          if (error.estado === 503 && error.reintentarEnS !== undefined) {
            setEstado({ tipo: 'cargando', mensaje: error.detalle, reintentoEnS: error.reintentarEnS })
            temporizador = window.setTimeout(ejecutar, error.reintentarEnS * 1000)
          } else {
            setEstado({ tipo: 'error', error })
          }
        })
    }

    setEstado({ tipo: 'cargando' })
    ejecutar()

    return () => {
      vigente = false
      if (temporizador !== undefined) window.clearTimeout(temporizador)
    }
    // fn cambia en cada render; las dependencias reales llegan en `deps`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, intento])

  return { estado, ultimo, reintentar: () => setIntento((i) => i + 1) }
}
