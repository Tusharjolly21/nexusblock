import { Icon } from '@iconify/react'
import { createReactBlockSpec } from '@blocknote/react'
import { useDocStore } from '../../store/useDocStore'
import { useEditorUi } from '../../store/useEditorUi'

export const DslBlock = createReactBlockSpec(
  {
    type: 'dsl',
    propSchema: {
      kind: { default: 'flow' },
      code: { default: '' },
      title: { default: 'Diagram as code' },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => {
      const kind = (block.props.kind as 'flow' | 'erd') || 'flow'
      const code = String(block.props.code || '')
      const title = String(block.props.title || (kind === 'erd' ? 'ERD as code' : 'Flow as code'))

      const updateCode = (next: string) => editor.updateBlock(block, { props: { code: next } })
      const openPanel = () => {
        useEditorUi.getState().setViewMode('split')
        useEditorUi.getState().setDslOpen(true)
        useEditorUi.getState().setDslType(kind)
      }
      const apply = () => {
        void useDocStore.getState().docBridge?.applyDslBlock(kind, code)
        openPanel()
      }

      return (
        <div contentEditable={false} style={wrap}>
          <div style={head}>
            <span style={badge}>
              <Icon icon={kind === 'erd' ? 'lucide:table-2' : 'lucide:workflow'} width={14} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={titleStyle}>{title}</div>
              <div style={subStyle}>{kind === 'erd' ? 'Entity relationship model' : 'Flow chart DSL'} · syncs with canvas</div>
            </div>
            <button onClick={openPanel} style={btn} title="Open code panel">
              <Icon icon="lucide:panel-right-open" width={13} /> Open
            </button>
            <button onClick={apply} style={{ ...btn, background: 'var(--color-ink)', color: 'var(--color-paper)' }} title="Apply this block to canvas">
              <Icon icon="lucide:play" width={13} /> Apply
            </button>
          </div>
          <textarea
            spellCheck={false}
            value={code}
            onChange={(event) => updateCode(event.currentTarget.value)}
            style={textarea}
          />
        </div>
      )
    },
  },
)

const wrap: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--color-line)',
  borderRadius: 14,
  overflow: 'hidden',
  background: 'var(--color-surface)',
  fontFamily: "'Instrument Sans', sans-serif",
}

const head: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px',
  borderBottom: '1px solid var(--color-line)',
}

const badge: React.CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  width: 30,
  height: 30,
  borderRadius: 10,
  background: 'var(--color-ink)',
  color: 'var(--color-paper)',
}

const titleStyle: React.CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: 13,
  fontWeight: 700,
  color: 'var(--color-ink)',
}

const subStyle: React.CSSProperties = {
  marginTop: 1,
  fontSize: 11,
  color: 'var(--color-grey-3)',
}

const btn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '5px 9px',
  borderRadius: 10,
  border: '1px solid var(--color-line)',
  background: 'var(--color-paper)',
  color: 'var(--color-ink)',
  fontSize: 11,
  fontWeight: 700,
  cursor: 'pointer',
}

const textarea: React.CSSProperties = {
  display: 'block',
  width: '100%',
  minHeight: 180,
  resize: 'vertical',
  border: 0,
  outline: 0,
  padding: 14,
  background: 'var(--color-paper)',
  color: 'var(--color-ink)',
  fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 12,
  lineHeight: 1.55,
}
