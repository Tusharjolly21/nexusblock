import { CanvasPane } from './CanvasPane'
import { IconRail } from './IconRail'
import { LibraryFlyout } from './LibraryFlyout'
import { ToolCluster } from './ToolCluster'
import { SelectionToolbar } from './SelectionToolbar'
import { CanvasInsertMenu } from './CanvasInsertMenu'
import { FigureToolLayer } from './FigureToolLayer'
import { CommentPinLayer } from './CommentPinLayer'
import { FigureContextMenu } from './FigureContextMenu'
import { TableShortcuts } from './TableShortcuts'
import { ConnectionHandles } from './ConnectionHandles'
import { HoverActions } from './HoverActions'
import { PageBar } from './PageBar'
import { CanvasCoach } from './CanvasCoach'
import { useEditorUi } from '../store/useEditorUi'
import { FOCUS_SHORTCUT_LABEL } from './FocusModeShortcut'
import { useApp, selectCurrentFile } from '../store/useApp'

/**
 * The canvas workspace: a thin icon rail on the left, the full-bleed canvas, a
 * floating tool cluster on top, and libraries that flyout on demand. Everything
 * except the rail floats over the canvas, so the drawing surface stays maximal.
 */
export function EditorShell() {
  const focusMode = useEditorUi((s) => s.focusMode)
  const isPresenting = useEditorUi((s) => s.isPresenting)
  const file = useApp(selectCurrentFile)
  const viewOnlyShared = !!file?.sharedFrom && file.sharedRole !== 'edit'
  const isEmbed = window.location.pathname.startsWith('/embed/')
  const hideChrome = focusMode || isPresenting || isEmbed

  return (
    <div className="flex min-h-0 flex-1">
      {!hideChrome && !viewOnlyShared && <IconRail />}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="relative min-h-0 flex-1" data-tour="canvas">
          <CanvasPane />
          {!hideChrome && !viewOnlyShared && (
            <>
              <ConnectionHandles />
              <HoverActions />
              <ToolCluster />
              <SelectionToolbar />
              <FigureToolLayer />
              <FigureContextMenu />
              <TableShortcuts />
              <CanvasInsertMenu />
              <LibraryFlyout />
              <PageBar />
              <CanvasCoach />
            </>
          )}
          {/* Comment pins render for everyone (viewers included) so they can
              read threads; placing new pins is gated to editors in the layer. */}
          {!hideChrome && <CommentPinLayer />}
          {focusMode && !isPresenting && <FocusModeHint />}
        </div>
      </div>
    </div>
  )
}

function FocusModeHint() {
  const setFocusMode = useEditorUi((s) => s.setFocusMode)

  return (
    <div className="pointer-events-auto absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-line bg-surface/95 px-3 py-2 text-xs font-medium text-grey-4 shadow-[0_14px_32px_-18px_rgba(0,0,0,.4)] backdrop-blur">
      <span className="text-ink">Canvas focus</span>
      <span className="hidden sm:inline">Press</span>
      <kbd className="rounded-md border border-line bg-paper px-1.5 py-0.5 font-mono text-[11px] text-ink">{FOCUS_SHORTCUT_LABEL}</kbd>
      <span className="hidden sm:inline">to restore tools</span>
      <button
        onClick={() => setFocusMode(false)}
        className="ml-1 rounded-full bg-ink px-2 py-1 text-[11px] font-semibold text-paper hover:opacity-90"
      >
        Exit
      </button>
    </div>
  )
}
