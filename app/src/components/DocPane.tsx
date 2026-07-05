import { useEffect, useMemo, useRef } from 'react'
import type { TLContent } from 'tldraw'
import { useCreateBlockNote, getDefaultReactSlashMenuItems, SuggestionMenuController } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import { BlockNoteSchema, defaultBlockSpecs, insertOrUpdateBlockForSlashMenu, filterSuggestionItems, type PartialBlock } from '@blocknote/core'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { useSearchParams } from 'react-router-dom'
import '@blocknote/core/fonts/inter.css'
import '@blocknote/mantine/style.css'
import { useDocStore } from '../store/useDocStore'
import { useApp, selectCurrentFile } from '../store/useApp'
import { useAuth } from '../store/useAuth'
import { cloudEnabled, pullContent, pushContent } from '../sync/cloud'
import { isCollabConfigured, collabWsUrl, roomIdForFile } from '../lib/collab'
import { useFirebaseIdToken } from '../lib/authToken'
import { useTheme, isDarkTone } from '../store/useTheme'
import { useEditorUi } from '../store/useEditorUi'
import { getTemplate } from '../onboarding/templates'
import { DiagramBlock } from './blocks/DiagramBlock'
import { CalloutBlock } from './blocks/CalloutBlock'
import { DslBlock } from './blocks/DslBlock'
import { snapshotCanvas } from '../canvas/exporters'
import { captureCanvasContent, captureFigureContent, createFigureAroundSelection, createFigureAtBounds, parseFigureEmbed, snapshotFigure } from '../canvas/figures'
import { applyFlow } from '../dsl/flow/compile'
import { applyErd } from '../dsl/erd/compile'

/** BlockNote schema extended with our custom blocks (live diagram + callout). */
const schema = BlockNoteSchema.create({
  blockSpecs: { ...defaultBlockSpecs, diagram: DiagramBlock(), callout: CalloutBlock(), dsl: DslBlock() },
})

const FLOW_DOC_STARTER = `// Flow chart embedded in the doc
direction right
"Client" [icon: monitor, color: blue] > "API" [icon: logos:aws-api-gateway, color: orange]
"API" > "Queue" [icon: logos:kafka-icon, color: pink]: publish
"Queue" > "Worker" [icon: boxes, color: green]
`

const ERD_DOC_STARTER = `// ERD embedded in the doc
users [icon: users, color: blue] {
  id uuid pk
  email citext
}
projects [icon: folder, color: green] {
  id uuid pk
  ownerId uuid
}
users.id < projects.ownerId
`

/**
 * Notion-style block editor (BlockNote): slash menu, drag handles, nested
 * blocks, checklists, code, tables — plus a custom "Diagram from canvas" block
 * (Eraser's docs+diagrams integration). Persists JSON blocks per file to
 * localStorage; Phase 2 swaps the store for Liveblocks/Yjs.
 */
export function DocPane() {
  const markSaved = useDocStore((s) => s.markSaved)
  const file = useApp(selectCurrentFile)
  const fileId = file?.id ?? 'scratch'
  const storageKey = `nb-doc-${fileId}`
  const [params] = useSearchParams()
  const live = params.get('live') === '1' && isCollabConfigured
  const liveToken = useFirebaseIdToken(live)

  // Shared-file access: load from the owner's cloud copy; viewers are read-only.
  const sharedFrom = file?.sharedFrom ?? null
  const uid = useAuth((s) => s.uid)
  const ownerUid = sharedFrom ?? uid
  const canEdit = !sharedFrom || file?.sharedRole === 'edit'

  const collab = useMemo(() => {
    if (!live || !liveToken) return null
    const yDoc = new Y.Doc()
    const provider = new WebsocketProvider(collabWsUrl, `${roomIdForFile(fileId, ownerUid)}:doc`, yDoc, { params: { token: liveToken } })
    return { yDoc, provider, fragment: yDoc.getXmlFragment('document-store') }
  }, [fileId, live, liveToken, ownerUid])

  useEffect(() => {
    return () => {
      collab?.provider.destroy()
      collab?.yDoc.destroy()
    }
  }, [collab])

  const userName = useAuth((s) => s.email)?.split('@')[0] || 'Teammate'
  const editor = useCreateBlockNote(
    {
      schema,
      initialContent: collab ? undefined : loadContent(storageKey, file?.template),
      collaboration: collab
        ? {
            fragment: collab.fragment,
            provider: collab.provider,
            user: { name: userName, color: '#111111' },
            showCursorLabels: 'activity',
          }
        : undefined,
    },
    [fileId, live, liveToken, ownerUid],
  )
  const setDocExporter = useDocStore((s) => s.setDocExporter)
  const setDocBridge = useDocStore((s) => s.setDocBridge)
  const setFigureReferences = useDocStore((s) => s.setFigureReferences)
  const setHeadingLinks = useDocStore((s) => s.setHeadingLinks)
  const canvasEditor = useDocStore((s) => s.editor)
  const tone = useTheme((s) => s.tone)
  const bridgeRef = useRef(useDocStore.getState().docBridge)

  // Expose Markdown + HTML export to the top bar while this pane is mounted.
  useEffect(() => {
    setDocExporter({
      toMarkdown: () => Promise.resolve(editor.blocksToMarkdownLossy(editor.document)),
      toHTML: () => Promise.resolve(editor.blocksToFullHTML(editor.document)),
    })
    return () => setDocExporter(null)
  }, [editor, setDocExporter])

  useEffect(() => {
    const collectReferences = () => {
      const refs = editor.document
        .filter((block) => block.type === 'diagram' && String(block.props.figureId || ''))
        .map((block) => ({
          blockId: block.id,
          figureId: String((block.props as Record<string, unknown>).figureId || ''),
          caption: String((block.props as Record<string, unknown>).caption || 'Figure'),
        }))
      setFigureReferences(refs)
      return refs
    }

    const jumpToFigure = (figureId: string) => {
      const tldr = useDocStore.getState().editor
      if (!tldr || !tldr.getShape(figureId as never)) return
      useEditorUi.getState().setViewMode('split')
      window.setTimeout(() => {
        tldr.select(figureId as never)
        tldr.zoomToSelection({ animation: { duration: 420 } })
        tldr.setCurrentTool('select')
      }, 80)
    }

    // A frame is the same shape as a figure (`group-frame`); jumping to one is
    // the doc → canvas half of a heading link.
    const jumpToFrame = jumpToFigure

    // Canvas → doc: reveal a heading block and briefly highlight it.
    const jumpToHeading = (blockId: string) => {
      useEditorUi.getState().setViewMode('split')
      window.setTimeout(() => {
        const el = document.querySelector(`[data-id="${blockId}"]`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.classList.add('nb-heading-flash')
          window.setTimeout(() => el.classList.remove('nb-heading-flash'), 1200)
        }
        try { editor.setTextCursorPosition(blockId, 'end') } catch { /* block gone */ }
      }, 80)
    }

    // Rebuild the heading ↔ frame link list from frame meta + current headings.
    const collectHeadingLinks = () => {
      const tldr = useDocStore.getState().editor
      if (!tldr) { setHeadingLinks([]); return }
      const textByBlockId = new Map<string, string>()
      editor.document.forEach((b) => {
        if (b.type === 'heading') textByBlockId.set(b.id, blockPlainText(b))
      })
      const links = tldr
        .getCurrentPageShapes()
        .filter((s) => s.type === 'group-frame' && !!(s.meta as Record<string, unknown>)?.headingBlockId)
        .map((s) => {
          const meta = s.meta as Record<string, unknown>
          const blockId = String(meta.headingBlockId)
          return {
            blockId,
            headingText: textByBlockId.get(blockId) || String(meta.headingText || 'Heading'),
            frameId: s.id,
            frameName: String((s.props as Record<string, unknown>).label || 'Frame'),
          }
        })
      setHeadingLinks(links)
    }

    // Link a heading block to a canvas frame. Uses the selected frame, else
    // wraps the current selection, else drops a new empty frame at center.
    const linkHeadingToFrame = (blockId: string, headingText: string) => {
      const tldr = useDocStore.getState().editor
      if (!tldr) return
      const selectedFrame = tldr.getSelectedShapes().find((s) => s.type === 'group-frame')
      let frameId = selectedFrame?.id ?? createFigureAroundSelection(tldr) ?? undefined
      if (!frameId) {
        const c = tldr.getViewportPageBounds().center
        frameId = createFigureAtBounds(tldr, { x: c.x - 160, y: c.y - 110, w: 320, h: 220 }, headingText || 'Section')
      }
      const frame = tldr.getShape(frameId)
      tldr.updateShape({ id: frameId, type: 'group-frame', meta: { ...(frame?.meta ?? {}), headingBlockId: blockId, headingText } })
      jumpToFrame(frameId)
      collectHeadingLinks()
    }

    const unlinkFrame = (frameId: string) => {
      const tldr = useDocStore.getState().editor
      const frame = tldr?.getShape(frameId as never)
      if (!tldr || !frame) return
      const meta = { ...(frame.meta as Record<string, unknown>) }
      delete meta.headingBlockId
      delete meta.headingText
      tldr.updateShape({ id: frameId as never, type: 'group-frame', meta: meta as never })
      collectHeadingLinks()
    }

    const refreshFigureEmbeds = async (figureId?: string) => {
      const tldr = useDocStore.getState().editor
      if (!tldr) return
      const refs = collectReferences().filter((ref) => !figureId || ref.figureId === figureId)
      for (const ref of refs) {
        if (!tldr.getShape(ref.figureId as never)) continue
        const src = await snapshotFigure(tldr, ref.figureId as never)
        if (!src) continue
        const content = await captureFigureContent(tldr, ref.figureId as never)
        const block = editor.getBlock(ref.blockId)
        if (block) editor.updateBlock(block, { props: { src, content: content ?? undefined } as never })
      }
    }

    const restoreDiagramToCanvas = async (diagram: { src: string; caption: string; figureId?: string; content?: string }) => {
      const tldr = useDocStore.getState().editor
      if (!tldr) return
      useEditorUi.getState().setViewMode('split')

      if (diagram.figureId && tldr.getShape(diagram.figureId as never)) {
        jumpToFigure(diagram.figureId)
        return
      }

      window.setTimeout(async () => {
        const center = tldr.getViewportPageBounds().center
        const restoredNative = restoreNativeDiagramContent(tldr, diagram.content, center)
        if (restoredNative) {
          markSaved()
          return
        }

        if (!diagram.src) return
        const file = dataUrlToFile(diagram.src, `${fileSafeName(diagram.caption || 'diagram')}.png`)
        if (!file) return
        tldr.markHistoryStoppingPoint('restore diagram from doc')
        await tldr.putExternalContent({ type: 'files', files: [file], point: center })
        tldr.zoomToSelection({ animation: { duration: 420 } })
        tldr.setCurrentTool('select')
        markSaved()
      }, 120)
    }

    const insertFigureReference = (figureId: string, caption: string) => {
      insertOrUpdateBlockForSlashMenu(editor, {
        type: 'paragraph',
        content: [{ type: 'text', text: `@${caption || 'Figure'} `, styles: { bold: true } }],
        props: { backgroundColor: 'blue' },
      })
      jumpToFigure(figureId)
    }

    const insertDslBlock = (kind: 'flow' | 'erd', code?: string) => {
      insertOrUpdateBlockForSlashMenu(editor, {
        type: 'dsl',
        props: {
          kind,
          title: kind === 'erd' ? 'ERD as code' : 'Flow as code',
          code: code || (kind === 'erd' ? ERD_DOC_STARTER : FLOW_DOC_STARTER),
        },
      })
    }

    const applyDslBlock = async (kind: 'flow' | 'erd', code: string) => {
      const tldr = useDocStore.getState().editor
      if (!tldr) return
      const errors = kind === 'erd' ? await applyErd(tldr, code) : await applyFlow(tldr, code)
      if (errors.length) return
      useEditorUi.getState().setViewMode('split')
    }

    const getActiveDocBlock = () => {
      try {
        const b = editor.getTextCursorPosition().block
        return { id: b.id, text: blockPlainText(b) || 'Document note' }
      } catch {
        return null
      }
    }

    const bridge = { jumpToFigure, refreshFigureEmbeds, restoreDiagramToCanvas, insertFigureReference, insertDslBlock, applyDslBlock, jumpToHeading, jumpToFrame, linkHeadingToFrame, unlinkFrame, collectHeadingLinks, getActiveDocBlock }
    bridgeRef.current = bridge
    setDocBridge(bridge)
    const collectAll = () => { collectReferences(); collectHeadingLinks() }
    collectAll()
    const stop = editor.onChange(collectAll)
    return () => {
      stop?.()
      setDocBridge(null)
      setFigureReferences([])
      setHeadingLinks([])
    }
  }, [editor, markSaved, setDocBridge, setFigureReferences, setHeadingLinks])

  useEffect(() => {
    if (!canvasEditor || !canEdit) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const unlisten = canvasEditor.store.listen(
      () => {
        // Keep heading↔frame links in sync with frame changes (rename/delete/link).
        bridgeRef.current?.collectHeadingLinks?.()
        if (!useDocStore.getState().figureReferences.length) return
        clearTimeout(timer)
        timer = window.setTimeout(() => {
          void bridgeRef.current?.refreshFigureEmbeds()
        }, 1600)
      },
      { scope: 'document' },
    )
    return () => {
      unlisten()
      clearTimeout(timer)
    }
  }, [canvasEditor, canEdit])

  // Cloud content: pull this file's doc. Shared files always load the owner's
  // copy; own files only when there's no local copy yet (fresh device).
  // In a live room the Yjs document is the source of truth — never replaceBlocks
  // there, or we'd clobber collaborators' edits on every load.
  useEffect(() => {
    if (live || !cloudEnabled()) return
    if (!sharedFrom && localStorage.getItem(storageKey)) return
    const ownerUid = sharedFrom ?? useAuth.getState().uid
    if (!ownerUid) return
    let cancelled = false
    void pullContent(ownerUid, fileId).then((c) => {
      if (cancelled || !c?.doc) return
      try {
        const blocks = JSON.parse(c.doc) as PartialBlock[]
        if (blocks.length) {
          editor.replaceBlocks(editor.document, blocks)
          if (!sharedFrom) localStorage.setItem(storageKey, c.doc)
        }
      } catch {
        /* ignore malformed cloud doc */
      }
    })
    return () => { cancelled = true }
  }, [editor, fileId, storageKey, sharedFrom, live])

  // Seed the live document with existing content when the room is empty. Only
  // the first participant in a fresh room seeds (later joiners receive it over
  // Yjs), so we don't duplicate the content. For a shared file whose owner isn't
  // present, the recipient seeds from the owner's cloud copy rather than a blank.
  useEffect(() => {
    if (!collab) return
    const { provider, yDoc, fragment } = collab
    let cancelled = false
    const aloneInEmptyRoom = () =>
      fragment.length === 0 &&
      [...provider.awareness.getStates().keys()].filter((id) => id !== yDoc.clientID).length === 0
    const seed = async () => {
      if (cancelled || !aloneInEmptyRoom()) return
      let blocks: PartialBlock[] | undefined
      if (sharedFrom && cloudEnabled()) {
        try {
          const c = await pullContent(sharedFrom, fileId)
          if (c?.doc) blocks = JSON.parse(c.doc) as PartialBlock[]
        } catch { /* fall back to nothing */ }
      } else {
        blocks = loadContent(storageKey, file?.template)
      }
      // Re-check after the await — the owner may have joined and synced content.
      if (cancelled || !aloneInEmptyRoom()) return
      if (blocks && blocks.length) editor.replaceBlocks(editor.document, blocks)
    }
    const onSync = (s: boolean) => { if (s) window.setTimeout(() => void seed(), 60) }
    provider.on('sync', onSync)
    if (provider.synced) window.setTimeout(() => void seed(), 60)
    return () => { cancelled = true; provider.off('sync', onSync) }
  }, [collab, editor, storageKey, file?.template, sharedFrom, fileId])

  const persist = () => {
    // Read-only viewers never write back (locally or to the cloud).
    if (!canEdit) return
    const json = JSON.stringify(editor.document)
    localStorage.setItem(storageKey, json)
    markSaved()
    // Edits to a shared file write back to the OWNER's copy.
    const target = sharedFrom ?? useAuth.getState().uid
    if (target && cloudEnabled()) pushContent(target, fileId, { doc: json }).catch(() => {})
  }

  const handlePaste = (event: React.ClipboardEvent) => {
    const text = event.clipboardData.getData('text/plain')
    const figure = parseFigureEmbed(text)
    if (!figure) return
    event.preventDefault()
    insertOrUpdateBlockForSlashMenu(editor, {
      type: 'diagram',
      props: { src: figure.src, caption: figure.caption, figureId: figure.figureId, content: figure.content },
    })
    persist()
  }

  return (
    <div className="h-full overflow-y-auto py-4" onPasteCapture={handlePaste}>
      <BlockNoteView editor={editor} editable={canEdit} theme={isDarkTone(tone) ? 'dark' : 'light'} onChange={persist} slashMenu={false}>
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) =>
            filterSuggestionItems(
              [
                {
                  title: 'Diagram from canvas',
                  subtext: 'Embed a live snapshot of the canvas',
                  aliases: ['diagram', 'canvas', 'figure', 'chart'],
                  group: 'Media',
                  icon: <span style={{ fontSize: 16 }}>◨</span>,
                  onItemClick: async () => {
                    const tldr = useDocStore.getState().editor
                    const src = tldr ? await snapshotCanvas(tldr) : null
                    const content = tldr ? await captureCanvasContent(tldr) : ''
                    insertOrUpdateBlockForSlashMenu(editor, { type: 'diagram', props: { src: src ?? '', content } })
                  },
                },
                {
                  title: 'Flow as code',
                  subtext: 'Place editable diagram DSL inside this doc',
                  aliases: ['dsl', 'flow', 'diagram as code', 'code'],
                  group: 'Media',
                  icon: <span style={{ fontSize: 16 }}>⌘</span>,
                  onItemClick: () => useDocStore.getState().docBridge?.insertDslBlock('flow'),
                },
                {
                  title: 'ERD as code',
                  subtext: 'Place an editable data model beside your notes',
                  aliases: ['erd', 'database', 'schema', 'diagram as code'],
                  group: 'Media',
                  icon: <span style={{ fontSize: 16 }}>▦</span>,
                  onItemClick: () => useDocStore.getState().docBridge?.insertDslBlock('erd'),
                },
                {
                  title: 'Callout',
                  subtext: 'Colored info / warning / tip box',
                  aliases: ['callout', 'note', 'info', 'warning', 'tip', 'admonition'],
                  group: 'Basic blocks',
                  icon: <span style={{ fontSize: 16 }}>💡</span>,
                  onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: 'callout', props: { variant: 'info' } }),
                },
                {
                  title: 'Link to canvas frame',
                  subtext: 'Two-way link this section to a canvas frame',
                  aliases: ['link', 'frame', 'anchor', 'heading', 'section'],
                  group: 'Media',
                  icon: <span style={{ fontSize: 16 }}>🔗</span>,
                  onItemClick: () => {
                    const block = editor.getTextCursorPosition().block
                    useDocStore.getState().docBridge?.linkHeadingToFrame(block.id, blockPlainText(block))
                  },
                },
                ...getDefaultReactSlashMenuItems(editor),
              ],
              query,
            )
          }
        />
      </BlockNoteView>
    </div>
  )
}

/** Flatten a BlockNote block's inline content to plain text. */
function blockPlainText(block: { content?: unknown }): string {
  const content = block.content
  if (!Array.isArray(content)) return ''
  return content
    .map((c) => (c && typeof c === 'object' && 'text' in c ? String((c as { text: unknown }).text) : ''))
    .join('')
    .trim()
}

function loadContent(key: string, template?: string): PartialBlock[] | undefined {
  const raw = localStorage.getItem(key)
  if (raw) {
    try {
      return JSON.parse(raw) as PartialBlock[]
    } catch {
      /* fall through to seed */
    }
  }
  if (template) {
    const seeded = getTemplate(template as never).seedDoc?.()
    if (seeded && seeded.length) return seeded as PartialBlock[]
  }
  return [
    { type: 'paragraph', content: 'Notes, decisions, and context — right next to the diagram.' },
    { type: 'paragraph', content: 'Type “/” for headings, lists, checkboxes, code, tables, or a live diagram…' },
  ]
}

function restoreNativeDiagramContent(editor: import('tldraw').Editor, content: string | undefined, point: { x: number; y: number }) {
  if (!content) return false
  try {
    const parsed = JSON.parse(content) as TLContent
    if (!Array.isArray(parsed.shapes) || parsed.shapes.length === 0) return false
    editor.markHistoryStoppingPoint('restore diagram from doc')
    editor.putContentOntoCurrentPage(parsed, { point, select: true })
    editor.zoomToSelection({ animation: { duration: 420 } })
    editor.setCurrentTool('select')
    return true
  } catch {
    return false
  }
}

function dataUrlToFile(dataUrl: string, fileName: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/)
  if (!match) return null
  const [, mime, base64] = match
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return new File([bytes], fileName, { type: mime })
}

function fileSafeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'diagram'
}
