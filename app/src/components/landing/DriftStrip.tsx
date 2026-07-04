import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Icon } from '@iconify/react'

/** Section 6: the product thesis, with three parallax layers (spec 5.1 §6). */
export function DriftStrip() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const yBack = useTransform(scrollYProgress, [0, 1], [40, -40])
  const yMid = useTransform(scrollYProgress, [0, 1], [20, -20])
  const yFront = useTransform(scrollYProgress, [0, 1], [-10, 10])

  return (
    <section ref={ref} className="relative overflow-hidden border-y border-line bg-paper py-28">
      <motion.div style={{ y: yBack }} className="pointer-events-none absolute inset-0 opacity-[0.5]"
        aria-hidden>
        <div className="mx-auto mt-10 h-64 max-w-3xl rounded-3xl border border-line" />
      </motion.div>

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-2">
        <motion.div style={{ y: yMid }}>
          <div className="mb-4 flex items-center gap-2.5 font-mono text-xs uppercase tracking-widest text-grey-3">
            <span className="h-px w-6 bg-grey-3" /> The differentiator
          </div>
          <h2 className="font-display text-[clamp(28px,3.6vw,42px)] font-medium leading-tight tracking-[-0.03em]">
            Your diagram, checked against reality.
          </h2>
          <p className="mt-4 text-lg text-grey-4">
            Connect a read-only AWS role or Terraform state. Every night we diff what's actually running against
            what you drew — and badge the drift before the diagram becomes a lie.
          </p>
        </motion.div>

        <motion.div style={{ y: yFront }} className="relative">
          <div
            className="relative rounded-2xl border border-line bg-surface p-6"
            style={{ backgroundImage: 'radial-gradient(circle, var(--color-canvas-dot) 1px, transparent 1px)', backgroundSize: '18px 18px' }}
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold">
                <Icon icon="logos:terraform-icon" width={18} height={18} /> terraform.tfstate
              </span>
              <Icon icon="lucide:arrow-right" width={18} className="text-grey-3" />
              <span className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold">
                <Icon icon="lucide:git-compare" width={16} /> your diagram
              </span>
            </div>
            <motion.div
              animate={{ opacity: [1, 0.35, 1] }}
              transition={{ duration: 2.4, repeat: Infinity }}
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-grey-2 bg-surface px-3 py-1.5 font-mono text-xs text-grey-4"
            >
              <Icon icon="lucide:alert-triangle" width={13} /> drift · prod has 3 queues, diagram shows 1
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
