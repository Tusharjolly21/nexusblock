import { useLayoutEffect, useRef } from 'react'

/**
 * Metric counter that ticks up from 0 to `value` the first time it scrolls into
 * view. anime.js-driven and lazy-loaded; reduced-motion snaps to the final
 * value. Renders the final value in markup too, so it's correct without JS.
 */
export function CountUp({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  duration = 1200,
  className,
}: {
  value: number
  decimals?: number
  prefix?: string
  suffix?: string
  duration?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const fmt = (n: number) => `${prefix}${n.toFixed(decimals)}${suffix}`

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    if (prefersReduced()) { el.textContent = fmt(value); return }
    el.textContent = fmt(0)

    let cancelled = false
    let fired = false
    const run = () => {
      if (fired || cancelled) return
      fired = true
      const state = { v: 0 }
      void import('animejs').then(({ animate }) => {
        if (cancelled) return
        animate(state, {
          v: value,
          duration,
          ease: 'out(4)',
          onUpdate: () => { if (ref.current) ref.current.textContent = fmt(state.v) },
          onComplete: () => { if (ref.current) ref.current.textContent = fmt(value) },
        })
      })
    }
    const io = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) { run(); io.disconnect() } },
      { threshold: 0.6 },
    )
    io.observe(el)
    return () => { cancelled = true; io.disconnect() }
    // fmt is derived from the same deps; re-running on value/format change is intended.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, decimals, prefix, suffix, duration])

  return <span ref={ref} className={className}>{fmt(value)}</span>
}

const prefersReduced = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
