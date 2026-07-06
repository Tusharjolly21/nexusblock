import { useEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import { useDocStore } from '../store/useDocStore'
import { useEditorUi } from '../store/useEditorUi'
import { useApp, selectCurrentFile } from '../store/useApp'
import { useAuth } from '../store/useAuth'
import { cloudEnabled, pullContent, pushContent } from '../sync/cloud'
import { loadVersions, restoreVersion, saveVersion, saveVersions, type DocVersion } from '../canvas/versions'

/** Version history as a top-bar popover (snapshot save + restore). */
export function VersionMenu() {
  const editor = useDocStore((s) => s.editor)
  const file = useApp(selectCurrentFile)
  const fileId = file?.id ?? 'scratch'
  const uid = useAuth((s) => s.uid)
  const ownerUid = file?.sharedFrom ?? uid
  const canEdit = !file?.sharedFrom || file.sharedRole === 'edit'
  const setDiffVersion = useEditorUi((s) => s.setDiffVersion)
  const [open, setOpen] = useState(false)
  const [versions, setVersions] = useState<DocVersion[]>([])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setVersions(loadVersions(fileId))
    if (!ownerUid || !cloudEnabled()) return
    let cancelled = false
    void pullContent(ownerUid, fileId).then((content) => {
      if (cancelled || !content?.versions) return
      try {
        const remote = JSON.parse(content.versions) as DocVersion[]
        saveVersions(fileId, remote)
        setVersions(remote)
      } catch {
        /* ignore malformed versions */
      }
    })
    return () => { cancelled = true }
  }, [open, fileId, ownerUid])

  const save = () => {
    if (!editor || !canEdit) return
    const next = saveVersion(editor, undefined, fileId)
    setVersions(next)
    if (ownerUid && cloudEnabled()) pushContent(ownerUid, fileId, { versions: JSON.stringify(next) }).catch(() => {})
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="rounded-full border border-grey-2 px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-ink"
      >
        History
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-64 rounded-xl border border-line bg-paper p-2 shadow-[0_16px_40px_-16px_rgba(0,0,0,.3)]">
          <div className="flex items-center justify-between px-1 pb-1.5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-grey-3">
              Versions · {versions.length}
            </span>
            <button
              onClick={save}
              disabled={!editor || !canEdit}
              className="rounded-full border border-grey-2 px-2.5 py-0.5 text-xs font-semibold text-ink transition-colors hover:border-ink disabled:opacity-40"
            >
              Save snapshot
            </button>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {versions.length === 0 ? (
              <p className="px-1 py-2 text-xs text-grey-3">No snapshots yet.</p>
            ) : (
              versions.map((v) => (
                <div
                  key={v.id}
                  className="group flex w-full items-center justify-between rounded-lg px-2 py-1.5 hover:bg-grey-1"
                >
                  <button
                    onClick={() => {
                      if (editor) restoreVersion(editor, v)
                      setOpen(false)
                    }}
                    title={`Restore ${v.label}`}
                    className="flex flex-1 flex-col text-left outline-none"
                  >
                    <span className="text-sm font-medium text-grey-4">{v.label}</span>
                    <span className="font-mono text-[9px] text-grey-3">
                      {new Date(v.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setDiffVersion(v)
                      setOpen(false)
                    }}
                    title={`Compare active canvas with ${v.label}`}
                    className="ml-2 hidden h-7 w-7 place-items-center rounded-lg border border-line bg-surface text-grey-4 hover:border-ink hover:text-ink group-hover:grid"
                  >
                    <Icon icon="lucide:git-compare-arrows" width={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
