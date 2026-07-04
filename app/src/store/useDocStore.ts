import { create } from 'zustand'
import type { Editor } from 'tldraw'

export type FigureReference = {
  blockId: string
  figureId: string
  caption: string
}

/** A two-way link between a document heading and a canvas frame (group-frame). */
export type HeadingLink = {
  blockId: string
  headingText: string
  frameId: string
  frameName: string
}

export type DocState = {
  /** Document title shown in the top bar. */
  title: string
  /** Whether the right-hand doc pane is visible. */
  docPaneOpen: boolean
  /** Last time we "saved" (Phase 1: local only). */
  lastSavedAt: number | null
  /** The live tldraw editor, shared so the rail/toolbar/top bar can drive it. */
  editor: Editor | null
  /** Current tldraw tool id, mirrored for our custom toolbar highlight. */
  activeTool: string
  /** Which library flyout is open (null = none, canvas full width). */
  flyout: FlyoutKind
  /** Bridge to the doc editor for Markdown export (set by DocPane). */
  docExporter: DocExporter | null
  /** Bridge to the doc editor/canvas embed system (set by DocPane). */
  docBridge: DocBridge | null
  /** Figures currently referenced by document blocks. */
  figureReferences: FigureReference[]
  /** Heading ↔ frame links for the current file. */
  headingLinks: HeadingLink[]
  /** Which tab the right side panel shows. */
  sideTab: 'doc' | 'code'
  /** Custom Figure tool mode: drag on canvas to draw a figure container. */
  figureToolActive: boolean
  /** Comment-pin tool mode: click on canvas to drop a point comment. */
  commentToolActive: boolean

  setTitle: (title: string) => void
  toggleDocPane: () => void
  markSaved: () => void
  setEditor: (editor: Editor | null) => void
  setActiveTool: (tool: string) => void
  setFlyout: (flyout: FlyoutKind) => void
  toggleFlyout: (flyout: Exclude<FlyoutKind, null>) => void
  setDocExporter: (exporter: DocExporter | null) => void
  setDocBridge: (bridge: DocBridge | null) => void
  setFigureReferences: (references: FigureReference[]) => void
  setHeadingLinks: (links: HeadingLink[]) => void
  setSideTab: (tab: 'doc' | 'code') => void
  setFigureToolActive: (active: boolean) => void
  setCommentToolActive: (active: boolean) => void
}

/** Minimal contract so the store doesn't depend on BlockNote's types. */
export type DocExporter = { toMarkdown: () => Promise<string>; toHTML: () => Promise<string> }
export type DocBridge = {
  jumpToFigure: (figureId: string) => void
  refreshFigureEmbeds: (figureId?: string) => Promise<void>
  restoreDiagramToCanvas: (diagram: { src: string; caption: string; figureId?: string; content?: string }) => Promise<void>
  insertFigureReference: (figureId: string, caption: string) => void
  insertDslBlock: (kind: 'flow' | 'erd', code?: string) => void
  applyDslBlock: (kind: 'flow' | 'erd', code: string) => Promise<void>
  /** Scroll the document to a block and reveal it (canvas → doc navigation). */
  jumpToHeading: (blockId: string) => void
  /** Select + zoom a canvas frame (doc → canvas navigation). */
  jumpToFrame: (frameId: string) => void
  /** Link a heading block to the selected frame (creating one if needed). */
  linkHeadingToFrame: (blockId: string, headingText: string) => void
  /** Remove a heading↔frame link from a frame. */
  unlinkFrame: (frameId: string) => void
  /** Recompute the heading↔frame link list (called on canvas changes). */
  collectHeadingLinks: () => void
  /** The block under the doc cursor — used to anchor a comment to a doc range. */
  getActiveDocBlock: () => { id: string; text: string } | null
}

export type FlyoutKind = 'insert' | 'search' | 'snapshots' | 'layers' | 'shapes' | 'icons' | 'catalog' | null

/**
 * Single-player app state (Phase 1). Multiplayer presence/selection will move
 * to Yjs awareness in Phase 2 — see architecture doc §4.
 */
export const useDocStore = create<DocState>((set) => ({
  title: 'payments-service',
  docPaneOpen: true,
  lastSavedAt: null,
  editor: null,
  activeTool: 'select',
  flyout: null,
  docExporter: null,
  docBridge: null,
  figureReferences: [],
  headingLinks: [],
  sideTab: 'doc',
  figureToolActive: false,
  commentToolActive: false,

  setTitle: (title) => set({ title }),
  toggleDocPane: () => set((s) => ({ docPaneOpen: !s.docPaneOpen })),
  markSaved: () => set({ lastSavedAt: Date.now() }),
  setEditor: (editor) => set({ editor }),
  setActiveTool: (activeTool) => set({ activeTool }),
  setFlyout: (flyout) => set({ flyout }),
  toggleFlyout: (flyout) => set((s) => ({ flyout: s.flyout === flyout ? null : flyout })),
  setDocExporter: (docExporter) => set({ docExporter }),
  setDocBridge: (docBridge) => set({ docBridge }),
  setFigureReferences: (figureReferences) => set({ figureReferences }),
  setHeadingLinks: (headingLinks) => set({ headingLinks }),
  setSideTab: (sideTab) => set({ sideTab }),
  setFigureToolActive: (figureToolActive) => set({ figureToolActive }),
  setCommentToolActive: (commentToolActive) => set({ commentToolActive }),
}))
