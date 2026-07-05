import { useRef, type ReactNode } from 'react'
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion'
import { Icon } from '@iconify/react'

/**
 * Horizontal-scroll feature gallery. The section pins to the viewport while you
 * scroll down, and vertical scroll drives the track horizontally — each feature
 * is a distinct, self-contained panel that slides through center. Depends on the
 * page root using `overflow-x: clip` (not `hidden`) so sticky isn't broken.
 *
 * framer-motion `useScroll` maps scroll progress → track translate; reduced
 * motion falls back to a calm stacked grid.
 */

type Panel = { name: string; body: string; icon: string; tab: string; demo: ReactNode }

const PANELS: Panel[] = [
  {
    name: 'Infinite canvas',
    body: 'Drop nodes, drag to connect, and let smart elbow + arrow routing keep it tidy.',
    icon: 'lucide:pen-tool',
    tab: 'Canvas',
    demo: <CanvasDemo />,
  },
  {
    name: 'Docs beside diagrams',
    body: 'Write notes next to the canvas and embed the diagram as a live figure — never a stale screenshot.',
    icon: 'lucide:file-text',
    tab: 'Doc',
    demo: <DocDemo />,
  },
  {
    name: 'Diagram as code',
    body: 'Write flow / ERD DSL that compiles straight to native, editable shapes — and pull the canvas back to code.',
    icon: 'lucide:file-code-2',
    tab: 'Code',
    demo: <CodeDemo />,
  },
  {
    name: 'AI + live collaboration',
    body: 'Generate a diagram from a prompt, then review together with live cursors and pinned comments.',
    icon: 'lucide:sparkles',
    tab: 'Canvas',
    demo: <CollabDemo />,
  },
  {
    name: 'Version history',
    body: 'Snapshot any state and diff exactly what changed across every review.',
    icon: 'lucide:history',
    tab: 'Canvas',
    demo: <HistoryDemo />,
  },
]

const N = PANELS.length

export function CinematicShowcase() {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const x = useTransform(scrollYProgress, [0, 1], ['0%', `-${((N - 1) / N) * 100}%`])
  const barW = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])

  if (reduce) return <StaticFallback />

  return (
    <section ref={ref} className="relative" style={{ height: `${N * 90}vh` }}>
      <div className="sticky top-0 flex h-[100svh] flex-col overflow-hidden">
        {/* progress bar */}
        <div className="absolute inset-x-0 top-0 z-30 h-[3px] bg-line/60">
          <motion.div style={{ width: barW }} className="h-full bg-ink" />
        </div>

        {/* horizontal track */}
        <motion.div style={{ x }} className="flex h-full">
          {PANELS.map((panel, i) => (
            <div key={panel.name} className="flex h-full w-[100vw] shrink-0 items-center justify-center px-6 md:px-14">
              <FeatureSlide index={i} panel={panel} />
            </div>
          ))}
        </motion.div>

        <Dots p={scrollYProgress} />
        <div className="pointer-events-none absolute bottom-6 left-1/2 z-20 hidden -translate-x-1/2 items-center gap-2 rounded-full border border-line bg-surface/90 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-grey-3 backdrop-blur md:flex">
          <Icon icon="lucide:chevrons-down" width={12} /> scroll to explore
        </div>
      </div>
    </section>
  )
}

function FeatureSlide({ index, panel }: { index: number; panel: Panel }) {
  return (
    <div className="grid w-full max-w-[1080px] items-center gap-8 lg:grid-cols-[0.82fr_1.18fr]">
      <div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-grey-3">
          <Icon icon={panel.icon} width={12} /> {String(index + 1).padStart(2, '0')} / {String(N).padStart(2, '0')}
        </div>
        <h3 className="font-display text-[clamp(30px,3.6vw,50px)] font-medium leading-[1.02] tracking-[-0.035em]">{panel.name}</h3>
        <p className="mt-4 max-w-md text-[17px] leading-8 text-grey-4">{panel.body}</p>
      </div>
      <Frame tab={panel.tab}>{panel.demo}</Frame>
    </div>
  )
}

function Frame({ tab, children }: { tab: string; children: ReactNode }) {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_44px_110px_-50px_rgba(15,23,42,.45)]">
      <div className="flex items-center gap-3 border-b border-line bg-paper px-4 py-2.5">
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
      <div className="relative h-[clamp(280px,42vh,380px)] overflow-hidden" style={{ backgroundImage: 'radial-gradient(circle, var(--color-canvas-dot) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
        {children}
      </div>
    </div>
  )
}

function Node({ x, y, icon, label, faded }: { x: string; y: string; icon: string; label: string; faded?: boolean }) {
  return (
    <div
      className={'absolute flex items-center gap-2.5 rounded-xl border bg-surface px-3 py-2 shadow-[0_12px_30px_-22px_rgba(0,0,0,.5)] ' + (faded ? 'border-dashed border-grey-2 opacity-55' : 'border-line')}
      style={{ left: x, top: y, width: 'clamp(112px,17%,152px)' }}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-grey-1"><Icon icon={icon} width={19} /></span>
      <span className="truncate text-[12px] font-semibold text-ink">{label}</span>
    </div>
  )
}

function CanvasSkeleton({ withCache }: { withCache?: boolean }) {
  return (
    <>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 380" preserveAspectRatio="xMidYMid meet" aria-hidden>
        <defs><marker id="cinA" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="var(--color-ink)" /></marker></defs>
        <g stroke="var(--color-ink)" strokeWidth="2" fill="none" opacity="0.68">
          <path d="M250 110 H360" markerEnd="url(#cinA)" />
          <path d="M540 110 H650" markerEnd="url(#cinA)" />
          <path d="M450 150 V230 H340" markerEnd="url(#cinA)" />
          <path d="M450 150 V230 H560" markerEnd="url(#cinA)" />
        </g>
      </svg>
      <Node x="8%" y="16%" icon="logos:react" label="Web app" />
      <Node x="38%" y="16%" icon="logos:aws-api-gateway" label="Gateway" />
      <Node x="68%" y="16%" icon="logos:aws-cognito" label="Auth" />
      <Node x="28%" y="52%" icon="logos:kafka-icon" label="Events" />
      <Node x="56%" y="52%" icon="logos:postgresql" label="Ledger" />
      {withCache && <Node x="56%" y="78%" icon="logos:redis" label="Cache" />}
    </>
  )
}

function CanvasDemo() {
  return (
    <div className="absolute inset-0">
      <CanvasSkeleton />
      <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-line bg-surface/90 px-2.5 py-1 font-mono text-[9.5px] text-grey-4 shadow-sm backdrop-blur">
        <Icon icon="lucide:activity" width={11} /> smart elbow + arrow routing
      </div>
    </div>
  )
}

function DocDemo() {
  return (
    <div className="absolute inset-0 grid grid-cols-2">
      <div className="relative border-r border-line">
        <div className="scale-[0.82] origin-top-left"><CanvasSkeleton /></div>
      </div>
      <div className="bg-surface p-5">
        <div className="font-display text-base font-semibold text-ink">Payments architecture</div>
        <p className="mt-2 text-[12.5px] leading-6 text-grey-4">Checkout hits the gateway, then payment events fan out to async workers.</p>
        <figure className="mt-3 overflow-hidden rounded-lg border border-line">
          <div className="flex items-center gap-1.5 border-b border-line bg-paper px-2 py-1 font-mono text-[8px] uppercase tracking-widest text-grey-3"><Icon icon="lucide:image" width={10} /> embedded from canvas</div>
          <div className="grid grid-cols-3 gap-1.5 p-2">
            {['logos:aws-api-gateway', 'logos:kafka-icon', 'logos:postgresql'].map((ic) => (
              <div key={ic} className="grid place-items-center rounded-md border border-line bg-paper py-2"><Icon icon={ic} width={16} /></div>
            ))}
          </div>
        </figure>
      </div>
    </div>
  )
}

function CodeDemo() {
  return (
    <div className="absolute inset-0 grid grid-cols-[1.05fr_1fr]">
      <div className="bg-[#0d0d0f] p-5 font-mono text-[12px] leading-6 text-[#e6e6e6]">
        <pre className="whitespace-pre-wrap">
{`direction right
"Gateway" [icon: aws-api-gateway]
"Events"  [icon: kafka, color: pink]
"Ledger"  [icon: postgres, color: blue]
"Gateway" > "Events": publish
"Events"  > "Ledger": write`}
        </pre>
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
          <Icon icon="lucide:check" width={13} /> Applied to canvas
        </div>
      </div>
      <div className="relative border-l border-line"><div className="scale-[0.72] origin-center"><CanvasSkeleton /></div></div>
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
      <CanvasSkeleton withCache />
      <div className="absolute left-1/2 top-4 w-[min(400px,80%)] -translate-x-1/2 rounded-xl border border-line bg-surface/95 px-3 py-2.5 shadow-lg backdrop-blur">
        <div className="flex items-center gap-2">
          <Icon icon="lucide:sparkles" width={14} className="shrink-0 text-ink" />
          <span className="truncate text-[13px] text-ink">Add a Redis cache between workers and the ledger</span>
        </div>
      </div>
      <Cursor x="20%" y="60%" name="Aria" color="#0ea5e9" />
      <Cursor x="62%" y="34%" name="Kai" color="#8b5cf6" />
      <div className="absolute left-[45%] top-[47%] rounded-full rounded-bl-none border border-ink bg-ink p-1.5 text-paper shadow-md"><Icon icon="lucide:message-circle" width={13} /></div>
    </div>
  )
}

function HistoryDemo() {
  return (
    <div className="absolute inset-0 grid grid-cols-[1.1fr_0.9fr]">
      <div className="relative border-r border-line">
        <div className="scale-[0.8] origin-top-left"><CanvasSkeleton withCache /></div>
        <div className="absolute left-[48%] top-[74%] flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] font-semibold text-emerald-600"><Icon icon="lucide:plus" width={10} /> added</div>
      </div>
      <div className="bg-surface p-4">
        <div className="mb-2.5 flex items-center gap-2 text-[13px] font-semibold text-ink"><Icon icon="lucide:history" width={14} /> Version history</div>
        {[
          { v: 'v18', label: 'AI: add Redis cache', now: true },
          { v: 'v17', label: 'Async payment workers', now: false },
          { v: 'v16', label: 'Initial design', now: false },
        ].map((s) => (
          <div key={s.v} className={'mb-1.5 flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11.5px] ' + (s.now ? 'border-ink bg-grey-1' : 'border-line')}>
            <span className="font-mono text-[9px] text-grey-3">{s.v}</span>
            <span className="min-w-0 flex-1 truncate text-grey-4">{s.label}</span>
            {s.now && <span className="rounded-full bg-ink px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-wider text-paper">now</span>}
          </div>
        ))}
        <div className="mt-3 rounded-lg border border-line bg-paper p-2.5">
          <div className="mb-1.5 font-mono text-[8px] uppercase tracking-widest text-grey-3">Diff · v17 → v18</div>
          <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-emerald-600"><Icon icon="lucide:plus" width={11} /> Cache + queues (Redis)</div>
          <div className="mt-1 flex items-center gap-1.5 text-[11.5px] text-grey-4"><Icon icon="lucide:git-commit-horizontal" width={11} /> Workers → Ledger changed</div>
        </div>
      </div>
    </div>
  )
}

function Dots({ p }: { p: MotionValue<number> }) {
  return (
    <div className="absolute right-6 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-2.5 md:flex">
      {PANELS.map((panel, i) => {
        const a = i / N
        const b = (i + 1) / N
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const o = useTransform(p, [a, a + 0.03, b - 0.03, b], [0.25, 1, 1, 0.25])
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const sc = useTransform(p, [a, a + 0.03, b - 0.03, b], [1, 1.5, 1.5, 1])
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
