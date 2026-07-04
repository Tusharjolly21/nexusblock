import { Link } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { motion } from 'framer-motion'
import type { CSSProperties } from 'react'
import { TEMPLATE_CARDS } from './landingData'

/** Templates teaser (horizontal scroll-snap) or full grid for the page. */
export function TemplatesSection({ full = false }: { full?: boolean }) {
  const cards = full ? TEMPLATE_CARDS : TEMPLATE_CARDS.slice(0, 8)
  return (
    <section id="templates" className="mx-auto max-w-6xl px-6 py-24">
      <div className="mb-10 flex items-end justify-between">
        <div className="max-w-2xl">
          <div className="mb-4 flex items-center gap-2.5 font-mono text-xs uppercase tracking-widest text-grey-3">
            <span className="h-px w-6 bg-grey-3" /> Templates
          </div>
          <h2 className="font-display text-[clamp(30px,4vw,46px)] font-medium tracking-[-0.03em]">
            Start from a proven diagram.
          </h2>
        </div>
        {!full && (
          <Link to="/templates" className="hidden shrink-0 items-center gap-1.5 text-sm font-semibold text-ink hover:opacity-80 sm:flex">
            Browse all <Icon icon="lucide:arrow-right" width={15} />
          </Link>
        )}
      </div>

      <div className={full ? 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3' : 'flex snap-x gap-5 overflow-x-auto pb-4 [scrollbar-width:none]'}>
        {cards.map((c, i) => (
          <motion.div
            key={c.name}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5, delay: (i % 6) * 0.045 }}
            whileHover={{ y: -6 }}
            className={
              'group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-ink ' +
              (full ? 'min-h-[292px]' : 'w-72 shrink-0 snap-start')
            }
          >
            <motion.span
              aria-hidden
              animate={{ x: [-8, 8, -8], y: [0, -5, 0] }}
              transition={{ duration: 7 + (i % 3), repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-10 blur-2xl"
              style={{ backgroundColor: c.accent }}
            />
            <div
              className="relative mb-5 h-40 overflow-hidden rounded-xl border border-line bg-paper text-grey-3"
              style={{
                backgroundImage:
                  'linear-gradient(135deg, color-mix(in srgb, var(--accent) 16%, transparent), transparent 45%), radial-gradient(circle, var(--color-canvas-dot) 1px, transparent 1px)',
                backgroundSize: 'auto, 16px 16px',
                '--accent': c.accent,
              } as CSSProperties}
            >
              <div className="absolute left-5 top-5 grid h-24 w-24 place-items-center rounded-2xl border border-line bg-surface shadow-[0_12px_32px_-18px_rgba(0,0,0,.45)] transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-105">
                <Icon icon={c.icon} width={58} height={58} />
              </div>
              <div className="absolute bottom-4 right-4 flex -space-x-2">
                {c.stack.map((icon) => (
                  <span key={icon} className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface shadow-[0_8px_20px_-14px_rgba(0,0,0,.5)]">
                    <Icon icon={icon} width={24} height={24} />
                  </span>
                ))}
              </div>
              <div className="absolute bottom-4 left-5 flex items-center gap-1.5 rounded-full border border-line bg-surface/90 px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-grey-3">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.accent }} />
                {c.metric}
              </div>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-grey-3">{c.kind}</span>
            <span className="mt-1 text-lg font-semibold tracking-[-0.01em] text-ink">{c.name}</span>
            <span className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-grey-4 transition-colors group-hover:text-ink">
              Use template <Icon icon="lucide:arrow-up-right" width={14} />
            </span>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
