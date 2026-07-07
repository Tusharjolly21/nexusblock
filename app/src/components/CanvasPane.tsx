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
import { SlideFrameShapeUtil } from '../shapes/SlideFrameShape'
import { ThreeDShapeUtil } from '../shapes/ThreeDShape'
import { DiagramAnimationOverlay } from './DiagramAnimationOverlay'
import { ICON_DND_TYPE, createIconShape, centerOn, ICON_SIZE, decodeIconDragPayload } from '../canvas/createNode'
import { saveThumb } from '../canvas/thumbnail'
import { LoadingAnimation } from './LoadingAnimation'
import { Icon } from '@iconify/react'
import { VersionDiffOverlay } from './VersionDiffOverlay'
import { TraceFlowOverlay } from './TraceFlowOverlay'
import { applyFlow } from '../dsl/flow/compile'


/** Custom shape utils registered on top of tldraw's defaults. */
const customShapeUtils = [
  ArchNodeShapeUtil,
  IconShapeUtil,
  DeviceFrameShapeUtil,
  CodeBlockShapeUtil,
  GroupFrameShapeUtil,
  FlowNodeShapeUtil,
  ErdEntityShapeUtil,
  TableShapeUtil,
  EmbedShapeUtil,
  SlideFrameShapeUtil,
  ThreeDShapeUtil,
]


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
  const isPresenting = useEditorUi((s) => s.isPresenting)
  const file = useApp(selectCurrentFile)
  const fileId = file?.id ?? 'scratch'

  const editor = useDocStore((s) => s.editor)
  const highlightedShapeId = useEditorUi((s) => s.highlightedShapeId)
  const driftedShapeIds = useEditorUi((s) => s.driftedShapeIds)
  const setDriftedShapeIds = useEditorUi((s) => s.setDriftedShapeIds)
  const setDslType = useEditorUi((s) => s.setDslType)
  const setDslOpen = useEditorUi((s) => s.setDslOpen)
  const traceFlowActive = useEditorUi((s) => s.traceFlowActive)
  const setTraceFlowActive = useEditorUi((s) => s.setTraceFlowActive)
  const flowAnimationStyle = useEditorUi((s) => s.flowAnimationStyle)
  const setFlowAnimationStyle = useEditorUi((s) => s.setFlowAnimationStyle)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!editor || (!highlightedShapeId && driftedShapeIds.length === 0)) return
    return react('highlight-listener', () => {
      editor.getCamera()
      setTick((t) => t + 1)
    })
  }, [editor, highlightedShapeId, driftedShapeIds])

  const toLayer = (p: { x: number; y: number }) => {
    if (!editor) return { x: 0, y: 0 }
    const screen = editor.pageToScreen(p)
    const rect = editor.getContainer().getBoundingClientRect()
    return { x: screen.x - rect.left, y: screen.y - rect.top }
  }

  // Shared-file access: a file opened via a share link belongs to `sharedFrom`.
  // Viewers (role !== 'edit') are read-only and never write back to the cloud.
  const sharedFrom = file?.sharedFrom ?? null
  const uid = useAuth((s) => s.uid)
  const ownerUid = sharedFrom ?? uid
  const canEdit = !sharedFrom || file?.sharedRole === 'edit'
  const isEmbed = window.location.pathname.startsWith('/embed/')
  const forcedReadOnly = (!!sharedFrom && !canEdit) || isEmbed

  // Live collaboration: opt-in per session via `?live=1` (from a share link).
  // Off = the normal local + Firestore-synced canvas, untouched.
  const [params] = useSearchParams()
  const live = params.get('live') === '1' && isCollabConfigured
  const collabStore = useCollabStore(roomIdForFile(fileId, ownerUid), customShapeUtils, live)
  const liveReady = live && collabStore.status === 'synced-remote'
  const [showLiveToast, setShowLiveToast] = useState(false)

  const [selectedShapeBounds, setSelectedShapeBounds] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

  useEffect(() => {
    if (!editor) return

    const handleSelectionChange = () => {
      const selectedIds = editor.getSelectedShapeIds()
      if (selectedIds.length === 1) {
        const id = selectedIds[0]
        const shape = editor.getShape(id)
        if (shape) {
          const meta = (shape.meta as any) || {}
          if (meta.templateId) {
            const pageBounds = editor.getShapePageBounds(id)
            if (pageBounds) {
              const topLeft = editor.pageToViewport({ x: pageBounds.x, y: pageBounds.y })
              const bottomRight = editor.pageToViewport({ x: pageBounds.x + pageBounds.w, y: pageBounds.y + pageBounds.h })
              setSelectedShapeBounds({
                x: topLeft.x,
                y: topLeft.y,
                w: bottomRight.x - topLeft.x,
                h: bottomRight.y - topLeft.y,
              })
              setSelectedTemplateId(meta.templateId)
              return
            }
          }
        }
      }
      setSelectedShapeBounds(null)
      setSelectedTemplateId(null)
    }

    // Run initially and listen to store/selection events
    handleSelectionChange()
    const unlisten = editor.store.listen(handleSelectionChange, { scope: 'document' })
    const unlistenTick = setInterval(handleSelectionChange, 100)

    return () => {
      unlisten()
      clearInterval(unlistenTick)
    }
  }, [editor])

  // Keep tldraw's canvas in step with the selected tone (dark tones → dark canvas).
  useEffect(() => {
    const editor = useDocStore.getState().editor
    editor?.user.updateUserPreferences({ colorScheme: isDarkTone(tone) ? 'dark' : 'light' })
  }, [tone])

  useEffect(() => {
    const editor = useDocStore.getState().editor
    const ro = readOnly || forcedReadOnly || isPresenting
    editor?.updateInstanceState({ isReadonly: ro })
    if (ro) editor?.setCurrentTool('hand')
  }, [readOnly, forcedReadOnly, isPresenting])


  // Auto-sync CDN on canvas updates
  useEffect(() => {
    const isReadOnly = readOnly || forcedReadOnly || isPresenting
    if (!editor || fileId === 'scratch' || isReadOnly) return
    
    let timer: number
    const publish = async () => {
      try {
        const ids = Array.from(editor.getCurrentPageShapeIds())
        if (ids.length === 0) return
        const res = await editor.toImage(ids, {
          format: 'svg',
          background: true,
          padding: 24,
        })
        if (!res?.blob) return
        const svg = await res.blob.text()
        
        const hostUrl = import.meta.env.VITE_AI_SERVER_URL || 'http://localhost:8787'
        await fetch(`${hostUrl}/api/v1/diagram/cdn/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId, svg })
        })
      } catch (err) {
        console.error('[cdn-sync] failed to auto-publish SVG:', err)
      }
    }

    return react('auto-publish: cdn sync', () => {
      editor.getCurrentPageShapes()
      window.clearTimeout(timer)
      timer = window.setTimeout(publish, 2000)
    })
  }, [editor, fileId, readOnly, forcedReadOnly, isPresenting])

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

  /** Drop an icon or Terraform State file onto the canvas. */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const editor = useDocStore.getState().editor
      if (!editor) return

      // Handle file drop (Terraform tfstate)
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0]
        if (file.name.endsWith('.json') || file.name.endsWith('.tfstate')) {
          const reader = new FileReader()
          reader.onload = async (event) => {
            try {
              const json = JSON.parse(event.target?.result as string)
              const resources = json.resources || []
              if (resources.length === 0) return

              let dsl = `// Auto-generated architecture from Terraform State\ndirection right\n\n`
              const parsedRes: { name: string; type: string; id: string }[] = []

              for (const res of resources) {
                if (res.mode !== 'managed') continue
                let icon = 'server'
                let color = 'green'
                let shape = 'rectangle'

                if (res.type.includes('db') || res.type.includes('rds') || res.type.includes('postgres') || res.type.includes('mysql')) {
                  icon = 'logos:postgresql'
                  color = 'blue'
                  shape = 'cylinder'
                } else if (res.type.includes('s3') || res.type.includes('bucket')) {
                  icon = 'logos:aws-s3'
                  color = 'orange'
                  shape = 'document'
                } else if (res.type.includes('sqs') || res.type.includes('queue') || res.type.includes('sns') || res.type.includes('mq')) {
                  icon = 'logos:aws-sqs'
                  color = 'pink'
                  shape = 'oval'
                } else if (res.type.includes('lambda') || res.type.includes('function')) {
                  icon = 'logos:aws-lambda'
                  color = 'orange'
                  shape = 'hexagon'
                } else if (res.type.includes('instance') || res.type.includes('ecs') || res.type.includes('eks') || res.type.includes('container')) {
                  icon = 'logos:aws-ec2'
                  color = 'green'
                  shape = 'rectangle'
                }

                dsl += `"${res.name}" [icon: "${icon}", color: ${color}, shape: ${shape}]\n`
                parsedRes.push({ name: res.name, type: res.type, id: res.name })
              }

              dsl += `\n`
              const names = parsedRes.map(r => r.name)
              for (const r of parsedRes) {
                if (r.name.includes('web') || r.name.includes('app') || r.name.includes('api') || r.name.includes('server')) {
                  for (const other of names) {
                    if (other !== r.name && (other.includes('db') || other.includes('rds') || other.includes('s3') || other.includes('queue'))) {
                      dsl += `"${r.name}" > "${other}"\n`
                    }
                  }
                }
              }

              const storageKey = `nb-flow-${fileId}`
              setDslType('flow')
              setDslOpen(true)
              localStorage.setItem(storageKey, dsl)
              await applyFlow(editor, dsl)
              markSaved()

              // Highlight database as drifted
              const shapes = editor.getCurrentPageShapes()
              const driftedIds: string[] = []
              for (const s of shapes) {
                const label = ((s.props as any)?.label || '').toLowerCase()
                if (label.includes('db') || label.includes('rds') || label.includes('s3') || label.includes('bucket')) {
                  driftedIds.push(s.id)
                  break
                }
              }
              setDriftedShapeIds(driftedIds)

            } catch (err) {
              console.error('[Terraform] tfstate parser error:', err)
            }
          }
          reader.readAsText(file)
        }
        return
      }

      // Handle icon drop
      const payload = decodeIconDragPayload(e.dataTransfer.getData(ICON_DND_TYPE))
      if (!payload?.icon) return
      const page = editor.screenToPage({ x: e.clientX, y: e.clientY })
      createIconShape(editor, {
        icon: payload.icon,
        label: payload.label || '',
        point: centerOn(page, ICON_SIZE, ICON_SIZE),
      })
    },
    [fileId, setDslType, setDslOpen, setDriftedShapeIds, markSaved],
  )

  return (
    <div
      className="relative h-full w-full"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(ICON_DND_TYPE) || e.dataTransfer.types.includes('Files')) e.preventDefault()
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
      <VersionDiffOverlay />
      <DiagramAnimationOverlay />

      {selectedShapeBounds && (
        <div
          className="absolute z-40 flex items-center gap-1.5 rounded-xl border border-line bg-paper px-3 py-1.5 shadow-xl transition-all animate-fade-in"
          style={{
            left: `${selectedShapeBounds.x + selectedShapeBounds.w / 2}px`,
            top: `${selectedShapeBounds.y - 48}px`,
            transform: 'translateX(-50%)',
          }}
        >
          {(selectedTemplateId === 'aws-vod' || selectedTemplateId === 'aws-vod-pipeline') && (
            <>
              <span className="text-[10px] font-semibold text-grey-4 flex items-center gap-1">
                <Icon icon="logos:aws" width={12} />
                VOD Template
              </span>
              <div className="h-3 w-px bg-line" />
            </>
          )}
          <button
            onClick={() => {
              useEditorUi.getState().setDslOpen(true)
              useEditorUi.getState().setDslType('flow')
              editor?.selectNone()
            }}
            className="flex items-center gap-1 rounded-lg bg-sky-600 hover:bg-sky-700 px-2 py-0.5 text-[10px] font-bold text-white transition-colors"
          >
            <Icon icon="lucide:code-2" width={11} />
            Edit Code
          </button>
        </div>
      )}
      {highlightedShapeId && editor && (() => {
        const shape = editor.getShape(highlightedShapeId as any)
        const isText = shape?.type === 'text'
        const bounds = editor.getShapePageBounds(highlightedShapeId as any)
        if (!bounds) return null
        const tl = toLayer({ x: bounds.x, y: bounds.y })
        const br = toLayer({ x: bounds.x + bounds.width, y: bounds.y + bounds.height })
        return (
          <div key={highlightedShapeId + tick}>
            <style>{`
              @keyframes nb-pulse {
                0%, 100% { transform: scale(1); opacity: 0.95; }
                50% { transform: scale(1.02); opacity: 0.75; }
              }
            `}</style>
            <div
              className="pointer-events-none absolute z-30"
              style={{
                left: tl.x - 6,
                top: tl.y - 6,
                width: (br.x - tl.x) + 12,
                height: (br.y - tl.y) + 12,
                border: '3px solid #3b82f6',
                borderRadius: 14,
                boxShadow: isText ? 'none' : '0 0 0 6px rgba(59, 130, 246, 0.42)',
                boxSizing: 'border-box',
                animation: 'nb-pulse 1.4s infinite ease-in-out',
                transformOrigin: 'center center',
              }}
            />
          </div>
        )
      })()}
      {driftedShapeIds.map((id) => {
        const bounds = editor?.getShapePageBounds(id as any)
        if (!bounds) return null
        const tl = toLayer({ x: bounds.x + bounds.width, y: bounds.y })
        return (
          <div
            key={id}
            className="pointer-events-auto absolute z-40 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 cursor-help place-items-center justify-center rounded-full border border-red-500 bg-red-100 text-red-600 shadow-md animate-bounce"
            style={{ left: tl.x, top: tl.y }}
            title="Infrastructure Drift Detected: Resource modified in cloud deployment!"
          >
            <Icon icon="lucide:alert-triangle" width={14} />
          </div>
        )
      })}
      <TraceFlowOverlay />
      <div className="absolute right-5 top-5 z-40 flex items-center gap-2">
        {traceFlowActive && (
          <div className="pointer-events-auto absolute right-12 top-0 z-40 flex w-[320px] flex-col rounded-2xl border border-line bg-surface/95 p-3.5 shadow-[0_16px_40px_-12px_rgba(0,0,0,.35)] backdrop-blur-lg">
            <div className="mb-2.5 flex items-center justify-between border-b border-line pb-1.5">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-grey-3">Connection Tracing Modes</span>
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono text-[9px] text-emerald-500 uppercase font-semibold">Active</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              {/* Flowing Elements Group */}
              <div>
                <div className="mb-1.5 text-[8.5px] font-bold uppercase tracking-wider text-grey-3">Flowing Elements</div>
                <div className="flex flex-col gap-1">
                  {(['particle', 'droplet', 'aurora', 'pill'] as const).map((style) => {
                    const isActive = flowAnimationStyle === style
                    const styleIcons = {
                      particle: 'lucide:sparkles',
                      droplet: 'lucide:droplet',
                      aurora: 'lucide:wind',
                      pill: 'lucide:package',
                    }
                    const styleTitles = {
                      particle: 'Particles',
                      droplet: 'Droplets',
                      aurora: 'Aurora Trails',
                      pill: 'Protocol Pills',
                    }
                    return (
                      <button
                        key={style}
                        onClick={() => setFlowAnimationStyle(style)}
                        className={`flex h-8 items-center gap-2 rounded-lg border px-2 text-[11px] font-medium transition-all ${
                          isActive
                            ? 'border-ink bg-ink text-paper'
                            : 'border-line text-grey-4 hover:border-ink hover:text-ink hover:bg-grey-1'
                        }`}
                      >
                        <Icon icon={styleIcons[style]} width={14} />
                        <span>{styleTitles[style]}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Path Strokes Group */}
              <div>
                <div className="mb-1.5 text-[8.5px] font-bold uppercase tracking-wider text-grey-3">Stroke Animations</div>
                <div className="flex flex-col gap-1">
                  {(['dashes', 'laser'] as const).map((style) => {
                    const isActive = flowAnimationStyle === style
                    const styleIcons = {
                      dashes: 'lucide:git-commit',
                      laser: 'lucide:zap',
                    }
                    const styleTitles = {
                      dashes: 'Neon Dashes',
                      laser: 'Spectrum Laser',
                    }
                    return (
                      <button
                        key={style}
                        onClick={() => setFlowAnimationStyle(style)}
                        className={`flex h-8 items-center gap-2 rounded-lg border px-2 text-[11px] font-medium transition-all ${
                          isActive
                            ? 'border-ink bg-ink text-paper'
                            : 'border-line text-grey-4 hover:border-ink hover:text-ink hover:bg-grey-1'
                        }`}
                      >
                        <Icon icon={styleIcons[style]} width={14} />
                        <span>{styleTitles[style]}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={() => setTraceFlowActive(!traceFlowActive)}
          title={traceFlowActive ? "Turn off connection tracing" : "Trace message flows along arrow connections"}
          className={`pointer-events-auto flex h-10 w-10 place-items-center justify-center rounded-full border shadow-[0_12px_30px_-10px_rgba(0,0,0,.3)] backdrop-blur transition-all hover:scale-105 ${traceFlowActive ? 'border-blue-500 bg-blue-100 text-blue-600' : 'border-line bg-surface/95 text-grey-4 hover:border-ink hover:text-ink'}`}
        >
          <Icon icon="lucide:activity" width={18} />
        </button>
      </div>
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
