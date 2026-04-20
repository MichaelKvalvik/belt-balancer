import { useLayoutEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore'

const STEPS = [
  {
    target: 'palette',
    title: 'Node Palette',
    body: 'Drag a Splitter from the palette onto the canvas. You have 1 available.',
    cta: 'Next →',
  },
  {
    target: 'canvas',
    title: 'Make a Connection',
    body: 'Drag from the solid orange dot on the Input node to a hollow dot on the Splitter.',
    cta: 'Next →',
  },
  {
    target: 'canvas',
    title: 'Wire Both Outputs',
    body: 'Connect the Splitter to both Output nodes. Flow rates update live — no Validate needed!',
    cta: 'Got it!',
  },
] as const

const CALLOUT_W = 256

export default function Tutorial() {
  const currentLevelId   = useGameStore((s) => s.currentLevelId)
  const tutorialStep     = useGameStore((s) => s.tutorialStep)
  const advanceTutorial  = useGameStore((s) => s.advanceTutorial)
  const dismissTutorial  = useGameStore((s) => s.dismissTutorial)

  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (tutorialStep === null || currentLevelId !== 1) { setPos(null); return }

    function calc() {
      const step = STEPS[tutorialStep as 0 | 1 | 2]
      const el = document.querySelector(`[data-tutorial="${step.target}"]`) as HTMLElement | null
      if (!el) return
      const r = el.getBoundingClientRect()

      if (step.target === 'palette') {
        setPos({
          top:  Math.max(8, r.top + r.height / 2 - 88),
          left: Math.max(8, r.left - CALLOUT_W - 16),
        })
      } else {
        setPos({
          top:  r.top + 20,
          left: Math.max(8, r.left + r.width / 2 - CALLOUT_W / 2),
        })
      }
    }

    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [tutorialStep, currentLevelId])

  if (tutorialStep === null || currentLevelId !== 1 || pos === null) return null

  const step = STEPS[tutorialStep]
  const arrowRight  = step.target === 'palette'
  const arrowBottom = step.target === 'canvas'

  return (
    <div
      className="fixed z-40 pointer-events-none"
      style={{ top: pos.top, left: pos.left, width: CALLOUT_W }}
    >
      <div className="pointer-events-auto relative bg-slate-800 border border-amber-500/50 rounded-xl shadow-2xl shadow-amber-500/10 p-4">

        {/* Right-pointing arrow (toward palette on right) */}
        {arrowRight && (
          <div
            className="absolute top-1/2 -translate-y-1/2 -right-[7px] w-3 h-3 bg-slate-800 rotate-45"
            style={{ borderTop: '1px solid rgba(245,158,11,0.5)', borderRight: '1px solid rgba(245,158,11,0.5)' }}
          />
        )}

        {/* Bottom-pointing arrow (toward canvas below) */}
        {arrowBottom && (
          <div
            className="absolute left-1/2 -translate-x-1/2 -bottom-[7px] w-3 h-3 bg-slate-800 rotate-45"
            style={{ borderBottom: '1px solid rgba(245,158,11,0.5)', borderRight: '1px solid rgba(245,158,11,0.5)' }}
          />
        )}

        <div className="text-[10px] font-mono text-amber-500 uppercase tracking-widest mb-1">
          {tutorialStep + 1} / 3 — {step.title}
        </div>
        <p className="text-[11px] font-mono text-slate-300 leading-relaxed mb-3">
          {step.body}
        </p>
        <div className="flex items-center justify-between">
          <button
            onClick={dismissTutorial}
            className="text-[10px] font-mono text-slate-500 hover:text-slate-300 transition-colors"
          >
            Skip tutorial
          </button>
          <button
            onClick={advanceTutorial}
            className="text-[11px] font-mono font-bold text-amber-400 border border-amber-500/40 rounded px-3 py-1 hover:bg-amber-500/10 active:scale-95 transition-all"
          >
            {step.cta}
          </button>
        </div>
      </div>
    </div>
  )
}
