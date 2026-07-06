import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import { useCatalogStore, type InsertedTemplate } from '../store/useCatalogStore'
import { TldrawRendererAdapter } from '../canvas/rendererAdapter'
import { useDocStore } from '../store/useDocStore'

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

  if (!showParticles || !activeTpl.graph.animation) return null

  const paths = activeTpl.graph.animation.flowPaths || []

  return (
    <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full">
      {paths.map((path) => {
        // Find corresponding tldraw arrow shape for this edge
        const arrow = templateShapes.find(
          (s) => s.type === 'arrow' && (s.meta as any)?.elementId === path.edgeId
        )
        if (!arrow) return null

        // Get start and end points in absolute page space
        const startPage = { x: arrow.x + arrow.props.start.x, y: arrow.y + arrow.props.start.y }
        const endPage = { x: arrow.x + arrow.props.end.x, y: arrow.y + arrow.props.end.y }

        // Map to client viewport coordinates
        const startScreen = editor.pageToScreen(startPage)
        const endScreen = editor.pageToScreen(endPage)

        const pathD = `M ${startScreen.x} ${startScreen.y} L ${endScreen.x} ${endScreen.y}`
        const color = path.color || '#3b82f6'
        const duration = `${(path.speed || 2) * (activeTpl.speed || 1)}s`

        return (
          <g key={path.edgeId}>
            <path d={pathD} fill="none" stroke="transparent" />
            <circle r="4" fill={color}>
              <animateMotion dur={duration} repeatCount="indefinite" path={pathD} />
            </circle>
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
  editor,
  activeTpl,
  updateTpl
}: {
  editor: any
  activeTpl: InsertedTemplate
  updateTpl: (patch: Partial<InsertedTemplate>) => void
}) {
  const activeLevel = activeTpl.detailLevel
  const isPlaying = activeTpl.isPlaying ?? false
  const activeScenarioId = activeTpl.activeScenarioId
  const currentStep = activeTpl.currentStepIndex ?? 0
  const speed = activeTpl.speed ?? 1

  const activeScenario = activeTpl.graph.scenarios.find((s) => s.id === activeScenarioId)
  const maxSteps = activeScenario ? activeScenario.steps.length : 0

  const handleLevelChange = (lvl: number) => {
    updateTpl({ detailLevel: lvl })
    // Re-render template on the canvas via adapter
    const bounds = editor.getCurrentPageShapes().find(
      (s: any) => (s.meta as any)?.templateId === activeTpl.templateId
    )
    if (bounds) {
      const adapter = new TldrawRendererAdapter(editor, { x: bounds.x, y: bounds.y }, activeTpl.templateId)
      adapter.render(activeTpl.graph, lvl)
    }
  }

  const handleNextStep = () => {
    if (maxSteps > 0) {
      updateTpl({ currentStepIndex: (currentStep + 1) % maxSteps })
    }
  }

  const handlePrevStep = () => {
    if (maxSteps > 0) {
      updateTpl({ currentStepIndex: (currentStep - 1 + maxSteps) % maxSteps })
    }
  }

  return (
    <div className="pointer-events-none absolute bottom-6 left-0 right-0 z-40 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-4 rounded-full border border-line bg-surface/95 px-5 py-2.5 shadow-[0_20px_50px_-16px_rgba(0,0,0,.3)] backdrop-blur transition-all">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          {activeTpl.graph.animation && (
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
          )}

          {activeScenarioId && (
            <div className="flex items-center gap-1.5 border-l border-line pl-2">
              <button
                onClick={handlePrevStep}
                className="grid h-8 w-8 place-items-center rounded-full text-grey-4 hover:bg-grey-1 hover:text-ink transition-colors"
                title="Previous step"
              >
                <Icon icon="lucide:skip-back" width={16} />
              </button>
              <span className="text-[10px] font-mono font-semibold text-grey-3">
                {currentStep + 1} / {maxSteps}
              </span>
              <button
                onClick={handleNextStep}
                className="grid h-8 w-8 place-items-center rounded-full text-grey-4 hover:bg-grey-1 hover:text-ink transition-colors"
                title="Next step"
              >
                <Icon icon="lucide:skip-forward" width={16} />
              </button>
            </div>
          )}
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


        <span className="h-4 w-px bg-line" />

        {/* Scenario Picker */}
        {activeTpl.graph.scenarios && activeTpl.graph.scenarios.length > 0 && (
          <div className="flex items-center gap-1 text-xs">
            <span className="text-grey-3">Scenario:</span>
            <select
              value={activeScenarioId || ''}
              onChange={(e) => updateTpl({ activeScenarioId: e.target.value || undefined, currentStepIndex: 0 })}
              className="bg-transparent font-bold outline-none cursor-pointer text-ink text-xs"
            >
              <option value="">Static View</option>
              {activeTpl.graph.scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <span className="h-4 w-px bg-line" />

        {/* Detail Level selector */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-grey-3">Detail:</span>
          <select
            value={activeLevel}
            onChange={(e) => handleLevelChange(Number(e.target.value))}
            className="bg-transparent font-bold outline-none cursor-pointer text-ink text-xs"
          >
            <option value={1}>L1: Executive</option>
            <option value={2}>L2: Engineering</option>
            <option value={3}>L3: Production</option>
            <option value={4}>L4: Implementation</option>
          </select>
        </div>
      </div>
    </div>
  )
}
