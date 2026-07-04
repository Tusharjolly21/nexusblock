import { motion } from 'framer-motion'
import { Icon } from '@iconify/react'
import { useEditorUi, type ViewMode } from '../store/useEditorUi'

const MODES: { id: ViewMode; icon: string; label: string }[] = [
  { id: 'canvas', icon: 'lucide:pen-tool', label: 'Canvas' },
  { id: 'split', icon: 'lucide:columns-2', label: 'Split' },
  { id: 'doc', icon: 'lucide:file-text', label: 'Doc' },
]

/** Eraser-style segmented control: Canvas · Split · Doc. */
export function ViewModeSwitch() {
  const viewMode = useEditorUi((s) => s.viewMode)
  const setViewMode = useEditorUi((s) => s.setViewMode)

  return (
    <div className="flex items-center gap-0.5 rounded-full border border-line bg-paper p-0.5">
      {MODES.map((m) => {
        const active = viewMode === m.id
        return (
          <button
            key={m.id}
            onClick={() => setViewMode(m.id)}
            title={`${m.label} view`}
            aria-pressed={active}
            className={
              'relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ' +
              (active ? 'text-paper' : 'text-grey-4 hover:text-ink')
            }
          >
            {active && (
              <motion.span
                layoutId="viewmode-pill"
                className="absolute inset-0 rounded-full bg-ink"
                transition={{ type: 'spring', stiffness: 500, damping: 34 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Icon icon={m.icon} width={14} />
              <span className="hidden sm:inline">{m.label}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
