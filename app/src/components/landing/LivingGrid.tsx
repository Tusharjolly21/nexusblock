import { useEffect, useRef } from 'react'
import { useTheme } from '../../store/useTheme'

/**
 * "The canvas is alive" — a pointer-reactive dot field behind the hero (spec
 * 5.2). Points within ~140px of the cursor brighten toward the ink color and
 * ease back. Implemented on Canvas2D (not WebGL) for reliability; degrades to a
 * static grid on reduced-motion / small screens. Tone-aware.
 */
const SPACING = 26
const RADIUS = 150

export function LivingGrid() {
  const tone = useTheme((s) => s.tone)
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const animate = !reduced && window.innerWidth >= 768

    // Read tone colors from CSS vars (re-read when `tone` changes via effect dep).
    const css = getComputedStyle(document.documentElement)
    const base = parseColor(css.getPropertyValue('--color-canvas-dot')) ?? [220, 220, 216]
    const accent = parseColor(css.getPropertyValue('--color-grey-4')) ?? [90, 90, 88]

    let dpr = Math.min(window.devicePixelRatio || 1, 2)
    let w = 0
    let h = 0
    const pointer = { x: -9999, y: -9999 }
    const target = { x: -9999, y: -9999 }

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (!animate) draw() // paint once in static mode
    }

    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      for (let x = 0; x <= w; x += SPACING) {
        for (let y = 0; y <= h; y += SPACING) {
          const d = Math.hypot(x - pointer.x, y - pointer.y)
          const t = animate ? smoothstep(1 - Math.min(d / RADIUS, 1)) : 0
          const r = 1 + t * 1.4
          const [cr, cg, cb] = mix(base, accent, t)
          ctx.beginPath()
          ctx.fillStyle = `rgba(${cr},${cg},${cb},${0.55 + t * 0.45})`
          ctx.arc(x, y, r, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    let raf = 0
    const loop = () => {
      pointer.x += (target.x - pointer.x) * 0.12
      pointer.y += (target.y - pointer.y) * 0.12
      draw()
      raf = requestAnimationFrame(loop)
    }

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      target.x = e.clientX - rect.left
      target.y = e.clientY - rect.top
    }

    resize()
    window.addEventListener('resize', resize)
    if (animate) {
      window.addEventListener('pointermove', onMove)
      raf = requestAnimationFrame(loop)
    }
    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [tone])

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
      style={{
        maskImage: 'radial-gradient(ellipse 90% 55% at 50% 0%, black 0%, transparent 72%)',
        WebkitMaskImage: 'radial-gradient(ellipse 90% 55% at 50% 0%, black 0%, transparent 72%)',
      }}
    />
  )
}

function smoothstep(t: number) {
  const x = Math.max(0, Math.min(1, t))
  return x * x * (3 - 2 * x)
}

function mix(a: number[], b: number[], t: number): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}

function parseColor(v: string): [number, number, number] | null {
  const hex = v.trim().replace('#', '')
  if (hex.length !== 6) return null
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)]
}
