import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import { loadVersions, restoreVersion, saveVersion, type DocVersion } from '../canvas/versions'
import { useDocStore } from '../store/useDocStore'
import { useApp, selectCurrentFile } from '../store/useApp'

export function SnapshotsPanel() {
  const editor = useDocStore((s) => s.editor)
  const fileId = useApp(selectCurrentFile)?.id ?? 'scratch'
  const [versions, setVersions] = useState<DocVersion[]>([])

  useEffect(() => {
    setVersions(loadVersions(fileId))
  }, [fileId])

  const save = () => {
    if (!editor) return
    const label = `v${versions.length + 1} · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    setVersions(saveVersion(editor, label, fileId))
  }

  const restore = (version: DocVersion) => {
    if (!editor) return
    restoreVersion(editor, version)
    editor.zoomToFit({ animation: { duration: 360 } })
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-line p-3">
        <div className="rounded-xl border border-line bg-surface p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Icon icon="lucide:history" width={16} />
            Version snapshots
          </div>
          <p className="mt-1 text-xs leading-relaxed text-grey-3">
            Save restore points before major architecture edits.
          </p>
          <button
            onClick={save}
            disabled={!editor}
            className="mt-3 w-full rounded-xl bg-ink px-3 py-2 text-sm font-semibold text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Save snapshot
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
        {versions.length === 0 ? (
          <div className="rounded-xl border border-line bg-surface p-4 text-sm text-grey-3">
            No snapshots yet.
          </div>
        ) : (
          <div className="space-y-2">
            {versions.map((version, index) => (
              <button
                key={version.id}
                onClick={() => restore(version)}
                className="flex w-full items-start gap-3 rounded-xl border border-line bg-surface p-3 text-left transition-colors hover:border-ink"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-paper font-mono text-[11px] font-bold text-ink">
                  {versions.length - index}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{version.label}</span>
                  <span className="mt-0.5 block truncate text-xs text-grey-3">
                    {new Date(version.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="mt-2 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-grey-3">
                    Restore snapshot <Icon icon="lucide:rotate-ccw" width={11} />
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
