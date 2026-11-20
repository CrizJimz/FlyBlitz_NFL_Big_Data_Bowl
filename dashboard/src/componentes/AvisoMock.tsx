/**
 * Chip naranja visible mientras se usan datos de ejemplo (`npm run dev:mock`).
 * La condición va literal (no la constante `usarMocks`) para que en el build quede `return null`
 * y el texto se elimine de dist.
 */
export function AvisoMock() {
  if (!(import.meta.env.DEV && import.meta.env.MODE === 'mock')) return null
  return (
    <span
      role="status"
      className="inline-flex min-h-9 items-center gap-2 rounded-full border border-alerta bg-alerta/15 px-3 text-xs font-extrabold uppercase tracking-widest text-alerta"
      title="Mocks con la forma del contrato. Las cifras no son reales."
    >
      <span className="h-2 w-2 rounded-full bg-alerta" aria-hidden />
      Datos de ejemplo
    </span>
  )
}
