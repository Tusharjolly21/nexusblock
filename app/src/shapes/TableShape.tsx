import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
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

export const TABLE_COL_W = 220
export const TABLE_ROW_H = 54
export const TABLE_W = TABLE_COL_W * 3
export const TABLE_H = TABLE_ROW_H * 3

export type TableShapeProps = {
  w: number
  h: number
  rows: string[][]
  activeRow: number
  activeCol: number
}

declare module '@tldraw/tlschema' {
  interface TLGlobalShapePropsMap {
    table: TableShapeProps
  }
}

export type TableShape = TLBaseShape<'table', TableShapeProps>

export const DEFAULT_TABLE_ROWS = [
  ['Number', 'Issue', 'Description'],
  ['001', 'Flicker on mobile', 'Flickering'],
  ['002', 'Button visibility', 'Button not shown'],
]

export class TableShapeUtil extends BaseBoxShapeUtil<TableShape> {
  static override type = 'table' as const

  static override props: RecordProps<TableShape> = {
    w: T.number,
    h: T.number,
    rows: T.arrayOf(T.arrayOf(T.string)),
    activeRow: T.number,
    activeCol: T.number,
  }

  override getDefaultProps(): TableShapeProps {
    return {
      w: TABLE_W,
      h: TABLE_H,
      rows: DEFAULT_TABLE_ROWS,
      activeRow: 1,
      activeCol: 0,
    }
  }

  override canResize = () => true

  override getGeometry(shape: TableShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  override onResize(shape: TableShape, info: TLResizeInfo<TableShape>) {
    return resizeBox(shape, info)
  }

  component(shape: TableShape) {
    return (
      <HTMLContainer style={{ width: shape.props.w, height: shape.props.h, overflow: 'visible', pointerEvents: 'all' }}>
        <TableCanvasEditor shape={shape} editor={this.editor} />
      </HTMLContainer>
    )
  }

  override getIndicatorPath(shape: TableShape) {
    const path = new Path2D()
    path.roundRect(0, 0, shape.props.w, shape.props.h, 10)
    return path
  }
}

type CellRef = { row: number; col: number }
type MenuState = CellRef & { x: number; y: number }

function TableCanvasEditor({ shape, editor }: { shape: TableShape; editor: Editor }) {
  const tone = useTheme((s) => s.tone)
  const dark = isDarkTone(tone)
  const rootRef = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(false)
  const [menu, setMenu] = useState<MenuState | null>(null)
  const rows = normalizedRows(shape.props.rows)
  const colCount = Math.max(1, rows[0]?.length ?? 1)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const stop = (event: Event) => event.stopPropagation()
    const events = ['keydown', 'keyup', 'keypress', 'pointerdown', 'pointerup', 'mousedown', 'mouseup', 'wheel', 'contextmenu']
    events.forEach((eventName) => root.addEventListener(eventName, stop, { capture: true }))
    return () => {
      events.forEach((eventName) => root.removeEventListener(eventName, stop, { capture: true }))
    }
  }, [])

  const updateRows = (nextRows: string[][], active: CellRef = activeCell(shape, nextRows), size?: { w?: number; h?: number }) => {
    editor.updateShape<TableShape>({
      id: shape.id,
      type: 'table',
      props: {
        rows: normalizedRows(nextRows),
        activeRow: active.row,
        activeCol: active.col,
        ...(size ?? {}),
      },
    })
  }

  const updateCell = (row: number, col: number, value: string) => {
    const next = cloneRows(rows)
    next[row][col] = value
    updateRows(next, { row, col })
  }

  const setActive = (row: number, col: number) => {
    editor.select(shape.id)
    editor.updateShape<TableShape>({ id: shape.id, type: 'table', props: { activeRow: row, activeCol: col } })
  }

  const addRowAt = (afterRow: number) => {
    const next = cloneRows(rows)
    const at = clamp(afterRow + 1, 0, next.length)
    next.splice(at, 0, blankRow(colCount))
    updateRows(next, { row: at, col: Math.min(shape.props.activeCol, colCount - 1) }, { h: shape.props.h + TABLE_ROW_H })
  }

  const addColAt = (afterCol: number) => {
    const next = cloneRows(rows).map((row) => {
      const copy = [...row]
      copy.splice(clamp(afterCol + 1, 0, colCount), 0, '')
      return copy
    })
    const at = clamp(afterCol + 1, 0, colCount)
    updateRows(next, { row: Math.min(shape.props.activeRow, next.length - 1), col: at }, { w: shape.props.w + TABLE_COL_W })
  }

  const runAction = (action: TableMenuAction) => {
    if (!menu) return
    const next = cloneRows(rows)
    const row = clamp(menu.row, 0, next.length - 1)
    const col = clamp(menu.col, 0, colCount - 1)
    let active = { row, col }
    let width = shape.props.w
    let height = shape.props.h

    if (action === 'row-before') {
      next.splice(row, 0, blankRow(colCount))
      height += TABLE_ROW_H
    } else if (action === 'row-after') {
      next.splice(row + 1, 0, blankRow(colCount))
      active = { row: row + 1, col }
      height += TABLE_ROW_H
    } else if (action === 'row-duplicate') {
      next.splice(row + 1, 0, [...next[row]])
      active = { row: row + 1, col }
      height += TABLE_ROW_H
    } else if (action === 'row-delete' && next.length > 1) {
      next.splice(row, 1)
      active = { row: Math.min(row, next.length - 1), col }
      height = Math.max(TABLE_ROW_H, height - TABLE_ROW_H)
    } else if (action === 'row-up' && row > 0) {
      ;[next[row - 1], next[row]] = [next[row], next[row - 1]]
      active = { row: row - 1, col }
    } else if (action === 'row-down' && row < next.length - 1) {
      ;[next[row + 1], next[row]] = [next[row], next[row + 1]]
      active = { row: row + 1, col }
    } else if (action === 'col-before') {
      next.forEach((r) => r.splice(col, 0, ''))
      width += TABLE_COL_W
    } else if (action === 'col-after') {
      next.forEach((r) => r.splice(col + 1, 0, ''))
      active = { row, col: col + 1 }
      width += TABLE_COL_W
    } else if (action === 'col-duplicate') {
      next.forEach((r) => r.splice(col + 1, 0, r[col] ?? ''))
      active = { row, col: col + 1 }
      width += TABLE_COL_W
    } else if (action === 'col-delete' && colCount > 1) {
      next.forEach((r) => r.splice(col, 1))
      active = { row, col: Math.min(col, colCount - 2) }
      width = Math.max(TABLE_COL_W, width - TABLE_COL_W)
    } else if (action === 'col-left' && col > 0) {
      next.forEach((r) => {
        ;[r[col - 1], r[col]] = [r[col], r[col - 1]]
      })
      active = { row, col: col - 1 }
    } else if (action === 'col-right' && col < colCount - 1) {
      next.forEach((r) => {
        ;[r[col + 1], r[col]] = [r[col], r[col + 1]]
      })
      active = { row, col: col + 1 }
    } else if (action === 'duplicate-table') {
      editor.duplicateShapes([shape.id], { x: 24, y: 24 })
      setMenu(null)
      return
    } else if (action === 'delete-table') {
      editor.deleteShapes([shape.id])
      setMenu(null)
      return
    }

    updateRows(next, active, { w: width, h: height })
    setMenu(null)
  }

  const onCellKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>, row: number, col: number) => {
    const addShortcut = (event.metaKey || event.ctrlKey) && event.shiftKey && isPlusKey(event)
    if (!addShortcut) return
    event.preventDefault()
    event.stopPropagation()
    if (event.altKey) addColAt(col)
    else addRowAt(row)
  }

  const onCellPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>, row: number, col: number) => {
    const raw = event.clipboardData.getData('text/plain')
    if (!raw.includes('\n') && !raw.includes('\t') && !raw.includes(',')) return
    const grid = parseTablePaste(raw)
    if (grid.length <= 1 && (grid[0]?.length ?? 0) <= 1) return
    event.preventDefault()
    event.stopPropagation()
    const next = cloneRows(rows)
    const neededRows = row + grid.length
    const neededCols = col + Math.max(...grid.map((r) => r.length))
    while (next.length < neededRows) next.push(blankRow(next[0]?.length ?? colCount))
    next.forEach((r) => {
      while (r.length < neededCols) r.push('')
    })
    grid.forEach((pasteRow, r) => {
      pasteRow.forEach((value, c) => {
        next[row + r][col + c] = value
      })
    })
    updateRows(next, { row, col }, {
      w: Math.max(shape.props.w, neededCols * TABLE_COL_W),
      h: Math.max(shape.props.h, neededRows * TABLE_ROW_H),
    })
  }

  const onContextMenu = (event: React.MouseEvent, row: number, col: number) => {
    event.preventDefault()
    event.stopPropagation()
    setActive(row, col)
    const root = rootRef.current
    if (!root) return
    const rect = root.getBoundingClientRect()
    const scaleX = rect.width / shape.props.w || 1
    const scaleY = rect.height / shape.props.h || 1
    setMenu({
      row,
      col,
      x: clamp((event.clientX - rect.left) / scaleX, 8, shape.props.w - 230),
      y: clamp((event.clientY - rect.top) / scaleY, 8, shape.props.h - 260),
    })
  }

  const border = dark ? '#363636' : '#deded9'
  const bg = dark ? '#111' : '#fff'
  const headerBg = dark ? '#171717' : '#fbfbfa'

  return (
    <div
      ref={rootRef}
      data-canvas-editor-block="true"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => {
        setHovered(false)
        setMenu(null)
      }}
      onPointerDownCapture={(e) => e.stopPropagation()}
      onPointerUpCapture={(e) => e.stopPropagation()}
      onMouseDownCapture={(e) => e.stopPropagation()}
      onMouseUpCapture={(e) => e.stopPropagation()}
      onDoubleClickCapture={(e) => e.stopPropagation()}
      onKeyDownCapture={(e) => e.stopPropagation()}
      onKeyUpCapture={(e) => e.stopPropagation()}
      onWheelCapture={(e) => e.stopPropagation()}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        color: 'var(--color-ink)',
        fontFamily: 'var(--font-mono)',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          border: `var(--shape-outline-thickness, 1.8px) solid ${border}`,
          borderRadius: 10,
          background: bg,
          boxShadow: dark ? '0 18px 42px rgba(0,0,0,.35)' : '0 18px 42px rgba(15,23,42,.1)',
        }}
      >
        <table style={{ width: '100%', height: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} style={{ height: `${100 / rows.length}%` }}>
                {row.map((cell, colIndex) => {
                  const active = rowIndex === shape.props.activeRow && colIndex === shape.props.activeCol
                  return (
                    <td
                      key={`${rowIndex}-${colIndex}`}
                      style={{
                        padding: 0,
                        borderRight: colIndex === row.length - 1 ? 'none' : `var(--shape-outline-thickness, 1.8px) solid ${border}`,
                        borderBottom: rowIndex === rows.length - 1 ? 'none' : `var(--shape-outline-thickness, 1.8px) solid ${border}`,
                        background: rowIndex === 0 ? headerBg : bg,
                        position: 'relative',
                      }}
                      onContextMenu={(event) => onContextMenu(event, rowIndex, colIndex)}
                    >
                      {active && (
                        <span
                          style={{
                            pointerEvents: 'none',
                            position: 'absolute',
                            inset: -1,
                            border: '2px solid #0ea5e9',
                            zIndex: 2,
                          }}
                        />
                      )}
                      <textarea
                        value={cell}
                        spellCheck={false}
                        onFocus={() => setActive(rowIndex, colIndex)}
                        onPointerDown={(event) => {
                          event.stopPropagation()
                          setActive(rowIndex, colIndex)
                        }}
                        onContextMenu={(event) => onContextMenu(event, rowIndex, colIndex)}
                        onKeyDown={(event) => onCellKeyDown(event, rowIndex, colIndex)}
                        onPaste={(event) => onCellPaste(event, rowIndex, colIndex)}
                        onChange={(event) => updateCell(rowIndex, colIndex, event.currentTarget.value)}
                        style={{
                          display: 'block',
                          width: '100%',
                          height: '100%',
                          resize: 'none',
                          border: 0,
                          outline: 0,
                          padding: '17px 14px',
                          background: 'transparent',
                          color: 'var(--color-ink)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: 16,
                          fontWeight: rowIndex === 0 ? 750 : 500,
                          lineHeight: 1.25,
                          overflow: 'hidden',
                        }}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hovered && !menu && (
        <>
          {rows.map((_, rowIndex) => (
            <button
              key={`row-${rowIndex}`}
              title="Add row after"
              onClick={() => addRowAt(rowIndex)}
              style={{
                position: 'absolute',
                left: -17,
                top: `${((rowIndex + 0.5) / rows.length) * 100}%`,
                transform: 'translateY(-50%)',
                width: 24,
                height: 24,
                borderRadius: 8,
                border: `1px solid ${border}`,
                background: dark ? '#202020' : '#f7f7f5',
                color: '#777',
                boxShadow: '0 8px 22px rgba(0,0,0,.12)',
                font: '700 16px/1 var(--font-sans)',
                cursor: 'pointer',
              }}
            >
              +
            </button>
          ))}
          {Array.from({ length: colCount }, (_, colIndex) => (
            <button
              key={`col-${colIndex}`}
              title="Add column after"
              onClick={() => addColAt(colIndex)}
              style={{
                position: 'absolute',
                top: -17,
                left: `${((colIndex + 0.5) / colCount) * 100}%`,
                transform: 'translateX(-50%)',
                width: 24,
                height: 24,
                borderRadius: 8,
                border: `1px solid ${border}`,
                background: dark ? '#202020' : '#f7f7f5',
                color: '#777',
                boxShadow: '0 8px 22px rgba(0,0,0,.12)',
                font: '700 16px/1 var(--font-sans)',
                cursor: 'pointer',
              }}
            >
              +
            </button>
          ))}
        </>
      )}
      {menu && <TableMenu menu={menu} onRun={runAction} dark={dark} />}
    </div>
  )
}

type TableMenuAction =
  | 'row-before'
  | 'row-after'
  | 'row-up'
  | 'row-down'
  | 'row-duplicate'
  | 'row-delete'
  | 'col-before'
  | 'col-after'
  | 'col-left'
  | 'col-right'
  | 'col-duplicate'
  | 'col-delete'
  | 'duplicate-table'
  | 'delete-table'

function TableMenu({ menu, onRun, dark }: { menu: MenuState; onRun: (action: TableMenuAction) => void; dark: boolean }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: menu.x,
        top: menu.y,
        zIndex: 20,
        width: 230,
        borderRadius: 14,
        border: '1px solid var(--color-line)',
        background: dark ? '#151515' : '#fff',
        boxShadow: '0 24px 55px rgba(0,0,0,.18)',
        overflow: 'hidden',
        fontFamily: 'var(--font-sans)',
        fontSize: 13,
        color: 'var(--color-ink)',
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
    >
      <MenuSection label="Row">
        <MenuButton label="Add row before" shortcut="" onClick={() => onRun('row-before')} />
        <MenuButton label="Add row after" shortcut="Cmd Shift +" onClick={() => onRun('row-after')} />
        <MenuButton label="Move up" onClick={() => onRun('row-up')} />
        <MenuButton label="Move down" onClick={() => onRun('row-down')} />
        <MenuButton label="Duplicate row" onClick={() => onRun('row-duplicate')} />
        <MenuButton label="Delete row" danger onClick={() => onRun('row-delete')} />
      </MenuSection>
      <MenuSection label="Column">
        <MenuButton label="Add column before" onClick={() => onRun('col-before')} />
        <MenuButton label="Add column after" shortcut="Cmd Shift Opt +" onClick={() => onRun('col-after')} />
        <MenuButton label="Move left" onClick={() => onRun('col-left')} />
        <MenuButton label="Move right" onClick={() => onRun('col-right')} />
        <MenuButton label="Duplicate column" onClick={() => onRun('col-duplicate')} />
        <MenuButton label="Delete column" danger onClick={() => onRun('col-delete')} />
      </MenuSection>
      <div style={{ borderTop: '1px solid var(--color-line)', padding: 6 }}>
        <MenuButton label="Duplicate table" onClick={() => onRun('duplicate-table')} />
        <MenuButton label="Delete table" danger onClick={() => onRun('delete-table')} />
      </div>
    </div>
  )
}

function MenuSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ borderBottom: '1px solid var(--color-line)', padding: 6 }}>
      <div style={{ padding: '6px 8px 4px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--color-grey-3)' }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function MenuButton({ label, shortcut, danger, onClick }: { label: string; shortcut?: string; danger?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        width: '100%',
        alignItems: 'center',
        gap: 10,
        border: 0,
        borderRadius: 9,
        background: 'transparent',
        padding: '8px 9px',
        color: danger ? '#ef4444' : 'var(--color-ink)',
        font: '600 13px/1.1 var(--font-sans)',
        textAlign: 'left',
        cursor: 'pointer',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.background = 'var(--color-grey-1)'
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = 'transparent'
      }}
    >
      <span style={{ flex: 1 }}>{label}</span>
      {shortcut && <span style={{ color: 'var(--color-grey-3)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>{shortcut}</span>}
    </button>
  )
}

function normalizedRows(rows: string[][]) {
  const source = rows.length ? rows : [['']]
  const colCount = Math.max(1, ...source.map((row) => row.length))
  return source.map((row) => {
    const next = [...row]
    while (next.length < colCount) next.push('')
    return next
  })
}

function cloneRows(rows: string[][]) {
  return normalizedRows(rows).map((row) => [...row])
}

function blankRow(colCount: number) {
  return Array.from({ length: Math.max(1, colCount) }, () => '')
}

function activeCell(shape: TableShape, rows: string[][]) {
  const normalized = normalizedRows(rows)
  return {
    row: clamp(shape.props.activeRow, 0, normalized.length - 1),
    col: clamp(shape.props.activeCol, 0, Math.max(0, normalized[0].length - 1)),
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function isPlusKey(event: KeyboardEvent) {
  return event.key === '+' || event.key === '='
}

function parseTablePaste(raw: string) {
  const trimmed = raw.replace(/\r/g, '').replace(/\n$/, '')
  const delimiter = trimmed.includes('\t') ? '\t' : ','
  return trimmed
    .split('\n')
    .map((line) => line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, '')))
    .filter((row) => row.some(Boolean))
}
