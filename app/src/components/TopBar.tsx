import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { ShareModal } from './ShareModal'
import { useDocStore } from '../store/useDocStore'
import { useApp, selectCurrentFile } from '../store/useApp'
import { useEditorUi } from '../store/useEditorUi'
import { useCommand } from '../store/useCommand'
import { VersionMenu } from './VersionMenu'
import { ExportMenu } from './ExportMenu'
import { ToneToggle } from './ToneToggle'
import { ViewModeSwitch } from './ViewModeSwitch'
import { Logo } from './Logo'
import { FOCUS_SHORTCUT_LABEL } from './FocusModeShortcut'

/** Editor top bar: workspace/back, editable file title, history + doc toggle. */
export function TopBar() {
  const lastSavedAt = useDocStore((s) => s.lastSavedAt)
  const file = useApp(selectCurrentFile)
  const renameFile = useApp((s) => s.renameFile)
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const inspectorOpen = useEditorUi((s) => s.inspectorOpen)
  const toggleInspector = useEditorUi((s) => s.toggleInspector)
  const focusMode = useEditorUi((s) => s.focusMode)
  const toggleFocusMode = useEditorUi((s) => s.toggleFocusMode)
  const readOnly = useEditorUi((s) => s.readOnly)
  const toggleReadOnly = useEditorUi((s) => s.toggleReadOnly)
  const toggleCommand = useCommand((s) => s.toggle)
  const [sharing, setSharing] = useState(false)
  const shared = !!file?.sharedFrom
  const sharedViewOnly = shared && file?.sharedRole !== 'edit'
  const isLive = params.get('live') === '1'

  return (
    <header className="relative z-40 grid h-14 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-b border-line bg-paper/90 px-3 backdrop-blur">
      <div className="flex min-w-0 items-center gap-2">
        <button
          onClick={() => navigate('/dashboard/all')}
          title="All files"
          className="flex shrink-0 items-center gap-2 rounded-lg px-2 py-1 font-display font-semibold tracking-tight text-ink hover:bg-grey-1"
        >
          <Logo />
          nexusblock
        </button>
        <span className="text-grey-2">/</span>
        <span className="hidden rounded-full border border-line px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-grey-3 lg:inline-flex">
          payments
        </span>
        <input
          aria-label="File title"
          value={file?.title ?? 'Untitled'}
          onChange={(e) => file && renameFile(file.id, e.target.value)}
          readOnly={!!file?.sharedFrom}
          className="min-w-[110px] max-w-[220px] flex-1 rounded-md bg-transparent px-2 py-1 text-sm font-medium text-grey-4 outline-none hover:bg-grey-1 focus:bg-grey-1 read-only:hover:bg-transparent"
        />
        {file?.sharedFrom && (
          <span className="hidden shrink-0 items-center gap-1 rounded-full border border-line px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-grey-3 2xl:inline-flex">
            <Icon icon="lucide:users" width={11} />
            Shared · {file.sharedRole === 'edit' ? 'Can edit' : 'View only'}
          </span>
        )}
      </div>

      <div className="justify-self-center">
        <ViewModeSwitch />
      </div>

      <div className="flex min-w-0 items-center justify-end gap-1">
        <SavedDot lastSavedAt={lastSavedAt} />
        {isLive && <LiveSessionPill shared={shared} />}
        <TopIconButton icon="lucide:command" label="Command palette (⌘K)" onClick={toggleCommand} className="hidden md:grid" />
        <TopIconButton icon="lucide:panel-right" label="Toggle inspector" active={inspectorOpen} onClick={toggleInspector} />
        <TopIconButton
          icon="lucide:shield-check"
          label={sharedViewOnly ? 'View-only shared file' : 'Review mode'}
          active={readOnly || sharedViewOnly}
          disabled={sharedViewOnly}
          onClick={toggleReadOnly}
        />
        <TopIconButton
          icon="lucide:screen-share"
          label={`Canvas focus (${FOCUS_SHORTCUT_LABEL})`}
          active={focusMode}
          onClick={toggleFocusMode}
        />
        <div className="mx-1 h-6 w-px shrink-0 bg-line" />
        <ToneToggle />
        <ExportMenu />
        <VersionMenu />
        {!shared ? (
          <button
            onClick={() => setSharing(true)}
            className="ml-1 inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-ink px-3.5 py-1.5 text-sm font-semibold text-paper hover:opacity-90"
          >
            <Icon icon="lucide:share-2" width={14} />
            Share
          </button>
        ) : (
          <CopyLinkButton />
        )}
      </div>
      {sharing && file && <ShareModal fileId={file.id} title={file.title} onClose={() => setSharing(false)} />}
    </header>
  )
}

/** Small saved-state indicator: a dot with the save time on hover (no wide pill). */
function SavedDot({ lastSavedAt }: { lastSavedAt: number | null }) {
  const time = lastSavedAt ? new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null
  return (
    <span
      title={time ? `Saved at ${time}` : 'Not saved yet'}
      aria-label={time ? 'Saved' : 'Not saved'}
      className={'mr-1 hidden h-2.5 w-2.5 shrink-0 rounded-full sm:block ' + (lastSavedAt ? 'bg-ink' : 'border border-grey-3')}
    />
  )
}

/** Compact live pill — click to copy the live link. */
function LiveSessionPill({ shared }: { shared: boolean }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    })
  }

  return (
    <button
      onClick={copy}
      title={copied ? 'Live link copied' : shared ? 'Shared live session — copy link' : 'Live session — copy link'}
      className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/15 sm:flex"
    >
      <span className="relative grid h-2.5 w-2.5 place-items-center">
        <span className="absolute h-2.5 w-2.5 animate-ping rounded-full bg-emerald-500/60" />
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      {copied ? 'Copied' : 'Live'}
    </button>
  )
}

/** Copy-link button for shared files — never wraps, flips to a check on copy. */
function CopyLinkButton() {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    })
  }
  return (
    <button
      onClick={copy}
      title="Copy link to this file"
      className="ml-1 inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-line px-3.5 py-1.5 text-sm font-semibold text-grey-4 transition-colors hover:border-ink hover:text-ink"
    >
      <Icon icon={copied ? 'lucide:check' : 'lucide:link'} width={14} />
      {copied ? 'Copied' : 'Copy link'}
    </button>
  )
}

function TopIconButton({
  icon,
  label,
  active,
  disabled,
  onClick,
  className = '',
}: {
  icon: string
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={
        'grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors ' +
        (active ? 'bg-ink text-paper' : 'text-grey-4 hover:bg-grey-1 hover:text-ink') +
        (disabled ? ' cursor-default opacity-80' : '') +
        (className ? ' ' + className : '')
      }
    >
      <Icon icon={icon} width={15} />
    </button>
  )
}
