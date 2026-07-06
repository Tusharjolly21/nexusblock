import {
  BaseBoxShapeUtil,
  createShapePropsMigrationIds,
  createShapePropsMigrationSequence,
  HTMLContainer,
  Rectangle2d,
  resizeBox,
  T,
  type RecordProps,
  type TLBaseShape,
  type TLShapeId,
  type TLResizeInfo,
} from 'tldraw'
import { getFigureContentIds } from '../canvas/figures'
import { resolveColor, pastelFill } from '../dsl/flow/lib'

/** Accent palette for group frames — mirrors Eraser's tinted container look. */
export const GROUP_ACCENTS = ['amber', 'violet', 'sky', 'grey'] as const
export type GroupAccent = (typeof GROUP_ACCENTS)[number]

const ACCENT: Record<GroupAccent, { border: string; fill: string; title: string }> = {
  amber: { border: '#c08a2d', fill: 'rgba(192,138,45,.06)', title: '#8a611c' },
  violet: { border: '#8b5cf6', fill: 'rgba(139,92,246,.06)', title: '#6d3fd4' },
  sky: { border: '#3b82c4', fill: 'rgba(59,130,196,.06)', title: '#2c6699' },
  grey: { border: 'var(--color-grey-3)', fill: 'rgba(0,0,0,.02)', title: 'var(--color-grey-3)' },
}

/** Props for a titled container that visually groups a set of nodes. */
export type GroupFrameProps = {
  w: number
  h: number
  label: string
  accent: GroupAccent
  /** Arbitrary color (name or #hex) overriding the accent; '' = use accent. */
  tint: string
  /** Title-tab scale (font + padding). 1 = default. */
  labelScale: number
  fontFamily: string
}

const Versions = createShapePropsMigrationIds('group-frame', { AddTint: 1, AddLabelScale: 2, AddFontFamily: 3 })

const migrations = createShapePropsMigrationSequence({
  sequence: [
    {
      id: Versions.AddTint,
      up: (props) => ({ ...props, tint: '' }),
      down: (props) => {
        const { tint: _tint, ...rest } = props as GroupFrameProps
        return rest
      },
    },
    {
      id: Versions.AddLabelScale,
      up: (props) => ({ ...props, labelScale: 1 }),
      down: (props) => {
        const { labelScale: _s, ...rest } = props as GroupFrameProps
        return rest
      },
    },
    {
      id: Versions.AddFontFamily,
      up: (props) => ({ ...props, fontFamily: '' }),
      down: (props) => {
        const { fontFamily: _fontFamily, ...rest } = props as GroupFrameProps
        return rest
      },
    },
  ],
})

declare module '@tldraw/tlschema' {
  interface TLGlobalShapePropsMap {
    'group-frame': GroupFrameProps
  }
}

/**
 * A titled group container — the labelled tinted box Eraser uses to cluster
 * related services (e.g. "PUB/SUB", "ANALYZE/STORE"). Rendered unfilled so
 * clicks pass through to the nodes inside; only the border + title tab select it.
 */
export type GroupFrameShape = TLBaseShape<'group-frame', GroupFrameProps>

export class GroupFrameShapeUtil extends BaseBoxShapeUtil<GroupFrameShape> {
  static override type = 'group-frame' as const

  static override props: RecordProps<GroupFrameShape> = {
    w: T.number,
    h: T.number,
    label: T.string,
    accent: T.literalEnum(...GROUP_ACCENTS),
    tint: T.string,
    labelScale: T.number,
    fontFamily: T.string,
  }

  static override migrations = migrations

  override getDefaultProps(): GroupFrameProps {
    return { w: 320, h: 260, label: 'Group', accent: 'amber', tint: '', labelScale: 1, fontFamily: '' }
  }

  override canResize = () => true

  // Double-click the frame (its border/title) to rename it inline.
  override canEdit = () => true

  // Unfilled interior so the nodes inside stay clickable; the border + label hit.
  override getGeometry(shape: GroupFrameShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: false,
    })
  }

  override onResize(shape: GroupFrameShape, info: TLResizeInfo<GroupFrameShape>) {
    return resizeBox(shape, info)
  }

  component(shape: GroupFrameShape) {
    const { w, h, label, fontFamily } = shape.props
    const tint = resolveColor(shape.props.tint)
    const a = tint ? { border: tint, fill: pastelFill(tint), title: tint } : ACCENT[shape.props.accent]
    const editing = this.editor.getEditingShapeId() === shape.id
    const scale = shape.props.labelScale || 1

    const tabStyle: React.CSSProperties = {
      position: 'absolute',
      top: 12,
      left: 14,
      padding: `${3 * scale}px ${9 * scale}px`,
      borderRadius: 7,
      border: `1px solid ${a.border}`,
      background: 'var(--color-paper)',
      color: a.title,
      fontFamily: fontFamily || "var(--font-sans)",
      fontSize: 11 * scale,
      fontWeight: 700,
      letterSpacing: '.04em',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
      pointerEvents: 'all',
      cursor: editing ? 'text' : 'grab',
      userSelect: 'none',
    }

    const startTitleDrag = (event: React.PointerEvent) => {
      if (editing) return
      event.preventDefault()
      event.stopPropagation()
      const editor = this.editor
      const startPage = editor.screenToPage({ x: event.clientX, y: event.clientY })
      const contentIds = getFigureContentIds(editor, shape.id)
      const initial = new Map<TLShapeId, { x: number; y: number }>()
      for (const id of contentIds) {
        const s = editor.getShape(id)
        if (s) initial.set(id, { x: s.x, y: s.y })
      }
      editor.markHistoryStoppingPoint('move figure')
      editor.select(shape.id)

      const move = (moveEvent: PointerEvent) => {
        const nextPage = editor.screenToPage({ x: moveEvent.clientX, y: moveEvent.clientY })
        const dx = nextPage.x - startPage.x
        const dy = nextPage.y - startPage.y
        for (const [id, p] of initial) {
          const s = editor.getShape(id)
          if (!s) continue
          editor.updateShape({ id, type: s.type, x: p.x + dx, y: p.y + dy })
        }
      }

      const up = () => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
      }

      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
    }

    return (
      <HTMLContainer style={{ width: w, height: h, pointerEvents: 'none' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            border: `1.5px solid ${a.border}`,
            background: a.fill,
            borderRadius: 18,
            boxSizing: 'border-box',
          }}
        />
        {editing ? (
          <input
            autoFocus
            defaultValue={label}
	            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) => this.editor.updateShape<GroupFrameShape>({ id: shape.id, type: 'group-frame', props: { label: e.currentTarget.value } })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') this.editor.setEditingShape(null)
              e.stopPropagation()
            }}
            onBlur={() => this.editor.setEditingShape(null)}
	            style={{ ...tabStyle, minWidth: 90, outline: 'none' }}
	          />
	        ) : (
	          label && (
	            <div
	              style={tabStyle}
	              onPointerDown={startTitleDrag}
	              onDoubleClick={(event) => {
	                event.preventDefault()
	                event.stopPropagation()
	                this.editor.setEditingShape(shape.id)
	              }}
	            >
	              {label}
	            </div>
	          )
	        )}
      </HTMLContainer>
    )
  }

  override getIndicatorPath(shape: GroupFrameShape) {
    const path = new Path2D()
    path.roundRect(0, 0, shape.props.w, shape.props.h, 18)
    return path
  }
}
