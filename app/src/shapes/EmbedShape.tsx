import {
  BaseBoxShapeUtil,
  HTMLContainer,
  Rectangle2d,
  resizeBox,
  T,
  type RecordProps,
  type TLBaseShape,
  type TLResizeInfo,
} from 'tldraw'

export type EmbedShapeProps = {
  w: number
  h: number
  url: string
  title: string
}

declare module '@tldraw/tlschema' {
  interface TLGlobalShapePropsMap {
    'nb-embed': EmbedShapeProps
  }
}

export type EmbedShape = TLBaseShape<'nb-embed', EmbedShapeProps>

export class EmbedShapeUtil extends BaseBoxShapeUtil<EmbedShape> {
  static override type = 'nb-embed' as const

  static override props: RecordProps<EmbedShape> = {
    w: T.number,
    h: T.number,
    url: T.string,
    title: T.string,
  }

  override getDefaultProps(): EmbedShapeProps {
    return {
      w: 620,
      h: 390,
      url: 'https://example.com',
      title: 'Embed',
    }
  }

  override canResize = () => true

  override getGeometry(shape: EmbedShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
  }

  override onResize(shape: EmbedShape, info: TLResizeInfo<EmbedShape>) {
    return resizeBox(shape, info)
  }

  component(shape: EmbedShape) {
    const { w, h, url, title } = shape.props
    return (
      <HTMLContainer style={{ width: w, height: h, pointerEvents: 'all' }}>
        <div
          data-canvas-editor-block="true"
          style={{
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            border: '1px solid var(--color-line)',
            borderRadius: 14,
            background: 'var(--color-paper)',
            boxShadow: '0 18px 45px rgba(15, 23, 42, 0.14)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              height: 36,
              padding: '0 12px',
              borderBottom: '1px solid var(--color-line)',
              background: 'var(--color-surface)',
              color: 'var(--color-grey-4)',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: 999, background: '#ff5f57' }} />
            <span style={{ width: 8, height: 8, borderRadius: 999, background: '#ffbd2e' }} />
            <span style={{ width: 8, height: 8, borderRadius: 999, background: '#28c840' }} />
            <span style={{ minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title || hostLabel(url)}</span>
          </div>
          {canFrame(url) ? (
            <iframe
              title={title || 'Canvas embed'}
              src={toEmbedUrl(url)}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
              referrerPolicy="no-referrer-when-downgrade"
              style={{ display: 'block', width: '100%', height: Math.max(80, h - 36), border: 0, background: 'white' }}
            />
          ) : (
            <div style={{ display: 'grid', height: Math.max(80, h - 36), placeItems: 'center', padding: 24, textAlign: 'center' }}>
              <div>
                <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 800, color: 'var(--color-ink)' }}>Embed preview blocked</div>
                <div style={{ fontSize: 12, color: 'var(--color-grey-3)' }}>{url}</div>
              </div>
            </div>
          )}
        </div>
      </HTMLContainer>
    )
  }

  override getIndicatorPath(shape: EmbedShape) {
    const path = new Path2D()
    path.roundRect(0, 0, shape.props.w, shape.props.h, 14)
    return path
  }
}

function toEmbedUrl(url: string) {
  try {
    const parsed = new URL(url)
    if (parsed.hostname === 'youtu.be') return `https://www.youtube.com/embed/${parsed.pathname.slice(1)}`
    if (parsed.hostname.includes('youtube.com') && parsed.searchParams.get('v')) {
      return `https://www.youtube.com/embed/${parsed.searchParams.get('v')}`
    }
    return parsed.toString()
  } catch {
    return url
  }
}

function hostLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'Embed'
  }
}

function canFrame(url: string) {
  return /^https?:\/\//i.test(url)
}
