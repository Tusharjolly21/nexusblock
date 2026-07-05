import { useRef } from 'react'
import { Icon } from '@iconify/react'
import { useStaggerReveal } from './anime'
import { Reveal } from './Reveal'

type Feature = {
  icon: string
  title: string
  body: string
  accent?: 'collab' | 'ai' | 'sync'
  span?: boolean
}

const FEATURES: Feature[] = [
  {
    icon: 'lucide:users',
    title: 'Real-time collaboration',
    body: 'Multiplayer canvas and docs with live cursors. Self-hosted sync — no per-seat limits.',
    accent: 'collab',
    span: true,
  },
  {
    icon: 'lucide:sparkles',
    title: 'AI diagram generation',
    body: 'Describe a system in plain English and watch it draw itself into native shapes.',
    accent: 'ai',
  },
  {
    icon: 'lucide:file-code-2',
    title: 'Diagram as code',
    body: 'Write flow & ERD DSL that compiles to real, editable diagrams — and pull the canvas back to code.',
  },
  {
    icon: 'lucide:message-circle',
    title: 'Comments & threads',
    body: 'Drop pin comments anywhere on the canvas, or thread review notes right in the doc.',
  },
  {
    icon: 'lucide:history',
    title: 'Version history',
    body: 'Snapshot any state and diff exactly what changed across every review.',
  },
  {
    icon: 'lucide:shield-check',
    title: 'Diagram lint',
    body: 'Orphan nodes, unlabeled arrows and naming drift surface like IDE problems.',
  },
  {
    icon: 'lucide:download',
    title: 'Export anywhere',
    body: 'Ship as PNG, SVG, PDF, or Markdown — pixel-crisp at any scale.',
  },
  {
    icon: 'lucide:link',
    title: 'Share & access control',
    body: 'Share links with view or edit roles, plus a tidy “Shared with me” space.',
  },
  {
    icon: 'lucide:cloud',
    title: 'Cloud sync',
    body: 'Every file follows you across devices with per-user cloud storage.',
    accent: 'sync',
  },
  {
    icon: 'lucide:shapes',
    title: 'Icons, shapes & connectors',
    body: 'Thousands of tech logos, custom shapes, and smart elbow + arrow routing.',
  },
  {
    icon: 'lucide:layout-template',
    title: 'Templates',
    body: 'Start from system-design, ERD, and flow templates instead of a blank page.',
  },
]

export function FeatureGrid() {
  const gridRef = useRef<HTMLDivElement>(null)
  useStaggerReveal(gridRef, '.fg-card')

  return (
    <section id="capabilities" className="mx-auto max-w-6xl px-6 py-24">
      <Reveal className="mb-12 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
        <div>
          <div className="mb-4 flex items-center gap-2.5 font-mono text-xs uppercase tracking-widest text-grey-3">
            <span className="h-px w-6 bg-grey-3" /> Everything in one canvas
          </div>
          <h2 className="max-w-[13ch] font-display text-[clamp(34px,4.6vw,58px)] font-medium leading-[1.0] tracking-[-0.04em]">
            Every way to describe a system.
          </h2>
        </div>
        <p className="max-w-xl text-lg leading-8 text-grey-4 lg:justify-self-end">
          Draw it, write it, generate it from a prompt, or compile it from code — then review, version, and ship
          it. One workspace where the diagram, the docs, and the truth are the same thing.
        </p>
      </Reveal>

      <div ref={gridRef} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <article
            key={f.title}
            className={
              'fg-card group relative overflow-hidden rounded-3xl border border-line bg-surface p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-ink hover:shadow-[0_24px_60px_-40px_rgba(0,0,0,.45)] ' +
              (f.span ? 'sm:col-span-2' : '')
            }
          >
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-line bg-paper text-ink transition-colors group-hover:border-ink">
                <Icon icon={f.icon} width={20} />
              </span>
              {f.accent && <FeatureAccent kind={f.accent} />}
            </div>
            <h3 className="font-display text-[19px] font-semibold tracking-[-0.015em] text-ink">{f.title}</h3>
            <p className="mt-2 max-w-[42ch] text-sm leading-6 text-grey-4">{f.body}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

/** Tiny living accents — CSS-only so they cost nothing and respect reduced-motion. */
function FeatureAccent({ kind }: { kind: NonNullable<Feature['accent']> }) {
  if (kind === 'collab') {
    return (
      <span className="ml-auto flex -space-x-1.5" aria-hidden>
        {['bg-sky-500', 'bg-emerald-500', 'bg-violet-500'].map((c, i) => (
          <span
            key={c}
            className={'grid h-6 w-6 place-items-center rounded-full border-2 border-surface text-[9px] font-bold text-white motion-safe:animate-[nbFloat_3s_ease-in-out_infinite] ' + c}
            style={{ animationDelay: `${i * 0.4}s` }}
          >
            {['A', 'M', 'K'][i]}
          </span>
        ))}
      </span>
    )
  }
  if (kind === 'ai') {
    return (
      <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-line bg-paper px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-grey-3" aria-hidden>
        <span className="h-1.5 w-1.5 rounded-full bg-ink motion-safe:animate-pulse" /> Claude
      </span>
    )
  }
  return (
    <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-emerald-600" aria-hidden>
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse" /> Synced
    </span>
  )
}
