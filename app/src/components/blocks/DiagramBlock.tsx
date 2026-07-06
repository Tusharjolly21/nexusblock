import { useRef } from 'react'
import { Icon } from '@iconify/react'
import { createReactBlockSpec } from '@blocknote/react'
import { useDocStore } from '../../store/useDocStore'
import { useEditorUi } from '../../store/useEditorUi'
import { snapshotFigure } from '../../canvas/figures'

/**
 * A live diagram figure embedded in the note editor — Eraser's headline
 * "insert diagram created from the canvas". Stores a PNG snapshot of the canvas
 * in the block; the Refresh button re-snapshots so the figure tracks the canvas.
 * Now supports custom align, preset widths, and draggable side resize handles.
 */
export const DiagramBlock = createReactBlockSpec(
  {
    type: 'diagram',
    propSchema: {
      src: { default: '' },
      caption: { default: 'Diagram' },
      figureId: { default: '' },
      content: { default: '' },
      width: { default: '100%' },
      alignment: { default: 'center' },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => {
      const src = block.props.src as string
      const caption = block.props.caption as string
      const figureId = block.props.figureId as string
      const content = block.props.content as string
      const width = (block.props.width || '100%') as string
      const alignment = (block.props.alignment || 'center') as string
      const hasEditablePayload = content.trim().length > 0
      const containerRef = useRef<HTMLDivElement>(null)

      const refresh = async () => {
        const bridge = useDocStore.getState().docBridge
        if (bridge) return bridge.refreshFigureEmbeds(figureId || undefined)
        const tldr = useDocStore.getState().editor
        if (!tldr || !figureId || !tldr.getShape(figureId as never)) return
        const next = await snapshotFigure(tldr, figureId as never)
        if (next) editor.updateBlock(block, { props: { src: next } })
      }

      const openCanvas = () => {
        useEditorUi.getState().setViewMode('split')
        if (figureId) useDocStore.getState().docBridge?.jumpToFigure(figureId)
      }

      const restoreCanvas = () => {
        void useDocStore.getState().docBridge?.restoreDiagramToCanvas({ src, caption, figureId, content })
      }

      const startResize = (e: React.PointerEvent, handleSide: 'left' | 'right') => {
        e.preventDefault()
        const container = containerRef.current
        if (!container) return
        const parent = container.parentElement
        if (!parent) return
        const parentWidth = parent.clientWidth
        const startWidth = container.clientWidth
        const startX = e.clientX

        const onPointerMove = (moveEvent: PointerEvent) => {
          const deltaX = moveEvent.clientX - startX
          const multiplier = alignment === 'center' ? 2 : 1
          const factor = handleSide === 'right' ? 1 : -1
          const newWidth = Math.max(120, Math.min(parentWidth, startWidth + deltaX * factor * multiplier))
          const newPct = Math.round((newWidth / parentWidth) * 100)
          editor.updateBlock(block, { props: { width: `${newPct}%` } })
        }

        const onPointerUp = () => {
          window.removeEventListener('pointermove', onPointerMove)
          window.removeEventListener('pointerup', onPointerUp)
        }

        window.addEventListener('pointermove', onPointerMove)
        window.addEventListener('pointerup', onPointerUp)
      }

      return (
        <div
          contentEditable={false}
          style={{
            display: 'flex',
            justifyContent: alignment === 'left' ? 'flex-start' : alignment === 'right' ? 'flex-end' : 'center',
            width: '100%',
          }}
        >
          <div
            ref={containerRef}
            style={{
              width: width,
              border: '1px solid var(--color-line)',
              borderRadius: 14,
              overflow: 'hidden',
              background: 'var(--color-surface)',
              fontFamily: "'Instrument Sans', sans-serif",
              position: 'relative',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 10px',
                borderBottom: src ? '1px solid var(--color-line)' : 'none',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--color-grey-4)',
              }}
            >
              <Icon icon="lucide:git-fork" width={14} className="shrink-0" />
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {caption || 'Diagram'}
              </span>

              {/* Alignment Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, borderRight: '1px solid var(--color-line)', paddingRight: 6 }}>
                {(['left', 'center', 'right'] as const).map((align) => (
                  <button
                    key={align}
                    onClick={() => editor.updateBlock(block, { props: { alignment: align } })}
                    style={{
                      ...presetBtn,
                      background: alignment === align ? 'var(--color-grey-1)' : 'transparent',
                      color: alignment === align ? 'var(--color-ink)' : 'var(--color-grey-3)',
                    }}
                    title={`Align ${align}`}
                  >
                    <Icon icon={align === 'left' ? 'lucide:align-left' : align === 'right' ? 'lucide:align-right' : 'lucide:align-center'} width={13} />
                  </button>
                ))}
              </div>

              {/* Width Preset Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, borderRight: '1px solid var(--color-line)', paddingRight: 6 }}>
                {['25%', '50%', '75%', '100%'].map((w) => (
                  <button
                    key={w}
                    onClick={() => editor.updateBlock(block, { props: { width: w } })}
                    style={{
                      ...presetBtn,
                      background: width === w ? 'var(--color-grey-1)' : 'transparent',
                      color: width === w ? 'var(--color-ink)' : 'var(--color-grey-3)',
                    }}
                    title={`Set width to ${w}`}
                  >
                    {w}
                  </button>
                ))}
              </div>

              <button onClick={refresh} title="Refresh from canvas" style={btn}>
                <Icon icon="lucide:refresh-cw" width={13} /> Refresh
              </button>
              <button
                onClick={restoreCanvas}
                title={hasEditablePayload ? 'Restore as editable canvas shapes' : 'Place this snapshot as an image on the canvas'}
                style={btn}
              >
                <Icon icon={hasEditablePayload ? 'lucide:undo-2' : 'lucide:image-plus'} width={13} />
                {hasEditablePayload ? 'Restore editable' : 'Place image'}
              </button>
              <button onClick={openCanvas} title={figureId ? 'Jump to source figure' : 'Open canvas'} style={btn}>
                <Icon icon={figureId ? 'lucide:crosshair' : 'lucide:maximize-2'} width={13} />
              </button>
            </div>

            {src ? (
              <div style={{ position: 'relative', width: '100%', userSelect: 'none' }}>
                <img src={src} alt={caption} style={{ display: 'block', width: '100%', height: 'auto', pointerEvents: 'none' }} />
                
                {/* Left Drag Resize Handle */}
                <div
                  onPointerDown={(e) => startResize(e, 'left')}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '10px',
                    cursor: 'ew-resize',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                  }}
                  className="group"
                >
                  <div
                    style={{
                      width: '4px',
                      height: '32px',
                      borderRadius: '2px',
                      background: 'var(--color-grey-2)',
                      transition: 'background 0.2s',
                    }}
                    className="group-hover:bg-blue-500"
                  />
                </div>

                {/* Right Drag Resize Handle */}
                <div
                  onPointerDown={(e) => startResize(e, 'right')}
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: '10px',
                    cursor: 'ew-resize',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                  }}
                  className="group"
                >
                  <div
                    style={{
                      width: '4px',
                      height: '32px',
                      borderRadius: '2px',
                      background: 'var(--color-grey-2)',
                      transition: 'background 0.2s',
                    }}
                    className="group-hover:bg-blue-500"
                  />
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', placeItems: 'center', gap: 8, padding: '32px 16px', color: 'var(--color-grey-3)' }}>
                <Icon icon="lucide:image-off" width={22} />
                <span style={{ fontSize: 13 }}>Canvas is empty — draw something, then Refresh.</span>
              </div>
            )}
          </div>
        </div>
      )
    },
  },
)

const presetBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2px 6px',
  borderRadius: 4,
  fontSize: 10,
  fontWeight: 600,
  cursor: 'pointer',
  border: 'none',
  transition: 'all 0.15s ease',
}

const btn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '3px 8px',
  borderRadius: 8,
  border: '1px solid var(--color-line)',
  background: 'var(--color-paper)',
  color: 'var(--color-ink)',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
}

