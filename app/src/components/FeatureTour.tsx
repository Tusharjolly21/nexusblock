import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Icon } from '@iconify/react'

type Rect = { top: number; left: number; width: number; height: number }

const TOUR_KEY = 'nexusblock-editor-feature-tour-v1'

const STEPS = [
  {
    target: '[data-tour="canvas"]',
    icon: 'lucide:mouse-pointer-2',
    title: 'Welcome to the canvas',
    body: 'Draw diagrams, docs, tables, device frames, code blocks, and architecture nodes on the same workspace.',
  },
  {
    target: '[data-tour="left-rail"]',
    icon: 'lucide:panel-left',
    title: 'Everything starts here',
    body: 'Open insert, icons, diagram catalog, search, layers, snapshots, device frames, docs, and DSL from the left rail.',
  },
  {
    target: '[data-tour="tool-cluster"]',
    icon: 'lucide:pen-tool',
    title: 'Fast drawing tools',
    body: 'Pick shapes, lines, arrows, text, figures, code blocks, and connector styles without covering the canvas.',
  },
  {
    target: '[data-tour="dsl-toggle"]',
    icon: 'lucide:square-code',
    title: 'Diagram as code',
    body: 'Open the DSL panel to generate or edit flowcharts and ERDs. Canvas edits can be pulled back into code.',
  },
  {
    target: '[data-tour="inspector-toggle"]',
    icon: 'lucide:sliders-horizontal',
    title: 'Inspect and clean up',
    body: 'Use the inspector for style, layers, comments, and lint issues when your diagram needs review quality.',
  },
] as const

export function FeatureTour() {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const step = STEPS[index]

  useEffect(() => {
    const seen = localStorage.getItem(TOUR_KEY)
    if (!seen) {
      const t = window.setTimeout(() => setOpen(true), 700)
      return () => window.clearTimeout(t)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const update = () => {
      const el = document.querySelector<HTMLElement>(step.target)
      if (!el) {
        setRect(null)
        return
      }
      const r = el.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open, step])

  const card = useMemo(() => {
    if (!rect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    const width = 336
    const gap = 14
    const viewportW = window.innerWidth
    const viewportH = window.innerHeight
    const besideRight = rect.left + rect.width + width + gap < viewportW
    const besideLeft = rect.left - width - gap > 0
    const top = Math.min(Math.max(rect.top + rect.height / 2 - 110, 72), viewportH - 260)
    if (besideRight) return { top, left: rect.left + rect.width + gap, transform: 'none' }
    if (besideLeft) return { top, left: rect.left - width - gap, transform: 'none' }
    return { top: Math.min(rect.top + rect.height + gap, viewportH - 260), left: Math.min(Math.max(rect.left, 16), viewportW - width - 16), transform: 'none' }
  }, [rect])

  const close = () => {
    localStorage.setItem(TOUR_KEY, '1')
    setOpen(false)
  }

  const next = () => {
    if (index === STEPS.length - 1) close()
    else setIndex((i) => i + 1)
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] pointer-events-none">
          <motion.div
            className="absolute inset-0 bg-ink/12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {rect && (
            <motion.div
              className="absolute rounded-2xl border border-ink bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,.10),0_18px_55px_-30px_rgba(0,0,0,.55)]"
              initial={false}
              animate={{
                top: rect.top - 8,
                left: rect.left - 8,
                width: rect.width + 16,
                height: rect.height + 16,
              }}
              transition={{ type: 'spring', stiffness: 420, damping: 36 }}
            />
          )}

          <motion.div
            key={index}
            className="pointer-events-auto absolute w-[336px] rounded-2xl border border-line bg-surface p-4 text-ink shadow-[0_24px_70px_-30px_rgba(0,0,0,.55)]"
            style={card}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-paper">
                <Icon icon={step.icon} width={18} />
              </span>
              <button onClick={close} className="grid h-8 w-8 place-items-center rounded-lg text-grey-3 hover:bg-grey-1 hover:text-ink" aria-label="Close tour">
                <Icon icon="lucide:x" width={16} />
              </button>
            </div>
            <h2 className="font-display text-xl font-semibold tracking-tight">{step.title}</h2>
            <p className="mt-2 text-sm leading-6 text-grey-4">{step.body}</p>
            <div className="mt-5 flex items-center justify-between">
              <div className="flex gap-1">
                {STEPS.map((_, i) => (
                  <span key={i} className={'h-1.5 rounded-full transition-all ' + (i === index ? 'w-6 bg-ink' : 'w-1.5 bg-grey-2')} />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={close} className="rounded-full px-3 py-1.5 text-sm font-semibold text-grey-3 hover:text-ink">Skip</button>
                <button onClick={next} className="rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-paper hover:opacity-90">
                  {index === STEPS.length - 1 ? 'Done' : 'Next'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
