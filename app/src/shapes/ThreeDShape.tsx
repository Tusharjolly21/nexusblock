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

export type ThreeDShapeProps = {
  w: number
  h: number
  shapeType: 'cube' | 'pyramid' | 'cylinder' | 'prism' | 'sphere' | 'cone'
  color: 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'yellow' | 'pink'
  spinning: boolean
  rotationX: number
  rotationY: number
  opacity: number
  borderWidth: number
  spinSpeed: number
}

declare module '@tldraw/tlschema' {
  interface TLGlobalShapePropsMap {
    'nb-3d-shape': ThreeDShapeProps
  }
}

export type ThreeDShape = TLBaseShape<'nb-3d-shape', ThreeDShapeProps>

const COLOR_MAP = {
  blue: { bg: 'rgba(59, 130, 246, 0.25)', border: '1.5px solid rgb(59, 130, 246)' },
  green: { bg: 'rgba(34, 197, 94, 0.25)', border: '1.5px solid rgb(34, 197, 94)' },
  orange: { bg: 'rgba(249, 115, 22, 0.25)', border: '1.5px solid rgb(249, 115, 22)' },
  purple: { bg: 'rgba(168, 85, 247, 0.25)', border: '1.5px solid rgb(168, 85, 247)' },
  red: { bg: 'rgba(239, 68, 68, 0.25)', border: '1.5px solid rgb(239, 68, 68)' },
  yellow: { bg: 'rgba(234, 179, 8, 0.25)', border: '1.5px solid rgb(234, 179, 8)' },
  pink: { bg: 'rgba(236, 72, 153, 0.25)', border: '1.5px solid rgb(236, 72, 153)' },
}

export class ThreeDShapeUtil extends BaseBoxShapeUtil<ThreeDShape> {
  static override type = 'nb-3d-shape' as const

  static override props: RecordProps<ThreeDShape> = {
    w: T.number,
    h: T.number,
    shapeType: T.literalEnum('cube', 'pyramid', 'cylinder', 'prism', 'sphere', 'cone'),
    color: T.literalEnum('blue', 'green', 'orange', 'purple', 'red', 'yellow', 'pink'),
    spinning: T.boolean,
    rotationX: T.number,
    rotationY: T.number,
    opacity: T.number,
    borderWidth: T.number,
    spinSpeed: T.number,
  }

  override getDefaultProps(): ThreeDShapeProps {
    return {
      w: 140,
      h: 140,
      shapeType: 'cube',
      color: 'blue',
      spinning: true,
      rotationX: -20,
      rotationY: 45,
      opacity: 0.25,
      borderWidth: 1.5,
      spinSpeed: 10,
    }
  }

  override canResize = () => true

  override getGeometry(shape: ThreeDShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
  }

  override onResize(shape: ThreeDShape, info: TLResizeInfo<ThreeDShape>) {
    return resizeBox(shape, info)
  }

  component(shape: ThreeDShape) {
    const { w, h, shapeType, color, spinning, rotationX, rotationY, opacity, borderWidth, spinSpeed } = shape.props
    const size = Math.min(w, h)
    const halfSize = size / 2

    // Get color settings
    const baseColors = COLOR_MAP[color] || COLOR_MAP.blue
    const rgbMatch = baseColors.bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
    const bg = rgbMatch ? `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${opacity})` : baseColors.bg
    const rawBorderColor = baseColors.border.split('solid ')[1] || 'rgb(59, 130, 246)'
    const border = `${borderWidth}px solid ${rawBorderColor}`

    // Inline CSS Keyframes styling (spin animation)
    const spinClass = spinning ? 'animate-spin-3d' : ''

    return (
      <HTMLContainer style={{ width: w, height: h, pointerEvents: 'all' }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes spin3d {
            from { transform: rotateX(${rotationX}deg) rotateY(0deg); }
            to { transform: rotateX(${rotationX}deg) rotateY(360deg); }
          }
          .animate-spin-3d {
            animation: spin3d ${spinSpeed}s linear infinite;
          }
          .face-triangle {
            clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
          }
        `}} />
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'grid',
            placeItems: 'center',
            perspective: '1000px',
            overflow: 'visible',
          }}
        >
          <div
            className={spinClass}
            style={{
              width: `${size}px`,
              height: `${size}px`,
              position: 'relative',
              transformStyle: 'preserve-3d',
              transform: spinning ? undefined : `rotateX(${rotationX}deg) rotateY(${rotationY}deg)`,
              transition: spinning ? undefined : 'transform 0.1s ease',
            }}
          >
            {/* 1. CUBE RENDERING */}
            {shapeType === 'cube' && (
              <>
                <div style={{ position: 'absolute', width: size, height: size, background: bg, border, transform: `translateZ(${halfSize}px)`, backdropFilter: 'blur(2px)' }} />
                <div style={{ position: 'absolute', width: size, height: size, background: bg, border, transform: `rotateY(180deg) translateZ(${halfSize}px)`, backdropFilter: 'blur(2px)' }} />
                <div style={{ position: 'absolute', width: size, height: size, background: bg, border, transform: `rotateY(90deg) translateZ(${halfSize}px)`, backdropFilter: 'blur(2px)' }} />
                <div style={{ position: 'absolute', width: size, height: size, background: bg, border, transform: `rotateY(-90deg) translateZ(${halfSize}px)`, backdropFilter: 'blur(2px)' }} />
                <div style={{ position: 'absolute', width: size, height: size, background: bg, border, transform: `rotateX(90deg) translateZ(${halfSize}px)`, backdropFilter: 'blur(2px)' }} />
                <div style={{ position: 'absolute', width: size, height: size, background: bg, border, transform: `rotateX(-90deg) translateZ(${halfSize}px)`, backdropFilter: 'blur(2px)' }} />
              </>
            )}

            {/* 2. PYRAMID RENDERING */}
            {shapeType === 'pyramid' && (
              <>
                <div style={{ position: 'absolute', width: size, height: size, background: bg, border, transform: `rotateX(-90deg) translateZ(${halfSize}px)`, backdropFilter: 'blur(2px)' }} />
                <div className="face-triangle" style={{ position: 'absolute', width: size, height: size * 1.1, background: bg, border, transformOrigin: 'bottom center', transform: `translateZ(${halfSize}px) rotateX(30deg) translateY(-8%)` }} />
                <div className="face-triangle" style={{ position: 'absolute', width: size, height: size * 1.1, background: bg, border, transformOrigin: 'bottom center', transform: `rotateY(180deg) translateZ(${halfSize}px) rotateX(30deg) translateY(-8%)` }} />
                <div className="face-triangle" style={{ position: 'absolute', width: size, height: size * 1.1, background: bg, border, transformOrigin: 'bottom center', transform: `rotateY(90deg) translateZ(${halfSize}px) rotateX(30deg) translateY(-8%)` }} />
                <div className="face-triangle" style={{ position: 'absolute', width: size, height: size * 1.1, background: bg, border, transformOrigin: 'bottom center', transform: `rotateY(-90deg) translateZ(${halfSize}px) rotateX(30deg) translateY(-8%)` }} />
              </>
            )}

            {/* 3. CYLINDER RENDERING */}
            {shapeType === 'cylinder' && (
              <>
                <div style={{ position: 'absolute', width: size, height: size, background: bg, border, borderRadius: '50%', transform: `rotateX(90deg) translateZ(${halfSize}px)`, backdropFilter: 'blur(2px)' }} />
                <div style={{ position: 'absolute', width: size, height: size, background: bg, border, borderRadius: '50%', transform: `rotateX(-90deg) translateZ(${halfSize}px)`, backdropFilter: 'blur(2px)' }} />
                {Array.from({ length: 12 }).map((_, idx) => {
                  const angle = idx * 30
                  const stripWidth = (Math.PI * size) / 12.2
                  return (
                    <div
                      key={idx}
                      style={{
                        position: 'absolute',
                        left: `${halfSize - stripWidth / 2}px`,
                        width: `${stripWidth}px`,
                        height: `${size}px`,
                        background: bg,
                        borderLeft: border,
                        borderRight: border,
                        transform: `rotateY(${angle}deg) translateZ(${halfSize - 0.5}px)`,
                      }}
                    />
                  )
                })}
              </>
            )}

            {/* 4. TRIANGULAR PRISM RENDERING */}
            {shapeType === 'prism' && (
              <>
                {/* Triangular Caps */}
                <div className="face-triangle" style={{ position: 'absolute', width: size, height: size * 0.86, background: bg, border, transform: `rotateX(90deg) translateZ(${halfSize}px)` }} />
                <div className="face-triangle" style={{ position: 'absolute', width: size, height: size * 0.86, background: bg, border, transform: `rotateX(-90deg) translateZ(${halfSize}px)` }} />
                {/* 3 Rectangular Side segments */}
                {Array.from({ length: 3 }).map((_, idx) => {
                  const angle = idx * 120
                  const stripWidth = size * 0.86
                  return (
                    <div
                      key={idx}
                      style={{
                        position: 'absolute',
                        left: `${halfSize - stripWidth / 2}px`,
                        width: `${stripWidth}px`,
                        height: `${size}px`,
                        background: bg,
                        borderLeft: border,
                        borderRight: border,
                        transform: `rotateY(${angle}deg) translateZ(${halfSize * 0.5}px)`,
                      }}
                    />
                  )
                })}
              </>
            )}

            {/* 5. HOLOGRAPHIC SPHERE RENDERING */}
            {shapeType === 'sphere' && (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  position: 'relative',
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* Glass outer ball */}
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: bg, border, backdropFilter: 'blur(3px)' }} />
                {/* Orbit Z circle */}
                <div style={{ position: 'absolute', inset: 4, borderRadius: '50%', border, transform: 'rotateZ(45deg)' }} />
                {/* Orbit Y circle */}
                <div style={{ position: 'absolute', inset: 4, borderRadius: '50%', border, transform: 'rotateY(90deg)' }} />
                {/* Orbit X circle */}
                <div style={{ position: 'absolute', inset: 4, borderRadius: '50%', border, transform: 'rotateX(90deg)' }} />
                {/* Glowing Core */}
                <div style={{
                  position: 'absolute', inset: '30%', borderRadius: '50%',
                  background: `radial-gradient(circle, ${rawBorderColor} 0%, transparent 75%)`,
                  boxShadow: `0 0 16px ${rawBorderColor}`,
                }} />
              </div>
            )}

            {/* 6. CONE RENDERING */}
            {shapeType === 'cone' && (
              <>
                {/* Bottom circular Cap */}
                <div style={{ position: 'absolute', width: size, height: size, background: bg, border, borderRadius: '50%', transform: `rotateX(-90deg) translateZ(${halfSize}px)` }} />
                {/* 12 segment triangles meeting at peak */}
                {Array.from({ length: 12 }).map((_, idx) => {
                  const angle = idx * 30
                  const stripWidth = (Math.PI * size) / 12.2
                  return (
                    <div
                      key={idx}
                      className="face-triangle"
                      style={{
                        position: 'absolute',
                        left: `${halfSize - stripWidth / 2}px`,
                        width: `${stripWidth}px`,
                        height: `${size}px`,
                        background: bg,
                        borderLeft: border,
                        borderRight: border,
                        transformOrigin: 'bottom center',
                        transform: `rotateY(${angle}deg) translateZ(${halfSize * 0.48}px) rotateX(25deg)`,
                      }}
                    />
                  )
                })}
              </>
            )}
          </div>
        </div>
      </HTMLContainer>
    )
  }

  override getIndicatorPath(shape: ThreeDShape) {
    const path = new Path2D()
    path.roundRect(0, 0, shape.props.w, shape.props.h, 8)
    return path
  }
}
