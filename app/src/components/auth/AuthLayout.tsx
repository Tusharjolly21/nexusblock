import { Link } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { motion } from 'framer-motion'
import { Logo } from '../Logo'
import { ToneToggle } from '../ToneToggle'

/**
 * Split-screen auth shell: the form on the left, a branded showcase on the right
 * (hidden on small screens). Tone-aware, dot-grid backdrop — same visual
 * language as the product.
 */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-screen overflow-hidden bg-paper text-ink lg:grid-cols-[minmax(420px,0.82fr)_minmax(560px,1.18fr)]">
      {/* form side */}
      <div className="relative flex min-h-0 flex-col px-6 py-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
            <Logo /> nexusblock
          </Link>
          <ToneToggle />
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>

      {/* showcase side */}
      <div
        className="relative hidden overflow-hidden border-l border-line bg-surface lg:block"
        style={{ backgroundImage: 'radial-gradient(circle, var(--color-canvas-dot) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      >
        <AuthProductShowcase />
      </div>
    </div>
  )
}

function AuthProductShowcase() {
  return (
    <div className="relative flex h-full min-h-0 flex-col gap-5 p-8 xl:p-10">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="shrink-0"
      >
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-paper/90 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-grey-3 shadow-sm">
          <motion.span
            className="h-1.5 w-1.5 rounded-full bg-ink"
            animate={{ scale: [1, 1.6, 1], opacity: [1, 0.45, 1] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          />
          Live canvas · Diagrams · Code
        </div>
        <h2 className="max-w-xl font-display text-[32px] font-medium leading-[1.06] tracking-[-0.03em] xl:text-[40px]">
          Map real systems, not placeholder boxes.
        </h2>
        <p className="mt-3 max-w-lg text-sm leading-6 text-grey-4">
          Architecture, flowcharts, ERDs, docs, and code blocks stay editable on one canvas with logos that mean something.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        className="relative min-h-0 flex-1 rounded-[26px] border border-line bg-paper/95 p-3 shadow-[0_32px_90px_-52px_rgba(0,0,0,.55)]"
      >
        <div className="flex h-full min-h-[390px] flex-col overflow-hidden rounded-[20px] border border-line bg-surface">
          <div className="flex h-11 shrink-0 items-center justify-between border-b border-line bg-paper px-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              <span className="ml-3 rounded-lg border border-line bg-surface px-2.5 py-1 font-mono text-[10px] text-grey-4">payments.nbdsl</span>
            </div>
            <div className="flex items-center gap-1 rounded-full border border-line bg-surface p-1 text-[10px] font-semibold text-grey-4">
              {[
                ['Architecture', 'lucide:boxes'],
                ['Flow', 'lucide:git-branch'],
                ['ERD', 'lucide:table-2'],
              ].map(([label, icon], index) => (
                <motion.span
                  key={label}
                  className={'flex items-center gap-1 rounded-full px-2 py-1 ' + (index === 0 ? 'bg-ink text-paper' : '')}
                  animate={index === 0 ? { opacity: [1, 0.84, 1] } : undefined}
                  transition={{ duration: 2.4, repeat: Infinity }}
                >
                  <Icon icon={icon} width={12} /> {label}
                </motion.span>
              ))}
            </div>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-[1fr_168px] xl:grid-cols-[1fr_188px]">
            <div className="relative overflow-hidden border-r border-line">
              <div
                className="absolute inset-0 opacity-70"
                style={{ backgroundImage: 'radial-gradient(circle, var(--color-canvas-dot) 1px, transparent 1px)', backgroundSize: '20px 20px' }}
              />
              <ArchitectureScene />
              <FlowScene />
              <ErdScene />
            </div>
            <InspectorScene />
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function ArchitectureScene() {
  const nodes = [
    { x: '8%', y: '17%', icon: 'logos:react', label: 'Checkout UI', tech: 'React' },
    { x: '36%', y: '17%', icon: 'logos:cloudflare-icon', label: 'Edge + WAF', tech: 'Cloudflare' },
    { x: '64%', y: '17%', icon: 'logos:aws-api-gateway', label: 'API gateway', tech: 'AWS' },
    { x: '36%', y: '52%', icon: 'logos:kafka-icon', label: 'Payment events', tech: 'Kafka' },
    { x: '64%', y: '52%', icon: 'logos:postgresql', label: 'Ledger DB', tech: 'Postgres' },
  ]

  return (
    <div className="absolute inset-0">
      <DiagramLine left="26%" top="25%" width="10%" delay={0.1} />
      <DiagramLine left="54%" top="25%" width="10%" delay={0.25} />
      <DiagramLine left="73%" top="36%" height="15%" delay={0.4} />
      <DiagramLine left="54%" top="61%" width="10%" delay={0.55} />

      <motion.div
        className="absolute left-[5%] top-[10%] h-[28%] w-[28%] rounded-2xl border border-dashed border-[#3b82f6]/45 bg-[#3b82f6]/5"
        animate={{ opacity: [0.55, 1, 0.55] }}
        transition={{ duration: 3.4, repeat: Infinity }}
      />
      <motion.div
        className="absolute left-[33%] top-[45%] h-[29%] w-[54%] rounded-2xl border border-dashed border-[#e93d82]/35 bg-[#e93d82]/5"
        animate={{ opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 3.8, repeat: Infinity, delay: 0.5 }}
      />

      {nodes.map((node, index) => (
        <motion.div
          key={node.label}
          className="absolute flex h-[66px] w-[min(150px,24%)] min-w-[118px] items-center gap-2.5 rounded-2xl border border-line bg-paper px-3 shadow-sm"
          style={{ left: node.x, top: node.y }}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 * index, duration: 0.45 }}
          whileHover={{ y: -4 }}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line bg-surface">
            <Icon icon={node.icon} width={21} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold text-ink">{node.label}</span>
            <span className="block font-mono text-[10px] uppercase tracking-widest text-grey-3">{node.tech}</span>
          </span>
        </motion.div>
      ))}
    </div>
  )
}

function FlowScene() {
  return (
    <motion.div
      className="absolute bottom-5 left-5 right-5 rounded-2xl border border-line bg-paper/92 p-3 shadow-sm"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.55 }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-grey-3">Flowchart</span>
        <span className="rounded-full bg-[#30a46c]/10 px-2 py-0.5 text-[10px] font-semibold text-[#30a46c]">auto-synced</span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2">
        <FlowPill icon="lucide:shopping-cart" label="Checkout" />
        <Icon icon="lucide:arrow-right" width={15} className="text-grey-3" />
        <FlowPill icon="lucide:shield-check" label="Authorize" tone="purple" />
        <Icon icon="lucide:arrow-right" width={15} className="text-grey-3" />
        <FlowPill icon="logos:stripe" label="Payment" tone="pink" />
      </div>
    </motion.div>
  )
}

function ErdScene() {
  return (
    <motion.div
      className="absolute right-5 top-[37%] hidden w-[176px] rounded-2xl border border-line bg-paper shadow-sm 2xl:block"
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.75, duration: 0.55 }}
    >
      <div className="border-b border-line bg-[#3b82f6]/10 px-3 py-2 text-xs font-bold text-ink">orders</div>
      {['id uuid pk', 'customerId uuid', 'status varchar', 'totalCents bigint'].map((row) => (
        <div key={row} className="flex items-center justify-between border-b border-line px-3 py-2 last:border-b-0">
          <span className="font-mono text-[10px] text-grey-4">{row}</span>
        </div>
      ))}
    </motion.div>
  )
}

function InspectorScene() {
  return (
    <div className="bg-paper p-3 xl:p-4">
      <div className="font-mono text-[10px] uppercase tracking-widest text-grey-3">Inspector</div>
      <div className="mt-3 rounded-2xl border border-line bg-surface p-3">
        <div className="flex items-center gap-2">
          <Icon icon="logos:aws-lambda" width={22} />
          <div>
            <div className="text-sm font-semibold">Workers</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-grey-3">Lambda</div>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {['label', 'icon', 'arrow'].map((item, index) => (
            <motion.div
              key={item}
              className="h-7 rounded-lg border border-line bg-paper px-2 py-1 font-mono text-[10px] text-grey-3"
              animate={{ opacity: [0.55, 1, 0.55] }}
              transition={{ duration: 2.2, delay: index * 0.25, repeat: Infinity }}
            >
              {item}: editable
            </motion.div>
          ))}
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-line bg-surface p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
          <Icon icon="lucide:git-compare-arrows" width={14} /> Canvas to code
        </div>
        <pre className="overflow-hidden rounded-xl bg-ink p-3 font-mono text-[9px] leading-5 text-paper">
{`"API gateway" > "Workers"
"Events" > "Ledger DB"`}
        </pre>
      </div>
    </div>
  )
}

function DiagramLine({ left, top, width, height, delay = 0 }: { left: string; top: string; width?: string; height?: string; delay?: number }) {
  const horizontal = Boolean(width)
  return (
    <motion.span
      className="absolute block origin-left bg-ink/45"
      style={{ left, top, width: width ?? 1, height: height ?? 1 }}
      initial={{ scaleX: horizontal ? 0 : 1, scaleY: horizontal ? 1 : 0 }}
      animate={{ scaleX: 1, scaleY: 1 }}
      transition={{ duration: 0.55, delay, repeat: Infinity, repeatDelay: 4 }}
    />
  )
}

function FlowPill({ icon, label, tone = 'blue' }: { icon: string; label: string; tone?: 'blue' | 'purple' | 'pink' | 'green' }) {
  const toneClass = {
    blue: 'border-[#3b82f6]/35 bg-[#3b82f6]/10',
    purple: 'border-[#8b5cf6]/35 bg-[#8b5cf6]/10',
    pink: 'border-[#e93d82]/35 bg-[#e93d82]/10',
    green: 'border-[#30a46c]/35 bg-[#30a46c]/10',
  }[tone]

  return (
    <motion.span
      className={`flex h-10 min-w-0 items-center gap-2 rounded-xl border px-2.5 ${toneClass}`}
      animate={{ y: [0, -2, 0] }}
      transition={{ duration: 2.8, repeat: Infinity }}
    >
      <Icon icon={icon} width={16} />
      <span className="truncate text-xs font-semibold">{label}</span>
    </motion.span>
  )
}

/** Social sign-in buttons shared by sign-up and sign-in. */
export function SsoButtons({ onPick }: { onPick: (p: 'google' | 'github' | 'microsoft') => void }) {
  const rows: { p: 'google' | 'github' | 'microsoft'; icon: string; label: string; tone?: string }[] = [
    { p: 'google', icon: 'logos:google-icon', label: 'Continue with Google' },
    { p: 'github', icon: 'simple-icons:github', label: 'Continue with GitHub', tone: 'text-ink' },
    { p: 'microsoft', icon: 'logos:microsoft-icon', label: 'Continue with Microsoft' },
  ]
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <button
          key={r.p}
          onClick={() => onPick(r.p)}
          className="flex items-center justify-center gap-2.5 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink"
        >
          <Icon icon={r.icon} width={18} className={r.tone ?? ''} /> {r.label}
        </button>
      ))}
    </div>
  )
}

export function OrDivider() {
  return (
    <div className="my-5 flex items-center gap-3 text-grey-3">
      <span className="h-px flex-1 bg-line" />
      <span className="font-mono text-[11px] uppercase tracking-widest">or</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}

export const authInputCls =
  'w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-ink placeholder:text-grey-3'
