import { Icon } from '@iconify/react'
import { useApp, selectCurrentFile } from '../store/useApp'
import { useEditorUi } from '../store/useEditorUi'
import { DocPane } from './DocPane'

/**
 * The document surface. `full` = a centered Notion-style page (Doc view);
 * otherwise it fills the right column of the split. Same BlockNote editor either
 * way, so content is shared across modes.
 */
export function DocView({ full = false }: { full?: boolean }) {
  const file = useApp(selectCurrentFile)
  const renameFile = useApp((s) => s.renameFile)
  const setViewMode = useEditorUi((s) => s.setViewMode)

  return (
    <div className={'flex h-full min-w-0 flex-col bg-surface ' + (full ? '' : 'border-l border-line')}>
      {/* header */}
      <div className="flex h-12 flex-none items-center justify-between border-b border-line px-4">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-grey-3">
          <Icon icon="lucide:file-text" width={13} /> Document
        </div>
        {!full && (
          <button
            onClick={() => setViewMode('canvas')}
            title="Hide document"
            className="grid h-8 w-8 place-items-center rounded-lg text-grey-4 hover:bg-grey-1 hover:text-ink"
          >
            <Icon icon="lucide:panel-right-close" width={16} />
          </button>
        )}
      </div>

      {/* body */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className={full ? 'mx-auto w-full max-w-3xl px-8 py-12' : 'px-2 py-4'}>
          {full && (
            <input
              aria-label="Document title"
              value={file?.title ?? 'Untitled'}
              onChange={(e) => file && renameFile(file.id, e.target.value)}
              placeholder="Untitled"
              className="mb-4 w-full bg-transparent font-display text-4xl font-semibold tracking-tight text-ink outline-none placeholder:text-grey-3"
            />
          )}
          <DocPane />
        </div>
      </div>
    </div>
  )
}
