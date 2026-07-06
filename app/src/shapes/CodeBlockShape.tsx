import { useEffect, useState } from 'react'
import MonacoEditor from '@monaco-editor/react'
import {
  BaseBoxShapeUtil,
  HTMLContainer,
  Rectangle2d,
  resizeBox,
  T,
  type Editor,
  type RecordProps,
  type TLBaseShape,
  type TLResizeInfo,
} from 'tldraw'
import { isDarkTone, useTheme } from '../store/useTheme'

export type CodeBlockProps = {
  w: number
  h: number
  language: string
  code: string
  title: string
}

declare module '@tldraw/tlschema' {
  interface TLGlobalShapePropsMap {
    'code-block': CodeBlockProps
  }
}

export type CodeBlockShape = TLBaseShape<'code-block', CodeBlockProps>

export class CodeBlockShapeUtil extends BaseBoxShapeUtil<CodeBlockShape> {
  static override type = 'code-block' as const

  static override props: RecordProps<CodeBlockShape> = {
    w: T.number,
    h: T.number,
    language: T.string,
    code: T.string,
    title: T.string,
  }

  override getDefaultProps(): CodeBlockProps {
    return {
      w: 440,
      h: 280,
      language: 'typescript',
      title: 'handler.ts',
      code: `export async function handler(event: PaymentEvent) {
  await validate(event)
  await publish('payments.authorized', event)
}`,
    }
  }

  override canResize = () => true
  // Double-click to edit the code; otherwise the block drags/selects like any shape.
  override canEdit = () => true

  override getGeometry(shape: CodeBlockShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  override onResize(shape: CodeBlockShape, info: TLResizeInfo<CodeBlockShape>) {
    return resizeBox(shape, info)
  }

  component(shape: CodeBlockShape) {
    // Reading the editing signal here (inside tldraw's reactive scope) makes the
    // shape re-render when it enters/leaves edit mode.
    const isEditing = this.editor.getEditingShapeId() === shape.id
    return (
      // Interactive only while editing — otherwise pointer-events pass through to
      // tldraw so the shape can be selected, dragged, and resized normally.
      <HTMLContainer style={{ width: shape.props.w, height: shape.props.h, pointerEvents: isEditing ? 'all' : 'none' }}>
        <CodeBlock shape={shape} editor={this.editor} isEditing={isEditing} />
      </HTMLContainer>
    )
  }

  override getIndicatorPath(shape: CodeBlockShape) {
    const path = new Path2D()
    path.roundRect(0, 0, shape.props.w, shape.props.h, 14)
    return path
  }
}

/** Languages offered in the code block, with the filename extension each uses. */
const LANGS: { id: string; ext: string; label: string }[] = [
  { id: 'typescript', ext: 'ts', label: 'TypeScript' },
  { id: 'javascript', ext: 'js', label: 'JavaScript' },
  { id: 'tsx', ext: 'tsx', label: 'TSX' },
  { id: 'python', ext: 'py', label: 'Python' },
  { id: 'go', ext: 'go', label: 'Go' },
  { id: 'rust', ext: 'rs', label: 'Rust' },
  { id: 'java', ext: 'java', label: 'Java' },
  { id: 'ruby', ext: 'rb', label: 'Ruby' },
  { id: 'php', ext: 'php', label: 'PHP' },
  { id: 'csharp', ext: 'cs', label: 'C#' },
  { id: 'cpp', ext: 'cpp', label: 'C++' },
  { id: 'sql', ext: 'sql', label: 'SQL' },
  { id: 'shell', ext: 'sh', label: 'Shell' },
  { id: 'yaml', ext: 'yml', label: 'YAML' },
  { id: 'json', ext: 'json', label: 'JSON' },
  { id: 'html', ext: 'html', label: 'HTML' },
  { id: 'css', ext: 'css', label: 'CSS' },
  { id: 'markdown', ext: 'md', label: 'Markdown' },
  { id: 'plaintext', ext: 'txt', label: 'Plain text' },
]

function CodeBlock({ shape, editor, isEditing }: { shape: CodeBlockShape; editor: Editor; isEditing: boolean }) {
  const tone = useTheme((s) => s.tone)
  const dark = isDarkTone(tone)
  const [code, setCode] = useState(shape.props.code)

  useEffect(() => {
    setCode(shape.props.code)
  }, [shape.props.code])

  const update = (props: Partial<CodeBlockProps>) => editor.updateShape({ id: shape.id, type: 'code-block', props })

  const updateCode = (next = '') => {
    setCode(next)
    update({ code: next })
  }

  // Switch language, and swap the filename's extension to match.
  const changeLanguage = (id: string) => {
    const ext = LANGS.find((l) => l.id === id)?.ext ?? 'txt'
    const base = shape.props.title.replace(/\.[^./\s]+$/, '') || 'untitled'
    update({ language: id, title: `${base}.${ext}` })
  }

  const scale = shape.props.w / 440
  const fontSize = Math.max(9, Math.min(36, Math.round(12 * scale)))
  const titleHeight = Math.max(28, Math.min(60, Math.round(34 * scale)))
  const dotSize = Math.max(6, Math.min(16, Math.round(9 * scale)))
  const titleFontSize = Math.max(9, Math.min(24, Math.round(11 * scale)))

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        borderRadius: 14,
        border: isEditing ? '1px solid var(--color-ink)' : '1px solid var(--color-line)',
        background: dark ? '#0d0d0d' : '#fbfbfa',
        boxShadow: '0 18px 45px rgba(15, 23, 42, 0.14)',
        fontFamily: 'var(--font-mono)',
        boxSizing: 'border-box',
      }}
    >
      {/* title bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: Math.max(4, Math.min(12, Math.round(8 * scale))),
          height: titleHeight,
          padding: `0 ${Math.max(8, Math.min(24, Math.round(12 * scale)))}px`,
          borderBottom: '1px solid var(--color-line)',
          background: dark ? '#151515' : '#f3f3f1',
          color: 'var(--color-grey-4)',
          fontSize: titleFontSize,
          fontWeight: 700,
        }}
      >
        <span style={{ width: dotSize, height: dotSize, borderRadius: 999, background: '#ff5f57' }} />
        <span style={{ width: dotSize, height: dotSize, borderRadius: 999, background: '#ffbd2e' }} />
        <span style={{ width: dotSize, height: dotSize, borderRadius: 999, background: '#28c840' }} />
        {isEditing ? (
          <input
            value={shape.props.title}
            onChange={(e) => update({ title: e.currentTarget.value })}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur(); e.stopPropagation() }}
            spellCheck={false}
            style={{ marginLeft: 6, minWidth: 40, flex: '0 1 auto', width: `${Math.max(6, shape.props.title.length)}ch`, border: 'none', outline: 'none', background: 'transparent', font: 'inherit', color: 'var(--color-ink)' }}
          />
        ) : (
          <span style={{ marginLeft: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shape.props.title}</span>
        )}
        {isEditing ? (
          <select
            value={shape.props.language}
            onChange={(e) => changeLanguage(e.currentTarget.value)}
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              marginLeft: 'auto',
              border: '1px solid var(--color-line)',
              borderRadius: 999,
              padding: '2px 6px',
              background: 'var(--color-surface)',
              color: 'var(--color-ink)',
              font: 'inherit',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {LANGS.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
        ) : (
          <span
            style={{
              marginLeft: 'auto',
              border: '1px solid var(--color-line)',
              borderRadius: 999,
              padding: '2px 7px',
              color: 'var(--color-grey-3)',
              textTransform: 'uppercase',
              letterSpacing: 0.6,
            }}
          >
            {shape.props.language}
          </span>
        )}
      </div>

      {/* body: Monaco while editing, a static preview otherwise */}
      <div style={{ width: '100%', height: Math.max(40, shape.props.h - titleHeight) }}>
        {isEditing ? (
          <MonacoEditor
            height="100%"
            width="100%"
            language={shape.props.language}
            value={code}
            theme={dark ? 'vs-dark' : 'light'}
            onChange={updateCode}
            onMount={(m) => m.focus()}
            options={{
              minimap: { enabled: false },
              fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: fontSize,
              lineNumbersMinChars: 3,
              padding: { top: 10, bottom: 10 },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              tabSize: 2,
              automaticLayout: true,
              overviewRulerLanes: 0,
              hideCursorInOverviewRuler: true,
            }}
          />
        ) : (
          <pre
            style={{
              margin: 0,
              padding: '10px 14px',
              height: '100%',
              overflow: 'hidden',
              color: dark ? '#e4e4e7' : '#27272a',
              fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: fontSize,
              lineHeight: 1.55,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {shape.props.code || '// double-click to edit'}
          </pre>
        )}
      </div>
    </div>
  )
}
