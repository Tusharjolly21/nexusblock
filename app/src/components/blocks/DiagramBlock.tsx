import { Icon } from '@iconify/react'
import { createReactBlockSpec } from '@blocknote/react'
import { useDocStore } from '../../store/useDocStore'
import { useEditorUi } from '../../store/useEditorUi'
import { snapshotFigure } from '../../canvas/figures'

/**
 * A live diagram figure embedded in the note editor — Eraser's headline
 * "insert diagram created from the canvas". Stores a PNG snapshot of the canvas
 * in the block; the Refresh button re-snapshots so the figure tracks the canvas.
 */
export const DiagramBlock = createReactBlockSpec(
  {
    type: 'diagram',
    propSchema: {
      src: { default: '' },
      caption: { default: 'Diagram' },
      figureId: { default: '' },
      content: { default: '' },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => {
      const src = block.props.src as string
      const caption = block.props.caption as string
      const figureId = block.props.figureId as string
      const content = block.props.content as string
      const hasEditablePayload = content.trim().length > 0

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

      return (
        <div
          contentEditable={false}
          style={{
            width: '100%',
            border: '1px solid var(--color-line)',
            borderRadius: 14,
            overflow: 'hidden',
            background: 'var(--color-surface)',
            fontFamily: "'Instrument Sans', sans-serif",
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
            <Icon icon="lucide:git-fork" width={14} />
            <span style={{ flex: 1 }}>{caption || 'Diagram'}</span>
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
            <img src={src} alt={caption} style={{ display: 'block', width: '100%', height: 'auto' }} />
          ) : (
            <div style={{ display: 'grid', placeItems: 'center', gap: 8, padding: '32px 16px', color: 'var(--color-grey-3)' }}>
              <Icon icon="lucide:image-off" width={22} />
              <span style={{ fontSize: 13 }}>Canvas is empty — draw something, then Refresh.</span>
            </div>
          )}
        </div>
      )
    },
  },
)

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
