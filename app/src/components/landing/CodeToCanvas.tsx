import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { Icon } from '@iconify/react'

const CODE = `client user "User" [user]
external cdn "Cloudflare" [cloudflare]
service lb "Load balancer" [nginx]
service api "App servers" [nodejs]
db pg "Postgres" [postgres]
db cache "Redis" [redis]

user -> cdn -> lb
lb -> api
api -> pg
api -> cache`

// A correct request path: user → CDN → load balancer → app servers → data.
// cx/cy are the icon-tile centers in the 560×360 canvas space.
type FlowNode = { id: string; icon: string; label: string; cx: number; cy: number; at: number }
const NODES: FlowNode[] = [
  { id: 'user', icon: 'lucide:circle-user-round', label: 'User', cx: 58, cy: 180, at: 0.06 },
  { id: 'cdn', icon: 'logos:cloudflare-icon', label: 'Cloudflare', cx: 175, cy: 180, at: 0.2 },
  { id: 'lb', icon: 'logos:nginx', label: 'Load balancer', cx: 292, cy: 180, at: 0.34 },
  { id: 'api', icon: 'logos:nodejs-icon', label: 'App servers', cx: 409, cy: 180, at: 0.5 },
  { id: 'pg', icon: 'logos:postgresql', label: 'Postgres', cx: 512, cy: 108, at: 0.66 },
  { id: 'cache', icon: 'logos:redis', label: 'Redis cache', cx: 512, cy: 252, at: 0.8 },
]
const EDGES: [string, string][] = [
  ['user', 'cdn'],
  ['cdn', 'lb'],
  ['lb', 'api'],
  ['api', 'pg'],
  ['api', 'cache'],
]
const nodeById = Object.fromEntries(NODES.map((n) => [n.id, n]))

/** Section 5: the DSL types itself; a real system-design flow draws in sync. */
export function CodeToCanvas() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const [n, setN] = useState(0)

  useEffect(() => {
    if (!inView) return
    let i = 0
    const id = setInterval(() => {
      i += 1
      setN(i)
      if (i >= CODE.length) clearInterval(id)
    }, 20)
    return () => clearInterval(id)
  }, [inView])

  const typed = CODE.slice(0, n)
  const p = n / CODE.length
  const done = n >= CODE.length

  return (
    <section id="code" ref={ref} className="mx-auto max-w-6xl px-6 py-24">
      <div className="mb-14 max-w-2xl">
        <div className="mb-4 flex items-center gap-2.5 font-mono text-xs uppercase tracking-widest text-grey-3">
          <span className="h-px w-6 bg-grey-3" /> Diagram as code
        </div>
        <h2 className="font-display text-[clamp(30px,4vw,46px)] font-medium leading-tight tracking-[-0.03em]">
          Type the system. Watch it draw itself.
        </h2>
        <p className="mt-4 text-lg text-grey-4">
          A readable DSL, reviewed in a pull request like any other code — rendered as native, editable shapes with
          real technology logos, never a static image.
        </p>
      </div>

      <div className="grid overflow-hidden rounded-2xl border border-line lg:grid-cols-[minmax(0,0.85fr)_1.15fr]">
        {/* code pane */}
        <div className="border-b border-line lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2 border-b border-line bg-paper px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-grey-3">
            <Icon icon="lucide:code-2" width={13} /> architecture.nb
          </div>
          <pre className="h-[360px] overflow-hidden whitespace-pre-wrap bg-surface p-5 font-mono text-[13px] leading-[1.85] text-grey-4">
            {typed}
            {!done && <span className="ml-0.5 inline-block h-[15px] w-[7px] translate-y-[2px] animate-pulse bg-ink" />}
          </pre>
        </div>

        {/* canvas pane — real system-design flow */}
        <div
          className="relative h-[360px] overflow-hidden bg-surface"
          style={{ backgroundImage: 'radial-gradient(circle, var(--color-canvas-dot) 1px, transparent 1px)', backgroundSize: '22px 22px' }}
        >
          <svg viewBox="0 0 560 360" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full" aria-hidden>
            {EDGES.map(([a, b], i) => {
              const na = nodeById[a]
              const nb = nodeById[b]
              const show = p > Math.max(na.at, nb.at) + 0.03
              return (
                <motion.path
                  key={`${a}-${b}`}
                  d={`M ${na.cx + 30} ${na.cy} C ${(na.cx + nb.cx) / 2} ${na.cy}, ${(na.cx + nb.cx) / 2} ${nb.cy}, ${nb.cx - 30} ${nb.cy}`}
                  stroke="var(--color-ink)"
                  strokeWidth="1.6"
                  fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={show ? { pathLength: 1, opacity: 1 } : {}}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                />
              )
            })}
          </svg>

          {NODES.map((node) => (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={p >= node.at ? { opacity: 1, scale: 1 } : {}}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="absolute flex w-[84px] flex-col items-center gap-2"
              style={{ left: `${((node.cx - 42) / 560) * 100}%`, top: `${((node.cy - 30) / 360) * 100}%` }}
            >
              <div className="grid h-[52px] w-[52px] place-items-center rounded-2xl border border-line bg-surface shadow-[0_2px_10px_-4px_rgba(0,0,0,.25)]">
                <Icon icon={node.icon} width={30} height={30} />
              </div>
              <span className="text-center text-[11px] font-semibold leading-tight text-ink">{node.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
