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

          // Resolve overrides from arrow meta with global fallbacks
          const color = (arrow.meta as any)?.flowColor || '#3b82f6'
          const rawSpeed = (arrow.meta as any)?.flowSpeed || 2.2
          const duration = `${rawSpeed}s`
          const localFlowStyle = (arrow.meta as any)?.flowStyle || flowAnimationStyle

          return (
            <g key={arrow.id}>
              {/* Pulsating neon conduit backdrop line */}
              <path
                d={d}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
                style={{
                  animation: 'trace-conduit-pulse 2s infinite ease-in-out',
                  filter: `drop-shadow(0 0 3px ${color})`,
                }}
              />

              {/* Reference path for offset motion */}
              <path d={d} fill="none" stroke="transparent" strokeWidth={1} id={`path-${arrow.id}`} />

              {/* Particle animation */}
              {localFlowStyle === 'particle' && (
                <circle
                  r={4 * Math.max(0.6, Math.min(1.4, cam.z))}
                  fill={color}
                  style={{
                    offsetPath: `path('${d}')`,
                    animation: `trace-flow-move ${duration} infinite linear`,
                    filter: `drop-shadow(0 0 4px ${color})`,
                  }}
                />
              )}

              {/* Dashed Pipeline animation */}
              {localFlowStyle === 'dashes' && (
                <path
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeWidth={2.5}
                  strokeDasharray="12,12"
                  style={{
                    animation: `trace-flow-dashes ${duration} infinite linear`,
                    filter: `drop-shadow(0 0 4px ${color})`,
                  }}
                />
              )}

              {/* Rainbow Spectrum Laser animation */}
              {localFlowStyle === 'laser' && (
                <path
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeWidth={3}
                  strokeDasharray="40,100"
                  style={{
                    animation: `trace-flow-laser ${duration} infinite linear, trace-flow-hue 6s infinite linear`,
                    filter: `drop-shadow(0 0 5px ${color})`,
                  }}
                />
              )}

              {/* Trailing Droplets animation */}
              {localFlowStyle === 'droplet' && (
                <>
                  <circle
                    r={5 * Math.max(0.6, Math.min(1.4, cam.z))}
                    fill={color}
                    style={{
                      offsetPath: `path('${d}')`,
                      animation: `trace-flow-move ${duration} infinite linear`,
                      filter: `drop-shadow(0 0 4px ${color})`,
                    }}
                  />
                  <circle
                    r={3.5 * Math.max(0.6, Math.min(1.4, cam.z))}
                    fill={color}
                    style={{
                      offsetPath: `path('${d}')`,
                      animation: `trace-flow-move ${duration} infinite linear`,
                      animationDelay: '-0.12s',
                      filter: `drop-shadow(0 0 3px ${color})`,
                      opacity: 0.75,
                    }}
                  />
                  <circle
                    r={2.2 * Math.max(0.6, Math.min(1.4, cam.z))}
                    fill={color}
                    style={{
                      offsetPath: `path('${d}')`,
                      animation: `trace-flow-move ${duration} infinite linear`,
                      animationDelay: '-0.24s',
                      filter: `drop-shadow(0 0 2px ${color})`,
                      opacity: 0.45,
                    }}
                  />
                </>
              )}

              {/* Aurora Trail animation */}
              {localFlowStyle === 'aurora' && (
                <>
                  {[...Array(6)].map((_, i) => {
                    const delaySec = -(i * 0.08)
                    const opacity = 1.0 - (i / 6)
                    const r = (6.0 - i * 0.75) * Math.max(0.6, Math.min(1.4, cam.z))
                    return (
                      <circle
                        key={i}
                        r={Math.max(1, r)}
                        fill={color}
                        style={{
                          offsetPath: `path('${d}')`,
                          animation: `trace-flow-move ${duration} infinite linear`,
                          animationDelay: `${delaySec}s`,
                          filter: `drop-shadow(0 0 ${12 - i * 1.5}px ${color})`,
                          opacity: opacity,
                        }}
                      />
                    )
                  })}
                </>
              )}

              {/* Protocol Packet Pill animation */}
              {localFlowStyle === 'pill' && (
                <g
                  style={{
                    offsetPath: `path('${d}')`,
                    animation: `trace-flow-move ${duration} infinite linear`,
                  }}
                >
                  <circle
                    cx={18}
                    cy={0}
                    r={3.5 * Math.max(0.6, Math.min(1.4, cam.z))}
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
                    {((arrow.meta as any)?.flowLabel || (arrow.props as any)?.text || 'DATA').substring(0, 7)}
                  </text>
                </g>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
