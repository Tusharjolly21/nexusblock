import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Icon } from '@iconify/react'
import { GeoShapeGeoStyle, react } from 'tldraw'
import { useDocStore } from '../store/useDocStore'
import { TOOLBAR_TOOLS, GEO_SHAPES, QUICK_GEO_SHAPES, setTool, setGeoShape } from '../canvas/tools'
import { createCodeBlock } from '../canvas/createNode'
import { useClickOutside } from '../hooks/useClickOutside'
import { useEditorUi, type ConnectorStyle } from '../store/useEditorUi'

type Menu = null | 'shapes'

/**
 * Compact floating tool cluster (FigJam/Eraser-style). Direct tools (select,
 * hand, draw, line, arrow, text, note, frame, highlighter, eraser) plus a Shapes
 * picker (all geo shapes) and a Style popover — everything tldraw's toolbar had,
 * in our own chrome. Active tool marked by a sliding ink pill (Framer layoutId).
 */
export function ToolCluster() {
  const editor = useDocStore((s) => s.editor)
  const activeTool = useDocStore((s) => s.activeTool)
  const figureToolActive = useDocStore((s) => s.figureToolActive)
  const setFigureToolActive = useDocStore((s) => s.setFigureToolActive)
  const commentToolActive = useDocStore((s) => s.commentToolActive)
  const setCommentToolActive = useDocStore((s) => s.setCommentToolActive)
  const connectorStyle = useEditorUi((s) => s.connectorStyle)
  const setConnectorStyle = useEditorUi((s) => s.setConnectorStyle)
  const [menu, setMenu] = useState<Menu>(null)
  const [currentGeo, setCurrentGeo] = useState<string>('rectangle')
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, () => setMenu(null), menu !== null)

  const geoActive = activeTool === 'geo'

  useEffect(() => {
    if (!editor) return
    return react('toolbar current geo', () => {
      setCurrentGeo(editor.getStyleForNextShape(GeoShapeGeoStyle))
    })
  }, [editor])

  return (
    <div ref={ref} data-tour="tool-cluster" className="pointer-events-auto absolute left-1/2 top-3 z-20 flex -translate-x-1/2 flex-col items-center">
      <div className="flex max-w-[calc(100vw-96px)] flex-nowrap items-center justify-center gap-0.5 overflow-x-auto rounded-2xl border border-line bg-surface/95 p-1 shadow-[0_12px_30px_-14px_rgba(0,0,0,.3)] backdrop-blur">
        {TOOLBAR_TOOLS.slice(0, 2).map((t) => (
          <ToolBtn key={t.id} icon={t.icon} label={t.label} active={!figureToolActive && activeTool === t.id} onClick={() => { setMenu(null); setFigureToolActive(false); setTool(editor, t.id) }} />
        ))}

        <Sep />

        {QUICK_GEO_SHAPES.map((s) => (
          <ToolBtn
            key={`${s.label}-${s.geo}`}
            icon={s.icon}
            label={s.label}
            active={geoActive && currentGeo === s.geo && !s.label.startsWith('Square')}
	            onClick={() => {
	              setMenu(null)
	              setFigureToolActive(false)
	              setGeoShape(editor, s.geo)
	            }}
          />
        ))}

        <Sep />

        {/* Shapes picker */}
        <button
          onClick={() => setMenu(menu === 'shapes' ? null : 'shapes')}
          title="More shapes"
          aria-pressed={geoActive || menu === 'shapes'}
          className={
            'flex h-9 items-center gap-0.5 rounded-xl px-2 transition-colors ' +
            (geoActive || menu === 'shapes' ? 'bg-ink text-paper' : 'text-grey-4 hover:bg-grey-1 hover:text-ink')
          }
        >
          <Icon icon="lucide:shapes" width={17} />
          <Icon icon="lucide:chevron-down" width={12} />
        </button>

        {TOOLBAR_TOOLS.slice(2).map((t) => (
	          <ToolBtn key={t.id} icon={t.icon} label={t.label} active={!figureToolActive && activeTool === t.id} onClick={() => { setMenu(null); setFigureToolActive(false); setTool(editor, t.id) }} />
        ))}
        <ToolBtn
          icon="lucide:group"
          label="Figure — F"
          active={figureToolActive}
          onClick={() => {
            setMenu(null)
            if (!editor) return
            editor.setCurrentTool('select')
            setFigureToolActive(!figureToolActive)
          }}
        />
        <ToolBtn
          icon="lucide:square-code"
          label="Code block"
          active={false}
	          onClick={() => {
	            setMenu(null)
	            setFigureToolActive(false)
	            if (editor) createCodeBlock(editor)
	          }}
        />
        <ToolBtn
          icon="lucide:message-square"
          label="Comment — C"
          active={commentToolActive}
          onClick={() => {
            setMenu(null)
            setFigureToolActive(false)
            if (!editor) return
            editor.setCurrentTool('select')
            setCommentToolActive(!commentToolActive)
          }}
        />

        <Sep />

        <ConnectorStyleButton style="straight" current={connectorStyle} icon="lucide:minus" setStyle={setConnectorStyle} />
        <ConnectorStyleButton style="curved" current={connectorStyle} icon="lucide:route" setStyle={setConnectorStyle} />
        <ConnectorStyleButton style="elbow" current={connectorStyle} icon="lucide:corner-down-right" setStyle={setConnectorStyle} />
      </div>

      {menu === 'shapes' && (
        <div className="mt-2 w-56 rounded-2xl border border-line bg-surface p-2 shadow-[0_20px_50px_-24px_rgba(0,0,0,.4)]">
          <div className="mb-1.5 px-1 font-mono text-[10px] uppercase tracking-widest text-grey-3">More shapes</div>
          <div className="grid grid-cols-5 gap-1">
            {GEO_SHAPES.map((s) => (
              <button
                key={s.geo}
                title={s.label}
	                onClick={() => { setFigureToolActive(false); setGeoShape(editor, s.geo); setMenu(null) }}
                className="grid aspect-square place-items-center rounded-lg text-grey-4 transition-colors hover:bg-grey-1 hover:text-ink"
              >
                <Icon icon={s.icon} width={18} />
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

function ToolBtn({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={'relative grid h-9 w-9 place-items-center rounded-xl transition-colors ' + (active ? 'text-paper' : 'text-grey-4 hover:bg-grey-1 hover:text-ink')}
    >
      {active && (
        <motion.span layoutId="tool-pill" className="absolute inset-0 rounded-xl bg-ink" transition={{ type: 'spring', stiffness: 500, damping: 34 }} />
      )}
      <span className="relative z-10">
        <Icon icon={icon} width={17} />
      </span>
    </button>
  )
}

function Sep() {
  return <span className="mx-0.5 h-6 w-px bg-line" />
}

function ConnectorStyleButton({
  style,
  current,
  icon,
  setStyle,
}: {
  style: ConnectorStyle
  current: ConnectorStyle
  icon: string
  setStyle: (style: ConnectorStyle) => void
}) {
  return (
    <button
      onClick={() => setStyle(style)}
      title={`${style} arrows`}
      aria-label={`${style} arrows`}
      aria-pressed={current === style}
      className={'relative grid h-9 w-9 place-items-center rounded-xl transition-colors ' + (current === style ? 'text-paper' : 'text-grey-4 hover:bg-grey-1 hover:text-ink')}
    >
      {current === style && (
        <motion.span layoutId="connector-pill" className="absolute inset-0 rounded-xl bg-ink" transition={{ type: 'spring', stiffness: 500, damping: 34 }} />
      )}
      <span className="relative z-10">
        <Icon icon={icon} width={17} />
      </span>
    </button>
  )
}
