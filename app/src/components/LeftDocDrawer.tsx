import { Icon } from '@iconify/react'
import { useEditorUi } from '../store/useEditorUi'
import { DocPane } from './DocPane'

export function LeftDocDrawer() {
  const setLeftDocOpen = useEditorUi((s) => s.setLeftDocOpen)

  return (
    <aside className="flex w-[360px] min-w-[320px] max-w-[420px] flex-none flex-col border-r border-line bg-surface">
      <div className="flex h-12 items-center justify-between border-b border-line px-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-grey-3">Document</div>
          <div className="text-sm font-semibold text-ink">Notes beside the canvas</div>
        </div>
        <button
          onClick={() => setLeftDocOpen(false)}
          title="Hide document"
          className="grid h-8 w-8 place-items-center rounded-lg text-grey-4 hover:bg-grey-1 hover:text-ink"
        >
          <Icon icon="lucide:panel-left-close" width={16} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <DocPane />
      </div>
    </aside>
  )
}
