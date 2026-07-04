import { motion } from 'framer-motion'

type LoadingAnimationProps = {
  label?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'cycle12' | 'rotate12' | 'cycle8' | 'rotate8'
  color?: string
  className?: string
}

const SIZE = {
  sm: { wrap: 'h-9 w-9', line: 4, length: 13, radius: 14, label: 'text-xs' },
  md: { wrap: 'h-16 w-16', line: 7, length: 23, radius: 25, label: 'text-sm' },
  lg: { wrap: 'h-24 w-24', line: 9, length: 28, radius: 34, label: 'text-sm' },
}

const DOTS_12 = Array.from({ length: 12 })
const DOTS_8 = Array.from({ length: 8 })

export function LoadingAnimation({
  label = 'Loading...',
  size = 'md',
  variant = 'cycle12',
  color = 'var(--color-ink)',
  className = '',
}: LoadingAnimationProps) {
  const cfg = SIZE[size]
  const count = variant.endsWith('8') ? 8 : 12
  const dots = count === 8 ? DOTS_8 : DOTS_12
  const rotate = variant.startsWith('rotate')

  return (
    <div className={`flex flex-col items-center justify-center gap-4 text-grey-3 ${className}`} role="status" aria-live="polite">
      <div className={`relative ${cfg.wrap}`} aria-hidden="true">
        <motion.div
          className="absolute inset-0"
          animate={rotate ? { rotate: 360 } : undefined}
          transition={rotate ? { duration: count === 12 ? 1.7 : 1.3, repeat: Infinity, ease: 'linear' } : undefined}
        >
          {dots.map((_, i) => {
            const angle = (360 / count) * i
            const delay = (i / count) * (rotate ? 0.35 : 1)
            return (
              <span
                key={i}
                className="absolute left-1/2 top-1/2"
                style={{
                  width: cfg.line,
                  height: cfg.length,
                  transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-${cfg.radius}px)`,
                }}
              >
                <motion.span
                  className="block h-full w-full rounded-full"
                  style={{ background: color }}
                  animate={{ opacity: [0.18, 0.18, 1, 0.18, 0.18] }}
                  transition={{
                    duration: rotate ? 0.9 : 1.05,
                    repeat: Infinity,
                    ease: 'linear',
                    delay,
                  }}
                />
              </span>
            )
          })}
        </motion.div>
      </div>
      {label && <div className={`text-center font-medium text-grey-4 ${cfg.label}`}>{label}</div>}
    </div>
  )
}
