import { useEffect, useReducer, useState } from 'react'
import { react } from 'tldraw'
import { Icon } from '@iconify/react'
import { useDocStore } from '../store/useDocStore'
import { useApp, selectCurrentFile } from '../store/useApp'
import { useAuth } from '../store/useAuth'
import { useComments } from '../store/useComments'

const isEditableTarget = (target: EventTarget | null) => {
  const node = target as HTMLElement | null
  return !!node?.closest('input, textarea, select, [contenteditable="true"], .monaco-editor')
}

/**
 * Canvas comment pins (Eraser-style). The Comment tool (`C`) drops a
 * point-anchored pin anywhere on the canvas; pins render as inline markers that
 * open their thread on click. Reuses the shared `useComments` store with a
 * `{ kind: 'point', x, y }` target.
 */
export function CommentPinLayer() {
  const editor = useDocStore((s) => s.editor)
  const active = useDocStore((s) => s.commentToolActive)
  const setActive = useDocStore((s) => s.setCommentToolActive)
  const file = useApp(selectCurrentFile)
  const fileId = file?.id ?? 'scratch'
  const canEdit = !file?.sharedFrom || file.sharedRole === 'edit'
  const authName = useAuth((s) => s.name)
  const email = useAuth((s) => s.email)
  const profileName = useApp((s) => s.profile?.name)
  const threads = useComments((s) => s.threadsByFile[fileId] ?? [])
  const addThread = useComments((s) => s.addThread)
  const updateThread = useComments((s) => s.updateThread)
  const deleteThread = useComments((s) => s.deleteThread)

  const [, bump] = useReducer((n: number) => n + 1, 0)
  const [openId, setOpenId] = useState<string | null>(null)
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null)
  const [draftText, setDraftText] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)

  // Re-render pins whenever the camera (pan/zoom) or viewport changes.
  useEffect(() => {
    if (!editor) return
    return react('comment-pins-camera', () => {
      editor.getCamera()
      editor.getViewportPageBounds()
      bump()
    })
  }, [editor])

  // `C` toggles the tool; Escape cancels the tool or an open draft.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return
      if (e.key === 'Escape') {
        if (useDocStore.getState().commentToolActive) { setActive(false); bump() }
        setDraft(null)
        setOpenId(null)
        return
      }
      if (e.key.toLowerCase() !== 'c' || e.metaKey || e.ctrlKey || e.altKey) return
      const ed = useDocStore.getState().editor
      if (!ed || ed.getEditingShapeId() || !canEdit) return
      e.preventDefault()
      e.stopPropagation()
      ed.setCurrentTool('select')
      setActive(!useDocStore.getState().commentToolActive)
    }
    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true })
  }, [setActive, canEdit])

  if (!editor) return null

  const toLayer = (x: number, y: number) => {
    const s = editor.pageToScreen({ x, y })
    const rect = editor.getContainer().getBoundingClientRect()
    return { x: s.x - rect.left, y: s.y - rect.top }
  }

  const pins = threads.filter((t) => t.target.kind === 'point')
  const openThread = pins.find((t) => t.id === openId) || null

  const submitDraft = () => {
    if (!draft || !draftText.trim() || !canEdit) return
    const thread = addThread(fileId, {
      target: { kind: 'point', x: draft.x, y: draft.y, label: 'Canvas pin' },
      author: displayAuthor(profileName, authName, email),
      body: draftText.trim(),
    })
    setDraft(null)
    setDraftText('')
    setEmojiOpen(false)
    setOpenId(thread.id)
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-[11]">
      {/* Existing pins */}
      {pins.map((t) => {
        if (t.target.kind !== 'point') return null
        const p = toLayer(t.target.x, t.target.y)
        const resolved = t.status === 'resolved'
        return (
          <button
            key={t.id}
            onClick={(e) => { e.stopPropagation(); setOpenId(openId === t.id ? null : t.id); setDraft(null) }}
            title={t.body}
            style={{ left: p.x, top: p.y }}
            className={
              'pointer-events-auto absolute -translate-x-1 -translate-y-full rounded-full rounded-bl-none border p-1.5 shadow-md transition-transform hover:scale-110 ' +
              (resolved ? 'border-line bg-grey-1 text-grey-3' : 'border-ink bg-ink text-paper')
            }
          >
            <Icon icon="lucide:message-circle" width={14} />
          </button>
        )
      })}

      {/* Open thread popover */}
      {openThread && openThread.target.kind === 'point' && (
        <PinPopover
          x={toLayer(openThread.target.x, openThread.target.y).x}
          y={toLayer(openThread.target.x, openThread.target.y).y}
          body={openThread.body}
          author={openThread.author}
          resolved={openThread.status === 'resolved'}
          canEdit={canEdit}
          onToggle={() => updateThread(fileId, openThread.id, { status: openThread.status === 'open' ? 'resolved' : 'open' })}
          onDelete={() => { deleteThread(fileId, openThread.id); setOpenId(null) }}
          onClose={() => setOpenId(null)}
        />
      )}

      {/* Draft composer at the just-placed point */}
      {draft && (
        <div
          style={{ left: toLayer(draft.x, draft.y).x, top: toLayer(draft.x, draft.y).y }}
          className="pointer-events-auto absolute w-64 -translate-y-2 rounded-2xl border border-line bg-paper p-2 shadow-xl"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <textarea
            autoFocus
            value={draftText}
            onChange={(e) => setDraftText(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitDraft() }
              if (e.key === 'Escape') { setDraft(null); setDraftText('') }
            }}
            rows={2}
            placeholder="Add comment. Enter to send"
            className="w-full resize-none rounded-xl border border-line bg-surface px-2.5 py-1.5 text-sm text-ink outline-none placeholder:text-grey-3 focus:border-ink"
          />
          <div className="mt-1.5 flex items-center justify-between">
            <div className="relative flex items-center gap-1">
              <button onClick={() => setEmojiOpen((v) => !v)} className="rounded-lg px-2 py-1 text-xs text-grey-3 hover:bg-grey-1 hover:text-ink" title="Add emoji">
                <Icon icon="lucide:smile" width={14} />
              </button>
              {emojiOpen && <EmojiPicker onPick={(emoji) => { setDraftText((v) => v + emoji); setEmojiOpen(false) }} />}
              <button onClick={() => { setDraft(null); setDraftText(''); setEmojiOpen(false) }} className="rounded-lg px-2 py-1 text-xs text-grey-3 hover:text-ink">Cancel</button>
            </div>
            <button onClick={submitDraft} disabled={!draftText.trim()} className="rounded-lg bg-ink px-3 py-1 text-xs font-semibold text-paper hover:opacity-90 disabled:opacity-40">Send</button>
          </div>
        </div>
      )}

      {/* Placement capture overlay: click anywhere to drop a pin */}
      {active && canEdit && (
        <div
          className="pointer-events-auto absolute inset-0 cursor-crosshair"
          onPointerDown={(e) => {
            if (e.button !== 0) return
            e.preventDefault()
            e.stopPropagation()
            const p = editor.screenToPage({ x: e.clientX, y: e.clientY })
            setDraft({ x: p.x, y: p.y })
            setDraftText('')
            setOpenId(null)
            setActive(false)
          }}
        />
      )}
    </div>
  )
}

const COMMENT_EMOJIS = ['👍', '✅', '👀', '🔥', '💡', '🚀', '❤️', '🙏']

function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  return (
    <div className="absolute bottom-8 left-0 z-20 grid w-36 grid-cols-4 gap-1 rounded-xl border border-line bg-paper p-2 shadow-xl">
      {COMMENT_EMOJIS.map((emoji) => (
        <button key={emoji} onClick={() => onPick(emoji)} className="grid h-7 w-7 place-items-center rounded-lg text-base hover:bg-grey-1">
          {emoji}
        </button>
      ))}
    </div>
  )
}

function displayAuthor(profileName?: string | null, authName?: string | null, email?: string | null) {
  const name = profileName || authName
  if (name && !name.includes('@')) return name
  if (email) return email.split('@')[0]
  return 'Teammate'
}

function formatAuthor(author: string) {
  return author.includes('@') ? author.split('@')[0] : author
}

function PinPopover({
  x, y, body, author, resolved, canEdit, onToggle, onDelete, onClose,
}: {
  x: number; y: number; body: string; author: string; resolved: boolean; canEdit: boolean
  onToggle: () => void; onDelete: () => void; onClose: () => void
}) {
  return (
    <div
      style={{ left: x + 14, top: y - 8 }}
      className="pointer-events-auto absolute w-64 -translate-y-full rounded-2xl border border-line bg-paper p-3 shadow-xl"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className="truncate text-xs font-semibold text-grey-4">{formatAuthor(author)}</span>
        <button onClick={onClose} className="rounded-md p-0.5 text-grey-3 hover:text-ink"><Icon icon="lucide:x" width={13} /></button>
      </div>
      <p className="text-sm leading-relaxed text-ink">{body}</p>
      {canEdit && (
        <div className="mt-2.5 flex items-center justify-between">
          <button
            onClick={onToggle}
            className="rounded-full border border-line px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-grey-3 hover:border-ink hover:text-ink"
          >
            {resolved ? 'resolved' : 'open'}
          </button>
          <button onClick={onDelete} className="rounded-lg px-2 py-1 text-grey-3 hover:bg-grey-1 hover:text-ink"><Icon icon="lucide:trash-2" width={13} /></button>
        </div>
      )}
    </div>
  )
}
