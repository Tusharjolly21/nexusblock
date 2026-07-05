import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react'

const prefersReduced = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Cohesive scroll reveal used across landing sections so the whole page shares
 * one motion rhythm: fade + rise, ease-out, entering only, once. anime.js is
 * lazy-loaded; reduced-motion renders the content in place with no animation.
 */
export function Reveal({
  children,
  className,
  style,
  delay = 0,
  y = 22,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
  delay?: number
  y?: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || prefersReduced()) return
    el.style.opacity = '0'
    el.style.willChange = 'transform, opacity'

    let cancelled = false
    let fired = false
    const run = () => {
      if (fired || cancelled) return
      fired = true
      void import('animejs').then(({ animate }) => {
        if (cancelled) return
        animate(el, { opacity: [0, 1], translateY: [y, 0], duration: 560, delay, ease: 'out(3)' })
      })
    }
    const io = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) { run(); io.disconnect() } },
      { threshold: 0.15 },
    )
    io.observe(el)
    return () => { cancelled = true; io.disconnect() }
  }, [delay, y])

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  )
}
