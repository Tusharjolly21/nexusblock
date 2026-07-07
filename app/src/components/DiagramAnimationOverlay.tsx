import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import { useCatalogStore, type InsertedTemplate } from '../store/useCatalogStore'
import { useDocStore } from '../store/useDocStore'
import { useEditorUi } from '../store/useEditorUi'

export function DiagramAnimationOverlay() {
  const editor = useDocStore((s) => s.editor)
  const insertedTemplates = useCatalogStore((s) => s.insertedTemplates)
  const updateInsertedTemplate = useCatalogStore((s) => s.updateInsertedTemplate)
  const removeInsertedTemplate = useCatalogStore((s) => s.removeInsertedTemplate)

  // Force re-render of overlay on canvas camera shifts
  const [cameraTick, setCameraTick] = useState(0)

  useEffect(() => {
    if (!editor) return
    const update = () => setCameraTick((t) => t + 1)
    const unlisten = editor.store.listen(update)
    return unlisten
  }, [editor])

  if (!editor || insertedTemplates.length === 0) return null

  // Find the first template that is active and either has animations enabled or is selected
  const activeTpl = insertedTemplates[0]
  const shapes = editor.getCurrentPageShapes()
  const templateShapes = shapes.filter((s) => (s.meta as any)?.templateId === activeTpl.templateId)

  // Reference cameraTick to satisfy unused variable warning
  if (cameraTick < 0) console.log(cameraTick)

  // If no shapes exist on the canvas for this template, clean up store references
  if (templateShapes.length === 0) {
    removeInsertedTemplate(activeTpl.templateId)
    return null
  }

  return (
    <>
      {/* SVG flow particles layer */}
      <FlowParticlesLayer editor={editor} activeTpl={activeTpl} templateShapes={templateShapes} />

      {/* Narrative Guided Tour Overlays */}
      <GuidedTourLayer editor={editor} activeTpl={activeTpl} templateShapes={templateShapes} />

      {/* Floating Controller widget */}
      <PlaybackControllerWidget
        editor={editor}
        activeTpl={activeTpl}
        updateTpl={(patch) => updateInsertedTemplate(activeTpl.templateId, patch)}
      />
    </>
  )
}

function FlowParticlesLayer({
  editor,
  activeTpl,
  templateShapes
}: {
  editor: any
  activeTpl: InsertedTemplate
  templateShapes: any[]
}) {
  const isPlaying = activeTpl.isPlaying
  const showParticles = activeTpl.isAnimated && isPlaying
  const flowStyle = useEditorUi((s) => s.flowAnimationStyle)

  if (!showParticles || !activeTpl.graph.animation) return null

  const paths = activeTpl.graph.animation.flowPaths || []

  return (
    <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes trace-flow-move {
          0% { offset-distance: 0%; }
          100% { offset-distance: 100%; }
        }
        @keyframes trace-flow-dashes {
          to { stroke-dashoffset: -40; }
        }
        @keyframes trace-flow-laser {
          from { stroke-dashoffset: 140; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes trace-flow-hue {
          from { filter: hue-rotate(0deg) drop-shadow(0 0 5px #f43f5e); }
          to { filter: hue-rotate(360deg) drop-shadow(0 0 5px #f43f5e); }
        }
        @keyframes trace-conduit-pulse {
          0%, 100% { opacity: 0.2; stroke-width: 1.2px; }
          50% { opacity: 0.5; stroke-width: 2.2px; }
        }
      `}} />
      {paths.map((path) => {
        // Find corresponding tldraw arrow shape for this edge
        const arrow = templateShapes.find(
          (s) => s.type === 'arrow' && (s.meta as any)?.elementId === path.edgeId
        )
        if (!arrow) return null

        const geom = editor.getShapeGeometry(arrow.id)
        if (!geom || !geom.vertices || geom.vertices.length < 2) return null

        const screenPoints = geom.vertices.map((v: any) => {
          const pagePt = { x: arrow.x + v.x, y: arrow.y + v.y }
          return editor.pageToScreen(pagePt)
        })

        const pathD = screenPoints
          .map((p: any, i: number) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
          .join(' ')

        // Resolve shape overrides with fallbacks
        const color = (arrow.meta as any)?.flowColor || path.color || '#3b82f6'
        const rawSpeed = (arrow.meta as any)?.flowSpeed || path.speed || 2
        const duration = `${rawSpeed * (activeTpl.speed || 1)}s`
        const localFlowStyle = (arrow.meta as any)?.flowStyle || flowStyle

        return (
          <g key={path.edgeId}>
            {/* Animated pulsating line conduit backdrop */}
            <path
              d={pathD}
              fill="none"
              stroke={color}
              strokeWidth={1.5}
              style={{
                animation: 'trace-conduit-pulse 2s infinite ease-in-out',
                filter: `drop-shadow(0 0 3px ${color})`,
              }}
            />

            {/* 1. Particle */}
            {localFlowStyle === 'particle' && (
              <circle r="4.5" fill={color} style={{ filter: `drop-shadow(0 0 5px ${color})` }}>
                <animateMotion dur={duration} repeatCount="indefinite" path={pathD} />
              </circle>
            )}

            {/* 2. Dashes */}
            {localFlowStyle === 'dashes' && (
              <path
                d={pathD}
                fill="none"
                stroke={color}
                strokeWidth={2.5}
                strokeDasharray="12,12"
                style={{
                  animation: 'trace-flow-dashes 1.2s infinite linear',
                  filter: `drop-shadow(0 0 4px ${color})`,
                }}
              />
            )}

            {/* 3. Laser */}
            {localFlowStyle === 'laser' && (
              <path
                d={pathD}
                fill="none"
                stroke={color}
                strokeWidth={3}
                strokeDasharray="40,100"
                style={{
                  animation: 'trace-flow-laser 2.5s infinite linear, trace-flow-hue 6s infinite linear',
                  filter: `drop-shadow(0 0 5px ${color})`,
                }}
              />
            )}

            {/* 4. Droplet */}
            {localFlowStyle === 'droplet' && (
              <>
                <circle r="5" fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }}>
                  <animateMotion dur={duration} repeatCount="indefinite" path={pathD} />
                </circle>
                <circle r="3.5" fill={color} opacity={0.75} style={{ filter: `drop-shadow(0 0 3px ${color})` }}>
                  <animateMotion dur={duration} repeatCount="indefinite" path={pathD} begin="-0.12s" />
                </circle>
                <circle r="2.2" fill={color} opacity={0.45} style={{ filter: `drop-shadow(0 0 2px ${color})` }}>
                  <animateMotion dur={duration} repeatCount="indefinite" path={pathD} begin="-0.24s" />
                </circle>
              </>
            )}

            {/* 5. Aurora Trail */}
            {localFlowStyle === 'aurora' && (
              <>
                {[...Array(6)].map((_, i) => {
                  const delaySec = -(i * 0.08)
                  const opacity = 1.0 - (i / 6)
                  const r = Math.max(1, 6.0 - i * 0.75)
                  return (
                    <circle
                      key={i}
                      r={r}
                      fill={color}
                      opacity={opacity}
                      style={{
                        filter: `drop-shadow(0 0 ${12 - i * 1.5}px ${color})`,
                      }}
                    >
                      <animateMotion dur={duration} repeatCount="indefinite" path={pathD} begin={`${delaySec}s`} />
                    </circle>
                  )
                })}
              </>
            )}

            {/* 6. Protocol Pill */}
            {localFlowStyle === 'pill' && (
              <g>
                <animateMotion dur={duration} repeatCount="indefinite" path={pathD} />
                <circle
                  cx={18}
                  cy={0}
                  r="3.5"
                  fill={color}
                  style={{
                    filter: `drop-shadow(0 0 6px ${color})`,
                  }}
                />
                <rect
                  x={-22}
                  y={-7}
                  width={44}
                  height={14}
                  rx={4}
                  fill="rgba(15, 23, 42, 0.9)"
                  stroke={color}
                  strokeWidth={1.2}
                  style={{
                    filter: 'drop-shadow(0 4px 10px rgba(0, 0, 0, 0.5))',
                  }}
                />
                <text
                  x={0}
                  y={1.5}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="7.5px"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {((arrow.props as any)?.text || 'DATA').substring(0, 7)}
                </text>
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}

function GuidedTourLayer({
  editor,
  activeTpl,
  templateShapes
}: {
  editor: any
  activeTpl: InsertedTemplate
  templateShapes: any[]
}) {
  const activeScenarioId = activeTpl.activeScenarioId
  const currentStepIndex = activeTpl.currentStepIndex ?? 0

  if (!activeScenarioId) return null

  const scenario = activeTpl.graph.scenarios.find((s) => s.id === activeScenarioId)
  if (!scenario) return null

  const step = scenario.steps.find((s) => s.stepIndex === currentStepIndex + 1)
  if (!step) return null

  // Find shape IDs to highlight
  const highlights = (step.highlightNodeIds || []).map((nodeId) => {
    const shape = templateShapes.find((s) => (s.meta as any)?.elementId === nodeId)
    return shape ? shape.id : null
  }).filter(Boolean)

  // Zoom camera to focus nodes on step change
  useEffect(() => {
    if (step.focusNodeIds && step.focusNodeIds.length > 0) {
      const targetIds = step.focusNodeIds.map((nodeId) => {
        const shape = templateShapes.find((s) => (s.meta as any)?.elementId === nodeId)
        return shape ? shape.id : null
      }).filter(Boolean)

      if (targetIds.length > 0) {
        const bounds = editor.getSelectionPageBounds(targetIds)
        if (bounds) {
          editor.zoomToBounds(bounds, { inset: 120, animation: { duration: 450 } })
        }
      }
    }
  }, [activeScenarioId, currentStepIndex])

  return (
    <>
      {/* Focus outline overlay wrappers */}
      {highlights.map((shapeId) => {
        const bounds = editor.getShapePageBounds(shapeId)
        if (!bounds) return null
        const tl = editor.pageToScreen({ x: bounds.x, y: bounds.y })
        const br = editor.pageToScreen({ x: bounds.x + bounds.w, y: bounds.y + bounds.h })

        return (
          <div
            key={shapeId}
            className="pointer-events-none absolute z-30 border-2 border-dashed border-sky-500 rounded-xl"
            style={{
              left: tl.x - 4,
              top: tl.y - 4,
              width: br.x - tl.x + 8,
              height: br.y - tl.y + 8,
              boxShadow: '0 0 0 4px rgba(56, 189, 248, 0.25)',
              animation: 'pulse 2s infinite'
            }}
          />
        )
      })}

      {/* Floating narration dialog */}
      <div className="pointer-events-none absolute bottom-24 left-0 right-0 z-30 flex justify-center animate-fade-in">
        <div className="pointer-events-auto max-w-lg rounded-2xl border border-line bg-surface/95 p-4 shadow-[0_16px_45px_-12px_rgba(0,0,0,.25)] backdrop-blur text-left">
          <div className="flex items-center justify-between border-b border-line pb-2 mb-2">
            <span className="text-[10px] font-bold text-sky-600 uppercase tracking-widest">
              GUIDED WALKTHROUGH • STEP {currentStepIndex + 1} OF {scenario.steps.length}
            </span>
            <span className="text-xs font-semibold text-grey-4">
              {scenario.name}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-ink font-medium">
            {step.notes}
          </p>
        </div>
      </div>
    </>
  )
}



function PlaybackControllerWidget({
  activeTpl,
  updateTpl
}: {
  editor: any
  activeTpl: InsertedTemplate
  updateTpl: (patch: Partial<InsertedTemplate>) => void
}) {
  const isPlaying = activeTpl.isPlaying ?? false
  const speed = activeTpl.speed ?? 1

  if (!activeTpl.graph.animation) return null

  return (
    <div className="pointer-events-none absolute bottom-6 left-0 right-0 z-40 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-4 rounded-full border border-line bg-surface/95 px-5 py-2.5 shadow-[0_20px_50px_-16px_rgba(0,0,0,.3)] backdrop-blur transition-all">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => updateTpl({ isPlaying: !isPlaying })}
            className={
              'grid h-8 w-8 place-items-center rounded-full text-paper transition-all ' +
              (isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-ink hover:opacity-90')
            }
            title={isPlaying ? 'Pause animation' : 'Play flow animation'}
          >
            <Icon icon={isPlaying ? 'lucide:pause' : 'lucide:play'} width={16} />
          </button>
        </div>

        {/* Speed adjuster */}
        {isPlaying && (
          <>
            <span className="h-4 w-px bg-line" />
            <button
              onClick={() => updateTpl({ speed: speed === 1 ? 1.5 : speed === 1.5 ? 0.75 : 1 })}
              className="text-[10px] font-bold text-grey-4 hover:text-ink flex items-center gap-1"
            >
              <Icon icon="lucide:timer" width={13} />
              {speed}x
            </button>
          </>
        )}
      </div>
    </div>
  )
}
