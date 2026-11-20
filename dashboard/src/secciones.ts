/** Secciones del dashboard (una por pantalla). `lista` = false se muestra como "Próximamente". */
export type Seccion = 'success-rate' | 'coberturas' | 'bolsillo' | 'separacion' | 'visor'

export interface DefinicionSeccion {
  id: Seccion
  etiqueta: string
  descripcion: string
  fase: 1 | 2
  lista: boolean
}

export const SECCIONES: DefinicionSeccion[] = [
  { id: 'success-rate', etiqueta: 'Success Rate', descripcion: 'Éxito por down y distancia', fase: 1, lista: false },
  { id: 'coberturas', etiqueta: 'Coberturas', descripcion: 'Zone vs Man por situación', fase: 2, lista: false },
  { id: 'bolsillo', etiqueta: 'Bolsillo', descripcion: 'Tiempo del snap al pase', fase: 2, lista: false },
  { id: 'separacion', etiqueta: 'Separación', descripcion: 'Receptor contra defensor', fase: 2, lista: false },
  { id: 'visor', etiqueta: 'Visor 2D', descripcion: 'Jugada cuadro por cuadro', fase: 1, lista: false },
]

export const SECCION_INICIAL: Seccion = 'success-rate'

/** Lee la sección del hash (`#visor`) y usa la inicial si no es válida. */
export function seccionDesdeHash(hash: string): Seccion {
  const id = hash.replace(/^#/, '')
  return SECCIONES.some((s) => s.id === id) ? (id as Seccion) : SECCION_INICIAL
}
