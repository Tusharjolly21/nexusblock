import { Icon } from '@iconify/react'
import { useDocStore } from '../store/useDocStore'
import { DeviceFramesTab } from './DeviceFramesTab'
import { IconLibrary } from './IconLibrary'
import { DiagramCatalog } from './DiagramCatalog'
import { InsertItemsPanel } from './InsertItemsPanel'
import { CanvasLayersPanel } from './CanvasLayersPanel'
import { CanvasSearchPanel } from './CanvasSearchPanel'
import { SnapshotsPanel } from './SnapshotsPanel'

/**
 * Floating library panel anchored beside the rail. Opens on demand and closes
 * back to nothing, so it never permanently steals canvas space. Absolutely
 * positioned over the canvas (not a layout column).
 */
export function LibraryFlyout() {
  const flyout = useDocStore((s) => s.flyout)
  const setFlyout = useDocStore((s) => s.setFlyout)

  if (!flyout) return null
  const title =
    flyout === 'insert'
      ? 'Insert item'
      : flyout === 'search'
        ? 'Search canvas'
        : flyout === 'snapshots'
          ? 'Snapshots'
      : flyout === 'layers'
        ? 'Layers'
        : flyout === 'shapes'
          ? 'Device frames'
          : flyout === 'catalog'
            ? 'Diagram catalog'
            : 'Icons & logos'
  const wide = flyout === 'insert' || flyout === 'layers' || flyout === 'search' || flyout === 'snapshots'

  return (
    <div
      className={
        'absolute bottom-3 left-3 top-3 z-20 flex min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-paper shadow-[0_20px_50px_-20px_rgba(0,0,0,.35)] ' +
        (flyout === 'catalog' ? 'w-[min(720px,calc(100vw-112px))]' : wide ? 'w-[360px]' : 'w-72')
      }
    >
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <span className="text-sm font-semibold text-ink">
          {title}
        </span>
        <button
          onClick={() => setFlyout(null)}
          aria-label="Close panel"
          className="grid h-6 w-6 place-items-center rounded-md text-grey-3 hover:bg-grey-1 hover:text-ink"
        >
          <Icon icon="lucide:x" width={14} height={14} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {flyout === 'insert'
          ? <InsertItemsPanel />
          : flyout === 'search'
            ? <CanvasSearchPanel />
            : flyout === 'snapshots'
              ? <SnapshotsPanel />
          : flyout === 'layers'
            ? <CanvasLayersPanel />
            : flyout === 'shapes'
              ? <DeviceFramesTab />
              : flyout === 'catalog'
                ? <DiagramCatalog />
                : <IconLibrary />}
      </div>
    </div>
  )
}
