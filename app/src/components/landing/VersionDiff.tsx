import { useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import { motion } from 'framer-motion'

type NodeState = 'same' | 'added' | 'removed'

type VersionNode = {
  id: string
  label: string
  tech: string
  icon: string
  x: number
  y: number
  state: NodeState
}

const BASE_NODES: VersionNode[] = [
  { id: 'web', label: 'Web client', tech: 'Next.js', icon: 'logos:nextjs-icon', x: 18, y: 32, state: 'same' },
  { id: 'api', label: 'API gateway', tech: 'Fastify', icon: 'logos:fastify-icon', x: 44, y: 32, state: 'same' },
  { id: 'db', label: 'Primary data', tech: 'Postgres', icon: 'logos:postgresql', x: 76, y: 32, state: 'same' },
]

const BEFORE_NODES: VersionNode[] = [
  ...BASE_NODES,
  { id: 'cron', label: 'Legacy cron', tech: 'Node', icon: 'logos:nodejs-icon', x: 44, y: 70, state: 'removed' },
]

const AFTER_NODES: VersionNode[] = [
  ...BASE_NODES,
  { id: 'bus', label: 'Event bus', tech: 'Kafka', icon: 'logos:kafka-icon', x: 57, y: 67, state: 'added' },
  { id: 'workers', label: 'Workers x3', tech: 'Redis', icon: 'logos:redis', x: 76, y: 67, state: 'added' },
]

/** Split slider for reviewing the same architecture before/after a version change. */
export function VersionDiff() {
  const trackRef = useRef<HTMLDivElement>(null)
  const [pct, setPct] = useState(50)
  const [dragging, setDragging] = useState(false)

  const setFromClientX = (clientX: number) => {
    const el = trackRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setPct(Math.max(18, Math.min(82, ((clientX - rect.left) / rect.width) * 100)))
  }

  return (
    <section id="diff" className="bg-paper px-6 py-28 text-ink">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <div className="mb-4 flex items-center gap-2.5 font-mono text-xs uppercase tracking-widest text-grey-3">
              <span className="h-px w-6 bg-grey-3" /> Versioning
            </div>
            <h2 className="font-display text-[clamp(34px,5vw,58px)] font-medium leading-tight tracking-[-0.035em]">
              Drag through the architecture change.
            </h2>
          </div>
          <p className="max-w-xl text-lg leading-relaxed text-grey-4 lg:justify-self-end">
            Shared services stay aligned while the changed path swaps from a cron job to an event bus and worker fan-out.
          </p>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-line bg-surface shadow-[0_28px_90px_-64px_rgba(0,0,0,.55)]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-paper px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-paper">
                <Icon icon="lucide:git-compare-arrows" width={19} />
              </span>
              <div>
                <div className="text-sm font-semibold">Payments service diff</div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-grey-3">v14 to v15</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <DiffPill icon="lucide:minus-circle" label="Removed" value="Legacy cron" tone="orange" />
              <DiffPill icon="logos:kafka-icon" label="Added" value="Kafka events" tone="green" />
              <DiffPill icon="logos:redis" label="Scaled" value="Workers x3" tone="green" />
            </div>
          </div>

          <div
            ref={trackRef}
            className={'relative overflow-hidden bg-surface ' + (dragging ? 'cursor-ew-resize' : '')}
            style={{
              height: 560,
              minHeight: 560,
              backgroundImage: 'radial-gradient(circle, var(--color-canvas-dot) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          >
            <CompareLayer variant="after" />

            <div
              className="absolute inset-0 bg-surface"
              style={{
                clipPath: `inset(0 ${100 - pct}% 0 0)`,
                backgroundImage:
                  'linear-gradient(90deg, color-mix(in srgb, #f97316 10%, transparent), transparent 65%), radial-gradient(circle, var(--color-canvas-dot) 1px, transparent 1px)',
                backgroundSize: 'auto, 20px 20px',
              }}
            >
              <CompareLayer variant="before" />
            </div>

            <div className="pointer-events-none absolute inset-x-5 top-5 z-20 flex items-start justify-between gap-4">
              <VersionBadge side="Before" version="v14" body="cron queue, direct writes" tone="orange" />
              <VersionBadge side="After" version="v15" body="event bus, worker fan-out" tone="green" />
            </div>

            <div
              className="absolute inset-y-0 z-30 -ml-7 w-14 cursor-ew-resize"
              style={{ left: `${pct}%` }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId)
                setDragging(true)
                setFromClientX(e.clientX)
              }}
              onPointerMove={(e) => dragging && setFromClientX(e.clientX)}
              onPointerUp={(e) => {
                e.currentTarget.releasePointerCapture(e.pointerId)
                setDragging(false)
              }}
            >
              <div className="absolute inset-y-5 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-ink to-transparent" />
              <motion.div
                animate={{ scale: dragging ? 1.08 : [1, 1.035, 1] }}
                transition={{ duration: dragging ? 0.16 : 2.6, repeat: dragging ? 0 : Infinity, ease: 'easeInOut' }}
                className="absolute top-1/2 left-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-line bg-surface text-ink shadow-[0_18px_45px_-24px_rgba(0,0,0,.75)]"
              >
                <span className="absolute inset-1.5 rounded-full border border-grey-1" />
                <Icon icon="lucide:chevrons-left-right" width={24} />
              </motion.div>
            </div>

            <div className="pointer-events-none absolute bottom-5 left-5 right-5 z-20 grid gap-3 md:grid-cols-3">
              <ChangeCard icon="lucide:minus-circle" label="Removed" value="Legacy cron retired" tone="orange" />
              <ChangeCard icon="logos:kafka-icon" label="Added" value="Kafka event stream" tone="green" />
              <ChangeCard icon="logos:redis" label="Scaled" value="Worker pool x3" tone="green" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function CompareLayer({ variant }: { variant: 'before' | 'after' }) {
  const before = variant === 'before'
  const nodes = before ? BEFORE_NODES : AFTER_NODES

  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: before
          ? undefined
          : 'linear-gradient(90deg, transparent 20%, color-mix(in srgb, #10b981 10%, transparent), transparent 86%)',
      }}
    >
      <svg viewBox="0 0 1000 560" className="absolute inset-0 h-full w-full" aria-hidden>
        {before ? (
          <>
            <Flow d="M 250 180 C 310 180, 355 180, 430 180" />
            <Flow d="M 520 180 C 610 180, 690 180, 760 180" />
            <Flow d="M 500 220 C 528 292, 512 338, 440 392" removed />
          </>
        ) : (
          <>
            <Flow d="M 250 180 C 310 180, 355 180, 430 180" />
            <Flow d="M 520 180 C 610 180, 690 180, 760 180" />
            <Flow d="M 500 220 C 548 298, 574 334, 570 374" added />
            <Flow d="M 650 374 C 682 374, 710 374, 760 374" added />
            <Flow d="M 760 344 C 788 288, 788 244, 760 220" added />
          </>
        )}
      </svg>

      {nodes.map((node, i) => (
        <motion.div
          key={`${variant}-${node.id}`}
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.42, delay: i * 0.05 }}
        >
          <NodeCard node={node} />
        </motion.div>
      ))}
    </div>
  )
}

function Flow({ d, added, removed }: { d: string; added?: boolean; removed?: boolean }) {
  return (
    <motion.path
      d={d}
      stroke={added ? '#10b981' : removed ? '#f97316' : 'var(--color-ink)'}
      strokeWidth={added || removed ? 3 : 1.7}
      strokeLinecap="round"
      strokeDasharray={removed ? '8 8' : undefined}
      fill="none"
      opacity={added || removed ? 0.9 : 0.38}
      initial={{ pathLength: 0 }}
      whileInView={{ pathLength: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7 }}
    />
  )
}

function NodeCard({ node }: { node: VersionNode }) {
  const tone =
    node.state === 'added'
      ? 'border-emerald-500/45 bg-emerald-50 shadow-[0_0_0_3px_rgba(16,185,129,.1)]'
      : node.state === 'removed'
        ? 'border-orange-400 border-dashed bg-orange-50/80'
        : 'border-line bg-surface'

  return (
    <div
      className={'absolute flex w-[188px] -translate-x-1/2 -translate-y-1/2 items-center gap-3 rounded-2xl border px-3 py-3 text-ink shadow-[0_16px_42px_-32px_rgba(0,0,0,.65)] backdrop-blur-sm ' + tone}
      style={{ left: `${node.x}%`, top: `${node.y}%` }}
    >
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-line bg-white p-2">
        <Icon icon={node.icon} width={36} height={36} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{node.label}</span>
        <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.18em] text-grey-3">{node.tech}</span>
      </span>
      {node.state !== 'same' && (
        <span className={'absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full border border-line bg-surface ' + (node.state === 'added' ? 'text-emerald-600' : 'text-orange-500')}>
          <Icon icon={node.state === 'added' ? 'lucide:plus' : 'lucide:minus'} width={15} />
        </span>
      )}
    </div>
  )
}

function VersionBadge({ side, version, body, tone }: { side: string; version: string; body: string; tone: 'orange' | 'green' }) {
  return (
    <div className="rounded-2xl border border-line bg-surface/90 px-4 py-3 text-ink shadow-[0_16px_42px_-32px_rgba(0,0,0,.65)] backdrop-blur">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-grey-3">
        <span className={'h-2 w-2 rounded-full ' + (tone === 'green' ? 'bg-emerald-500' : 'bg-orange-500')} />
        {side}
      </div>
      <div className="mt-1 text-lg font-semibold tracking-[-0.02em]">{version}</div>
      <div className="text-xs text-grey-4">{body}</div>
    </div>
  )
}

function DiffPill({ icon, label, value, tone }: { icon: string; label: string; value: string; tone: 'orange' | 'green' }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink">
      <Icon icon={icon} width={15} height={15} className={tone === 'green' ? 'text-emerald-600' : 'text-orange-500'} />
      <span className="font-mono text-[9px] uppercase tracking-widest text-grey-3">{label}</span>
      {value}
    </span>
  )
}

function ChangeCard({ icon, label, value, tone }: { icon: string; label: string; value: string; tone: 'orange' | 'green' }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface/92 px-4 py-3 text-ink shadow-[0_16px_42px_-34px_rgba(0,0,0,.65)] backdrop-blur">
      <span className={'grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white ' + (tone === 'green' ? 'text-emerald-600' : 'text-orange-500')}>
        <Icon icon={icon} width={21} height={21} />
      </span>
      <span className="min-w-0">
        <span className="block font-mono text-[9px] uppercase tracking-[0.2em] text-grey-3">{label}</span>
        <span className="block truncate text-sm font-semibold">{value}</span>
      </span>
    </div>
  )
}
