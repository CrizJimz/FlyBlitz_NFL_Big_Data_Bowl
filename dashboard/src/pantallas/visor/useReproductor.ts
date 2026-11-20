import { useCallback, useEffect, useState } from 'react'

export interface Reproductor {
  indice: number
  reproduciendo: boolean
  irA: (i: number) => void
  paso: (delta: number) => void
  alternar: () => void
}

/**
 * Reproduce `total` cuadros a `fps` cuadros por segundo. Se pausa al llegar al final.
 * `llave` reinicia el reproductor al cambiar de jugada.
 */
export function useReproductor(total: number, fps: number, llave: string): Reproductor {
  const [indice, setIndice] = useState(0)
  const [reproduciendo, setReproduciendo] = useState(false)

  useEffect(() => {
    setIndice(0)
    setReproduciendo(false)
  }, [llave])

  useEffect(() => {
    if (!reproduciendo || total === 0) return
    const id = window.setInterval(() => {
      setIndice((i) => {
        if (i >= total - 1) {
          setReproduciendo(false)
          return i
        }
        return i + 1
      })
    }, 1000 / Math.max(1, fps))
    return () => window.clearInterval(id)
  }, [reproduciendo, total, fps])

  const irA = useCallback((i: number) => setIndice(Math.min(Math.max(0, i), Math.max(0, total - 1))), [total])
  const paso = useCallback(
    (delta: number) => {
      setReproduciendo(false)
      setIndice((i) => Math.min(Math.max(0, i + delta), Math.max(0, total - 1)))
    },
    [total],
  )
  const alternar = useCallback(() => {
    setReproduciendo((r) => {
      // Si está al final, reproducir vuelve a empezar.
      if (!r) setIndice((i) => (i >= total - 1 ? 0 : i))
      return !r
    })
  }, [total])

  return { indice, reproduciendo, irA, paso, alternar }
}
