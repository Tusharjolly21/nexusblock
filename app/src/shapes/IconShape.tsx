import { Icon } from '@iconify/react'
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
  type TLResizeInfo,
} from 'tldraw'
import { isCustomIconSrc } from '../store/useCustomIcons'

/** Props for the icon-only shape. */
export type IconShapeProps = {
  w: number
  h: number
  /** Iconify id, e.g. 'logos:aws-lambda'. */
  icon: string
  /** Optional caption under the icon. Empty = pure icon. */
  label: string
  /** Tint for monochrome (lucide) icons; '' = default ink. Ignored by logos. */
  color: string
}

const Versions = createShapePropsMigrationIds('icon', { AddColor: 1 })

const iconMigrations = createShapePropsMigrationSequence({
  sequence: [
    {
      id: Versions.AddColor,
      up: (props) => ({ ...props, color: '' }),
      down: (props) => {
        const { color: _color, ...rest } = props as IconShapeProps
        return rest
      },
    },
  ],
})

declare module '@tldraw/tlschema' {
  interface TLGlobalShapePropsMap {
    icon: IconShapeProps
  }
}

/**
 * A standalone service icon — rendered icon-only (no card, no border), the way
 * Eraser drops logos onto the canvas. Distinct from `arch-node`, which is a
 * labelled container box.
 */
export type IconShape = TLBaseShape<'icon', IconShapeProps>

export class IconShapeUtil extends BaseBoxShapeUtil<IconShape> {
  static override type = 'icon' as const

  static override props: RecordProps<IconShape> = {
    w: T.number,
    h: T.number,
    icon: T.string,
    label: T.string,
    color: T.string,
  }

  static override migrations = iconMigrations

  override getDefaultProps(): IconShapeProps {
    return { w: 56, h: 56, icon: 'logos:aws', label: '', color: '' }
  }

  override canResize = () => true

  override getGeometry(shape: IconShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  override onResize(shape: IconShape, info: TLResizeInfo<IconShape>) {
    return resizeBox(shape, info)
  }

  component(shape: IconShape) {
    const { w, h, icon, label, color } = shape.props
    const size = Math.min(w, h)
    return (
      <HTMLContainer
        className={color ? 'nb-icon-tint' : undefined}
        style={{
          width: w,
          height: h,
          display: 'grid',
          placeItems: 'center',
          pointerEvents: 'all',
          color: color || undefined,
        }}
      >
        {isCustomIconSrc(icon) ? (
          <img
            src={icon}
            alt={label || 'Custom icon'}
            draggable={false}
            style={{
              width: size,
              height: size,
              objectFit: 'contain',
              display: 'block',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          />
        ) : (
          <Icon icon={icon} width={size} height={size} />
        )}
        {label && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginTop: 4,
              fontFamily: "'Instrument Sans', sans-serif",
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--color-ink)',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            {label}
          </div>
        )}
      </HTMLContainer>
    )
  }

  override getIndicatorPath(shape: IconShape) {
    const path = new Path2D()
    path.roundRect(0, 0, shape.props.w, shape.props.h, 8)
    return path
  }
}
