import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import { renderPlaintextFromRichText, toRichText, type Editor, type TLShape, DefaultColorStyle, DefaultFontStyle } from 'tldraw'
import { useEditorUi, type InspectorTab } from '../store/useEditorUi'
import { useDocStore } from '../store/useDocStore'
import { useApp, selectCurrentFile } from '../store/useApp'
import { useAuth } from '../store/useAuth'
import { useComments, type CommentThread } from '../store/useComments'
import { figureBacklinks } from '../canvas/backlinks'
import { runLint, type LintIssue } from '../canvas/linter'
import { CanvasLayersPanel } from './CanvasLayersPanel'
import { FLOW_SHAPES } from '../dsl/flow/lib'
import { NODE_KINDS } from '../shapes/ArchNodeShape'
import type { ErdRow } from '../shapes/ErdEntityShape'

/** Reactive lint issues for the current page (recomputed on document changes). */
function useLint(): LintIssue[] {
  const editor = useDocStore((s) => s.editor)
  const [issues, setIssues] = useState<LintIssue[]>([])
  useEffect(() => {
    if (!editor) return
    const recompute = () => setIssues(runLint(editor))
    recompute()
    let t: ReturnType<typeof setTimeout> | undefined
    const unlisten = editor.store.listen(
      () => {
        clearTimeout(t)
        t = setTimeout(recompute, 250)
      },
      { scope: 'document' },
    )
    return () => {
      unlisten()
      clearTimeout(t)
    }
  }, [editor])
  return issues
}

const TABS: { id: InspectorTab; icon: string; label: string }[] = [
  { id: 'style', icon: 'lucide:sliders-horizontal', label: 'Style' },
  { id: 'layers', icon: 'lucide:layers', label: 'Layers' },
  { id: 'comments', icon: 'lucide:message-circle', label: 'Comments' },
  { id: 'linter', icon: 'lucide:shield-check', label: 'Linter' },
]

export function RightInspector() {
  const tab = useEditorUi((s) => s.inspectorTab)
  const setTab = useEditorUi((s) => s.setInspectorTab)
  const setInspectorOpen = useEditorUi((s) => s.setInspectorOpen)
  const issues = useLint()

  return (
    <aside className="flex w-[300px] flex-none flex-col border-l border-line bg-surface">
      <div className="flex h-12 items-center justify-between border-b border-line px-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-grey-3">Inspector</div>
          <div className="text-sm font-semibold text-ink">{TABS.find((t) => t.id === tab)?.label}</div>
        </div>
        <button
          onClick={() => setInspectorOpen(false)}
          title="Hide inspector"
          className="grid h-8 w-8 place-items-center rounded-lg text-grey-4 hover:bg-grey-1 hover:text-ink"
        >
          <Icon icon="lucide:panel-right-close" width={16} />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-1 border-b border-line p-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            title={t.label}
            aria-pressed={tab === t.id}
            className={
              'relative grid h-9 place-items-center rounded-lg transition-colors ' +
              (tab === t.id ? 'bg-ink text-paper' : 'text-grey-4 hover:bg-grey-1 hover:text-ink')
            }
          >
            <Icon icon={t.icon} width={16} />
            {t.id === 'linter' && issues.length > 0 && (
              <span className={'absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 font-mono text-[9px] font-bold ' + (tab === 'linter' ? 'bg-paper text-ink' : 'bg-ink text-paper')}>
                {issues.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === 'style' && <StylePanel />}
        {tab === 'layers' && <LayersPanel />}
        {tab === 'comments' && <CommentsPanel />}
        {tab === 'linter' && <LinterPanel issues={issues} />}
      </div>
    </aside>
  )
}

function StylePanel() {
  const { editor, selected } = useSelection()

  if (!editor || selected.length === 0) {
    return (
      <div className="space-y-5">
        <PanelSection title="Selection">
          <div className="rounded-2xl border border-line bg-paper p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-paper">
                <Icon icon="lucide:mouse-pointer-2" width={18} />
              </span>
              <div>
                <div className="text-sm font-semibold">No shape selected</div>
                <div className="text-xs text-grey-3">Select a diagram node, ERD table, or arrow to customize it.</div>
              </div>
            </div>
          </div>
        </PanelSection>
        <QuickTips />
      </div>
    )
  }

  if (selected.length > 1) {
    return (
      <div className="space-y-5">
        <PanelSection title="Selection">
          <div className="rounded-2xl border border-line bg-paper p-4">
            <div className="text-sm font-semibold">{selected.length} shapes selected</div>
            <div className="mt-1 text-xs leading-relaxed text-grey-3">Move them together, duplicate, or select one shape to edit its code-backed properties.</div>
          </div>
        </PanelSection>
        <QuickTips />
      </div>
    )
  }

  const shape = selected[0]
  if (shape.type === 'arch-node') return <ArchNodeEditor editor={editor} shape={shape} />
  if (shape.type === 'flow-node') return <FlowNodeEditor editor={editor} shape={shape} />
  if (shape.type === 'erd-entity') return <ErdEntityEditor editor={editor} shape={shape} />
  if (shape.type === 'arrow') return <ArrowEditor editor={editor} shape={shape} />
  if (shape.type === 'nb-3d-shape') return <ThreeDShapeEditor editor={editor} shape={shape} />

  return (
    <div className="space-y-5">
      <PanelSection title="Selection">
        <div className="rounded-2xl border border-line bg-paper p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-paper">
              <Icon icon="lucide:box-select" width={18} />
            </span>
            <div>
              <div className="text-sm font-semibold">{shape.type}</div>
              <div className="text-xs text-grey-3">This shape can still be moved, resized, styled, and connected on canvas.</div>
            </div>
          </div>
        </div>
      </PanelSection>
      <ColorPickerSection editor={editor} shape={shape} />
      <QuickTips />
    </div>
  )
}

function useSelection() {
  const editor = useDocStore((s) => s.editor)
  const [selected, setSelected] = useState<TLShape[]>([])

  useEffect(() => {
    if (!editor) {
      setSelected([])
      return
    }
    const update = () => setSelected(editor.getSelectedShapes())
    update()
    const unlisten = editor.store.listen(update)
    return unlisten
  }, [editor])

  return { editor, selected }
}

function ArchNodeEditor({ editor, shape }: { editor: Editor; shape: TLShape & { type: 'arch-node' } }) {
  const props = shape.props as unknown as Record<string, string>
  const update = (patch: Partial<Record<string, string>>) => editor.updateShape({ id: shape.id, type: 'arch-node', props: patch })

  return (
    <div className="space-y-5">
      <PanelSection title="Architecture node">
        <EditorCard icon={props.icon || 'lucide:server'} title={props.label || 'Service'} subtitle="Canvas changes can be pulled into Flow DSL." />
        <TextField label="Name" value={props.label || ''} onChange={(label) => update({ label })} />
        <TextField label="Technology label" value={props.tech || ''} onChange={(tech) => update({ tech })} placeholder="React, Kafka, Postgres..." />
        <IconSearchField label="Iconify logo" value={props.icon || ''} onChange={(icon) => update({ icon })} />
        <SelectField label="Kind" value={props.kind || 'service'} options={[...NODE_KINDS]} onChange={(kind) => update({ kind })} />
      </PanelSection>
      <ColorPickerSection editor={editor} shape={shape} />
      <FontPickerSection editor={editor} shape={shape} />
      <QuickTips />
    </div>
  )
}

function FlowNodeEditor({ editor, shape }: { editor: Editor; shape: TLShape & { type: 'flow-node' } }) {
  const props = shape.props as unknown as Record<string, string>
  const update = (patch: Partial<Record<string, string>>) => editor.updateShape({ id: shape.id, type: 'flow-node', props: patch })

  return (
    <div className="space-y-5">
      <PanelSection title="Flow node">
        <EditorCard icon={props.icon || 'lucide:workflow'} title={props.label || 'Node'} subtitle="Change shape, icon, color, then Pull canvas to update code." />
        <TextField label="Name" value={props.label || ''} onChange={(label) => update({ label })} />
        <IconSearchField label="Icon" value={props.icon || ''} onChange={(icon) => update({ icon })} />
        <TextField label="Color" value={props.color || ''} onChange={(color) => update({ color })} placeholder="blue, green, #22c55e" />
        <SelectField label="Shape" value={props.shape || 'rectangle'} options={[...FLOW_SHAPES]} onChange={(shape) => update({ shape })} />
      </PanelSection>
      <ColorPickerSection editor={editor} shape={shape} />
      <FontPickerSection editor={editor} shape={shape} />
      <QuickTips />
    </div>
  )
}

function ErdEntityEditor({ editor, shape }: { editor: Editor; shape: TLShape & { type: 'erd-entity' } }) {
  const props = shape.props as Record<string, string | number>
  const update = (patch: Partial<Record<string, string | number>>) => editor.updateShape({ id: shape.id, type: 'erd-entity', props: patch })
  const rowsText = rowsToText(String(props.rows || '[]'))

  const updateRows = (text: string) => {
    const rows = textToRows(text)
    update({
      rows: JSON.stringify(rows),
      h: 42 + 8 + rows.length * 28,
    })
  }

  return (
    <div className="space-y-5">
      <PanelSection title="ERD table">
        <EditorCard icon={String(props.icon || 'lucide:table-2')} title={String(props.name || 'Entity')} subtitle="Each row becomes an entity field in ERD code." />
        <TextField label="Entity name" value={String(props.name || '')} onChange={(name) => update({ name })} />
        <IconSearchField label="Icon" value={String(props.icon || '')} onChange={(icon) => update({ icon })} />
        <TextField label="Color" value={String(props.color || '')} onChange={(color) => update({ color })} placeholder="blue, orange, green" />
        <TextareaField label="Fields" value={rowsText} onChange={updateRows} placeholder={'id uuid pk\ncustomerId uuid\nstatus varchar'} />
      </PanelSection>
      <ColorPickerSection editor={editor} shape={shape} />
      <FontPickerSection editor={editor} shape={shape} />
      <QuickTips />
    </div>
  )
}

function ArrowEditor({ editor, shape }: { editor: Editor; shape: TLShape & { type: 'arrow' } }) {
  const props = shape.props as unknown as Record<string, unknown>
  const label = props.richText ? renderPlaintextFromRichText(editor, props.richText as never) : ''
  const update = (patch: Record<string, unknown>) => editor.updateShape({ id: shape.id, type: 'arrow', props: patch as never })

  return (
    <div className="space-y-5">
      <PanelSection title="Arrow">
        <EditorCard icon="lucide:arrow-right" title={label || 'Connection'} subtitle="Arrow labels and direction are included when you Pull canvas." />
        <TextField label="Label" value={label} onChange={(text) => update({ richText: toRichText(text) })} placeholder="valid, writes, emits..." />
        <SelectField label="Start head" value={String(props.arrowheadStart || 'none')} options={['none', 'arrow', 'dot', 'bar', 'diamond']} onChange={(arrowheadStart) => update({ arrowheadStart })} />
        <SelectField label="End head" value={String(props.arrowheadEnd || 'arrow')} options={['none', 'arrow', 'dot', 'bar', 'diamond']} onChange={(arrowheadEnd) => update({ arrowheadEnd })} />
        <SelectField label="Line style" value={String(props.dash || 'draw')} options={['draw', 'solid', 'dashed', 'dotted']} onChange={(dash) => update({ dash })} />
      </PanelSection>
      <ColorPickerSection editor={editor} shape={shape} />
      <FontPickerSection editor={editor} shape={shape} />
      <QuickTips />
    </div>
  )
}

function EditorCard({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="mb-4 rounded-2xl border border-line bg-paper p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-paper">
          <Icon icon={icon} width={18} />
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{title}</div>
          <div className="text-xs leading-relaxed text-grey-3">{subtitle}</div>
        </div>
      </div>
    </div>
  )
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="mt-3 block">
      <span className="mb-1 block text-xs font-semibold text-grey-4">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none transition-colors placeholder:text-grey-3 focus:border-ink"
      />
    </label>
  )
}

function TextareaField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="mt-3 block">
      <span className="mb-1 block text-xs font-semibold text-grey-4">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        placeholder={placeholder}
        rows={7}
        className="w-full resize-y rounded-xl border border-line bg-surface px-3 py-2 font-mono text-xs leading-relaxed text-ink outline-none transition-colors placeholder:text-grey-3 focus:border-ink"
      />
      <span className="mt-1 block text-[11px] leading-relaxed text-grey-3">Format: fieldName type, add pk for primary keys.</span>
    </label>
  )
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="mt-3 block">
      <span className="mb-1 block text-xs font-semibold text-grey-4">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        className="h-9 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none transition-colors focus:border-ink"
      >
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}

function QuickTips() {
  return (
    <PanelSection title="Code sync">
      <div className="rounded-2xl border border-line bg-paper p-3 text-xs leading-relaxed text-grey-4">
        Customize shapes on canvas, then open Diagram as Code and click <span className="font-semibold text-ink">Pull canvas</span>. Use <span className="font-semibold text-ink">Apply</span> when code should redraw the canvas.
      </div>
    </PanelSection>
  )
}

function rowsToText(json: string) {
  try {
    const rows = JSON.parse(json) as ErdRow[]
    return Array.isArray(rows) ? rows.map((row) => `${row.name}${row.type ? ` ${row.type}` : ''}${row.pk ? ' pk' : ''}`).join('\n') : ''
  } catch {
    return ''
  }
}

function textToRows(text: string): ErdRow[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s+/)
      const name = parts[0] || 'field'
      const pk = parts.some((part) => part.toLowerCase() === 'pk')
      const type = parts.find((part, index) => index > 0 && part.toLowerCase() !== 'pk') || ''
      return { name, type, pk }
    })
}

function LayersPanel() {
  return (
    <div className="-m-4 h-[calc(100%+32px)]">
      <CanvasLayersPanel />
    </div>
  )
}

function CommentsPanel() {
  const { editor, selected } = useSelection()
  const file = useApp(selectCurrentFile)
  const fileId = file?.id ?? 'scratch'
  const sharedFrom = file?.sharedFrom ?? null
  const canComment = !!file && (!sharedFrom || file.sharedRole === 'edit' || file.sharedRole === 'view')
  const authName = useAuth((s) => s.name)
  const email = useAuth((s) => s.email)
  const profileName = useApp((s) => s.profile?.name)
  const addThread = useComments((s) => s.addThread)
  const updateThread = useComments((s) => s.updateThread)
  const deleteThread = useComments((s) => s.deleteThread)
  const threads = useComments((s) => s.threadsByFile[fileId] ?? [])
  const figureReferences = useDocStore((s) => s.figureReferences)
  const headingLinks = useDocStore((s) => s.headingLinks)
  const files = useApp((s) => s.files)
  const [draft, setDraft] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const targetShape = selected[0]
  const targetLabel = targetShape
    ? String((targetShape.props as Record<string, unknown>).label || (targetShape.props as Record<string, unknown>).name || targetShape.type)
    : 'Document note'

  const add = () => {
    if (!draft.trim() || !canComment) return
    let target: CommentThread['target']
    if (targetShape) {
      target = { kind: 'canvas', shapeId: targetShape.id, label: targetLabel }
    } else {
      const block = useDocStore.getState().docBridge?.getActiveDocBlock?.()
      target = { kind: 'doc', blockId: block?.id || 'document', label: block?.text || 'Document note' }
    }
    addThread(fileId, { target, author: displayCommentAuthor(profileName, authName, email), body: draft.trim() })
    setDraft('')
    setEmojiOpen(false)
  }

  const flyToThread = (thread: CommentThread) => {
    if (thread.target.kind === 'doc') {
      useDocStore.getState().docBridge?.jumpToHeading(thread.target.blockId)
      return
    }
    if (!editor) return
    if (thread.target.kind === 'point') {
      editor.centerOnPoint({ x: thread.target.x, y: thread.target.y }, { animation: { duration: 360 } })
      return
    }
    if (!editor.getShape(thread.target.shapeId as never)) return
    editor.select(thread.target.shapeId as never)
    editor.zoomToSelection({ animation: { duration: 360 } })
  }

  return (
    <div className="space-y-4">
      <PanelSection title="Add thread">
        <div className="rounded-2xl border border-line bg-paper p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-grey-4">
            <Icon icon={targetShape ? 'lucide:box-select' : 'lucide:file-text'} width={14} />
            Anchored to {targetLabel}
          </div>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                add()
              }
              if (event.key === 'Escape') setEmojiOpen(false)
            }}
            disabled={!canComment}
            placeholder={canComment ? 'Ask a question or leave review context...' : 'Comments are disabled'}
            rows={3}
            className="w-full resize-none rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-grey-3 focus:border-ink disabled:opacity-50"
          />
          <div className="mt-2 flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setEmojiOpen((v) => !v)}
                disabled={!canComment}
                title="Add emoji"
                className="grid h-9 w-9 place-items-center rounded-xl border border-line text-grey-3 hover:border-ink hover:text-ink disabled:opacity-40"
              >
                <Icon icon="lucide:smile" width={16} />
              </button>
              {emojiOpen && <CommentEmojiPicker onPick={(emoji) => { setDraft((v) => v + emoji); setEmojiOpen(false) }} />}
            </div>
            <button
              onClick={add}
              disabled={!draft.trim() || !canComment}
              className="flex h-9 flex-1 items-center justify-center gap-2 rounded-xl bg-ink text-sm font-semibold text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <Icon icon="lucide:send" width={15} /> Send
            </button>
          </div>
        </div>
      </PanelSection>

      <PanelSection title="Threads">
        {threads.length === 0 ? (
          <div className="rounded-2xl border border-line bg-paper p-3 text-sm text-grey-3">No threads yet. Select a shape and add the first one.</div>
        ) : (
          threads.map((thread) => (
            <Comment
              key={thread.id}
              thread={thread}
              onFly={() => flyToThread(thread)}
              onToggle={() => updateThread(fileId, thread.id, { status: thread.status === 'open' ? 'resolved' : 'open' })}
              onDelete={() => deleteThread(fileId, thread.id)}
            />
          ))
        )}
      </PanelSection>

      <PanelSection title="Heading links">
        {headingLinks.length === 0 ? (
          <div className="rounded-2xl border border-line bg-paper p-3 text-sm text-grey-3">
            No headings linked to frames. In the doc, type <span className="font-mono">/link</span> in a heading.
          </div>
        ) : (
          <div className="space-y-2">
            {headingLinks.map((link) => (
              <div key={link.frameId} className="flex items-center gap-1 rounded-xl border border-line bg-paper p-2 text-sm">
                <button
                  onClick={() => useDocStore.getState().docBridge?.jumpToHeading(link.blockId)}
                  title="Scroll to heading"
                  className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-left hover:text-ink"
                >
                  <Icon icon="lucide:heading" width={13} className="shrink-0 text-grey-3" />
                  <span className="truncate">{link.headingText || 'Heading'}</span>
                </button>
                <Icon icon="lucide:arrow-left-right" width={12} className="shrink-0 text-grey-2" />
                <button
                  onClick={() => useDocStore.getState().docBridge?.jumpToFrame(link.frameId)}
                  title="Zoom to frame"
                  className="flex min-w-0 max-w-[40%] items-center gap-1.5 truncate hover:text-ink"
                >
                  <Icon icon="lucide:frame" width={13} className="shrink-0 text-grey-3" />
                  <span className="truncate">{link.frameName}</span>
                </button>
                <button
                  onClick={() => useDocStore.getState().docBridge?.unlinkFrame(link.frameId)}
                  title="Remove link"
                  className="ml-0.5 shrink-0 rounded-lg p-1 text-grey-3 hover:bg-grey-1 hover:text-ink"
                >
                  <Icon icon="lucide:unlink" width={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </PanelSection>

      <PanelSection title="Figure references">
        {figureReferences.length === 0 ? (
          <div className="rounded-2xl border border-line bg-paper p-3 text-sm text-grey-3">No canvas figures are embedded in the doc yet.</div>
        ) : (
          <div className="space-y-2">
            {figureReferences.map((ref) => {
              // Cross-doc backlinks: other docs in the workspace embedding this figure.
              const otherDocs = figureBacklinks(ref.figureId).filter((d) => d.fileId !== fileId)
              const otherCount = otherDocs.length
              return (
                <div key={ref.blockId} className="rounded-xl border border-line bg-paper">
                  <button
                    onClick={() => useDocStore.getState().docBridge?.jumpToFigure(ref.figureId)}
                    className="flex w-full items-center gap-2 p-2 text-left text-sm hover:text-ink"
                  >
                    <Icon icon="lucide:crosshair" width={14} className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{ref.caption}</span>
                  </button>
                  {otherCount > 0 && (
                    <div className="border-t border-line px-2.5 py-1.5 text-[11px] text-grey-3">
                      Also referenced in{' '}
                      {otherDocs.slice(0, 3).map((d, i) => {
                        const title = files.find((f) => f.id === d.fileId)?.title || 'a doc'
                        return (
                          <span key={d.fileId}>
                            {i > 0 ? ', ' : ''}
                            <span className="text-grey-4">{title}</span>
                          </span>
                        )
                      })}
                      {otherCount > 3 ? ` +${otherCount - 3} more` : ''}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </PanelSection>
    </div>
  )
}

const RULE_ICON: Record<LintIssue['rule'], string> = {
  orphan: 'lucide:unplug',
  unlabeled: 'lucide:tag',
  dangling: 'lucide:link-2-off',
  duplicate: 'lucide:copy',
  overlap: 'lucide:layers',
}

function LinterPanel({ issues }: { issues: LintIssue[] }) {
  const editor = useDocStore((s) => s.editor)

  const flyTo = (issue: LintIssue) => {
    if (!editor) return
    editor.setSelectedShapes(issue.shapeIds)
    editor.zoomToSelection({ animation: { duration: 400 } })
  }

  return (
    <div className="space-y-3">
      <div className={'rounded-2xl border p-4 ' + (issues.length === 0 ? 'border-line bg-paper' : 'border-line bg-paper')}>
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Icon icon={issues.length === 0 ? 'lucide:shield-check' : 'lucide:alert-circle'} width={16} className={issues.length === 0 ? 'text-ink' : 'text-grey-3'} />
          {issues.length === 0 ? 'No issues — diagram looks clean' : `${issues.length} issue${issues.length > 1 ? 's' : ''} found`}
        </div>
        {issues.length > 0 && (
          <p className="mt-1 text-xs leading-relaxed text-grey-3">Click an issue to fly the canvas to the offender.</p>
        )}
      </div>

      {issues.map((issue) => (
        <button
          key={issue.id}
          onClick={() => flyTo(issue)}
          className="flex w-full items-start gap-3 rounded-2xl border border-line bg-surface p-3 text-left transition-colors hover:border-ink"
        >
          <Icon icon={RULE_ICON[issue.rule]} width={17} className="mt-0.5 shrink-0 text-grey-3" />
          <span className="min-w-0">
            <span className="block text-sm font-semibold">{issue.title}</span>
            <span className="block truncate text-xs text-grey-3">{issue.detail}</span>
          </span>
        </button>
      ))}
    </div>
  )
}

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-grey-3">{title}</div>
      {children}
    </section>
  )
}

function Comment({ thread, onFly, onToggle, onDelete }: { thread: CommentThread; onFly: () => void; onToggle: () => void; onDelete: () => void }) {
  return (
    <div className="rounded-2xl border border-line bg-paper p-3">
      <div className="mb-2 flex items-center justify-between">
        <button onClick={onFly} className="min-w-0 truncate text-left text-sm font-semibold hover:underline">{thread.target.label}</button>
        <button onClick={onToggle} className="rounded-full border border-line px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-grey-3 hover:border-ink hover:text-ink">
          {thread.status}
        </button>
      </div>
      <p className="text-sm leading-relaxed text-ink">{renderCommentBody(thread.body)}</p>
      <div className="mt-3 flex items-center justify-between text-[11px] text-grey-3">
        <span className="truncate">{formatCommentAuthor(thread.author)}</span>
        <button onClick={onDelete} className="rounded-lg px-2 py-1 hover:bg-grey-1 hover:text-ink">
          <Icon icon="lucide:trash-2" width={13} />
        </button>
      </div>
    </div>
  )
}

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

const COMMENT_EMOJIS = ['👍', '✅', '👀', '🔥', '💡', '🚀', '❤️', '🙏']

function CommentEmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  return (
    <div className="absolute bottom-11 left-0 z-40 grid w-36 grid-cols-4 gap-1 rounded-xl border border-line bg-paper p-2 shadow-xl">
      {COMMENT_EMOJIS.map((emoji) => (
        <button key={emoji} onClick={() => onPick(emoji)} className="grid h-7 w-7 place-items-center rounded-lg text-base hover:bg-grey-1">
          {emoji}
        </button>
      ))}
    </div>
  )
}

function displayCommentAuthor(profileName?: string | null, authName?: string | null, email?: string | null) {
  const name = profileName || authName
  if (name && !name.includes('@')) return name
  if (email) return email.split('@')[0]
  return 'Teammate'
}

function formatCommentAuthor(author: string) {
  return author.includes('@') ? author.split('@')[0] : author
}

function ToggleField({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="mt-3 flex items-center justify-between cursor-pointer">
      <span className="text-xs font-semibold text-grey-4">{label}</span>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.currentTarget.checked)}
        className="h-4 w-4 rounded border-line bg-surface text-ink outline-none transition-colors"
      />
    </label>
  )
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  suffix = '',
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  suffix?: string
}) {
  return (
    <label className="mt-3 block">
      <div className="mb-1 flex justify-between text-xs font-semibold text-grey-4">
        <span>{label}</span>
        <span className="font-mono text-grey-3">{value}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.currentTarget.value))}
        className="w-full h-1.5 bg-line rounded-lg appearance-none cursor-pointer accent-ink"
      />
    </label>
  )
}

function ThreeDShapeEditor({ editor, shape }: { editor: Editor; shape: TLShape }) {
  const props = shape.props as any
  const update = (patch: any) => editor.updateShape({ id: shape.id, type: 'nb-3d-shape', props: patch })

  return (
    <div className="space-y-5">
      <PanelSection title="3D Canvas Shape">
        <EditorCard icon="lucide:box" title="3D Shape Utility" subtitle="Custom glassmorphic 3D rendering engine" />
        <SelectField
          label="Shape Type"
          value={props.shapeType || 'cube'}
          options={['cube', 'pyramid', 'cylinder', 'prism', 'sphere', 'cone']}
          onChange={(shapeType) => update({ shapeType })}
        />
        <SelectField
          label="Pastel Color Theme"
          value={props.color || 'blue'}
          options={['blue', 'green', 'orange', 'purple', 'red', 'yellow', 'pink']}
          onChange={(color) => update({ color })}
        />
        <ToggleField
          label="Slow Auto-Spin Animation"
          value={props.spinning !== false}
          onChange={(spinning) => update({ spinning })}
        />
        
        {props.spinning !== false ? (
          <RangeField
            label="Spin Speed Duration"
            value={props.spinSpeed ?? 10}
            min={2}
            max={30}
            step={1}
            suffix="s"
            onChange={(spinSpeed) => update({ spinSpeed })}
          />
        ) : (
          <>
            <RangeField
              label="Rotation X Angle"
              value={props.rotationX ?? -20}
              min={-180}
              max={180}
              step={5}
              suffix="°"
              onChange={(rotationX) => update({ rotationX })}
            />
            <RangeField
              label="Rotation Y Angle"
              value={props.rotationY ?? 45}
              min={-180}
              max={180}
              step={5}
              suffix="°"
              onChange={(rotationY) => update({ rotationY })}
            />
          </>
        )}

        <RangeField
          label="Glass Opacity"
          value={props.opacity ?? 0.25}
          min={0.05}
          max={0.9}
          step={0.05}
          onChange={(opacity) => update({ opacity })}
        />
        <RangeField
          label="Border Outline Width"
          value={props.borderWidth ?? 1.5}
          min={0.5}
          max={6}
          step={0.5}
          suffix="px"
          onChange={(borderWidth) => update({ borderWidth })}
        />
      </PanelSection>
    </div>
  )
}

const COLOR_PALETTE = [
  { label: 'Default', hex: '', tldraw: 'black' },
  { label: 'Red', hex: '#ef4444', tldraw: 'red' },
  { label: 'Orange', hex: '#f97316', tldraw: 'orange' },
  { label: 'Amber', hex: '#f59e0b', tldraw: 'yellow' },
  { label: 'Green', hex: '#10b981', tldraw: 'green' },
  { label: 'Blue', hex: '#3b82f6', tldraw: 'blue' },
  { label: 'Purple', hex: '#8b5cf6', tldraw: 'purple' },
  { label: 'Pink', hex: '#ec4899', tldraw: 'pink' },
  { label: 'Grey', hex: '#64748b', tldraw: 'grey' },
]

function ColorPickerSection({ editor, shape }: { editor: Editor; shape: TLShape }) {
  const isCustom = ['flow-node', 'erd-entity', 'icon', 'nb-3d-shape'].includes(shape.type)
  const currentVal = isCustom
    ? (shape.props as any).color || ''
    : editor.getSharedStyles().get(DefaultColorStyle) || 'black'

  const handleSelectColor = (colorItem: typeof COLOR_PALETTE[number]) => {
    if (isCustom) {
      const val = colorItem.hex
      editor.updateShape({
        id: shape.id,
        type: shape.type,
        props: { ...shape.props, color: val },
      } as any)
    } else {
      editor.setStyleForSelectedShapes(DefaultColorStyle, colorItem.tldraw as any)
    }
  }

  return (
    <PanelSection title="Color Styling">
      <div className="grid grid-cols-5 gap-2 rounded-2xl border border-line bg-paper p-3">
        {COLOR_PALETTE.map((c) => {
          const isSelected = isCustom
            ? currentVal === c.hex || (c.hex === '' && !currentVal)
            : currentVal === c.tldraw

          return (
            <button
              key={c.label}
              onClick={() => handleSelectColor(c)}
              title={c.label}
              className={
                'h-8 w-8 rounded-full border transition-all ' +
                (isSelected ? 'ring-2 ring-ink ring-offset-2 scale-110' : 'border-line hover:scale-105')
              }
              style={{
                backgroundColor: c.hex || '#18181b',
              }}
            />
          )
        })}
      </div>
    </PanelSection>
  )
}

const FONT_OPTIONS = [
  { label: 'Inherit Default', value: '' },
  { label: 'Inter', value: 'Inter' },
  { label: 'Outfit', value: 'Outfit' },
  { label: 'Roboto', value: 'Roboto' },
  { label: 'JetBrains Mono', value: 'JetBrains Mono' },
  { label: 'Playfair Display', value: 'Playfair Display' },
  { label: 'Instrument Sans', value: 'Instrument Sans' },
]

function FontPickerSection({ editor, shape }: { editor: Editor; shape: TLShape }) {
  const isCustom = ['arch-node', 'flow-node', 'erd-entity', 'icon'].includes(shape.type)
  const currentVal = isCustom ? (shape.props as any).fontFamily || '' : ''

  const handleSelectFont = (fontVal: string) => {
    if (isCustom) {
      editor.updateShape({
        id: shape.id,
        type: shape.type,
        props: { ...shape.props, fontFamily: fontVal },
      } as any)
    } else {
      let tldrawFont: 'sans' | 'serif' | 'mono' | 'draw' = 'sans'
      if (fontVal === 'JetBrains Mono') tldrawFont = 'mono'
      if (fontVal === 'Playfair Display') tldrawFont = 'serif'
      editor.setStyleForSelectedShapes(DefaultFontStyle, tldrawFont)
    }
  }

  return (
    <PanelSection title="Font Override">
      <div className="rounded-2xl border border-line bg-paper p-3">
        <label className="block text-[10px] font-bold text-grey-4 uppercase tracking-wider mb-2">Select Font Family</label>
        <select
          value={currentVal}
          onChange={(e) => handleSelectFont(e.target.value)}
          className="w-full h-9 rounded-xl border border-line bg-surface px-3 text-xs text-ink outline-none focus:border-ink cursor-pointer font-semibold"
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>
    </PanelSection>
  )
}

function IconSearchField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (val: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<string[]>([])
  const [searching, setSearching] = useState(false)

  const triggerSearch = async (q: string) => {
    if (!q.trim()) return
    setSearching(true)
    try {
      const res = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(q)}&limit=48`)
      const data = await res.json()
      setResults(data.icons || [])
    } catch (err) {
      console.error('Failed to search icons:', err)
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => {
    const delay = setTimeout(() => {
      triggerSearch(searchQuery)
    }, 300)
    return () => clearTimeout(delay)
  }, [searchQuery])

  return (
    <div className="space-y-1.5 relative">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold text-grey-4 uppercase tracking-wider">{label}</label>
        <button
          type="button"
          onClick={() => {
            setOpen(!open)
            setSearchQuery(value.includes(':') ? value.split(':')[1] : value)
          }}
          className="text-[10px] font-semibold text-sky-500 hover:text-sky-600 flex items-center gap-1 transition-colors"
        >
          <Icon icon="lucide:globe" width={11} />
          Search Online
        </button>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 flex h-9 items-center gap-2 rounded-xl border border-line bg-surface px-3">
          {value ? (
            <Icon icon={value} width={16} className="text-ink" />
          ) : (
            <Icon icon="lucide:image" width={16} className="text-grey-3" />
          )}
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-xs text-ink outline-none placeholder:text-grey-3 font-medium"
            placeholder="logos:aws-lambda or database"
          />
        </div>
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-2xl border border-line bg-paper p-3.5 shadow-2xl animate-fade-in space-y-3.5 w-72">
          <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-1.5">
            <Icon icon="lucide:search" width={12} className="text-grey-3" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search e.g. apache kafka, redis..."
              className="flex-1 bg-transparent text-xs outline-none text-ink font-semibold"
              autoFocus
            />
            {searching && <Icon icon="lucide:loader-2" className="animate-spin text-grey-3" width={12} />}
          </div>

          <div className="max-h-48 overflow-y-auto no-scrollbar border-t border-line/45 pt-2">
            {results.length === 0 ? (
              <p className="text-[10px] text-grey-3 text-center py-4 font-semibold">No icons found. Type to search.</p>
            ) : (
              <div className="grid grid-cols-5 gap-2">
                {results.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => {
                      onChange(icon)
                      setOpen(false)
                    }}
                    title={icon}
                    className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-surface text-ink hover:border-sky-500 hover:text-sky-500 transition-all hover:scale-105"
                  >
                    <Icon icon={icon} width={20} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2 border-t border-line/60">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-1 text-[10px] font-bold bg-ink text-paper hover:opacity-90 transition-opacity"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


