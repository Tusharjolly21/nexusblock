import { useLayoutEffect, useRef } from 'react'
import { Icon } from '@iconify/react'

/**
 * Landing showpiece: a system-design diagram draws itself on the canvas, a doc
 * types itself on the right, then — the money shot — the canvas snapshots into
 * the doc as a live embedded figure. Demonstrates nexusblock's canvas↔doc
 * integration. anime.js-driven, lazy-loaded, scroll-triggered, reduced-motion
 * safe.
 */

const prefersReduced = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const TITLE = 'Payments architecture'
const PARA =
  'Checkout hits the API gateway, auth verifies the session, and payment events fan out to async workers that write the ledger.'
const CMD = '/ diagram from canvas'
const CAPTION = 'Fig 1 — Payment flow, embedded live from the canvas'
const CLOSE = 'Edit the canvas and this figure updates. One source of truth.'

/** A node box with an icon — used on the canvas side. */
function CNode({ x, y, icon, label, tech, w = 138 }: { x: number; y: number; icon: string; label: string; tech: string; w?: number }) {
  return (
    <div
      className="c2d-node absolute flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2 shadow-[0_10px_28px_-20px_rgba(0,0,0,.5)]"
      style={{ left: x, top: y, width: w }}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-grey-1">
        <Icon icon={icon} width={20} height={20} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[11.5px] font-semibold leading-tight text-ink">{label}</span>
        <span className="block font-mono text-[8.5px] uppercase tracking-wider text-grey-3">{tech}</span>
      </span>
    </div>
  )
}

/** Compact diagram thumbnail — the thing that flies into the doc and stays there. */
function MiniArchitecture() {
  return (
    <div className="relative h-full w-full bg-paper" style={{ backgroundImage: 'radial-gradient(circle, var(--color-canvas-dot) 1px, transparent 1px)', backgroundSize: '13px 13px' }}>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 300 150" preserveAspectRatio="xMidYMid meet" aria-hidden>
        <defs>
          <marker id="c2dMiniArrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0 0 L7 3.5 L0 7 z" fill="var(--color-ink)" />
          </marker>
        </defs>
        <g stroke="var(--color-ink)" strokeWidth="1.4" fill="none" opacity="0.65">
          <path d="M74 34 H108" markerEnd="url(#c2dMiniArrow)" />
          <path d="M150 46 V78 H108" markerEnd="url(#c2dMiniArrow)" />
          <path d="M150 46 V78 H196" markerEnd="url(#c2dMiniArrow)" />
        </g>
      </svg>
      {[
        { x: 26, y: 22, icon: 'logos:aws-api-gateway', l: 'Gateway' },
        { x: 118, y: 22, icon: 'logos:kafka-icon', l: 'Events' },
        { x: 60, y: 78, icon: 'logos:aws-lambda', l: 'Workers' },
        { x: 168, y: 78, icon: 'logos:postgresql', l: 'Ledger' },
      ].map((n) => (
        <div key={n.l} className="absolute flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2 py-1 shadow-sm" style={{ left: n.x, top: n.y }}>
          <Icon icon={n.icon} width={14} height={14} />
          <span className="text-[9px] font-semibold text-ink">{n.l}</span>
        </div>
      ))}
    </div>
  )
}

export function CanvasToDoc() {
  const sectionRef = useRef<HTMLElement>(null)
  const canvasSrcRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const paraRef = useRef<HTMLParagraphElement>(null)
  const cmdRef = useRef<HTMLSpanElement>(null)
  const capRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLParagraphElement>(null)
  const slotRef = useRef<HTMLDivElement>(null)
  const figureRef = useRef<HTMLDivElement>(null)
  const ghostRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const nodes = Array.from(section.querySelectorAll<HTMLElement>('.c2d-node'))
    const lines = Array.from(section.querySelectorAll<SVGPathElement>('.c2d-line'))
    const typeTargets = [titleRef, paraRef, cmdRef, capRef, closeRef]

    // Reduced motion / no animation: show the finished, composed state.
    if (prefersReduced()) {
      if (titleRef.current) titleRef.current.textContent = TITLE
      if (paraRef.current) paraRef.current.textContent = PARA
      if (cmdRef.current) cmdRef.current.textContent = CMD
      if (capRef.current) capRef.current.textContent = CAPTION
      if (closeRef.current) closeRef.current.textContent = CLOSE
      if (figureRef.current) figureRef.current.style.opacity = '1'
      return
    }

    // Pre-paint hidden state.
    nodes.forEach((n) => { n.style.opacity = '0' })
    typeTargets.forEach((r) => { if (r.current) r.current.textContent = '' })
    if (figureRef.current) figureRef.current.style.opacity = '0'

    let cancelled = false
    let started = false
    const timers: number[] = []
    const wait = (ms: number) => new Promise<void>((res) => { timers.push(window.setTimeout(res, ms)) })

    /** Typewriter with a blinking caret. Resolves when the string is fully typed. */
    const type = (el: HTMLElement | null, text: string, speed: number) =>
      new Promise<void>((resolve) => {
        if (!el || cancelled) return resolve()
        const textNode = document.createTextNode('')
        const caret = document.createElement('span')
        caret.className = 'nb-caret-bar'
        el.textContent = ''
        el.append(textNode, caret)
        let i = 0
        const tick = () => {
          if (cancelled) return resolve()
          textNode.nodeValue = text.slice(0, ++i)
          if (i >= text.length) { caret.remove(); return resolve() }
          timers.push(window.setTimeout(tick, speed))
        }
        timers.push(window.setTimeout(tick, speed))
      })

    const play = () => {
      if (started || cancelled) return
      started = true
      void import('animejs').then(async ({ animate, stagger, svg }) => {
      if (cancelled) return

      const animateP = (targets: Parameters<typeof animate>[0], params: Parameters<typeof animate>[1]) =>
        new Promise<void>((resolve) => { animate(targets, { ...params, onComplete: () => resolve() }) })

      // 1. Canvas draws itself — nodes cascade, then connectors draw.
      if (nodes.length) await animateP(nodes, { opacity: [0, 1], scale: [0.9, 1], translateY: [12, 0], delay: stagger(70), duration: 460, ease: 'out(3)' })
      if (cancelled) return
      if (lines.length) {
        const drawables = svg.createDrawable(lines, 0, 0)
        await animateP(drawables, { draw: '0 1', delay: stagger(60), duration: 520, ease: 'inOut(2)' })
      }
      if (cancelled) return

      // 2. The doc types itself.
      await type(titleRef.current, TITLE, 44)
      await type(paraRef.current, PARA, 15)
      await wait(120)
      await type(cmdRef.current, CMD, 34)
      await wait(240)
      if (cancelled) return

      // 3. The money shot: snapshot the canvas into the doc figure slot.
      const src = canvasSrcRef.current
      const slot = slotRef.current
      const ghost = ghostRef.current
      const figure = figureRef.current
      if (src && slot && ghost && figure) {
        const s = src.getBoundingClientRect()
        const t = slot.getBoundingClientRect()
        // Ghost is fixed at the slot's final rect; start transformed to overlay the canvas.
        Object.assign(ghost.style, {
          position: 'fixed', left: `${t.left}px`, top: `${t.top}px`, width: `${t.width}px`, height: `${t.height}px`,
          opacity: '1', zIndex: '60', transformOrigin: 'top left', willChange: 'transform',
        })
        const dx = s.left - t.left
        const dy = s.top - t.top
        const scale = t.width ? s.width / t.width : 1
        ghost.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`
        await animateP(ghost, { translateX: [dx, 0], translateY: [dy, 0], scale: [scale, 1], duration: 760, ease: 'inOut(3)' })
        if (cancelled) return
        // Hand off to the real embedded figure, retire the ghost.
        figure.style.opacity = '1'
        ghost.style.opacity = '0'
        ghost.style.transform = ''
      }

      // 4. Caption + closing line.
      await type(capRef.current, CAPTION, 26)
      await type(closeRef.current, CLOSE, 15)
      })
    }

    // Play the whole sequence the first time the section scrolls into view.
    const io = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) { play(); io.disconnect() } },
      { threshold: 0.35 },
    )
    io.observe(section)

    return () => {
      cancelled = true
      timers.forEach((id) => window.clearTimeout(id))
      io.disconnect()
    }
  }, [])

  return (
    <section ref={sectionRef} id="canvas-doc" className="mx-auto max-w-6xl px-6 py-24">
      <div className="mb-10 grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
        <div>
          <div className="mb-4 flex items-center gap-2.5 font-mono text-xs uppercase tracking-widest text-grey-3">
            <span className="h-px w-6 bg-grey-3" /> Docs + diagrams, one artifact
          </div>
          <h2 className="max-w-[14ch] font-display text-[clamp(34px,4.6vw,58px)] font-medium leading-[1.0] tracking-[-0.04em]">
            Draw it once. Drop it in your doc.
          </h2>
        </div>
        <p className="max-w-xl text-lg leading-8 text-grey-4 lg:justify-self-end">
          Design on the canvas, write beside it, and embed the live diagram into your notes with a keystroke. The
          figure stays in sync with the canvas — never a stale screenshot.
        </p>
      </div>

      <div className="grid gap-4 overflow-hidden rounded-[30px] border border-line bg-surface p-4 shadow-[0_28px_90px_-60px_rgba(0,0,0,.55)] lg:grid-cols-2">
        {/* Canvas side */}
        <div className="overflow-hidden rounded-2xl border border-line bg-paper">
          <div className="flex items-center gap-2 border-b border-line bg-surface px-4 py-2.5">
            <span className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            </span>
            <span className="ml-1 font-mono text-[11px] font-medium text-grey-4">canvas</span>
          </div>
          <div
            className="relative h-[380px] overflow-hidden"
            style={{ backgroundImage: 'radial-gradient(circle, var(--color-canvas-dot) 1px, transparent 1px)', backgroundSize: '20px 20px' }}
          >
            <div ref={canvasSrcRef} className="absolute inset-0 min-w-[560px]">
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 560 380" aria-hidden>
                <defs>
                  <marker id="c2dArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                    <path d="M0 0 L8 4 L0 8 z" fill="var(--color-ink)" />
                  </marker>
                </defs>
                <g stroke="var(--color-ink)" strokeWidth="1.7" fill="none" opacity="0.72">
                  <path className="c2d-line" d="M156 68 H206" markerEnd="url(#c2dArrow)" />
                  <path className="c2d-line" d="M338 68 H388" markerEnd="url(#c2dArrow)" />
                  <path className="c2d-line" d="M272 92 V160" markerEnd="url(#c2dArrow)" />
                  <path className="c2d-line" d="M272 208 V238 H174 V268" markerEnd="url(#c2dArrow)" />
                  <path className="c2d-line" d="M272 208 V238 H366 V268" markerEnd="url(#c2dArrow)" />
                  <path className="c2d-line" d="M240 292 H300" strokeDasharray="6 6" opacity="0.4" markerEnd="url(#c2dArrow)" />
                </g>
              </svg>
              <CNode x={24} y={44} icon="logos:react" label="Web app" tech="React" />
              <CNode x={206} y={44} icon="logos:aws-api-gateway" label="API gateway" tech="AWS" />
              <CNode x={388} y={44} icon="logos:aws-cognito" label="Auth" tech="Cognito" />
              <CNode x={206} y={160} icon="logos:kafka-icon" label="Payment events" tech="Kafka" />
              <CNode x={108} y={268} icon="logos:aws-lambda" label="Workers" tech="Lambda" w={132} />
              <CNode x={300} y={268} icon="logos:postgresql" label="Ledger DB" tech="Postgres" w={132} />
            </div>
            <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-line bg-surface/90 px-2.5 py-1 font-mono text-[9.5px] text-grey-4 shadow-sm backdrop-blur">
              <Icon icon="lucide:activity" width={11} /> elbow + arrow routing
            </div>
          </div>
        </div>

        {/* Doc side */}
        <div className="doc-prose overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="flex items-center gap-2 border-b border-line bg-paper px-4 py-2.5">
            <Icon icon="lucide:file-text" width={14} className="text-grey-4" />
            <span className="font-mono text-[11px] font-medium text-grey-4">design-doc.md</span>
          </div>
          <div className="h-[380px] overflow-hidden p-6">
            <h3 ref={titleRef} className="min-h-[34px] font-display text-2xl font-semibold tracking-[-0.02em] text-ink" />
            <p ref={paraRef} className="mt-3 min-h-[72px] text-[15px] leading-7 text-grey-4" />
            <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-line bg-paper px-2.5 py-1.5 font-mono text-[12px] text-grey-4">
              <Icon icon="lucide:sparkles" width={13} className="text-ink" />
              <span ref={cmdRef} className="min-h-[16px]" />
            </div>
            {/* Figure slot — the canvas lands here */}
            <figure className="mt-4">
              <div ref={slotRef} className="relative h-[132px] overflow-hidden rounded-xl border border-line bg-paper">
                <div ref={figureRef} className="absolute inset-0" style={{ opacity: 0 }}>
                  <MiniArchitecture />
                </div>
              </div>
              <figcaption ref={capRef} className="mt-2 min-h-[16px] font-mono text-[11px] text-grey-3" />
            </figure>
            <p ref={closeRef} className="mt-3 min-h-[16px] text-[14px] leading-6 text-grey-4" />
          </div>
        </div>
      </div>

      {/* Flight clone overlay (fixed, driven by anime). */}
      <div ref={ghostRef} className="pointer-events-none overflow-hidden rounded-xl border border-line shadow-[0_30px_80px_-30px_rgba(0,0,0,.5)]" style={{ opacity: 0, position: 'fixed', left: 0, top: 0 }}>
        <MiniArchitecture />
      </div>
    </section>
  )
}
