import { Icon } from '@iconify/react'
import { TEMPLATES, type TemplateId } from '../onboarding/templates'

/** Modal grid of starter templates. Picking one creates + opens a file. */
export function TemplatePicker({
  onPick,
  onClose,
}: {
  onPick: (id: TemplateId) => void
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/30 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl border border-line bg-paper p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold tracking-tight">Start a new file</h2>
          <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg text-grey-3 hover:bg-grey-1 hover:text-ink">
            <Icon icon="lucide:x" width={16} height={16} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => onPick(t.id)}
              className="group flex flex-col rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:border-ink"
            >
              <TemplateThumb id={t.id} />
              <span className="mt-3 text-sm font-semibold text-ink">{t.name}</span>
              <span className="mt-0.5 text-xs text-grey-3">{t.description}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Tiny schematic preview per template. */
function TemplateThumb({ id }: { id: TemplateId }) {
  const box = 'fill-white stroke-ink'
  return (
    <div className="grid h-24 place-items-center rounded-xl border border-line bg-paper">
      <svg width="150" height="70" viewBox="0 0 150 70">
        {id === 'blank' && <rect x="1" y="1" width="148" height="68" rx="8" className="fill-none stroke-grey-2" strokeDasharray="4 4" />}
        {id === 'system' && (
          <g strokeWidth="1.5">
            <line x1="34" y1="35" x2="60" y2="35" className="stroke-ink" />
            <line x1="94" y1="35" x2="112" y2="22" className="stroke-ink" />
            <line x1="94" y1="35" x2="112" y2="48" className="stroke-ink" />
            <rect x="8" y="26" width="26" height="18" rx="3" className={box} />
            <rect x="60" y="26" width="34" height="18" rx="3" className={box} />
            <rect x="112" y="14" width="30" height="16" rx="3" className={box} />
            <rect x="112" y="40" width="30" height="16" rx="3" className={box} />
          </g>
        )}
        {id === 'micro' && (
          <g strokeWidth="1.5">
            <line x1="34" y1="35" x2="60" y2="16" className="stroke-ink" />
            <line x1="34" y1="35" x2="60" y2="35" className="stroke-ink" />
            <line x1="34" y1="35" x2="60" y2="54" className="stroke-ink" />
            <rect x="8" y="26" width="26" height="18" rx="3" className={box} />
            <rect x="60" y="8" width="30" height="15" rx="3" className={box} />
            <rect x="60" y="27" width="30" height="15" rx="3" className={box} />
            <rect x="60" y="46" width="30" height="15" rx="3" className={box} />
          </g>
        )}
        {id === 'notes' && (
          <g strokeWidth="1.5" className="stroke-grey-3">
            <line x1="30" y1="20" x2="120" y2="20" />
            <line x1="30" y1="34" x2="120" y2="34" />
            <line x1="30" y1="48" x2="90" y2="48" />
          </g>
        )}
        {id === 'git-s3' && (
          <g strokeWidth="1.5">
            <line x1="26" y1="26" x2="40" y2="26" className="stroke-ink" />
            <line x1="60" y1="26" x2="74" y2="26" className="stroke-ink" />
            <line x1="94" y1="26" x2="108" y2="26" className="stroke-ink" />
            <line x1="52" y1="36" x2="52" y2="46" className="stroke-ink" />
            <rect x="8" y="18" width="18" height="16" rx="3" className={box} />
            <rect x="40" y="18" width="20" height="16" rx="3" className={box} />
            <rect x="74" y="18" width="20" height="16" rx="3" className={box} />
            <rect x="108" y="18" width="20" height="16" rx="3" className={box} />
            <rect x="42" y="46" width="20" height="15" rx="3" className={box} />
          </g>
        )}
      </svg>
    </div>
  )
}
