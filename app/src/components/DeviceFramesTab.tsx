import { Icon } from '@iconify/react'
import { createDeviceFrame, type DeviceFrameKind } from '../canvas/createNode'
import { useDocStore } from '../store/useDocStore'

const DEVICE_FRAMES: Array<{ kind: DeviceFrameKind; label: string; hint: string; icon: string }> = [
  { kind: 'phone', label: 'Phone', hint: 'Mobile screen mockup', icon: 'lucide:smartphone' },
  { kind: 'tablet', label: 'Tablet', hint: 'Tablet screen mockup', icon: 'lucide:tablet' },
  { kind: 'desktop', label: 'Desktop', hint: 'Monitor screen mockup', icon: 'lucide:monitor' },
  { kind: 'chrome', label: 'Chrome', hint: 'Browser window mockup', icon: 'lucide:panel-top' },
]

/** Left rail device frame panel: black-screen mockups for product / app flows. */
export function DeviceFramesTab() {
  const editor = useDocStore((s) => s.editor)

  return (
    <div className="h-full overflow-y-auto overscroll-contain p-3">
      <div className="grid grid-cols-2 gap-2">
      {DEVICE_FRAMES.map((frame) => (
        <button
          key={frame.kind}
          onClick={() => {
            if (editor) createDeviceFrame(editor, frame.kind)
          }}
          className="group rounded-xl border border-line bg-surface p-2.5 text-left transition-colors hover:border-ink"
        >
          <span className="mb-2 grid h-24 place-items-center rounded-lg border border-line bg-grey-1">
            <DevicePreview kind={frame.kind} />
          </span>
          <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Icon icon={frame.icon} width={15} height={15} />
            {frame.label}
          </span>
          <span className="mt-0.5 block truncate text-xs text-grey-3">{frame.hint}</span>
        </button>
      ))}
      </div>
    </div>
  )
}

function DevicePreview({ kind }: { kind: DeviceFrameKind }) {
  if (kind === 'phone') {
    return <span className="block h-20 w-11 rounded-[10px] border-2 border-ink bg-ink shadow-sm" />
  }
  if (kind === 'tablet') {
    return <span className="block h-20 w-14 rounded-[8px] border-2 border-ink bg-ink shadow-sm" />
  }
  if (kind === 'desktop') {
    return (
      <span className="flex flex-col items-center">
        <span className="block h-12 w-20 rounded-sm border-2 border-ink bg-ink shadow-sm" />
        <span className="h-3 w-2 bg-ink" />
        <span className="h-1.5 w-9 rounded-sm bg-ink" />
      </span>
    )
  }
  return (
    <span className="block h-14 w-24 overflow-hidden rounded-sm border-2 border-ink bg-paper shadow-sm">
      <span className="flex h-3 items-center gap-1 border-b border-ink px-1">
        <span className="h-1.5 w-1.5 rounded-full bg-ink" />
        <span className="h-1.5 w-1.5 rounded-full bg-ink" />
        <span className="h-1.5 w-1.5 rounded-full bg-ink" />
      </span>
      <span className="block h-[calc(100%-12px)] bg-ink" />
    </span>
  )
}
