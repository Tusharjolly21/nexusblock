import { useRef, type ReactNode } from 'react'
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion'
import { Icon } from '@iconify/react'

/**
 * Horizontal-scroll feature gallery. The section pins to the viewport while you
 * scroll down; vertical scroll drives a horizontal track. Each panel *dwells*
 * in center (readable) before sliding to the next, and pops slightly as it
 * passes through (depth). Needs the page root on `overflow-x: clip` so sticky
 * isn't broken. Reduced-motion → calm stacked grid.
 */

type Panel = { name: string; body: string; icon: string; tab: string; demo: ReactNode }

const PANELS: Panel[] = [
  { name: 'Infinite canvas', body: 'Drop nodes, drag to connect, and let smart elbow + arrow routing keep it tidy.', icon: 'lucide:pen-tool', tab: 'Canvas', demo: <CanvasDemo /> },
  { name: 'Docs beside diagrams', body: 'Write notes next to the canvas and embed the diagram as a live figure — never a stale screenshot.', icon: 'lucide:file-text', tab: 'Doc', demo: <DocDemo /> },
  { name: 'Diagram as code', body: 'Write flow / ERD DSL that compiles straight to native, editable shapes.', icon: 'lucide:file-code-2', tab: 'Code', demo: <CodeDemo /> },
  { name: 'AI + live collaboration', body: 'Generate a diagram from a prompt, then review together with live cursors and comments.', icon: 'lucide:sparkles', tab: 'Canvas', demo: <CollabDemo /> },
  { name: 'Version history', body: 'Snapshot any state and diff exactly what changed across every review.', icon: 'lucide:history', tab: 'Review', demo: <HistoryDemo /> },
]

const N = PANELS.length
// Dwell keyframes: hold at each panel, then transition. Keeps every panel
// on-screen long enough to read before the track slides on.
const DWELL_IN = [0, 0.09, 0.22, 0.31, 0.44, 0.53, 0.66, 0.75, 0.9, 1]
const DWELL_OUT = ['0%', '0%', '-20%', '-20%', '-40%', '-40%', '-60%', '-60%', '-80%', '-80%']
// Scroll position where each panel is centered (for depth + dots).
const CENTERS = [0.05, 0.265, 0.485, 0.705, 0.95]
const cl = (n: number) => Math.min(1, Math.max(0, n))
// Clamped keyframe rings around a center — WAAPI requires offsets in [0,1] and
// monotonically non-decreasing, so the edge panels (near 0 and 1) must clamp.
const ring = (c: number, r: number): number[] => [cl(c - r), c, cl(c + r)]
const ring4 = (c: number, a: number, b: number): number[] => [cl(c - b), cl(c - a), cl(c + a), cl(c + b)]

export function CinematicShowcase() {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const x = useTransform(p, DWELL_IN, DWELL_OUT)
  const barW = useTransform(p, [0, 1], ['0%', '100%'])

  if (reduce) return <StaticFallback />

  return (
    <section ref={ref} className="relative" style={{ height: `${N * 115}vh` }}>
      <div className="sticky top-0 flex h-[100svh] flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(60% 55% at 50% 45%, var(--color-surface) 0%, transparent 72%)' }} />
        <div className="absolute inset-x-0 top-0 z-30 h-[3px] bg-line/60">
          <motion.div style={{ width: barW }} className="h-full bg-ink" />
        </div>

        <motion.div style={{ x, width: `${N * 100}vw` }} className="relative z-10 flex h-full">
          {PANELS.map((panel, i) => {
            const c = CENTERS[i]
            // eslint-disable-next-line react-hooks/rules-of-hooks
            const scale = useTransform(p, ring(c, 0.12), [0.92, 1, 0.92])
            // eslint-disable-next-line react-hooks/rules-of-hooks
            const opacity = useTransform(p, ring(c, 0.15), [0.4, 1, 0.4])
            return (
              <div key={panel.name} className="flex h-full w-[100vw] shrink-0 items-center justify-center px-6 md:px-14">
                <motion.div style={{ scale, opacity }} className="w-full max-w-[1140px] will-change-transform">
                  <FeatureSlide index={i} panel={panel} />
                </motion.div>
              </div>
            )
          })}
        </motion.div>

        <Dots p={p} />
        <div className="pointer-events-none absolute bottom-6 left-1/2 z-20 hidden -translate-x-1/2 items-center gap-2 rounded-full border border-line bg-surface/90 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-grey-3 backdrop-blur md:flex">
          <Icon icon="lucide:chevrons-down" width={12} /> scroll to explore
        </div>
      </div>
    </section>
  )
}

function FeatureSlide({ index, panel }: { index: number; panel: Panel }) {
  return (
    <div className="grid w-full items-center gap-10 lg:grid-cols-[0.78fr_1.22fr]">
      <div>
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-grey-3">
          <Icon icon={panel.icon} width={12} /> {String(index + 1).padStart(2, '0')} / {String(N).padStart(2, '0')}
        </div>
        <h3 className="font-display text-[clamp(30px,3.6vw,52px)] font-medium leading-[1.02] tracking-[-0.035em]">{panel.name}</h3>
        <p className="mt-5 max-w-md text-[17px] leading-8 text-grey-4">{panel.body}</p>
      </div>
      <Frame tab={panel.tab}>{panel.demo}</Frame>
    </div>
  )
}

function Frame({ tab, children }: { tab: string; children: ReactNode }) {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_50px_120px_-50px_rgba(15,23,42,.45)]">
      <div className="flex items-center gap-3 border-b border-line bg-paper px-4 py-3">
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </span>
        <span className="ml-2 rounded-md bg-ink px-2.5 py-1 text-[11px] font-medium text-paper">{tab}</span>
        <span className="ml-auto hidden items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest text-emerald-600 sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> live
        </span>
      </div>
      <div className="relative h-[clamp(300px,46vh,420px)] overflow-hidden" style={{ backgroundImage: 'radial-gradient(circle, var(--color-canvas-dot) 1px, transparent 1px)', backgroundSize: '22px 22px' }}>
        {children}
      </div>
    </div>
  )
}

/* ── Building blocks ─────────────────────────────────────────────────────── */

function CanvasNode({ x, y, icon, label }: { x: string; y: string; icon: string; label: string }) {
  return (
    <div className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-2.5 rounded-xl border border-line bg-surface px-3.5 py-2.5 shadow-[0_14px_34px_-24px_rgba(0,0,0,.5)]" style={{ left: x, top: y }}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-grey-1"><Icon icon={icon} width={20} /></span>
      <span className="whitespace-nowrap text-[13px] font-semibold text-ink">{label}</span>
    </div>
  )
}

/** Full-frame architecture with evenly spaced nodes + connectors. */
function WideCanvas({ withCache }: { withCache?: boolean }) {
  return (
    <div className="absolute inset-0">
      {/* Connectors live in the same 0–100 % space as the nodes so lines land on
          them exactly. preserveAspectRatio="none" → coords == % of container. */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <g stroke="var(--color-ink)" strokeWidth="1" fill="none" opacity="0.55" vectorEffect="non-scaling-stroke">
          <line x1="21" y1="20" x2="31" y2="20" />
          <line x1="53" y1="20" x2="63" y2="20" />
          <path d="M42 27 V50 M27 50 H58 M27 50 V54 M58 50 V54" />
          {withCache && <path d="M58 67 V78" strokeDasharray="3 2" />}
        </g>
      </svg>
      {/* arrow tips (HTML, so they don't distort with the stretched SVG) */}
      <span className="absolute h-0 w-0 -translate-y-1/2 border-y-[4px] border-l-[6px] border-y-transparent border-l-ink/60" style={{ left: '31%', top: '20%' }} />
      <span className="absolute h-0 w-0 -translate-y-1/2 border-y-[4px] border-l-[6px] border-y-transparent border-l-ink/60" style={{ left: '63%', top: '20%' }} />
      <span className="absolute h-0 w-0 -translate-x-1/2 border-x-[4px] border-t-[6px] border-x-transparent border-t-ink/60" style={{ left: '27%', top: '54%' }} />
      <span className="absolute h-0 w-0 -translate-x-1/2 border-x-[4px] border-t-[6px] border-x-transparent border-t-ink/60" style={{ left: '58%', top: '54%' }} />
      <CanvasNode x="10%" y="20%" icon="logos:react" label="Web app" />
      <CanvasNode x="42%" y="20%" icon="logos:aws-api-gateway" label="Gateway" />
      <CanvasNode x="74%" y="20%" icon="logos:aws-cognito" label="Auth" />
      <CanvasNode x="27%" y="60%" icon="logos:kafka-icon" label="Events" />
      <CanvasNode x="58%" y="60%" icon="logos:postgresql" label="Ledger" />
      {withCache && <CanvasNode x="58%" y="86%" icon="logos:redis" label="Cache" />}
    </div>
  )
}

/** Clean vertical flow for narrow columns — no clipping, generous spacing. */
function FlowStack({ items }: { items: { icon: string; label: string; added?: boolean }[] }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2.5 p-6">
      {items.map((n, i) => (
        <div key={n.label} className="flex w-full flex-col items-center gap-2.5">
          <div className={'flex w-[82%] items-center gap-2.5 rounded-xl border bg-surface px-3 py-2.5 shadow-[0_10px_26px_-22px_rgba(0,0,0,.5)] ' + (n.added ? 'border-emerald-500/50' : 'border-line')}>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-grey-1"><Icon icon={n.icon} width={18} /></span>
            <span className="flex-1 truncate text-[12.5px] font-semibold text-ink">{n.label}</span>
            {n.added && <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-wider text-emerald-600">new</span>}
          </div>
          {i < items.length - 1 && (
            <span className="flex flex-col items-center text-grey-3">
              <span className="h-3 w-px bg-grey-3" />
              <Icon icon="lucide:chevron-down" width={12} className="-mt-1" />
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

/* ── Per-panel demos ─────────────────────────────────────────────────────── */

function CanvasDemo() {
  return (
    <div className="absolute inset-0">
      <WideCanvas />
      <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full border border-line bg-surface/90 px-2.5 py-1 font-mono text-[9.5px] text-grey-4 shadow-sm backdrop-blur">
        <Icon icon="lucide:activity" width={11} /> smart elbow + arrow routing
      </div>
    </div>
  )
}

function DocDemo() {
  return (
    <div className="absolute inset-0 bg-surface p-7 md:p-9">
      <div className="font-display text-xl font-semibold text-ink">Payments architecture</div>
      <p className="mt-3 max-w-[52ch] text-[14px] leading-7 text-grey-4">
        Checkout hits the gateway, auth verifies the session, and payment events fan out to async workers.
      </p>
      <figure className="mt-6 max-w-md overflow-hidden rounded-xl border border-line">
        <figcaption className="flex items-center gap-1.5 border-b border-line bg-paper px-3 py-2 font-mono text-[9px] uppercase tracking-widest text-grey-3">
          <Icon icon="lucide:image" width={11} /> embedded from canvas
        </figcaption>
        <div className="grid grid-cols-3 gap-3 p-4">
          {['logos:aws-api-gateway', 'logos:kafka-icon', 'logos:postgresql'].map((ic) => (
            <div key={ic} className="grid place-items-center rounded-lg border border-line bg-paper py-4"><Icon icon={ic} width={22} /></div>
          ))}
        </div>
      </figure>
      <p className="mt-4 text-[12px] text-grey-3">Edit the canvas and this figure updates automatically.</p>
    </div>
  )
}

function CodeDemo() {
  return (
    <div className="absolute inset-0 grid grid-cols-[1.08fr_0.92fr]">
      <div className="flex flex-col justify-center bg-[#0d0d0f] p-6 font-mono text-[12.5px] leading-7 text-[#e6e6e6]">
        <pre className="whitespace-pre-wrap">
{`direction right
"Gateway" [icon: aws-api-gateway]
"Events"  [icon: kafka]
"Ledger"  [icon: postgres]
"Gateway" > "Events"
"Events"  > "Ledger"`}
        </pre>
        <div className="mt-5 inline-flex w-fit items-center gap-1.5 rounded-md bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
          <Icon icon="lucide:check" width={13} /> Applied to canvas
        </div>
      </div>
      <div className="border-l border-line">
        <FlowStack items={[{ icon: 'logos:aws-api-gateway', label: 'Gateway' }, { icon: 'logos:kafka-icon', label: 'Events' }, { icon: 'logos:postgresql', label: 'Ledger' }]} />
      </div>
    </div>
  )
}

function Cursor({ x, y, name, color }: { x: string; y: string; name: string; color: string }) {
  return (
    <div className="absolute" style={{ left: x, top: y }}>
      <Icon icon="lucide:mouse-pointer-2" width={18} style={{ color, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.28))' }} />
      <span className="ml-3 -mt-1 inline-block rounded-md rounded-tl-none px-1.5 py-0.5 text-[10px] font-semibold text-white" style={{ background: color }}>{name}</span>
    </div>
  )
}

function CollabDemo() {
  return (
    <div className="absolute inset-0">
      <WideCanvas withCache />
      <div className="absolute left-1/2 top-4 w-[min(400px,82%)] -translate-x-1/2 rounded-xl border border-line bg-surface/95 px-3 py-2.5 shadow-lg backdrop-blur">
        <div className="flex items-center gap-2">
          <Icon icon="lucide:sparkles" width={14} className="shrink-0 text-ink" />
          <span className="truncate text-[13px] text-ink">Add a Redis cache between workers and the ledger</span>
        </div>
      </div>
      <Cursor x="16%" y="70%" name="Aria" color="#0ea5e9" />
      <Cursor x="80%" y="52%" name="Kai" color="#8b5cf6" />
      <div className="absolute left-[40%] top-[40%] rounded-full rounded-bl-none border border-ink bg-ink p-1.5 text-paper shadow-md"><Icon icon="lucide:message-circle" width={13} /></div>
    </div>
  )
}

function HistoryDemo() {
  return (
    <div className="absolute inset-0 grid grid-cols-[0.92fr_1.08fr]">
      <div className="border-r border-line">
        <FlowStack
          items={[
            { icon: 'logos:kafka-icon', label: 'Events' },
            { icon: 'logos:aws-lambda', label: 'Workers' },
            { icon: 'logos:redis', label: 'Cache', added: true },
            { icon: 'logos:postgresql', label: 'Ledger' },
          ]}
        />
      </div>
      <div className="flex flex-col justify-center bg-surface p-6">
        <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-ink"><Icon icon="lucide:history" width={14} /> Version history</div>
        {[
          { v: 'v18', label: 'AI: add Redis cache', now: true },
          { v: 'v17', label: 'Async payment workers', now: false },
          { v: 'v16', label: 'Initial design', now: false },
        ].map((s) => (
          <div key={s.v} className={'mb-2 flex items-center gap-2.5 rounded-lg border px-3 py-2 text-[12px] ' + (s.now ? 'border-ink bg-grey-1' : 'border-line')}>
            <span className="font-mono text-[9px] text-grey-3">{s.v}</span>
            <span className="min-w-0 flex-1 truncate text-grey-4">{s.label}</span>
            {s.now && <span className="rounded-full bg-ink px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-wider text-paper">now</span>}
          </div>
        ))}
        <div className="mt-3 rounded-lg border border-line bg-paper p-3">
          <div className="mb-2 font-mono text-[8px] uppercase tracking-widest text-grey-3">Diff · v17 → v18</div>
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-emerald-600"><Icon icon="lucide:plus" width={11} /> Cache + queues (Redis)</div>
          <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-grey-4"><Icon icon="lucide:git-commit-horizontal" width={11} /> Workers → Ledger changed</div>
        </div>
      </div>
    </div>
  )
}

function Dots({ p }: { p: MotionValue<number> }) {
  return (
    <div className="absolute right-6 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-3 md:flex">
      {PANELS.map((panel, i) => {
        const c = CENTERS[i]
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const o = useTransform(p, ring4(c, 0.04, 0.11), [0.25, 1, 1, 0.25])
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const sc = useTransform(p, ring4(c, 0.04, 0.11), [1, 1.5, 1.5, 1])
        return <motion.span key={panel.name} style={{ opacity: o, scale: sc }} className="h-2 w-2 rounded-full bg-ink" />
      })}
    </div>
  )
}

function StaticFallback() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <h2 className="mb-8 max-w-[16ch] font-display text-[clamp(30px,4vw,50px)] font-medium tracking-[-0.03em]">A full canvas, docs, code, AI, and review workspace.</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PANELS.map((panel) => (
          <div key={panel.name} className="rounded-2xl border border-line bg-surface p-6">
            <div className="mb-3 grid h-11 w-11 place-items-center rounded-2xl border border-line bg-paper"><Icon icon={panel.icon} width={20} /></div>
            <h3 className="font-display text-lg font-semibold text-ink">{panel.name}</h3>
            <p className="mt-1.5 text-sm leading-6 text-grey-4">{panel.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
