import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Icon } from '@iconify/react'
import { useAuth } from '../store/useAuth'
import { useSelfDrawDiagram, useStaggerReveal } from './landing/anime'
import { CountUp } from './landing/CountUp'
import { CanvasToDoc } from './landing/CanvasToDoc'
import { FeatureGrid } from './landing/FeatureGrid'
import { Reveal } from './landing/Reveal'
import { LiveCursors } from './landing/LiveCursors'
import { LandingNav, LandingFooter } from './landing/LandingChrome'
import { LivingGrid } from './landing/LivingGrid'
import { LogoStrip } from './landing/LogoStrip'
import { CodeToCanvas } from './landing/CodeToCanvas'
import { DriftStrip } from './landing/DriftStrip'
import { VersionDiff } from './landing/VersionDiff'
import { TemplatesSection } from './landing/TemplatesSection'
import { PricingSection } from './landing/PricingSection'
import heroAsset from '../assets/hero.png'

const rise = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.6, ease: [0.2, 0.8, 0.2, 1] as const } }),
}

/** Marketing landing (spec Part 5), tone-aware, lucide icons, no emojis. */
export function Landing() {
  const authed = useAuth((s) => s.authed)
  const startHref = authed ? '/app' : '/signup'
  return (
    <div className="min-h-full overflow-x-hidden bg-paper text-ink">
      <LivingGrid />
      <div className="relative z-10">
        <LandingNav />

        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 pb-8 pt-24 text-center">
          <motion.span variants={rise} initial="hidden" animate="show" custom={0}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 font-mono text-xs uppercase tracking-wider text-grey-3">
            <span className="h-1.5 w-1.5 rounded-full bg-ink" /> Live drift checks for production systems
          </motion.span>
          <motion.h1 variants={rise} initial="hidden" animate="show" custom={1}
            className="mx-auto mt-7 max-w-[15ch] font-display text-[clamp(44px,6.4vw,84px)] font-medium leading-[1.03] tracking-[-0.035em]">
            Diagrams that <span className="text-grey-3">stay true</span> to your system
          </motion.h1>
          <motion.p variants={rise} initial="hidden" animate="show" custom={2}
            className="mx-auto mt-6 max-w-[52ch] text-lg text-grey-4">
            Draw architecture, write docs, and generate diagrams from code — then let nexusblock watch your real
            infrastructure and flag the drift before your diagram becomes a lie.
          </motion.p>
          <motion.div variants={rise} initial="hidden" animate="show" custom={3} className="mt-9 flex justify-center gap-3">
            <Link to={startHref} className="flex items-center gap-1.5 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper transition-transform hover:-translate-y-px">
              Start drawing — free <Icon icon="lucide:arrow-right" width={15} />
            </Link>
            <a href="#code" className="rounded-full border border-grey-2 px-5 py-3 text-sm font-semibold text-ink transition-colors hover:border-ink">
              See it as code
            </a>
          </motion.div>
        </section>

        {/* Signature mockup */}
        <section className="mx-auto max-w-5xl px-6 pb-20 pt-8">
          <AppMockup />
        </section>

        <LogoStrip />
        <ProductShowcase />

        <CanvasToDoc />

        <FeatureOperatingSystem />

        <CodeToCanvas />
        <DriftStrip />
        <VersionDiff />
        <TemplatesSection />
        <FeatureGrid />
        <PricingSection />

        {/* Final CTA */}
        <section className="mx-auto max-w-6xl px-6 pb-28">
          <Reveal
            className="rounded-3xl border border-line px-8 py-24 text-center"
            style={{
              backgroundImage:
                'radial-gradient(circle at 50% -10%, var(--color-surface) 0%, transparent 60%), radial-gradient(circle, var(--color-canvas-dot) 1px, transparent 1px)',
              backgroundSize: 'auto, 26px 26px',
            }}
          >
            <h2 className="mx-auto max-w-[18ch] font-display text-[clamp(28px,4vw,44px)] font-medium tracking-[-0.03em]">
              Your architecture, drawn once. True forever.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-grey-4">Free for individuals. Flat pricing for teams — no per-seat surprises.</p>
            <Link to={startHref} className="mt-8 inline-flex items-center gap-1.5 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper transition-transform hover:-translate-y-px">
              Open the canvas <Icon icon="lucide:arrow-right" width={15} />
            </Link>
          </Reveal>
        </section>

        <LandingFooter />
      </div>
    </div>
  )
}

/** Self-demoing app screenshot in a realistic MacBook, pure DOM (crisp at any DPR). */
function AppMockup() {
  return (
    <div className="mx-auto w-full max-w-[1040px]">
      {/* lid / screen */}
      <div className="relative rounded-t-[28px] rounded-b-[12px] bg-gradient-to-b from-[#3a3a3c] to-[#171719] p-[14px] pt-[26px] shadow-[0_44px_100px_-34px_rgba(0,0,0,.62)]">
        {/* camera */}
        <span className="absolute left-1/2 top-[11px] h-[7px] w-[7px] -translate-x-1/2 rounded-full bg-[#0a0a0a] ring-1 ring-[#333]">
          <span className="absolute left-1/2 top-1/2 h-[2px] w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1e2a3a]" />
        </span>
        <div className="overflow-hidden rounded-[10px] border border-black/45 bg-surface">
          {/* chrome */}
          <div className="flex items-center gap-3 border-b border-line bg-paper px-4 py-3">
            <div className="group flex gap-2">
              <span className="grid h-3 w-3 place-items-center rounded-full bg-[#ff5f57] ring-1 ring-black/10">
                <Icon icon="lucide:x" width={7} className="text-black/50 opacity-0 group-hover:opacity-100" />
              </span>
              <span className="grid h-3 w-3 place-items-center rounded-full bg-[#febc2e] ring-1 ring-black/10">
                <Icon icon="lucide:minus" width={7} className="text-black/50 opacity-0 group-hover:opacity-100" />
              </span>
              <span className="grid h-3 w-3 place-items-center rounded-full bg-[#28c840] ring-1 ring-black/10">
                <Icon icon="lucide:maximize-2" width={6} className="text-black/50 opacity-0 group-hover:opacity-100" />
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-t-lg border border-b-0 border-line bg-surface px-3 py-1.5 text-[11px] font-medium text-grey-4">
              <Icon icon="lucide:box" width={12} /> payments-service
            </div>
            <div className="flex flex-1 items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 font-mono text-[11px] text-grey-3">
              <Icon icon="lucide:lock" width={11} /> app.nexusblock.io/w/acme/payments-service
            </div>
          </div>
          <div className="grid h-[590px]" style={{ gridTemplateColumns: '54px 1fr 230px' }}>
            <div className="flex flex-col items-center gap-3 border-r border-line bg-paper pt-4 text-grey-3">
              {['lucide:mouse-pointer-2', 'lucide:plus', 'lucide:smile', 'lucide:monitor-smartphone', 'lucide:layout-grid', 'lucide:code-2'].map((ic, i) => (
                <span key={ic} className={'grid h-8 w-8 place-items-center rounded-lg ' + (i === 0 ? 'bg-ink text-paper' : '')}>
                  <Icon icon={ic} width={16} />
                </span>
              ))}
            </div>
            <div
              className="relative overflow-hidden"
              style={{
                backgroundImage: 'radial-gradient(circle, var(--color-canvas-dot) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            >
              <ArchitectureDiagram />
            </div>
            <div className="border-l border-line bg-paper p-3.5 text-[11px]">
              <div className="mb-2 font-mono text-[9px] uppercase tracking-widest text-grey-3">Inspector</div>
              <div className="rounded-xl border border-line bg-surface p-3">
                <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
                  <Icon icon="lucide:shield-check" width={15} /> Production diagram
                </div>
                <p className="text-grey-4"><CountUp value={24} /> services · <CountUp value={3} /> regions · <CountUp value={9} /> live bindings</p>
              </div>
              <div className="mb-2 mt-4 font-mono text-[9px] uppercase tracking-widest text-grey-3">Layers</div>
              {[
                ['logos:cloudflare-icon', 'Edge + CDN'],
                ['logos:aws-api-gateway', 'Public API'],
                ['logos:aws-lambda', 'Async workers'],
                ['logos:postgresql', 'Primary data'],
                ['logos:prometheus', 'Observability'],
              ].map(([ic, l], i) => (
                <div key={l} className={'flex items-center gap-2 rounded-md px-2 py-1.5 font-medium ' + (i === 2 ? 'bg-grey-1 text-ink' : 'text-grey-4')}>
                  <Icon icon={ic} width={16} height={16} /> {l}
                </div>
              ))}
              <div className="mb-2 mt-4 font-mono text-[9px] uppercase tracking-widest text-grey-3">Review</div>
              {['Queue fan-out documented', 'Drift check passed', '2 owners notified'].map((l) => (
                <div key={l} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-grey-3">
                  <Icon icon="lucide:check-circle-2" width={12} /> {l}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* aluminum base deck + notch */}
      <div className="relative mx-auto h-[14px] w-[calc(100%+72px)] max-w-none -translate-x-[36px] rounded-b-[12px] bg-gradient-to-b from-[#d0d0d4] to-[#8d8d92] shadow-[0_10px_20px_-10px_rgba(0,0,0,.5)]">
        <div className="absolute left-1/2 top-0 h-[7px] w-[130px] -translate-x-1/2 rounded-b-[8px] bg-[#7c7c82]" />
      </div>
    </div>
  )
}

function ArchitectureDiagram() {
  const ref = useRef<HTMLDivElement>(null)
  useSelfDrawDiagram(ref)
  return (
    <div ref={ref} className="absolute inset-0 min-w-[720px]">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 720 590" aria-hidden>
        <defs>
          <style>{`
            .diagram-line { stroke: var(--color-ink); stroke-width: 1.7; fill: none; opacity: .72; }
            .diagram-line-muted { stroke-dasharray: 6 7; opacity: .38; }
          `}</style>
          <marker id="mockArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M 0 0 L 8 4 L 0 8 z" fill="var(--color-ink)" />
          </marker>
        </defs>
        <path d="M130 132 H218" className="diagram-line" markerEnd="url(#mockArrow)" />
        <path d="M318 132 H398" className="diagram-line" markerEnd="url(#mockArrow)" />
        <path d="M498 132 H592" className="diagram-line" markerEnd="url(#mockArrow)" />
        <path d="M268 170 V246 H186" className="diagram-line" markerEnd="url(#mockArrow)" />
        <path d="M268 170 V246 H348" className="diagram-line" markerEnd="url(#mockArrow)" />
        <path d="M438 170 V246 H438" className="diagram-line" markerEnd="url(#mockArrow)" />
        <path d="M438 286 V368 H346" className="diagram-line" markerEnd="url(#mockArrow)" />
        <path d="M438 286 V368 H528" className="diagram-line" markerEnd="url(#mockArrow)" />
        <path d="M186 286 V430 H348" className="diagram-line diagram-line-muted" markerEnd="url(#mockArrow)" />
        <path d="M528 408 V462 H420" className="diagram-line diagram-line-muted" markerEnd="url(#mockArrow)" />
      </svg>

      <Cluster style={{ left: 26, top: 42, width: 166, height: 180 }} label="Users + edge" tone="orange" />
      <Cluster style={{ left: 214, top: 42, width: 168, height: 180 }} label="Public API" tone="blue" />
      <Cluster style={{ left: 402, top: 42, width: 260, height: 180 }} label="AWS us-east-1" tone="green" />
      <Cluster style={{ left: 120, top: 302, width: 500, height: 214 }} label="Async processing + data" tone="purple" />

      <MockNode style={{ left: 54, top: 104 }} icon="logos:react" label="Web app" tech="React" />
      <MockNode style={{ left: 228, top: 104 }} icon="logos:cloudflare-icon" label="CDN edge" tech="WAF" />
      <MockNode style={{ left: 408, top: 104 }} icon="logos:aws-api-gateway" label="API Gateway" tech="REST" />
      <MockNode style={{ left: 566, top: 104 }} icon="logos:aws-cognito" label="Auth" tech="Cognito" compact />
      <MockNode style={{ left: 138, top: 226 }} icon="logos:aws-s3" label="Assets" tech="S3" compact />
      <MockNode style={{ left: 322, top: 226 }} icon="logos:aws-eventbridge" label="Events" tech="Bus" compact />
      <MockNode style={{ left: 408, top: 226 }} icon="logos:aws-lambda" label="Workers" tech="Lambda" />
      <MockNode style={{ left: 268, top: 348 }} icon="logos:kafka-icon" label="Payment stream" tech="Kafka" />
      <MockNode style={{ left: 504, top: 348 }} icon="logos:postgresql" label="Ledger DB" tech="Postgres" />
      <MockNode style={{ left: 360, top: 446 }} icon="logos:redis" label="Cache + queues" tech="Redis" />

      <div className="hero-badge absolute right-4 top-4 flex items-center gap-1.5 rounded-full border border-line bg-surface/90 px-2.5 py-1 font-mono text-[9.5px] text-grey-4 shadow-sm backdrop-blur">
        <Icon icon="lucide:activity" width={11} /> live sync · <CountUp value={9} /> bindings healthy
      </div>
      <div className="hero-badge absolute bottom-4 left-4 flex items-center gap-2 rounded-xl border border-line bg-surface/90 px-3 py-2 text-[11px] text-grey-4 shadow-sm backdrop-blur">
        <Icon icon="lucide:git-compare" width={14} className="text-ink" />
        <span><strong className="text-ink">v18</strong> adds async payment workers, preserves edge/auth/data links.</span>
      </div>
    </div>
  )
}

function Cluster({ style, label, tone }: { style: React.CSSProperties; label: string; tone: 'orange' | 'blue' | 'green' | 'purple' }) {
  const colors = {
    orange: 'border-orange-400/70 bg-orange-500/[0.045] text-orange-600',
    blue: 'border-sky-400/70 bg-sky-500/[0.045] text-sky-600',
    green: 'border-emerald-400/70 bg-emerald-500/[0.045] text-emerald-600',
    purple: 'border-violet-400/70 bg-violet-500/[0.045] text-violet-600',
  }
  return (
    <div className={'hero-cluster absolute rounded-2xl border border-dashed ' + colors[tone]} style={style}>
      <div className="absolute left-3 top-2 font-mono text-[9px] uppercase tracking-widest">{label}</div>
    </div>
  )
}

function MockNode({ style, icon, label, tech, compact = false }: { style: React.CSSProperties; icon: string; label: string; tech: string; compact?: boolean }) {
  return (
    <div
      className={'hero-node absolute flex items-center rounded-xl border border-line bg-surface shadow-[0_10px_28px_-20px_rgba(0,0,0,.45)] ' + (compact ? 'gap-2 px-3 py-2' : 'gap-3 px-3.5 py-2.5')}
      style={style}
    >
      <span className={(compact ? 'h-8 w-8' : 'h-10 w-10') + ' grid shrink-0 place-items-center rounded-lg bg-grey-1'}>
        <Icon icon={icon} width={compact ? 23 : 28} height={compact ? 23 : 28} />
      </span>
      <span className={(compact ? 'text-[11px]' : 'text-[12px]') + ' font-semibold text-ink'}>{label}</span>
      <span className="rounded bg-grey-1 px-1.5 py-0.5 font-mono text-[8.5px] font-medium text-grey-3">{tech}</span>
    </div>
  )
}

function FeatureOperatingSystem() {
  const cardsRef = useRef<HTMLDivElement>(null)
  useStaggerReveal(cardsRef, '.feat-card')
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-24">
      <Reveal className="mb-12 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
        <div>
          <div className="mb-4 flex items-center gap-2.5 font-mono text-xs uppercase tracking-widest text-grey-3">
            <span className="h-px w-6 bg-grey-3" /> Why it's different
          </div>
          <h2 className="max-w-[12ch] font-display text-[clamp(36px,5vw,64px)] font-medium leading-[0.98] tracking-[-0.045em]">
            The canvas becomes the system record.
          </h2>
        </div>
        <p className="max-w-xl text-lg leading-8 text-grey-4 lg:justify-self-end">
          nexusblock is not just another drawing surface. It gives teams a workspace where diagrams, code, reviews,
          comments, icons, and drift checks all describe the same architecture.
        </p>
      </Reveal>

      <motion.div
        initial={{ opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
        className="overflow-hidden rounded-[30px] border border-line bg-surface shadow-[0_28px_90px_-60px_rgba(0,0,0,.55)]"
      >
        <div className="flex items-center justify-between border-b border-line bg-paper px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-surface">
              <Icon icon="lucide:boxes" width={17} />
            </span>
            <div>
              <div className="text-sm font-semibold">Production architecture</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-grey-3">canvas + code + review</div>
            </div>
          </div>
          <div className="hidden items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 font-mono text-[10px] text-emerald-600 sm:flex">
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-emerald-500"
              animate={{ scale: [1, 1.7, 1], opacity: [1, 0.45, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }}
            />
            2 editors live
          </div>
        </div>
        <div className="grid min-h-[460px] lg:grid-cols-[minmax(0,1fr)_320px]">
          <FeatureCanvas />
          <FeatureCodePanel />
        </div>
      </motion.div>

      <div ref={cardsRef} className="mt-5 grid gap-5 lg:grid-cols-3">
        <FeatureCard
          icon="lucide:git-compare-arrows"
          title="Version diffs"
          body="Added, removed, and changed services are visible in one calm review surface."
        >
          <DiffPreview />
        </FeatureCard>
        <FeatureCard
          icon="lucide:shield-check"
          title="Diagram lint"
          body="Unlabeled arrows, orphan nodes, and naming drift show up like IDE problems."
        >
          <LintPreview />
        </FeatureCard>
        <FeatureCard
          icon="logos:terraform-icon"
          title="Infra sync"
          body="Connect live state and keep the diagram honest after the first design review."
        >
          <SyncPreview />
        </FeatureCard>
      </div>
    </section>
  )
}

function FeatureCanvas() {
  const nodes = [
    { x: '8%', y: '18%', icon: 'logos:react', label: 'Web app', tech: 'React' },
    { x: '36%', y: '18%', icon: 'logos:cloudflare-icon', label: 'Edge CDN', tech: 'WAF' },
    { x: '64%', y: '18%', icon: 'logos:aws-api-gateway', label: 'API gateway', tech: 'AWS' },
    { x: '30%', y: '54%', icon: 'logos:kafka-icon', label: 'Events', tech: 'Kafka' },
    { x: '58%', y: '54%', icon: 'logos:aws-lambda', label: 'Workers', tech: 'Lambda' },
    { x: '58%', y: '76%', icon: 'logos:postgresql', label: 'Ledger DB', tech: 'Postgres' },
  ]

  return (
    <div
      className="relative min-h-[460px] overflow-hidden border-b border-line bg-paper lg:border-b-0 lg:border-r"
      style={{ backgroundImage: 'radial-gradient(circle, var(--color-canvas-dot) 1px, transparent 1px)', backgroundSize: '22px 22px' }}
    >
      <FeatureGroup className="left-[5%] top-[11%] h-[25%] w-[25%] border-[#3b82f6]/45 bg-[#3b82f6]/5 text-[#3b82f6]" label="client" />
      <FeatureGroup className="left-[33%] top-[11%] h-[25%] w-[50%] border-[#0ba5c7]/45 bg-[#0ba5c7]/5 text-[#0ba5c7]" label="edge + api" />
      <FeatureGroup className="left-[27%] top-[47%] h-[42%] w-[56%] border-[#e93d82]/40 bg-[#e93d82]/5 text-[#e93d82]" label="async + data" />
      <FeatureLine left="27%" top="25%" width="9%" delay={0.05} />
      <FeatureLine left="55%" top="25%" width="9%" delay={0.2} />
      <FeatureLine left="72%" top="34%" height="20%" delay={0.35} />
      <FeatureLine left="48%" top="61%" width="10%" delay={0.5} />
      <FeatureLine left="67%" top="66%" height="10%" delay={0.65} />

      {nodes.map((node, i) => (
        <motion.div
          key={node.label}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: i * 0.06 }}
          className="absolute flex h-[64px] w-[min(160px,23%)] min-w-[124px] items-center gap-2.5 rounded-2xl border border-line bg-surface px-3 shadow-[0_16px_40px_-30px_rgba(0,0,0,.65)]"
          style={{ left: node.x, top: node.y }}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-grey-1">
            <Icon icon={node.icon} width={22} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold">{node.label}</span>
            <span className="block font-mono text-[10px] uppercase tracking-widest text-grey-3">{node.tech}</span>
          </span>
        </motion.div>
      ))}

      <LiveCursors />

      <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 rounded-2xl border border-line bg-surface/90 p-2.5 shadow-sm backdrop-blur">
        {['logos:aws', 'logos:terraform-icon', 'logos:kubernetes', 'logos:redis', 'logos:github-actions'].map((icon) => (
          <span key={icon} className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-paper">
            <Icon icon={icon} width={21} />
          </span>
        ))}
        <span className="ml-auto rounded-full bg-ink px-3 py-1.5 font-mono text-[10px] text-paper">pull canvas</span>
      </div>
    </div>
  )
}

function FeatureCodePanel() {
  return (
    <div className="bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-widest text-grey-3">Diagram as code</div>
        <Icon icon="lucide:code-2" width={15} />
      </div>
      <pre className="h-[245px] overflow-hidden rounded-2xl border border-line bg-ink p-4 font-mono text-[10px] leading-6 text-paper">
{`direction right

"Edge + API" {
  "CDN edge" [icon: logos:cloudflare-icon]
  "API gateway" [icon: logos:aws-api-gateway]
}

"Async + data" {
  "Payment events" [icon: logos:kafka-icon]
  "Workers" [icon: logos:aws-lambda]
  "Ledger DB" [shape: cylinder, icon: logos:postgresql]
}

"API gateway" > "Payment events"
"Workers" > "Ledger DB"`}
      </pre>
      <div className="mt-5 space-y-2.5">
        {[
          ['lucide:check-circle-2', 'Native shapes, not screenshots'],
          ['lucide:arrow-left-right', 'Canvas edits can update code'],
          ['lucide:scan-search', 'Linting catches broken diagrams'],
        ].map(([icon, text]) => (
          <div key={text} className="flex items-center gap-2 rounded-xl border border-line bg-paper px-3 py-2 text-xs font-medium text-grey-4">
            <Icon icon={icon} width={14} className="text-ink" /> {text}
          </div>
        ))}
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, body, children }: { icon: string; title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="feat-card overflow-hidden rounded-[26px] border border-line bg-surface">
      <div className="p-6">
        <div className="mb-4 grid h-11 w-11 place-items-center rounded-2xl border border-line bg-paper">
          <Icon icon={icon} width={21} />
        </div>
        <h3 className="font-display text-[22px] font-semibold tracking-[-0.02em]">{title}</h3>
        <p className="mt-2 min-h-[48px] text-sm leading-6 text-grey-4">{body}</p>
      </div>
      {children}
    </div>
  )
}

function DiffPreview() {
  return (
    <div className="relative h-[190px] border-t border-line bg-paper">
      <div className="absolute inset-x-5 top-5 flex items-center justify-between">
        <span className="rounded-full border border-line bg-surface px-2.5 py-1 font-mono text-[10px] text-grey-3">before v14</span>
        <span className="rounded-full border border-line bg-surface px-2.5 py-1 font-mono text-[10px] text-grey-3">after v15</span>
      </div>
      <div className="absolute bottom-0 left-0 top-[54px] w-1/2 bg-[#f5820e]/8" />
      <div className="absolute bottom-0 right-0 top-[54px] w-1/2 bg-[#0ba5c7]/8" />
      <motion.div
        className="absolute bottom-5 top-[62px] w-px bg-ink"
        animate={{ left: ['44%', '56%', '44%'] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className="absolute left-1/2 top-1/2 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-line bg-surface shadow-sm">
          <Icon icon="lucide:chevrons-left-right" width={15} />
        </span>
      </motion.div>
      <MiniNode className="left-[11%] top-[50%]" icon="logos:nodejs-icon" label="Cron" muted />
      <MiniNode className="right-[11%] top-[42%]" icon="logos:kafka-icon" label="Events" />
      <MiniNode className="right-[14%] bottom-[14%]" icon="logos:redis" label="Workers" />
    </div>
  )
}

function LintPreview() {
  return (
    <div className="border-t border-line bg-paper p-5">
      <div className="space-y-3">
        {[
          ['lucide:tag', 'Unlabeled arrow', 'Payment events → Workers'],
          ['lucide:unplug', 'Orphan node', 'Legacy cron has no owner'],
          ['lucide:copy', 'Duplicate label', 'Two services named API'],
        ].map(([icon, title, detail], index) => (
          <motion.div
            key={title}
            className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-3"
            animate={{ opacity: [0.68, 1, 0.68] }}
            transition={{ duration: 2.6, delay: index * 0.28, repeat: Infinity }}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-grey-1">
              <Icon icon={icon} width={15} />
            </span>
            <span>
              <span className="block text-sm font-semibold">{title}</span>
              <span className="block text-xs leading-5 text-grey-3">{detail}</span>
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function SyncPreview() {
  return (
    <div className="border-t border-line bg-paper p-5">
      <div className="rounded-2xl border border-line bg-surface p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="font-mono text-[10px] uppercase tracking-widest text-grey-3">Read-only sources</div>
          <span className="rounded-full bg-[#30a46c]/10 px-2 py-1 text-[10px] font-semibold text-[#30a46c]">synced</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {['logos:aws', 'logos:terraform-icon', 'logos:kubernetes', 'logos:github-icon'].map((icon) => (
            <span key={icon} className="grid h-12 place-items-center rounded-2xl border border-line bg-paper">
              <Icon icon={icon} width={24} />
            </span>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-line bg-paper p-3 text-xs leading-5 text-grey-4">
          <strong className="text-ink">3 changes</strong> detected since the last review. Diagram badges update before the architecture drifts silently.
        </div>
      </div>
    </div>
  )
}

function FeatureGroup({ className, label }: { className: string; label: string }) {
  return (
    <div className={'absolute rounded-2xl border border-dashed ' + className}>
      <div className="absolute left-3 top-2 font-mono text-[9px] uppercase tracking-widest">{label}</div>
    </div>
  )
}

function FeatureLine({ left, top, width, height, delay = 0 }: { left: string; top: string; width?: string; height?: string; delay?: number }) {
  const horizontal = Boolean(width)
  return (
    <motion.span
      className="absolute block origin-left bg-ink/55"
      style={{ left, top, width: width ?? 1, height: height ?? 1 }}
      initial={{ scaleX: horizontal ? 0 : 1, scaleY: horizontal ? 1 : 0 }}
      whileInView={{ scaleX: 1, scaleY: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.65, delay }}
    />
  )
}

function MiniNode({ className, icon, label, muted = false }: { className: string; icon: string; label: string; muted?: boolean }) {
  return (
    <div className={'absolute flex items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-2 shadow-sm ' + className + (muted ? ' opacity-55' : '')}>
      <Icon icon={icon} width={23} />
      <span className="text-xs font-semibold">{label}</span>
    </div>
  )
}

const SHOWCASES = [
  {
    eyebrow: 'From cloud to canvas',
    title: 'Start with real infrastructure logos, not mystery boxes.',
    body: 'Template previews now surface the services your team actually recognizes: AWS, Kubernetes, Postgres, Kafka, Terraform, and the rest of the stack.',
    logos: ['logos:aws', 'logos:kubernetes', 'logos:cloudflare-icon', 'logos:postgresql', 'logos:kafka-icon', 'logos:terraform-icon'],
    reverse: false,
  },
  {
    eyebrow: 'Docs that move',
    title: 'The visual side keeps pace with the writing side.',
    body: 'Use diagrams as living product artifacts: code panes, drift badges, version diffs, and doc previews all share the same restrained workspace language.',
    logos: ['logos:github-icon', 'logos:markdown', 'logos:openai-icon', 'logos:notion-icon', 'logos:figma', 'logos:slack-icon'],
    reverse: true,
  },
]

function ProductShowcase() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="space-y-20">
        {SHOWCASES.map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
            className={'grid items-center gap-10 md:grid-cols-2 ' + (item.reverse ? 'md:[&>*:first-child]:order-2' : '')}
          >
            <LogoImagePanel logos={item.logos} variant={i} />
            <div>
              <div className="mb-4 flex items-center gap-2.5 font-mono text-xs uppercase tracking-widest text-grey-3">
                <span className="h-px w-6 bg-grey-3" /> {item.eyebrow}
              </div>
              <h2 className="font-display text-[clamp(28px,3.8vw,44px)] font-medium leading-tight tracking-[-0.03em]">
                {item.title}
              </h2>
              <p className="mt-4 text-lg text-grey-4">{item.body}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

function LogoImagePanel({ logos, variant }: { logos: string[]; variant: number }) {
  return (
    <div
      className="relative min-h-[360px] overflow-hidden rounded-2xl border border-line bg-surface"
      style={{ backgroundImage: 'radial-gradient(circle, var(--color-canvas-dot) 1px, transparent 1px)', backgroundSize: '20px 20px' }}
    >
      <motion.img
        src={heroAsset}
        alt=""
        aria-hidden
        animate={{ y: [0, -10, 0], rotate: variant === 0 ? [0, 1.5, 0] : [0, -1.5, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute left-1/2 top-1/2 w-52 -translate-x-1/2 -translate-y-1/2 opacity-85"
      />
      {logos.map((logo, i) => {
        const positions = [
          'left-[9%] top-[16%]',
          'right-[12%] top-[12%]',
          'left-[18%] bottom-[14%]',
          'right-[16%] bottom-[18%]',
          'left-[42%] top-[8%]',
          'left-[45%] bottom-[8%]',
        ]
        return (
          <motion.span
            key={logo}
            animate={{ y: [0, i % 2 ? 8 : -8, 0], rotate: [0, i % 2 ? -2 : 2, 0] }}
            transition={{ duration: 5 + i * 0.45, repeat: Infinity, ease: 'easeInOut' }}
            className={'absolute grid h-20 w-20 place-items-center rounded-2xl border border-line bg-surface shadow-[0_18px_38px_-26px_rgba(0,0,0,.55)] ' + positions[i]}
          >
            <Icon icon={logo} width={44} height={44} />
          </motion.span>
        )
      })}
    </div>
  )
}
