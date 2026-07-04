import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import { react, type TLPageId } from 'tldraw'
import { useDocStore } from '../store/useDocStore'

type PageInfo = { id: TLPageId; name: string }

/**
 * Multi-page control for a file (Tier 3). tldraw pages live in the per-file
 * store, so they persist automatically. Floating bottom-left, mirroring the
 * page menu we hid from tldraw's default chrome.
 */
export function PageBar() {
  const editor = useDocStore((s) => s.editor)
  const [pages, setPages] = useState<PageInfo[]>([])
  const [currentId, setCurrentId] = useState<TLPageId | null>(null)
  const [editing, setEditing] = useState<TLPageId | null>(null)

  useEffect(() => {
    if (!editor) return
    return react('pages', () => {
      setPages(editor.getPages().map((p) => ({ id: p.id, name: p.name })))
      setCurrentId(editor.getCurrentPageId())
    })
  }, [editor])

  if (!editor || pages.length === 0) return null

  const addPage = () => {
    const before = new Set(editor.getPages().map((p) => p.id))
    editor.createPage({ name: `Page ${editor.getPages().length + 1}` })
    const created = editor.getPages().find((p) => !before.has(p.id))
    if (created) editor.setCurrentPage(created.id)
  }

  const removePage = (id: TLPageId) => {
    if (editor.getPages().length <= 1) return
    editor.deletePage(id)
  }

  return (
    <div className="pointer-events-auto absolute bottom-3 left-14 z-20 flex max-w-[52vw] items-center gap-1 overflow-x-auto rounded-xl border border-line bg-surface/95 p-1 shadow-[0_12px_30px_-14px_rgba(0,0,0,.3)] backdrop-blur">
      <Icon icon="lucide:files" width={14} className="ml-1 mr-0.5 shrink-0 text-grey-3" />
      {pages.map((p) =>
        editing === p.id ? (
          <input
            key={p.id}
            autoFocus
            defaultValue={p.name}
            onBlur={(e) => { editor.renamePage(p.id, e.target.value.trim() || p.name); setEditing(null) }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { editor.renamePage(p.id, e.currentTarget.value.trim() || p.name); setEditing(null) }
              if (e.key === 'Escape') setEditing(null)
            }}
            className="w-28 rounded-lg border border-ink bg-paper px-2 py-1 text-xs text-ink focus:outline-none"
          />
        ) : (
          <div key={p.id} className="group/pg relative shrink-0">
            <button
              onClick={() => editor.setCurrentPage(p.id)}
              onDoubleClick={() => setEditing(p.id)}
              title="Double-click to rename"
              className={
                'max-w-[160px] truncate rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ' +
                (currentId === p.id ? 'bg-ink text-paper' : 'text-grey-4 hover:bg-grey-1 hover:text-ink')
              }
            >
              {p.name}
            </button>
            {pages.length > 1 && (
              <button
                onClick={() => removePage(p.id)}
                aria-label="Delete page"
                className="absolute -right-1 -top-1 hidden h-4 w-4 place-items-center rounded-full bg-ink text-paper group-hover/pg:grid"
              >
                <Icon icon="lucide:x" width={10} />
              </button>
            )}
          </div>
        ),
      )}
      <button
        onClick={addPage}
        aria-label="Add page"
        title="Add page"
        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-grey-4 hover:bg-grey-1 hover:text-ink"
      >
        <Icon icon="lucide:plus" width={15} />
      </button>
    </div>
  )
}
