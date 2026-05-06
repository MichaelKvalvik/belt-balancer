import { useEffect, useRef, useState, type ReactNode } from 'react'

interface Props {
  /** Always-visible strip when collapsed (~48px tall). Tapping it opens. */
  peek: ReactNode
  /** Sheet body, scrollable when expanded. */
  children: ReactNode
  defaultOpen?: boolean
}

const PEEK_PX = 48

/**
 * Mobile-only collapsible bottom sheet. Shows a peek strip when closed and
 * slides up to reveal the body. Drag the handle (or the peek) to toggle.
 *
 * Pure pointer events — no gesture library.
 */
export default function MobileBottomSheet({ peek, children, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const [dragOffset, setDragOffset] = useState<number | null>(null)
  const [sheetHeight, setSheetHeight] = useState(0)
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragStartY = useRef<number | null>(null)
  const dragStartTime = useRef<number>(0)
  const lastY = useRef<number>(0)
  const lastTime = useRef<number>(0)

  useEffect(() => {
    if (!sheetRef.current) return
    const el = sheetRef.current
    function measure() { setSheetHeight(el.getBoundingClientRect().height) }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  function onPointerDown(e: React.PointerEvent) {
    // Only react to primary pointer (touch / left mouse).
    if (e.button !== 0 && e.pointerType === 'mouse') return
    dragStartY.current = e.clientY
    dragStartTime.current = performance.now()
    lastY.current = e.clientY
    lastTime.current = dragStartTime.current
    setDragOffset(0)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (dragStartY.current == null) return
    const dy = e.clientY - dragStartY.current
    lastY.current = e.clientY
    lastTime.current = performance.now()
    setDragOffset(dy)
  }

  function onPointerUp(e: React.PointerEvent) {
    if (dragStartY.current == null) return
    const totalDy = e.clientY - dragStartY.current
    const dt = Math.max(performance.now() - dragStartTime.current, 1)
    const velocity = totalDy / dt // px/ms; negative = upward
    dragStartY.current = null
    setDragOffset(null)

    // Velocity-based snap: a fast flick wins, otherwise base on sign + threshold.
    if (Math.abs(velocity) > 0.5) {
      setOpen(velocity < 0)
    } else if (open) {
      setOpen(totalDy < sheetHeight * 0.25)
    } else {
      setOpen(totalDy < -PEEK_PX * 0.5)
    }
  }

  // Resting transform when not dragging: closed = leave only the peek visible.
  const restingTranslate = open ? 0 : Math.max(sheetHeight - PEEK_PX, 0)
  const transform = dragOffset == null
    ? restingTranslate
    : Math.max(0, Math.min(sheetHeight, restingTranslate + dragOffset))

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-slate-950/60 z-30"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}
      <div
        ref={sheetRef}
        className="fixed left-0 right-0 bottom-0 z-40 bg-slate-900 border-t border-slate-700 rounded-t-xl shadow-2xl flex flex-col"
        style={{
          maxHeight: '85vh',
          transform: `translateY(${transform}px)`,
          transition: dragOffset == null ? 'transform 200ms ease-out' : 'none',
          touchAction: 'none',
        }}
      >
        {/* Drag handle + peek (combined as the toggle target) */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClick={(e) => {
            // Plain tap (no drag) — toggle.
            if (Math.abs((lastY.current ?? 0) - (dragStartY.current ?? lastY.current ?? 0)) > 4) return
            // Stop propagation so the backdrop tap doesn't immediately re-close.
            e.stopPropagation()
            setOpen((v) => !v)
          }}
          className="select-none cursor-grab active:cursor-grabbing"
          role="button"
          aria-expanded={open}
        >
          <div className="flex justify-center pt-1.5 pb-1">
            <div className="h-1 w-10 rounded-full bg-slate-600" />
          </div>
          <div
            className="px-3 pb-2 flex items-center justify-between gap-3"
            style={{ minHeight: PEEK_PX - 12 }}
          >
            <div className="flex-1 min-w-0">{peek}</div>
            <span className="text-[10px] font-mono text-slate-500 shrink-0">
              {open ? 'Close ▼' : 'Tools ▲'}
            </span>
          </div>
        </div>

        {/* Body */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ overscrollBehavior: 'contain' }}
        >
          {children}
        </div>
      </div>
    </>
  )
}
