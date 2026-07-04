import { useDocStore } from '../store/useDocStore'
import { DocPane } from './DocPane'
import { CodePane } from './CodePane'

/**
 * Right-hand panel with two tabs: the BlockNote document and the diagram-as-code
 * editor. One panel, tabbed, so Doc and Code never fight for screen space.
 */
export function SidePanel() {
  const sideTab = useDocStore((s) => s.sideTab)
  const setSideTab = useDocStore((s) => s.setSideTab)

  // tldraw binds tool shortcuts (t, v, r, …) to document.body and only skips
  // non-readonly <textarea>s — which misses Monaco's input. Contain keyboard
  // events to this panel so typing in the code/doc editor never drives the
  // canvas. (Inner editors handle their keys first; we stop the native event
  // before it bubbles to tldraw.)
  const containKeys = (e: React.KeyboardEvent) => e.nativeEvent.stopImmediatePropagation()

  return (
    <div
      className="flex h-full flex-col border-l border-line bg-surface"
      onKeyDown={containKeys}
      onKeyUp={containKeys}>
      <div className="flex gap-1 border-b border-line p-2">
        <Tab active={sideTab === 'doc'} onClick={() => setSideTab('doc')}>
          Document
        </Tab>
        <Tab active={sideTab === 'code'} onClick={() => setSideTab('code')}>
          Code
        </Tab>
      </div>
      <div className="min-h-0 flex-1">
        {/* Keep both mounted so unsaved code/doc state survives tab switches. */}
        <div className={sideTab === 'doc' ? 'h-full' : 'hidden'}>
          <DocPane />
        </div>
        <div className={sideTab === 'code' ? 'h-full' : 'hidden'}>
          <CodePane />
        </div>
      </div>
    </div>
  )
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={
        'flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ' +
        (active ? 'bg-ink text-paper' : 'text-grey-4 hover:bg-grey-1')
      }
    >
      {children}
    </button>
  )
}
