import { useEffect, useReducer, useState } from 'react'
import { react } from 'tldraw'
import { Icon } from '@iconify/react'
import { useDocStore } from '../store/useDocStore'
import { useApp, selectCurrentFile } from '../store/useApp'
import { useAuth } from '../store/useAuth'
import { useComments } from '../store/useComments'
import { useTheme, isDarkTone } from '../store/useTheme'
import Picker from '@emoji-mart/react'
import data from '@emoji-mart/data'
import { notifyMention } from '../lib/ai'

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
  const tone = useTheme((s) => s.tone)
  const addThread = useComments((s) => s.addThread)
  const updateThread = useComments((s) => s.updateThread)
  const deleteThread = useComments((s) => s.deleteThread)

  const [, bump] = useReducer((n: number) => n + 1, 0)
  const [openId, setOpenId] = useState<string | null>(null)
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null)
  const [draftText, setDraftText] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [mentionSearch, setMentionSearch] = useState<string | null>(null)
  const [mentionIndex, setMentionIndex] = useState(0)

  const filteredMembers = MEMBERS.filter(m => 
    m.username.toLowerCase().includes((mentionSearch || '').toLowerCase()) || 
    m.name.toLowerCase().includes((mentionSearch || '').toLowerCase())
  )

  const selectMention = (member: typeof MEMBERS[0]) => {
    const words = draftText.substring(0, draftText.length).split(/\s+/)
    for (let i = words.length - 1; i >= 0; i--) {
      if (words[i].startsWith('@')) {
        words[i] = `@${member.username} `
        break
      }
    }
    const next = words.join(' ')
    setDraftText(next)
    setMentionSearch(null)
  }

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

    const matches = Array.from(draftText.matchAll(/@(\w+)/g)).map(m => m[1])
    if (matches.length > 0) {
      matches.forEach(recipient => {
        notifyMention({
          fileId,
          sender: displayAuthor(profileName, authName, email),
          recipient,
          comment: draftText.trim()
        }).catch(() => {})
      })
    }

    setDraft(null)
    setDraftText('')
    setEmojiOpen(false)
    setMentionSearch(null)
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
            onChange={(e) => {
              const val = e.currentTarget.value
              setDraftText(val)
              const cursor = e.currentTarget.selectionStart
              const beforeCursor = val.substring(0, cursor)
              const words = beforeCursor.split(/\s+/)
              const lastWord = words[words.length - 1]
              if (lastWord.startsWith('@')) {
                setMentionSearch(lastWord.substring(1))
                setMentionIndex(0)
              } else {
                setMentionSearch(null)
              }
            }}
            onKeyDown={(e) => {
              if (mentionSearch !== null && filteredMembers.length > 0) {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setMentionIndex((i) => (i + 1) % filteredMembers.length)
                  return
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setMentionIndex((i) => (i - 1 + filteredMembers.length) % filteredMembers.length)
                  return
                }
                if (e.key === 'Enter' || e.key === 'Tab') {
                  e.preventDefault()
                  selectMention(filteredMembers[mentionIndex])
                  return
                }
              }
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitDraft() }
              if (e.key === 'Escape') { setDraft(null); setDraftText(''); setMentionSearch(null) }
            }}
            rows={2}
            placeholder="Add comment. Enter to send"
            className="w-full resize-none rounded-xl border border-line bg-surface px-2.5 py-1.5 text-sm text-ink outline-none placeholder:text-grey-3 focus:border-ink"
          />
          {mentionSearch !== null && filteredMembers.length > 0 && (
            <div className="absolute left-2 bottom-12 z-30 w-48 rounded-xl border border-line bg-paper py-1 shadow-xl max-h-40 overflow-y-auto">
              {filteredMembers.map((m, idx) => (
                <button
                  key={m.username}
                  onClick={() => selectMention(m)}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex flex-col ${mentionIndex === idx ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold' : 'text-ink hover:bg-surface/50'}`}
                >
                  <span className="font-semibold text-ink">{m.name}</span>
                  <span className="text-[10px] text-grey-3">@{m.username}</span>
                </button>
              ))}
            </div>
          )}
          <div className="mt-1.5 flex items-center justify-between">
            <div className="relative flex items-center gap-1">
              <button onClick={() => setEmojiOpen((v) => !v)} className="rounded-lg px-2 py-1 text-xs text-grey-3 hover:bg-grey-1 hover:text-ink" title="Add emoji">
                <Icon icon="lucide:smile" width={14} />
              </button>
              {emojiOpen && (
                <EmojiPicker
                  theme={isDarkTone(tone) ? 'dark' : 'light'}
                  onPick={(emoji) => {
                    setDraftText((v) => v + emoji)
                    setEmojiOpen(false)
                  }}
                />
              )}
              <button onClick={() => { setDraft(null); setDraftText(''); setEmojiOpen(false); setMentionSearch(null) }} className="rounded-lg px-2 py-1 text-xs text-grey-3 hover:text-ink">Cancel</button>
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

function EmojiPicker({ onPick, theme }: { onPick: (emoji: string) => void; theme: 'light' | 'dark' }) {
  return (
    <div className="absolute bottom-8 left-0 z-20 shadow-xl rounded-xl overflow-hidden border border-line">
      <Picker
        data={data}
        onEmojiSelect={(emoji: any) => onPick(emoji.native)}
        theme={theme}
        previewPosition="none"
        skinTonePosition="none"
      />
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
      <p className="text-sm leading-relaxed text-ink">{renderCommentBody(body)}</p>
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

const MEMBERS = [
  { username: 'tushar', name: 'Tushar Jolly', email: 'tushar@nexusblock.io' },
  { username: 'alex', name: 'Alex Rivera', email: 'alex@nexusblock.io' },
  { username: 'sarah', name: 'Sarah Chen', email: 'sarah@nexusblock.io' },
  { username: 'john', name: 'John Doe', email: 'john@nexusblock.io' },
]

function renderCommentBody(text: string) {
  const parts = text.split(/(@\w+)/)
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return (
        <span key={i} className="inline-block px-1.5 py-0.5 rounded bg-blue-500/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 font-semibold text-xs border border-blue-500/10 dark:border-blue-400/10 mx-0.5 animate-pulse">
          {part}
        </span>
      )
    }
    return part
  })
}
