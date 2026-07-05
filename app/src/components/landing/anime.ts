import { useLayoutEffect, type RefObject } from 'react'

const prefersReduced = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Self-drawing architecture diagram: dashed clusters fade + scale in, service
 * nodes cascade, connectors draw themselves, and floating badges settle last.
 * anime.js is lazy-loaded so it never weighs on the app bundle; reduced-motion
 * users simply see the finished diagram with no animation.
 *
 * Targets are found by class inside `rootRef`: `.hero-cluster`, `.hero-node`,
 * `.hero-badge`, and `.diagram-line` (the SVG connectors).
 */
export function useSelfDrawDiagram(rootRef: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root || prefersReduced()) return

    const svgEl = root.querySelector('svg')
    const clusters = Array.from(root.querySelectorAll<HTMLElement>('.hero-cluster'))
    const nodes = Array.from(root.querySelectorAll<HTMLElement>('.hero-node'))
    const badges = Array.from(root.querySelectorAll<HTMLElement>('.hero-badge'))
    // Draw the solid connectors; muted/dashed ones keep their style and just
    // fade in with the SVG rather than being redrawn as solid lines.
    const paths = Array.from(root.querySelectorAll<SVGPathElement>('.diagram-line:not(.diagram-line-muted)'))
    const blocks = [...clusters, ...nodes, ...badges]

    // Hide before first paint so nothing flashes ahead of the draw-in.
    blocks.forEach((el) => { el.style.opacity = '0' })
    if (svgEl) svgEl.style.opacity = '0'

    let cancelled = false
    let cleanup: (() => void) | undefined
    void import('animejs').then(({ stagger, createTimeline, svg }) => {
      if (cancelled || !root.isConnected) return
      // Start the connectors undrawn (end = 0), then draw them to full.
      const drawables = paths.length ? svg.createDrawable(paths, 0, 0) : []
      const tl = createTimeline({ defaults: { ease: 'out(3)' } })
      if (clusters.length) tl.add(clusters, { opacity: [0, 1], scale: [0.965, 1], duration: 560, delay: stagger(80) }, 60)
      if (nodes.length) tl.add(nodes, { opacity: [0, 1], scale: [0.9, 1], translateY: [12, 0], duration: 520, delay: stagger(55) }, 300)
      if (svgEl) tl.add(svgEl, { opacity: [0, 1], duration: 220 }, 660)
      if (drawables.length) tl.add(drawables, { draw: '0 1', duration: 640, delay: stagger(55), ease: 'inOut(2)' }, 680)
      if (badges.length) tl.add(badges, { opacity: [0, 1], translateY: [8, 0], duration: 460, delay: stagger(120) }, 1360)
      cleanup = () => tl.pause()
    })
    return () => { cancelled = true; cleanup?.() }
  }, [rootRef])
}

/**
 * Staggered scroll reveal: children matching `selector` cascade in once the
 * container first enters the viewport. Reduced-motion → immediately visible.
 */
export function useStaggerReveal(rootRef: RefObject<HTMLElement | null>, selector: string) {
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root || prefersReduced()) return
    const items = Array.from(root.querySelectorAll<HTMLElement>(selector))
    if (!items.length) return
    items.forEach((el) => { el.style.opacity = '0' })

    let cancelled = false
    let fired = false
    const run = () => {
      if (fired || cancelled) return
      fired = true
      void import('animejs').then(({ animate, stagger }) => {
        if (cancelled) return
        animate(items, { opacity: [0, 1], translateY: [24, 0], duration: 640, delay: stagger(95), ease: 'out(3)' })
      })
    }
    const io = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) { run(); io.disconnect() } },
      { threshold: 0.2 },
    )
    io.observe(root)
    return () => { cancelled = true; io.disconnect() }
  }, [rootRef, selector])
}
