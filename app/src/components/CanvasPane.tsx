import { useCallback, useEffect, useState } from 'react'
import {
  Tldraw,
  react,
  getSnapshot,
  loadSnapshot,
  defaultBindingUtils,
  DefaultColorStyle,
  DefaultSizeStyle,
  ArrowShapeKindStyle,
  type Editor,
  type TLComponents,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { useSearchParams } from 'react-router-dom'
import { useDocStore } from '../store/useDocStore'
import { useApp, selectCurrentFile } from '../store/useApp'
import { useAuth } from '../store/useAuth'
import { cloudEnabled, pullContent, pushContent } from '../sync/cloud'
import { useCollabStore } from '../collab/useCollabStore'
import { isCollabConfigured, roomIdForFile } from '../lib/collab'
import { useEditorUi } from '../store/useEditorUi'
import { useTheme, isDarkTone } from '../store/useTheme'
import { getTemplate } from '../onboarding/templates'
import { ArchNodeShapeUtil } from '../shapes/ArchNodeShape'
import { IconShapeUtil } from '../shapes/IconShape'
import { DeviceFrameShapeUtil } from '../shapes/DeviceFrameShape'
import { CodeBlockShapeUtil } from '../shapes/CodeBlockShape'
import { GroupFrameShapeUtil } from '../shapes/GroupFrameShape'
import { FlowNodeShapeUtil } from '../shapes/FlowNodeShape'
import { ErdEntityShapeUtil } from '../shapes/ErdEntityShape'
import { TableShapeUtil } from '../shapes/TableShape'
import { EmbedShapeUtil } from '../shapes/EmbedShape'
import { ICON_DND_TYPE, createIconShape, centerOn, ICON_SIZE, decodeIconDragPayload } from '../canvas/createNode'
import { saveThumb } from '../canvas/thumbnail'
import { LoadingAnimation } from './LoadingAnimation'
import { Icon } from '@iconify/react'

/** Custom shape utils registered on top of tldraw's defaults. */
const customShapeUtils = [ArchNodeShapeUtil, IconShapeUtil, DeviceFrameShapeUtil, CodeBlockShapeUtil, GroupFrameShapeUtil, FlowNodeShapeUtil, ErdEntityShapeUtil, TableShapeUtil, EmbedShapeUtil]

/**
 * Trim tldraw's default chrome so the app reads as nexusblock, not stock tldraw,
 * and nothing competes with our sidebar / top bar. We keep the essential editing
 * controls (tool toolbar, style panel, zoom) and hide the brand menu, page tabs,
 * minimap, and debug/share panels.
 */
const components: TLComponents = {
  // We provide our own thin rail + floating tool cluster, so hide tldraw's
  // stock chrome entirely and let the canvas breathe.
  Toolbar: null,
  MenuPanel: null,
  PageMenu: null,
  MainMenu: null,
  Minimap: null,
  DebugMenu: null,
  DebugPanel: null,
  SharePanel: null,
  HelpMenu: null,
  // We render our own StylePopover (anchored under the toolbar) instead of
  // tldraw's fixed top-right style panel.
  StylePanel: null,
}

/**
 * Diagram canvas for the current file. Persistence is scoped per file, and a
 * new file's template is seeded on first mount. Publishes the tldraw Editor to
 * the store so the rail, top bar, and (later) DSL/AI pipelines can drive it.
 */
export function CanvasPane() {
  const markSaved = useDocStore((s) => s.markSaved)
  const setEditor = useDocStore((s) => s.setEditor)
  const setActiveTool = useDocStore((s) => s.setActiveTool)
  const tone = useTheme((s) => s.tone)
  const readOnly = useEditorUi((s) => s.readOnly)
  const file = useApp(selectCurrentFile)
  const fileId = file?.id ?? 'scratch'

  // Shared-file access: a file opened via a share link belongs to `sharedFrom`.
  // Viewers (role !== 'edit') are read-only and never write back to the cloud.
  const sharedFrom = file?.sharedFrom ?? null
  const canEdit = !sharedFrom || file?.sharedRole === 'edit'
  const forcedReadOnly = !!sharedFrom && !canEdit

  // Live collaboration: opt-in per session via `?live=1` (from a share link).
  // Off = the normal local + Firestore-synced canvas, untouched.
  const [params] = useSearchParams()
  const live = params.get('live') === '1' && isCollabConfigured
  const collabStore = useCollabStore(roomIdForFile(fileId), customShapeUtils, live)
  const liveReady = live && collabStore.status === 'synced-remote'
  const [showLiveToast, setShowLiveToast] = useState(false)

  // Keep tldraw's canvas in step with the selected tone (dark tones → dark canvas).
  useEffect(() => {
    const editor = useDocStore.getState().editor
    editor?.user.updateUserPreferences({ colorScheme: isDarkTone(tone) ? 'dark' : 'light' })
  }, [tone])

  useEffect(() => {
    const editor = useDocStore.getState().editor
    const ro = readOnly || forcedReadOnly
    editor?.updateInstanceState({ isReadonly: ro })
    if (ro) editor?.setCurrentTool('hand')
  }, [readOnly, forcedReadOnly])

  useEffect(() => {
    if (!liveReady) return
    setShowLiveToast(true)
    const t = window.setTimeout(() => setShowLiveToast(false), 2200)
    return () => window.clearTimeout(t)
  }, [liveReady])

  const handleMount = useCallback(
    (e: Editor) => {
      setEditor(e)
      markSaved()
      e.user.updateUserPreferences({
        colorScheme: isDarkTone(useTheme.getState().tone) ? 'dark' : 'light',
        isSnapMode: true,
      })
      e.updateInstanceState({ isReadonly: useEditorUi.getState().readOnly || forcedReadOnly })

      // nexusblock connector defaults for user-drawn arrows: thin + ink, and
      // the current connector line type (elbow by default) so the toolbar Arrow
      // tool draws bent connectors automatically too.
      e.setStyleForNextShapes(DefaultColorStyle, 'black')
      e.setStyleForNextShapes(DefaultSizeStyle, 's')
      e.setStyleForNextShapes(
        ArrowShapeKindStyle,
        useEditorUi.getState().connectorStyle === 'elbow' ? 'elbow' : 'arc',
      )

      // First-mount content: prefer this file's cloud snapshot (device switch
      // or durable live-room hydrate), otherwise seed the template. Only ever
      // fills an EMPTY page — never clobbers existing local drawings.
      const seedKey = `nb-seeded-${fileId}`
      void (async () => {
        // Shared files load from the OWNER's cloud copy; own files from the
        // current user's. For a shared file we always overwrite (the viewer is
        // not the source of truth); for our own we only fill an empty page.
        const ownerUid = sharedFrom ?? useAuth.getState().uid
        let loadedFromCloud = false
        const shouldPull = sharedFrom ? true : e.getCurrentPageShapeIds().size === 0
        if (shouldPull && cloudEnabled() && ownerUid) {
          try {
            const content = await pullContent(ownerUid, fileId)
            if (content?.canvas) {
              loadSnapshot(e.store, { document: JSON.parse(content.canvas) })
              loadedFromCloud = true
            }
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('[cloud] canvas pull failed:', err)
          }
        }
        // Templates are only seeded for the owner's own files, never shared ones.
        if (!live && !sharedFrom && !loadedFromCloud && file && file.template !== 'blank' && !localStorage.getItem(seedKey) && e.getCurrentPageShapeIds().size === 0) {
          getTemplate(file.template).seedCanvas?.(e)
        }
        if (!live && !sharedFrom && file && file.template !== 'blank') localStorage.setItem(seedKey, '1')
      })()

      // Mirror tldraw's active tool into our store so the custom toolbar
      // highlights correctly even when the tool changes via keyboard/canvas.
      const stop = react('sync active tool', () => setActiveTool(e.getCurrentToolId()))

      // Keep a live thumbnail fresh (debounced) for the dashboard, and bump the
      // file's "edited" time.
      let timer: ReturnType<typeof setTimeout> | undefined
      const unlisten = e.store.listen(
        () => {
          clearTimeout(timer)
          timer = setTimeout(() => {
            saveThumb(e, fileId)
            useApp.getState().touchFile(fileId)
            // Mirror the canvas to the cloud (document snapshot only). Live
            // rooms are realtime, but Firebase is the durable copy after the
            // session ends / refreshes. Edits to a shared file write back to
            // the OWNER's copy.
            // Edits to a shared file write back to the OWNER's copy.
            const target = sharedFrom ?? useAuth.getState().uid
            if (canEdit && target && cloudEnabled()) {
              try {
                pushContent(target, fileId, { canvas: JSON.stringify(getSnapshot(e.store).document) }).catch(() => {})
              } catch {
                /* ignore */
              }
            }
          }, 1200)
        },
        { scope: 'document' },
      )
      // Initial capture (covers seeded templates).
      const initial = setTimeout(() => saveThumb(e, fileId), 900)

      return () => {
        stop()
        unlisten()
        clearTimeout(timer)
        clearTimeout(initial)
        void saveThumb(e, fileId) // final capture before leaving the editor
        setEditor(null)
      }
    },
    [setEditor, markSaved, setActiveTool, file, fileId, live, sharedFrom, canEdit, forcedReadOnly],
  )

  /** Drop an icon from the library onto the canvas at the cursor. */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      const payload = decodeIconDragPayload(e.dataTransfer.getData(ICON_DND_TYPE))
      const editor = useDocStore.getState().editor
      if (!payload?.icon || !editor) return
      e.preventDefault()
      const page = editor.screenToPage({ x: e.clientX, y: e.clientY })
      createIconShape(editor, {
        icon: payload.icon,
        label: payload.label || '',
        point: centerOn(page, ICON_SIZE, ICON_SIZE),
      })
    },
    [],
  )

  return (
    <div
      className="relative h-full w-full"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(ICON_DND_TYPE)) e.preventDefault()
      }}
      onDrop={handleDrop}
    >
      {live && !liveReady ? (
        <LiveLoadingOverlay />
      ) : live ? (
        // A pre-built store still needs shape AND binding utils registered on
        // the Editor itself, or custom shapes (icon, arch node, …) fail to
        // render and arrow/line bindings (dragging connectors) break.
        <Tldraw
          store={collabStore}
          shapeUtils={customShapeUtils}
          bindingUtils={defaultBindingUtils}
          components={components}
          onMount={handleMount}
        />
      ) : (
        <Tldraw
          persistenceKey={`nb-canvas-${fileId}`}
          shapeUtils={customShapeUtils}
          components={components}
          onMount={handleMount}
        />
      )}
      {showLiveToast && <LiveReadyToast />}
    </div>
  )
}

function LiveLoadingOverlay() {
  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-paper">
      <LoadingAnimation size="lg" variant="cycle12" label="Going live..." />
    </div>
  )
}

function LiveReadyToast() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-5 z-40 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-emerald-500/20 bg-surface/95 px-4 py-3 text-sm text-ink shadow-[0_20px_60px_-30px_rgba(0,0,0,.55)] backdrop-blur">
      <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/12 text-emerald-600">
        <span className="absolute right-2 top-2 h-2 w-2 animate-ping rounded-full bg-emerald-500" />
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-500" />
        <Icon icon="lucide:radio" width={16} />
      </span>
      <span className="leading-tight">
        <span className="block font-semibold">Live session started</span>
        <span className="block text-xs text-grey-3">People with the live link can join now.</span>
      </span>
    </div>
  )
}
