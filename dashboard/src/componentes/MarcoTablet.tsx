import type { ReactNode } from 'react'

/** Marco con bordes redondeados gruesos que imita una tablet de sideline. */
export function MarcoTablet({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-[720px] min-w-[1280px] p-4">
      <div className="flex flex-1 flex-col overflow-hidden rounded-[28px] border-[10px] border-navy-900 bg-navy-950 shadow-2xl ring-1 ring-navy-700">
        {children}
      </div>
    </div>
  )
}
