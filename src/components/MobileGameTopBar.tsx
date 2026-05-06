import { useState, type ReactNode } from 'react'

interface OverflowItem {
  label: string
  onClick: () => void
}

interface Props {
  /** Left: home/back action. */
  onBack: () => void
  backLabel?: string
  /** Center: short title or descriptor. */
  title: ReactNode
  /** Optional right-aligned status badge (e.g. "✓ Solved"). */
  status?: ReactNode
  /** Items rendered in the ⋮ overflow menu. */
  overflow?: OverflowItem[]
}

/**
 * Mobile-only top bar for game screens. Renders only at `< md` (the parent
 * gates this with `useIsMobile`). Touch targets are ≥40×40px.
 */
export default function MobileGameTopBar({ onBack, backLabel = '← Home', title, status, overflow }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="md:hidden flex items-center gap-2 h-11 px-2 bg-slate-900 border-b border-slate-700 shrink-0 relative">
      <button
        onClick={onBack}
        className="text-xs font-mono text-slate-400 hover:text-amber-400 min-w-[40px] min-h-[40px] flex items-center justify-center"
      >
        {backLabel}
      </button>
      <div className="flex-1 min-w-0 text-xs font-mono text-slate-300 truncate">
        {title}
      </div>
      {status}
      {overflow && overflow.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="px-2 min-w-[40px] min-h-[40px] text-base font-mono rounded border border-slate-600 text-slate-300 hover:bg-slate-700"
            title="More actions"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            ⋮
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} aria-hidden />
              <div
                className="absolute right-0 top-full mt-1 z-40 bg-slate-900 border border-slate-700 rounded shadow-lg flex flex-col min-w-[160px]"
                role="menu"
              >
                {overflow.map((item, i) => (
                  <button
                    key={item.label}
                    onClick={() => { setMenuOpen(false); item.onClick() }}
                    className={[
                      'text-left px-3 py-2 text-xs font-mono text-slate-300 hover:bg-slate-800',
                      i < overflow.length - 1 ? 'border-b border-slate-800' : '',
                    ].join(' ')}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </header>
  )
}
