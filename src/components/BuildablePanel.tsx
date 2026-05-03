import { useGameStore } from '../store/gameStore'
import { BUILDABLE_MULTIPLES } from '../utils/buildableMultiples'

/**
 * Sliding chip row that lists buildable factors (2^a · 3^b > 1) — the scale
 * ratios you can compose with splitter/merger trees.  Pinned to the canvas
 * top edge; clicks pass through to the canvas behind so opening the panel
 * never blocks node interaction.
 */
export default function BuildablePanel() {
  const open = useGameStore((s) => s.showBuildablePanel)
  const toggle = useGameStore((s) => s.toggleBuildablePanel)

  return (
    <div className="absolute top-0 left-0 right-0 z-40 pointer-events-none">
      {/* Toggle button — top-right of canvas */}
      <button
        type="button"
        onClick={toggle}
        title="Toggle buildable totals (B)"
        className={[
          'pointer-events-auto absolute top-2 right-2',
          'px-2.5 py-1 rounded font-mono text-[11px] tracking-wide',
          'border transition-colors select-none',
          open
            ? 'bg-amber-500/15 border-amber-500 text-amber-300'
            : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:border-slate-500 hover:text-slate-100',
        ].join(' ')}
      >
        ≡ Buildable
      </button>

      {/* Sliding chip row */}
      <div
        className={[
          'mx-2 mt-2 mr-28',
          'transition-all duration-200 ease-out',
          open
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 -translate-y-2 pointer-events-none',
        ].join(' ')}
        aria-hidden={!open}
      >
        <div
          className={[
            'pointer-events-auto relative',
            'rounded-md border border-slate-700 bg-slate-900/95 backdrop-blur-sm',
            'shadow-[0_4px_18px_rgba(0,0,0,0.5)]',
          ].join(' ')}
        >
          <div
            className="buildable-scroll flex items-center gap-1.5 overflow-x-auto px-2.5 py-1.5"
            onWheel={(e) => {
              if (e.deltaY !== 0 && e.deltaX === 0) {
                e.currentTarget.scrollLeft += e.deltaY
              }
            }}
          >
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mr-1 shrink-0">
              Buildable
            </span>
            {BUILDABLE_MULTIPLES.map((n) => (
              <span
                key={n}
                title={`×${n}`}
                className={[
                  'shrink-0 rounded-full border px-2 py-0.5',
                  'font-mono text-[11px] leading-none',
                  'border-slate-700 bg-slate-800/80 text-slate-300',
                  'transition-colors hover:border-amber-500/60 hover:text-amber-300',
                ].join(' ')}
              >
                {n}
              </span>
            ))}
          </div>
          {/* Right-edge fade hints at horizontal scrollability */}
          <div className="pointer-events-none absolute top-0 bottom-0 right-0 w-6 rounded-r-md bg-gradient-to-l from-slate-900/95 to-transparent" />
        </div>
      </div>
    </div>
  )
}
