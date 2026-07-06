import { useEffect, useState } from 'react'
import { useEditorUi } from '../store/useEditorUi'
import { useDocStore } from '../store/useDocStore'
import { react } from 'tldraw'

export function TraceFlowOverlay() {
  const editor = useDocStore((s) => s.editor)
  const traceFlowActive = useEditorUi((s) => s.traceFlowActive)
  const flowAnimationStyle = useEditorUi((s) => s.flowAnimationStyle)
  const [cam, setCam] = useState({ x: 0, y: 0, z: 1 })
  const [arrows, setArrows] = useState<any[]>([])

  // Watch for camera movements to align screen paths
  useEffect(() => {
    if (!editor || !traceFlowActive) return
    return react('trace-flow-cam', () => {
      const c = editor.getCamera()
      setCam({ x: c.x, y: c.y, z: c.z })
    })
  }, [editor, traceFlowActive])

  // Watch for editor shape additions / mutations to trace active arrows
  useEffect(() => {
    if (!editor || !traceFlowActive) return
    return react('trace-flow-arrows', () => {
      const allArrows = editor.getCurrentPageShapes().filter((s) => s.type === 'arrow')
      setArrows(allArrows)
    })
  }, [editor, traceFlowActive])

  if (!editor || !traceFlowActive || arrows.length === 0) return null

  const toLayer = (p: { x: number; y: number }) => {
    const screen = editor.pageToScreen(p)
    const rect = editor.getContainer().getBoundingClientRect()
    return { x: screen.x - rect.left, y: screen.y - rect.top }
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes trace-flow-move {
          0% { offset-distance: 0%; }
          100% { offset-distance: 100%; }
        }
        @keyframes trace-flow-dashes {
          to { stroke-dashoffset: -40; }
        }
        @keyframes trace-flow-laser {
          0%, 100% { stroke-dasharray: 20, 160; stroke-dashoffset: 0; }
          50% { stroke-dasharray: 80, 100; stroke-dashoffset: -80; }
        }
        @keyframes trace-flow-hue {
          from { filter: hue-rotate(0deg) drop-shadow(0 0 5px #f43f5e); }
          to { filter: hue-rotate(360deg) drop-shadow(0 0 5px #f43f5e); }
        }
      `}} />
      <svg className="h-full w-full">
        {arrows.map((arrow) => {
          const geom = editor.getShapeGeometry(arrow.id)
          if (!geom || !geom.vertices || geom.vertices.length < 2) return null

          const screenPoints = geom.vertices.map((v) => {
            const pagePt = { x: arrow.x + v.x, y: arrow.y + v.y }
            return toLayer(pagePt)
          })

          const d = screenPoints
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
            .join(' ')

          return (
            <g key={arrow.id}>
              {/* Reference path for offset motion */}
              <path d={d} fill="none" stroke="transparent" strokeWidth={1} id={`path-${arrow.id}`} />
              
              {/* Particle animation */}
              {flowAnimationStyle === 'particle' && (
                <circle
                  r={4 * Math.max(0.6, Math.min(1.4, cam.z))}
                  fill="#60a5fa"
                  style={{
                    offsetPath: `path('${d}')`,
                    animation: 'trace-flow-move 2.2s infinite linear',
                    filter: 'drop-shadow(0 0 4px #3b82f6) drop-shadow(0 0 8px #60a5fa)',
                  }}
                />
              )}

              {/* Dashed Pipeline animation */}
              {flowAnimationStyle === 'dashes' && (
                <path
                  d={d}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  strokeDasharray="12,12"
                  style={{
                    animation: 'trace-flow-dashes 1.2s infinite linear',
                    filter: 'drop-shadow(0 0 4px #0ea5e9)',
                  }}
                />
              )}

              {/* Rainbow Spectrum Laser animation */}
              {flowAnimationStyle === 'laser' && (
                <path
                  d={d}
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth={3}
                  style={{
                    animation: 'trace-flow-laser 2.5s infinite linear, trace-flow-hue 6s infinite linear',
                    filter: 'drop-shadow(0 0 5px #f43f5e)',
                  }}
                />
              )}

              {/* Trailing Droplets animation */}
              {flowAnimationStyle === 'droplet' && (
                <>
                  <circle
                    r={5 * Math.max(0.6, Math.min(1.4, cam.z))}
                    fill="#10b981"
                    style={{
                      offsetPath: `path('${d}')`,
                      animation: 'trace-flow-move 2s infinite linear',
                      filter: 'drop-shadow(0 0 4px #10b981)',
                    }}
                  />
                  <circle
                    r={3.5 * Math.max(0.6, Math.min(1.4, cam.z))}
                    fill="#34d399"
                    style={{
                      offsetPath: `path('${d}')`,
                      animation: 'trace-flow-move 2s infinite linear',
                      animationDelay: '-0.12s',
                      filter: 'drop-shadow(0 0 3px #34d399)',
                      opacity: 0.75,
                    }}
                  />
                  <circle
                    r={2.2 * Math.max(0.6, Math.min(1.4, cam.z))}
                    fill="#a7f3d0"
                    style={{
                      offsetPath: `path('${d}')`,
                      animation: 'trace-flow-move 2s infinite linear',
                      animationDelay: '-0.24s',
                      filter: 'drop-shadow(0 0 2px #a7f3d0)',
                      opacity: 0.45,
                    }}
                  />
                </>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
