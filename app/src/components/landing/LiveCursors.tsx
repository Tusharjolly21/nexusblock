import { useLayoutEffect, useRef } from 'react'
import { Icon } from '@iconify/react'

const prefersReduced = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

type CursorSpec = { name: string; color: string; path: [number, number][]; dur: number }

// Paths are fractions of the container; two collaborators roam the demo canvas.
const CURSORS: CursorSpec[] = [
  { name: 'Aria', color: '#0ea5e9', dur: 7200, path: [[0.16, 0.26], [0.5, 0.18], [0.63, 0.5], [0.34, 0.62], [0.16, 0.26]] },
  { name: 'Kai', color: '#8b5cf6', dur: 8600, path: [[0.72, 0.56], [0.56, 0.24], [0.3, 0.36], [0.62, 0.74], [0.72, 0.56]] },
]

/**
 * Ambient live-collaboration cursors for the landing demo canvas — named
 * pointers drifting between nodes, so multiplayer is shown, not just claimed.
 * anime.js-driven, lazy-loaded, reduced-motion-safe (cursors rest in place).
 */
export function LiveCursors() {
  const rootRef = useRef<HTMLDivElement>(null)
  const cursorRefs = useRef<(HTMLDivElement | null)[]>([])

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const cursors = cursorRefs.current.filter((c): c is HTMLDivElement => !!c)

    if (prefersReduced()) {
      const r = root.getBoundingClientRect()
      cursors.forEach((c, i) => {
        const [fx, fy] = CURSORS[i].path[0]
        c.style.transform = `translate(${fx * r.width}px, ${fy * r.height}px)`
        c.style.opacity = '1'
      })
      return
    }

    let cancelled = false
    const teardown: (() => void)[] = []
    void import('animejs').then(({ animate }) => {
      if (cancelled) return
      const running: { pause: () => void }[] = []
      const start = () => {
        running.forEach((a) => a.pause())
        running.length = 0
        const r = root.getBoundingClientRect()
        cursors.forEach((c, i) => {
          const spec = CURSORS[i]
          c.style.opacity = '1'
          running.push(
            animate(c, {
              translateX: spec.path.map(([fx]) => fx * r.width),
              translateY: spec.path.map(([, fy]) => fy * r.height),
              duration: spec.dur,
              ease: 'inOut(2)',
              loop: true,
            }),
          )
        })
      }
      start()
      const ro = new ResizeObserver(() => start())
      ro.observe(root)
      teardown.push(() => { running.forEach((a) => a.pause()); ro.disconnect() })
    })
    return () => { cancelled = true; teardown.forEach((fn) => fn()) }
  }, [])

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 z-20">
      {CURSORS.map((c, i) => (
        <div
          key={c.name}
          ref={(el) => { cursorRefs.current[i] = el }}
          className="absolute left-0 top-0"
          style={{ opacity: 0, willChange: 'transform' }}
        >
          <Icon icon="lucide:mouse-pointer-2" width={18} style={{ color: c.color, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.28))' }} />
          <span
            className="ml-3 -mt-1 inline-block whitespace-nowrap rounded-md rounded-tl-none px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm"
            style={{ background: c.color }}
          >
            {c.name}
          </span>
        </div>
      ))}
    </div>
  )
}
