import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion'
import { Icon } from '@iconify/react'

/**
 * Cinematic scroll-driven feature tour. The app frame stays pinned in the
 * center while scroll scrubs a camera (zoom/pan/tilt) and animates the UI
 * *inside* the mockup — connectors draw, docs type, code applies, AI generates,
 * cursors collaborate, versions diff. Every beat is demonstrated, not shown.
 *
 * framer-motion `useScroll` drives everything off scroll progress, so it's
 * fully scrubbable; reduced-motion falls back to a calm static frame + captions.
 */

const SCENES = [
  { name: 'Infinite canvas', body: 'Drop nodes, connect them with smart elbow + arrow routing.', icon: 'lucide:pen-tool' },
  { name: 'Docs beside diagrams', body: 'Write notes and embed the live canvas as a figure — never a stale screenshot.', icon: 'lucide:file-text' },
  { name: 'Diagram as code', body: 'Write flow / ERD DSL that compiles straight to native shapes.', icon: 'lucide:file-code-2' },
  { name: 'AI + live collaboration', body: 'Generate from a prompt, then review together with live cursors and comments.', icon: 'lucide:sparkles' },
  { name: 'Version history', body: 'Snapshot any state and diff exactly what changed across every review.', icon: 'lucide:history' },
] as const

const N = SCENES.length
// Scene i owns progress [i/N, (i+1)/N]; helpers fade/scrub within it.
const R = (i: number): [number, number] => [i / N, (i + 1) / N]

export function CinematicShowcase() {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] })

  // Camera: gentle zoom + pan toward the active panel, then pull back.
  const scale = useTransform(p, [0, 0.2, 0.4, 0.6, 0.8, 1], [1, 1.05, 1.05, 1.04, 1.04, 0.99])
  const x = useTransform(p, [0, 0.2, 0.4, 0.6, 0.8, 1], ['0%', '5%', '-6%', '0%', '-5%', '0%'])
  const rotate = useTransform(p, [0, 0.5, 1], [0.4, -0.3, 0.2])

  if (reduce) return <StaticFallback />

  return (
    <section ref={ref} className="relative" style={{ height: '560vh' }}>
      <div className="sticky top-0 flex h-[100svh] items-center justify-center overflow-hidden px-6">
        <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(60% 50% at 50% 42%, var(--color-surface) 0%, transparent 70%)' }} />

        <Chapters p={p} />

        <motion.div style={{ scale, x, rotate }} className="relative z-10 w-full max-w-[940px] will-change-transform">
          <AppFrame p={p} />
        </motion.div>

        <Dots p={p} />
      </div>
    </section>
  )
}

function Chapters({ p }: { p: MotionValue<number> }) {
  return (
    <div className="pointer-events-none absolute left-6 top-1/2 z-20 hidden w-[248px] -translate-y-1/2 lg:block xl:left-[max(24px,calc(50%-620px))]">
      {SCENES.map((s, i) => {
        const [a, b] = R(i)
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const opacity = useTransform(p, [a - 0.03, a + 0.04, b - 0.04, b + 0.03], [0, 1, 1, 0])
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const y = useTransform(p, [a - 0.03, a + 0.04], [16, 0])
        return (
          <motion.div key={s.name} style={{ opacity, y }} className="absolute inset-x-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-grey-3">
              <Icon icon={s.icon} width={12} /> {String(i + 1).padStart(2, '0')} / {String(N).padStart(2, '0')}
            </div>
            <h3 className="font-display text-[26px] font-medium leading-tight tracking-[-0.03em] text-ink">{s.name}</h3>
            <p className="mt-2 text-sm leading-6 text-grey-4">{s.body}</p>
          </motion.div>
        )
      })}
    </div>
  )
}

function Dots({ p }: { p: MotionValue<number> }) {
  return (
    <div className="absolute right-6 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-2.5 md:flex">
      {SCENES.map((s, i) => {
        const [a, b] = R(i)
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const o = useTransform(p, [a, a + 0.02, b - 0.02, b], [0.25, 1, 1, 0.25])
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const sc = useTransform(p, [a, a + 0.02, b - 0.02, b], [1, 1.5, 1.5, 1])
        return <motion.span key={s.name} style={{ opacity: o, scale: sc }} className="h-2 w-2 rounded-full bg-ink" />
      })}
    </div>
  )
}

function Tab({ p, label, active }: { p: MotionValue<number>; label: string; active: number[] }) {
  const on = useTransform(
    p,
    active.flatMap((i) => [R(i)[0] - 0.02, R(i)[0] + 0.03, R(i)[1] - 0.03, R(i)[1] + 0.02]),
    active.flatMap(() => [0, 1, 1, 0]),
  )
  const color = useTransform(on, [0, 1], ['var(--color-grey-4)', 'var(--color-paper)'])
  return (
    <span className="relative rounded-md px-2.5 py-1 text-[11px] font-medium">
      <motion.span style={{ opacity: on }} className="absolute inset-0 rounded-md bg-ink" />
      <motion.span style={{ color }} className="relative">{label}</motion.span>
    </span>
  )
}

function AppFrame({ p }: { p: MotionValue<number> }) {
  // Scene overlays (crossfade within each scene's 0.2 window).
  const badgeO = useTransform(p, [0, 0.02, 0.16, 0.2], [0, 1, 1, 0])
  const o2 = useTransform(p, [0.2, 0.24, 0.37, 0.4], [0, 1, 1, 0])
  const o3 = useTransform(p, [0.4, 0.44, 0.57, 0.6], [0, 1, 1, 0])
  const o4 = useTransform(p, [0.6, 0.64, 0.77, 0.8], [0, 1, 1, 0])
  const o5 = useTransform(p, [0.8, 0.84, 0.98, 1], [0, 1, 1, 1])

  // Scene 1 — connectors draw.
  const draw1 = useTransform(p, [0.02, 0.16], [0, 1])
  // Scene 2 — doc wipe + figure drop.
  const docWipe = useTransform(p, [0.24, 0.35], ['inset(0 100% 0 0)', 'inset(0 0% 0 0)'])
  const figOpacity = useTransform(p, [0.33, 0.39], [0, 1])
  const figY = useTransform(p, [0.33, 0.39], [14, 0])
  // Scene 3 — code wipe + applied.
  const codeWipe = useTransform(p, [0.44, 0.55], ['inset(0 100% 0 0)', 'inset(0 0% 0 0)'])
  const appliedO = useTransform(p, [0.55, 0.59], [0, 1])
  // Scene 4 — prompt wipe, generate node, cursors.
  const promptWipe = useTransform(p, [0.64, 0.72], ['inset(0 100% 0 0)', 'inset(0 0% 0 0)'])
  const genO = useTransform(p, [0.72, 0.78], [0, 1])
  const genScale = useTransform(p, [0.72, 0.78], [0.85, 1])
  const curAx = useTransform(p, [0.6, 0.8], ['12%', '58%'])
  const curAy = useTransform(p, [0.6, 0.8], ['62%', '30%'])
  const curBx = useTransform(p, [0.6, 0.8], ['70%', '34%'])
  const curBy = useTransform(p, [0.6, 0.8], ['28%', '66%'])
  const collabO = useTransform(p, [0.66, 0.74], [0, 1])
  // Scene 5 — version history slides in; diff rows stagger; "added" ring pops.
  const h0 = useTransform(p, [0.82, 0.87], [0, 1])
  const h1 = useTransform(p, [0.85, 0.9], [0, 1])
  const h2 = useTransform(p, [0.88, 0.93], [0, 1])
  const diffO = useTransform(p, [0.9, 0.95], [0, 1])
  const addedO = useTransform(p, [0.9, 0.96], [0, 1])
  const addedScale = useTransform(p, [0.9, 0.96], [0.6, 1])

  return (
    <div className="overflow-hidden rounded-[22px] border border-line bg-surface shadow-[0_50px_120px_-40px_rgba(15,23,42,.4)]">
      <div className="flex items-center gap-3 border-b border-line bg-paper px-4 py-2.5">
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </span>
        <div className="ml-2 flex items-center gap-1">
          <Tab p={p} label="Canvas" active={[0, 3, 4]} />
          <Tab p={p} label="Doc" active={[1]} />
          <Tab p={p} label="Code" active={[2]} />
        </div>
        <div className="ml-auto hidden items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest text-emerald-600 sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> live
        </div>
      </div>

      <div className="relative h-[clamp(320px,52vh,520px)] overflow-hidden" style={{ backgroundImage: 'radial-gradient(circle, var(--color-canvas-dot) 1px, transparent 1px)', backgroundSize: '22px 22px' }}>
        {/* Base canvas (shared spatial anchor) */}
        <div className="absolute inset-0">
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 520" preserveAspectRatio="xMidYMid meet" aria-hidden>
            <defs>
              <marker id="cinArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="var(--color-ink)" /></marker>
            </defs>
            {['M250 150 H360', 'M540 150 H650', 'M450 190 V300 H340', 'M450 190 V300 H560'].map((d) => (
              <motion.path key={d} d={d} stroke="var(--color-ink)" strokeWidth="2" fill="none" markerEnd="url(#cinArrow)" style={{ pathLength: draw1, opacity: 0.7 }} />
            ))}
          </svg>
          <StageNode x="8%" y="22%" icon="logos:react" label="Web app" />
          <StageNode x="38%" y="22%" icon="logos:aws-api-gateway" label="Gateway" />
          <StageNode x="68%" y="22%" icon="logos:aws-cognito" label="Auth" />
          <StageNode x="28%" y="52%" icon="logos:kafka-icon" label="Events" />
          <StageNode x="56%" y="52%" icon="logos:postgresql" label="Ledger" />
          <motion.div style={{ opacity: genO, scale: genScale }} className="absolute inset-0">
            <StageNode x="56%" y="74%" icon="logos:redis" label="Cache" />
          </motion.div>
        </div>

        {/* Scene 2 — doc panel */}
        <motion.div style={{ opacity: o2 }} className="absolute inset-y-0 right-0 w-[54%] border-l border-line bg-surface p-6">
          <div className="mb-2 font-display text-lg font-semibold text-ink">Payments architecture</div>
          <motion.p style={{ clipPath: docWipe }} className="text-sm leading-6 text-grey-4">
            Checkout hits the gateway, auth verifies the session, and payment events fan out to async workers.
          </motion.p>
          <motion.figure style={{ opacity: figOpacity, y: figY }} className="mt-4 overflow-hidden rounded-xl border border-line">
            <div className="flex items-center gap-1.5 border-b border-line bg-paper px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-widest text-grey-3"><Icon icon="lucide:image" width={11} /> embedded from canvas</div>
            <div className="grid grid-cols-3 gap-2 p-3">
              {['logos:aws-api-gateway', 'logos:kafka-icon', 'logos:postgresql'].map((ic) => (
                <div key={ic} className="grid place-items-center rounded-lg border border-line bg-paper py-2.5"><Icon icon={ic} width={18} /></div>
              ))}
            </div>
          </motion.figure>
        </motion.div>

        {/* Scene 3 — code editor */}
        <motion.div style={{ opacity: o3 }} className="absolute inset-y-0 right-0 w-[52%] border-l border-line bg-[#0d0d0f] p-5 font-mono text-[12px] leading-6 text-[#e6e6e6]">
          <motion.pre style={{ clipPath: codeWipe }} className="whitespace-pre-wrap">
{`direction right
"Gateway" [icon: aws-api-gateway]
"Events"  [icon: kafka, color: pink]
"Ledger"  [icon: postgres, color: blue]
"Gateway" > "Events": publish
"Events"  > "Ledger": write`}
          </motion.pre>
          <motion.div style={{ opacity: appliedO }} className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
            <Icon icon="lucide:check" width={13} /> Applied to canvas
          </motion.div>
        </motion.div>

        {/* Scene 4 — AI prompt + collaboration */}
        <motion.div style={{ opacity: o4 }} className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-5 w-[min(420px,72%)] -translate-x-1/2 rounded-xl border border-line bg-surface/95 px-3 py-2.5 shadow-lg backdrop-blur">
            <div className="flex items-center gap-2">
              <Icon icon="lucide:sparkles" width={14} className="shrink-0 text-ink" />
              <motion.span style={{ clipPath: promptWipe }} className="whitespace-nowrap text-[13px] text-ink">Add a Redis cache between workers and the ledger</motion.span>
            </div>
          </div>
          <motion.div style={{ opacity: collabO, left: curAx, top: curAy }} className="absolute">
            <Icon icon="lucide:mouse-pointer-2" width={18} style={{ color: '#0ea5e9', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.28))' }} />
            <span className="ml-3 -mt-1 inline-block rounded-md rounded-tl-none bg-[#0ea5e9] px-1.5 py-0.5 text-[10px] font-semibold text-white">Aria</span>
          </motion.div>
          <motion.div style={{ opacity: collabO, left: curBx, top: curBy }} className="absolute">
            <Icon icon="lucide:mouse-pointer-2" width={18} style={{ color: '#8b5cf6', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.28))' }} />
            <span className="ml-3 -mt-1 inline-block rounded-md rounded-tl-none bg-[#8b5cf6] px-1.5 py-0.5 text-[10px] font-semibold text-white">Kai</span>
          </motion.div>
          <motion.div style={{ opacity: collabO }} className="absolute left-[44%] top-[46%] rounded-full rounded-bl-none border border-ink bg-ink p-1.5 text-paper shadow-md">
            <Icon icon="lucide:message-circle" width={13} />
          </motion.div>
        </motion.div>

        {/* Scene 5 — version history + diff */}
        <motion.div style={{ opacity: o5 }} className="absolute inset-0">
          {/* "added" highlight on the freshly-generated Cache node */}
          <motion.div style={{ opacity: addedO, scale: addedScale }} className="absolute left-[52%] top-[70%] flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] font-semibold text-emerald-600">
            <Icon icon="lucide:plus" width={10} /> added
          </motion.div>
          <div className="absolute inset-y-0 right-0 w-[44%] border-l border-line bg-surface p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink"><Icon icon="lucide:history" width={15} /> Version history</div>
            {[
              { v: 'v18', label: 'AI: add Redis cache', now: true, o: h2 },
              { v: 'v17', label: 'Async payment workers', now: false, o: h1 },
              { v: 'v16', label: 'Initial design', now: false, o: h0 },
            ].map((s) => (
              <motion.div key={s.v} style={{ opacity: s.o }} className={'mb-1.5 flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[12px] ' + (s.now ? 'border-ink bg-grey-1' : 'border-line')}>
                <span className="font-mono text-[10px] text-grey-3">{s.v}</span>
                <span className="min-w-0 flex-1 truncate text-grey-4">{s.label}</span>
                {s.now && <span className="rounded-full bg-ink px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-paper">now</span>}
              </motion.div>
            ))}
            <motion.div style={{ opacity: diffO }} className="mt-4 rounded-xl border border-line bg-paper p-3">
              <div className="mb-2 font-mono text-[9px] uppercase tracking-widest text-grey-3">Diff · v17 → v18</div>
              <div className="flex items-center gap-2 text-[12px] font-medium text-emerald-600"><Icon icon="lucide:plus" width={12} /> Cache + queues (Redis)</div>
              <div className="mt-1 flex items-center gap-2 text-[12px] text-grey-4"><Icon icon="lucide:git-commit-horizontal" width={12} /> Workers → Ledger link changed</div>
            </motion.div>
          </div>
        </motion.div>

        <div className="pointer-events-none absolute inset-0" style={{ boxShadow: 'inset 0 0 80px -20px rgba(15,23,42,.12)' }} />
        <motion.div style={{ opacity: badgeO }} className="pointer-events-none absolute right-4 top-4 flex items-center gap-1.5 rounded-full border border-line bg-surface/90 px-2.5 py-1 font-mono text-[9.5px] text-grey-4 shadow-sm backdrop-blur">
          <Icon icon="lucide:activity" width={11} /> smart routing
        </motion.div>
      </div>
    </div>
  )
}

function StageNode({ x, y, icon, label }: { x: string; y: string; icon: string; label: string }) {
  return (
    <div className="absolute flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2 shadow-[0_12px_30px_-22px_rgba(0,0,0,.5)]" style={{ left: x, top: y, width: 'clamp(112px,16%,150px)' }}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-grey-1"><Icon icon={icon} width={19} /></span>
      <span className="truncate text-[12px] font-semibold text-ink">{label}</span>
    </div>
  )
}

function StaticFallback() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <h2 className="mb-8 max-w-[16ch] font-display text-[clamp(30px,4vw,50px)] font-medium tracking-[-0.03em]">A full canvas, docs, code, AI, and review workspace.</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SCENES.map((s) => (
          <div key={s.name} className="rounded-2xl border border-line bg-surface p-6">
            <div className="mb-3 grid h-11 w-11 place-items-center rounded-2xl border border-line bg-paper"><Icon icon={s.icon} width={20} /></div>
            <h3 className="font-display text-lg font-semibold text-ink">{s.name}</h3>
            <p className="mt-1.5 text-sm leading-6 text-grey-4">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
