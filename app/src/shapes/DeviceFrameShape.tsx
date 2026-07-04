import type { CSSProperties } from 'react'
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
import type { DeviceFrameKind } from '../canvas/createNode'

export type DeviceFrameProps = {
  w: number
  h: number
  kind: DeviceFrameKind
}

declare module '@tldraw/tlschema' {
  interface TLGlobalShapePropsMap {
    'device-frame': DeviceFrameProps
  }
}

export type DeviceFrameShape = TLBaseShape<'device-frame', DeviceFrameProps>

export class DeviceFrameShapeUtil extends BaseBoxShapeUtil<DeviceFrameShape> {
  static override type = 'device-frame' as const

  static override props: RecordProps<DeviceFrameShape> = {
    w: T.number,
    h: T.number,
    kind: T.literalEnum('phone', 'tablet', 'desktop', 'chrome'),
  }

  override getDefaultProps(): DeviceFrameProps {
    return { w: 180, h: 320, kind: 'phone' }
  }

  override canResize = () => true

  override getGeometry(shape: DeviceFrameShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  override onResize(shape: DeviceFrameShape, info: TLResizeInfo<DeviceFrameShape>) {
    return resizeBox(shape, info)
  }

  component(shape: DeviceFrameShape) {
    const { w, h, kind } = shape.props
    return (
      <HTMLContainer
        style={{
          width: w,
          height: h,
          pointerEvents: 'all',
          fontFamily: "'Instrument Sans', sans-serif",
        }}
      >
        <DeviceFrameVisual kind={kind} />
      </HTMLContainer>
    )
  }

  override getIndicatorPath(shape: DeviceFrameShape) {
    const path = new Path2D()
    path.roundRect(0, 0, shape.props.w, shape.props.h, 22)
    return path
  }
}

function DeviceFrameVisual({ kind }: { kind: DeviceFrameKind }) {
  if (kind === 'phone') {
    return (
      <div style={fillWrap}>
        <div style={{ ...shell, borderRadius: '30px', padding: '18px 12px 16px' }}>
          <div style={speaker} />
          <div style={{ ...screen, borderRadius: '22px' }} />
          <div style={homeBar} />
        </div>
      </div>
    )
  }

  if (kind === 'tablet') {
    return (
      <div style={fillWrap}>
        <div style={{ ...shell, borderRadius: '28px', padding: '20px 16px 18px' }}>
          <div style={{ ...screen, borderRadius: '18px' }} />
          <div style={homeBar} />
        </div>
      </div>
    )
  }

  if (kind === 'desktop') {
    return (
      <div style={{ ...fillWrap, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ ...shell, width: '100%', height: '82%', borderRadius: '18px', padding: '14px' }}>
          <div style={{ ...screen, borderRadius: '10px' }} />
        </div>
        <div style={{ width: '9%', height: '10%', background: '#111', borderRadius: '0 0 6px 6px' }} />
        <div style={{ width: '34%', height: '7%', background: '#111', borderRadius: '999px' }} />
      </div>
    )
  }

  return (
    <div style={fillWrap}>
      <div style={{ ...shell, borderRadius: '18px', overflow: 'hidden', padding: 0 }}>
        <div
          style={{
            height: '15%',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 14px',
            borderBottom: '2px solid #111',
            background: '#f7f7f5',
          }}
        >
          <span style={dot} />
          <span style={dot} />
          <span style={dot} />
          <span style={{ flex: 1, height: 12, borderRadius: 999, background: '#e8e8e4' }} />
        </div>
        <div style={{ height: '85%', padding: 14 }}>
          <div style={{ ...screen, borderRadius: '12px' }} />
        </div>
      </div>
    </div>
  )
}

const fillWrap: CSSProperties = {
  width: '100%',
  height: '100%',
  filter: 'drop-shadow(0 14px 24px rgba(15, 23, 42, 0.12))',
}

const shell: CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
  boxSizing: 'border-box',
  background: '#f7f7f5',
  border: '3px solid #111',
}

const screen: CSSProperties = {
  width: '100%',
  height: '100%',
  boxSizing: 'border-box',
  background: '#050505',
  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.06)',
}

const speaker: CSSProperties = {
  position: 'absolute',
  left: '50%',
  top: 10,
  transform: 'translateX(-50%)',
  width: '20%',
  height: 5,
  borderRadius: 999,
  background: '#111',
}

const homeBar: CSSProperties = {
  position: 'absolute',
  left: '50%',
  bottom: 8,
  transform: 'translateX(-50%)',
  width: '22%',
  height: 5,
  borderRadius: 999,
  background: '#111',
}

const dot: CSSProperties = {
  width: 9,
  height: 9,
  borderRadius: 999,
  background: '#111',
}
