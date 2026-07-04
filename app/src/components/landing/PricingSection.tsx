import { Link } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { motion } from 'framer-motion'
import { TIERS } from './landingData'

/** Pricing cards (spec 5.1 §9) — flat plans, no per-seat. */
export function PricingSection({ heading = true }: { heading?: boolean }) {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-6 py-24">
      {heading && (
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="font-display text-[clamp(30px,4vw,46px)] font-medium tracking-[-0.03em]">
            Flat pricing. No per-seat surprises.
          </h2>
          <p className="mt-4 text-lg text-grey-4">Start free. Upgrade when your diagrams start earning their keep.</p>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        {TIERS.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.5 }}
            className={
              'flex flex-col rounded-2xl border p-7 ' +
              (t.featured ? 'border-ink bg-surface shadow-[0_20px_50px_-24px_rgba(0,0,0,.3)]' : 'border-line bg-paper')
            }
          >
            <div className="flex items-center justify-between">
              <span className="font-display text-lg font-semibold">{t.name}</span>
              {t.featured && (
                <span className="rounded-full bg-ink px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-paper">
                  Popular
                </span>
              )}
            </div>
            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="font-display text-4xl font-semibold tracking-tight">{t.price}</span>
              <span className="text-sm text-grey-3">{t.cadence}</span>
            </div>
            <p className="mt-2 text-sm text-grey-4">{t.tagline}</p>
            <Link
              to="/signup"
              className={
                'mt-6 rounded-full py-2.5 text-center text-sm font-semibold transition-colors ' +
                (t.featured ? 'bg-ink text-paper hover:opacity-90' : 'border border-grey-2 text-ink hover:border-ink')
              }
            >
              {t.cta}
            </Link>
            <ul className="mt-7 space-y-3">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-grey-4">
                  <Icon icon="lucide:check" width={16} className="mt-0.5 shrink-0 text-ink" />
                  {f}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
