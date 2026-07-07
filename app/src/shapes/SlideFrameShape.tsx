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

export type SlideFrameProps = {
  w: number
  h: number
  label: string
}

declare module '@tldraw/tlschema' {
  interface TLGlobalShapePropsMap {
    'slide-frame': SlideFrameProps
  }
}

export type SlideFrameShape = TLBaseShape<'slide-frame', SlideFrameProps>

export class SlideFrameShapeUtil extends BaseBoxShapeUtil<SlideFrameShape> {
  static override type = 'slide-frame' as const

  static override props: RecordProps<SlideFrameShape> = {
    w: T.number,
    h: T.number,
    label: T.string,
  }

  override getDefaultProps(): SlideFrameProps {
    return {
      w: 800,
      h: 500,
      label: 'Slide Title',
    }
  }

  override canResize = () => true
  override canEdit = () => true

  override getGeometry(shape: SlideFrameShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: false,
    })
  }

  override onResize(shape: SlideFrameShape, info: TLResizeInfo<SlideFrameShape>) {
    return resizeBox(shape, info)
  }

  component(shape: SlideFrameShape) {
    const { w, h, label } = shape.props
    const editing = this.editor.getEditingShapeId() === shape.id

    // Find all slide frames on current page to compute dynamic index
    const pageShapes = this.editor.getCurrentPageShapes()
    const slideShapes = pageShapes.filter((s) => s.type === 'slide-frame')
    const sorted = [...slideShapes].sort((a, b) => {
      const rowDiff = 120
      if (Math.abs(a.y - b.y) > rowDiff) return a.y - b.y
      return a.x - b.x
    })
    const slideNumber = sorted.findIndex((s) => s.id === shape.id) + 1

    const tabStyle: React.CSSProperties = {
      position: 'absolute',
      top: -24,
      left: 0,
      padding: '2px 8px',
      borderRadius: '6px 6px 0 0',
      border: 'var(--shape-outline-thickness, 1.8px) solid var(--color-grey-3)',
      borderBottom: 'none',
      background: 'var(--color-surface)',
      color: 'var(--color-ink)',
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '.05em',
      whiteSpace: 'nowrap',
      pointerEvents: 'all',
      cursor: editing ? 'text' : 'grab',
      userSelect: 'none',
    }

    return (
      <HTMLContainer style={{ width: w, height: h, pointerEvents: 'none' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            border: 'var(--shape-outline-thickness, 1.8px) dashed var(--color-grey-3)',
            borderRadius: 8,
            boxSizing: 'border-box',
          }}
        />
        {editing ? (
          <input
            autoFocus
            defaultValue={label}
            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) =>
              this.editor.updateShape<SlideFrameShape>({
                id: shape.id,
                type: 'slide-frame',
                props: { label: e.currentTarget.value },
              })
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') this.editor.setEditingShape(null)
              e.stopPropagation()
            }}
            onBlur={() => this.editor.setEditingShape(null)}
            style={{ ...tabStyle, minWidth: 120, outline: 'none' }}
          />
        ) : (
          <div
            style={tabStyle}
            onDoubleClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              this.editor.setEditingShape(shape.id)
            }}
          >
            Slide {slideNumber}: {label || 'Untitled'}
          </div>
        )}
      </HTMLContainer>
    )
  }

  override getIndicatorPath(shape: SlideFrameShape) {
    const path = new Path2D()
    path.roundRect(0, 0, shape.props.w, shape.props.h, 8)
    return path
  }
}
