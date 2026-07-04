import { Icon } from '@iconify/react'
import { useTheme, TONES, type Tone, isDarkTone } from '../store/useTheme'

/** Two-mode selector used in onboarding. */
export function ToneSwatches({
  onHover,
  size = 40,
}: {
  onHover?: (tone: Tone | null) => void
  size?: number
}) {
  const tone = useTheme((s) => s.tone)
  const setTone = useTheme((s) => s.setTone)
  return (
    <div className="inline-flex rounded-full border border-line bg-surface p-1 shadow-[0_12px_28px_-24px_rgba(0,0,0,.5)]">
      {TONES.map((t) => {
        const active = tone === t.id
        return (
          <button
            key={t.id}
            onClick={() => setTone(t.id)}
            onMouseEnter={() => onHover?.(t.id)}
            onMouseLeave={() => onHover?.(null)}
            title={t.label}
            aria-label={`${t.label} mode`}
            aria-pressed={active}
            className={
              'flex items-center gap-2 rounded-full px-4 font-medium transition-colors ' +
              (active ? 'bg-ink text-paper shadow-sm' : 'text-grey-4 hover:bg-grey-1 hover:text-ink')
            }
            style={{ height: size }}
          >
            <Icon icon={t.dark ? 'lucide:moon' : 'lucide:sun'} width={16} height={16} />
            <span className="text-sm">{t.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Compact premium light/obsidian toggle for the top bar. */
export function ToneToggle() {
  const tone = useTheme((s) => s.tone)
  const setTone = useTheme((s) => s.setTone)
  const dark = isDarkTone(tone)
  const next = dark ? 'light' : 'obsidian'

  return (
    <button
      onClick={() => setTone(next)}
      title={dark ? 'Switch to light mode' : 'Switch to obsidian mode'}
      aria-label={dark ? 'Switch to light mode' : 'Switch to obsidian mode'}
      aria-pressed={dark}
      className="group relative flex h-8 w-[58px] items-center rounded-full border border-line bg-surface p-1 text-grey-4 shadow-[0_10px_24px_-20px_rgba(0,0,0,.55)] transition-colors hover:border-ink"
    >
      <span
        className={
          'absolute top-1 grid h-6 w-6 place-items-center rounded-full bg-ink text-paper shadow-sm transition-transform duration-300 ' +
          (dark ? 'translate-x-6' : 'translate-x-0')
        }
      >
        <Icon icon={dark ? 'lucide:moon' : 'lucide:sun'} width={14} height={14} />
      </span>
      <span className="grid h-6 w-6 place-items-center">
        <Icon icon="lucide:sun" width={13} height={13} />
      </span>
      <span className="ml-auto grid h-6 w-6 place-items-center">
        <Icon icon="lucide:moon" width={13} height={13} />
      </span>
    </button>
  )
}
