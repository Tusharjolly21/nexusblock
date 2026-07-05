import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { useApp, type FileMeta, type Folder, type Profile } from '../store/useApp'
import { useAuth } from '../store/useAuth'
import { cloudEnabled, deleteContent, deleteShareArtifacts } from '../sync/cloud'
import { getTemplate, type TemplateId } from '../onboarding/templates'
import { getThumb } from '../canvas/thumbnail'
import { docText, matchSnippet } from '../canvas/search'
import { TemplatePicker } from './TemplatePicker'
import { Logo } from './Logo'
import { ToneSwatches, ToneToggle } from './ToneToggle'

type ViewTab = 'all' | 'recents' | 'mine' | 'unsorted'
type SettingsTab = 'members' | 'billing' | 'git' | 'icons' | 'tokens' | 'team' | 'profile' | 'appearance' | 'mcp'

type DashboardContext = {
  workspace: string
  profile: ReturnType<typeof useApp.getState>['profile']
  files: FileMeta[]
  folders: Folder[]
  imported: string[]
  mcpCommand: string
  displayName: string
  displayEmail: string
  photoUrl: string | null
}

const MCP_COMMANDS: Record<string, string> = {
  codex: 'codex mcp add nexusblock https://app.nexusblock.io/api/mcp',
  'claude-code': 'claude mcp add --transport http nexusblock https://app.nexusblock.io/api/mcp',
  cursor: 'cursor://settings/mcp?server=nexusblock',
  vscode: 'code --add-mcp nexusblock=https://app.nexusblock.io/api/mcp',
  'github-copilot': 'gh nexusblock mcp connect',
}

const MAX_IMAGE_UPLOAD_BYTES = 900_000
const SAFE_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])

async function readSafeImageDataUrl(file: File): Promise<string | null> {
  if (!SAFE_IMAGE_TYPES.has(file.type) || file.size > MAX_IMAGE_UPLOAD_BYTES) return null
  if (file.type !== 'image/svg+xml') return readFileAsDataUrl(file)
  const raw = await file.text()
  const sanitized = raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\s(href|xlink:href)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, '')
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(sanitized)))}`
}

function readFileAsDataUrl(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null)
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(file)
  })
}

export function Dashboard() {
  const profile = useApp((s) => s.profile)
  const workspace = useApp((s) => s.workspaceName)
  const files = useApp((s) => s.files)
  const folders = useApp((s) => s.folders)
  const createFile = useApp((s) => s.createFile)
  const deleteFile = useApp((s) => s.deleteFile)
  const moveFile = useApp((s) => s.moveFile)
  const createFolder = useApp((s) => s.createFolder)
  const renameFolder = useApp((s) => s.renameFolder)
  const deleteFolder = useApp((s) => s.deleteFolder)
  const updateWorkspaceProfile = useApp((s) => s.updateProfile)
  const setWorkspaceName = useApp((s) => s.setWorkspaceName)
  const resetWorkspace = useApp((s) => s.resetWorkspace)
  const navigate = useNavigate()
  const signOut = useAuth((s) => s.signOut)
  const updateAuthProfile = useAuth((s) => s.updateProfile)
  const authEmail = useAuth((s) => s.email)
  const authName = useAuth((s) => s.name)
  const photoUrl = useAuth((s) => s.photoUrl)
  const { folderId } = useParams()
  const importRef = useRef<HTMLInputElement>(null)

  const [picking, setPicking] = useState(false)
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<ViewTab>('all')
  const [copied, setCopied] = useState<string | null>(null)
  const [imported, setImported] = useState<string[]>(profile?.importedDiagramNames ?? [])
  const [teamMenuOpen, setTeamMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('members')

  const folderExists = !folderId || folders.some((f) => f.id === folderId)
  const activeFolder: string | 'all' = folderExists ? (folderId ?? 'all') : 'all'

  const openFolder = (id: string | 'all') => navigate(id === 'all' ? '/dashboard/all' : `/dashboard/folder/${id}`)
  const openFile = (id: string) => navigate(`/app/file/${id}`)
  const create = (template: TemplateId, title?: string) => {
    if ((profile?.plan ?? 'free') === 'free' && files.filter((f) => !f.sharedFrom).length >= 3) {
      setSettingsTab('billing')
      setSettingsOpen(true)
      return
    }
    const fileId = createFile(template, title, activeFolder === 'all' ? null : activeFolder)
    navigate(`/app/file/${fileId}`)
  }
  const removeFile = (id: string) => {
    deleteFile(id)
    const uid = useAuth.getState().uid
    if (uid && cloudEnabled()) {
      deleteContent(uid, id).catch(() => {})
      deleteShareArtifacts(id).catch(() => {})
    }
  }

  const onPick = (id: TemplateId) => {
    setPicking(false)
    create(id)
  }

  const scoped = useMemo(() => {
    let list = activeFolder === 'all' ? files : files.filter((f) => f.folderId === activeFolder)
    if (tab === 'recents') list = [...list].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 12)
    if (tab === 'mine') list = list.filter((f) => !f.sharedFrom)
    if (tab === 'unsorted') list = list.filter((f) => !f.folderId)
    return list
  }, [activeFolder, files, tab])

  const q = query.trim().toLowerCase()
  const results = useMemo(() => {
    if (!q) return scoped.map((file) => ({ file, snippet: null as string | null }))
    return scoped
      .map((file) => {
        const text = docText(file.id)
        const inTitle = file.title.toLowerCase().includes(q)
        const snippet = matchSnippet(text, q)
        if (!inTitle && !snippet) return null
        return { file, snippet: inTitle ? null : snippet }
      })
      .filter((r): r is { file: FileMeta; snippet: string | null } => r !== null)
  }, [q, scoped])

  const copy = async (label: string, value: string) => {
    await navigator.clipboard?.writeText(value)
    setCopied(label)
    window.setTimeout(() => setCopied(null), 1400)
  }

  const handleImports = (list: FileList | null) => {
    if (!list?.length) return
    const names = Array.from(list).map((f) => f.name)
    const next = [...names, ...imported].slice(0, 12)
    setImported(next)
    updateWorkspaceProfile({ importedDiagramNames: next })
    names.forEach((name) => createFile('notes', `Imported: ${name}`, activeFolder === 'all' ? null : activeFolder))
  }

  const folderCount = (id: string) => files.filter((f) => f.folderId === id).length
  const mcpCommand = MCP_COMMANDS[profile?.mcpClient ?? 'codex'] ?? MCP_COMMANDS.codex
  const displayName = profile?.name || authName || authEmail || 'Your account'
  const displayEmail = authEmail || 'Signed in locally'
  const inviteUrl = `https://app.nexusblock.io/invite/${workspace.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  const dashboardContext = { workspace, profile, files, folders, imported, mcpCommand, displayName, displayEmail, photoUrl }

  if (!folderExists) return <Navigate to="/dashboard/all" replace />

  return (
    <div className="grid h-full min-h-screen grid-cols-[228px_1fr] overflow-hidden bg-paper text-ink">
      <aside className="flex min-h-0 flex-col border-r border-line bg-surface/80 px-3 py-3 backdrop-blur-xl">
        <div className="relative">
          <button
            onClick={() => setTeamMenuOpen((v) => !v)}
            className="flex w-full items-center gap-2.5 rounded-xl border border-line bg-paper px-2.5 py-2.5 text-left shadow-[0_16px_36px_-30px_rgba(0,0,0,.55)] transition-colors hover:border-ink"
            aria-expanded={teamMenuOpen}
          >
            <BrandMark />
            <span className="min-w-0 flex-1 truncate font-display text-base font-semibold">{workspace}</span>
            <Icon icon={teamMenuOpen ? 'lucide:chevron-up' : 'lucide:chevron-down'} width={16} className="text-grey-3" />
          </button>
          {teamMenuOpen && (
            <TeamMenu
              workspace={workspace}
              displayName={displayName}
              displayEmail={displayEmail}
              photoUrl={photoUrl}
              onSettings={() => { setSettingsTab('members'); setSettingsOpen(true); setTeamMenuOpen(false) }}
              onCreateTeam={() => { setSettingsTab('members'); setSettingsOpen(true); setTeamMenuOpen(false) }}
              onClose={() => setTeamMenuOpen(false)}
              onLogout={() => { signOut(); navigate('/') }}
            />
          )}
        </div>

        <nav className="mt-5 space-y-1">
          <SideItem active={activeFolder === 'all' && tab === 'all'} icon="lucide:layout-grid" label="All files" hint="A" onClick={() => { setTab('all'); openFolder('all') }} />
          <SideItem icon="lucide:clock-3" label="Recents" hint="R" active={tab === 'recents'} onClick={() => { setTab('recents'); openFolder('all') }} />
          <SideItem icon="lucide:user-round" label="Created by me" hint="M" active={tab === 'mine'} onClick={() => setTab('mine')} />
          <SideItem icon="lucide:inbox" label="Unsorted" hint="U" active={tab === 'unsorted'} onClick={() => setTab('unsorted')} />
        </nav>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between px-2 font-mono text-[11px] uppercase tracking-[0.22em] text-grey-3">
            Team folders
            <button
              onClick={() => openFolder(createFolder('New folder'))}
              className="grid h-7 w-7 place-items-center rounded-lg text-grey-3 hover:bg-grey-1 hover:text-ink"
              aria-label="New folder"
            >
              <Icon icon="lucide:folder-plus" width={15} />
            </button>
          </div>
          <div className="space-y-1">
            {folders.map((folder) => (
              <FolderRow
                key={folder.id}
                folder={folder}
                active={activeFolder === folder.id}
                count={folderCount(folder.id)}
                onOpen={() => openFolder(folder.id)}
                onRename={renameFolder}
                onDelete={(id) => { deleteFolder(id); openFolder('all') }}
              />
            ))}
            {folders.length === 0 && <div className="rounded-2xl border border-dashed border-line px-3 py-4 text-xs text-grey-3">No folders yet.</div>}
          </div>
        </div>

        <div className="mt-auto space-y-2 pt-5">
          <div className="rounded-2xl border border-line bg-paper p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Free workspace</div>
              <span className="rounded-full bg-grey-1 px-2 py-1 text-[11px] font-bold text-grey-4">{files.length}/3</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-grey-1">
              <div className="h-full rounded-full bg-ink" style={{ width: `${Math.min(100, (files.length / 3) * 100)}%` }} />
            </div>
            <button onClick={() => { setSettingsTab('billing'); setSettingsOpen(true) }} className="mt-3 w-full rounded-xl bg-ink px-3 py-2 text-sm font-semibold text-paper">Upgrade</button>
          </div>

          <FeatureLink icon="lucide:settings-2" label="Workspace settings" onClick={() => { setSettingsTab('team'); setSettingsOpen(true) }} />

          <button onClick={() => create('blank')} className="flex w-full items-center justify-between rounded-2xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper">
            New file <Icon icon="lucide:chevron-down" width={16} />
          </button>
        </div>
      </aside>

      <main className="min-w-0 overflow-y-auto">
        <header className="sticky top-0 z-20 border-b border-line bg-paper/86 px-5 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex rounded-xl border border-line bg-surface p-1">
              {(['all', 'recents', 'mine', 'unsorted'] as ViewTab[]).map((item) => (
                <button
                  key={item}
                  onClick={() => setTab(item)}
                  className={'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ' + (tab === item ? 'bg-ink text-paper' : 'text-grey-3 hover:text-ink')}
                >
                  {tabLabel(item)}
                </button>
              ))}
            </div>

            <div className="ml-auto flex w-[min(420px,38vw)] items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 focus-within:border-ink">
              <Icon icon="lucide:search" width={17} className="text-grey-3" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search files, docs, comments..."
                className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-grey-3"
              />
              <kbd className="rounded-lg border border-line px-2 py-1 font-mono text-[11px] text-grey-3">/</kbd>
            </div>

            <button
              onClick={() => { setSettingsTab('members'); setSettingsOpen(true) }}
              className="inline-flex items-center gap-2 rounded-xl bg-ink px-3.5 py-2 text-sm font-semibold text-paper"
            >
              <Icon icon="lucide:send" width={16} /> Invite
            </button>
            <ToneToggle />
            <button
              onClick={() => { setSettingsTab('profile'); setSettingsOpen(true) }}
              className="group relative grid h-9 w-9 place-items-center rounded-full border border-line bg-surface transition-transform hover:scale-105"
              aria-label="Open profile settings"
              title={displayName}
            >
              <Avatar name={displayName} photoUrl={photoUrl} size="sm" />
              <span className="pointer-events-none absolute left-1/2 top-11 z-50 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs font-semibold text-paper shadow-lg group-hover:block">
                {displayName}
              </span>
            </button>
          </div>
        </header>

        <section className="px-5 py-4">
          <div className="flex items-start justify-between gap-5">
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight">Architecture workspace</h1>
              <p className="mt-1 max-w-xl text-sm leading-6 text-grey-3">
                Files, docs, imports, and coding-tool setup for {workspace}.
              </p>
            </div>
            <div className="hidden items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2.5 2xl:flex">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-500/12 text-emerald-600">
                <Icon icon="lucide:check" width={16} />
              </span>
              <div>
                <div className="text-sm font-semibold">Workspace ready</div>
                <div className="text-xs text-grey-3">{profile?.preferredTone ?? 'light'} mode - {profile?.stylePreference ?? 'technical'} defaults</div>
              </div>
            </div>
          </div>

          <input ref={importRef} type="file" hidden multiple accept=".vsdx,.drawio,.pdf,.svg,.png,.jpg,.jpeg" onChange={(e) => handleImports(e.target.files)} />

          <div className="mt-4 grid gap-2 lg:grid-cols-4">
            <ActionCard icon="lucide:plus" title="Create blank file" body="Start with a clean canvas and doc." onClick={() => create('blank')} />
            <ActionCard icon="lucide:blocks" title="Browse catalog" body="Insert architecture, ERD, flow, and sequence starters." onClick={() => setPicking(true)} />
            <ActionCard icon="lucide:upload-cloud" title="Import diagrams" body={imported.length ? `${imported.length} file${imported.length > 1 ? 's' : ''} staged from onboarding/dashboard.` : 'Bring .drawio, .vsdx, PDF, SVG, or PNG references.'} onClick={() => importRef.current?.click()} />
            <ActionCard
              icon="lucide:terminal-square"
              title="Connect MCP"
              body="Copy your selected setup command."
              onClick={() => copy('MCP', mcpCommand)}
              meta={copied === 'MCP' ? 'Copied' : profile?.mcpClient || 'codex'}
            />
          </div>

          <div className="mt-4">
            <div className="overflow-hidden rounded-2xl border border-line bg-surface">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <div>
                  <h2 className="font-display text-lg font-semibold">Files</h2>
                  <p className="text-sm text-grey-3">{results.length ? `${results.length} item${results.length > 1 ? 's' : ''}` : 'Your list is empty'}</p>
                </div>
                <button onClick={() => setPicking(true)} className="rounded-full border border-line px-3 py-1.5 text-sm font-semibold hover:border-ink">
                  New from template
                </button>
              </div>

              {files.length === 0 ? (
                <EmptyState onCreate={() => create('system')} onCatalog={() => setPicking(true)} />
              ) : results.length === 0 ? (
                <div className="grid h-72 place-items-center text-center text-grey-3">No files match “{query}”.</div>
              ) : (
                <div className="divide-y divide-line">
                  {results.map(({ file, snippet }) => (
                    <FileRow
                      key={file.id}
                      file={file}
                      snippet={snippet}
                      folders={folders}
                      onOpen={openFile}
                      onDelete={removeFile}
                      onMove={moveFile}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {picking && <TemplatePicker onPick={onPick} onClose={() => setPicking(false)} />}
      {settingsOpen && (
        <SettingsModal
          context={dashboardContext}
          tab={settingsTab}
          setTab={setSettingsTab}
          inviteUrl={inviteUrl}
          copied={copied}
          copy={copy}
          updateAuthProfile={updateAuthProfile}
          updateWorkspaceProfile={updateWorkspaceProfile}
          setWorkspaceName={setWorkspaceName}
          resetWorkspace={resetWorkspace}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  )
}

function BrandMark() {
  return (
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-ink text-paper">
      <Logo size={16} />
    </span>
  )
}

function TeamMenu({
  workspace,
  displayName,
  displayEmail,
  photoUrl,
  onSettings,
  onCreateTeam,
  onClose,
  onLogout,
}: {
  workspace: string
  displayName: string
  displayEmail: string
  photoUrl: string | null
  onSettings: () => void
  onCreateTeam: () => void
  onClose: () => void
  onLogout: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div ref={ref} className="absolute left-0 top-[calc(100%+10px)] z-50 w-[294px] overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_28px_70px_-28px_rgba(0,0,0,.6)]">
      <div className="p-3">
        <button className="flex w-full items-center rounded-xl bg-[rgb(39,106,221)] px-3 py-2.5 text-left text-sm font-semibold text-white">
          <span className="min-w-0 flex-1 truncate">{workspace}</span>
        </button>
      </div>
      <div className="space-y-1 border-t border-line p-3">
        <TeamMenuItem icon="lucide:users-round" label="Join or Create Team" onClick={onCreateTeam} />
        <TeamMenuItem icon="lucide:settings" label="Settings" hint="⇧ ⌥ S" onClick={onSettings} />
        <TeamMenuItem icon="lucide:log-out" label="Logout" onClick={onLogout} />
      </div>
      <div className="flex items-center gap-3 border-t border-line p-4">
        <Avatar name={displayName} photoUrl={photoUrl} />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-ink">{displayName}</div>
          <div className="truncate text-xs text-grey-3">{displayEmail}</div>
        </div>
      </div>
    </div>
  )
}

function TeamMenuItem({ icon, label, hint, onClick }: { icon: string; label: string; hint?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-grey-4 hover:bg-grey-1 hover:text-ink">
      <Icon icon={icon} width={16} />
      <span className="flex-1">{label}</span>
      {hint && <span className="font-mono text-[11px] text-grey-3">{hint}</span>}
    </button>
  )
}

function Avatar({ name, photoUrl, size = 'md' }: { name: string; photoUrl: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'sm' ? 'h-8 w-8 text-xs' : size === 'lg' ? 'h-12 w-12 text-base' : 'h-10 w-10 text-sm'
  const initial = (name[0] || 'N').toUpperCase()
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-ink font-semibold text-paper ${cls}`}>
      {photoUrl ? <img src={photoUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : initial}
    </span>
  )
}

function SettingsModal({
  context,
  tab,
  setTab,
  inviteUrl,
  copied,
  copy,
  updateAuthProfile,
  updateWorkspaceProfile,
  setWorkspaceName,
  resetWorkspace,
  onClose,
}: {
  context: DashboardContext
  tab: SettingsTab
  setTab: (tab: SettingsTab) => void
  inviteUrl: string
  copied: string | null
  copy: (label: string, value: string) => Promise<void>
  updateAuthProfile: (profile: { name?: string; photoUrl?: string | null }) => Promise<{ error?: string; message?: string }>
  updateWorkspaceProfile: (profile: Partial<Profile>) => void
  setWorkspaceName: (name: string) => void
  resetWorkspace: (ownerUid: string) => void
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[80] bg-black/45 p-5 backdrop-blur-sm">
      <div className="mx-auto flex h-[min(880px,calc(100vh-56px))] max-w-[1500px] flex-col overflow-hidden rounded-2xl border border-line bg-surface text-ink shadow-[0_34px_120px_-42px_rgba(0,0,0,.75)]">
        <div className="flex items-center gap-5 border-b border-line px-8 py-5">
          <h2 className="font-display text-2xl font-semibold">Settings</h2>
          <div className="mx-auto hidden w-full max-w-3xl rounded-xl border border-line bg-paper px-4 py-3 text-sm text-grey-4 lg:block">
            Your team has {Math.max(1, context.profile?.invitedEmails?.length ? context.profile.invitedEmails.length + 1 : 1)} member on the {context.profile?.plan ?? 'free'} plan. <button onClick={() => setTab('billing')} className="font-semibold underline decoration-grey-3 underline-offset-4">Manage plan</button>
          </div>
          <button onClick={onClose} className="rounded-xl bg-grey-1 px-4 py-2 text-sm font-semibold text-grey-4 hover:text-ink">
            Close <span className="ml-1 text-xs text-grey-3">Esc</span>
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[230px_1fr]">
          <aside className="overflow-y-auto border-r border-line px-7 py-7">
            <SettingsGroup title="Team">
              <SettingsNav active={tab === 'members'} icon="lucide:users-round" label="Team Members" onClick={() => setTab('members')} />
              <SettingsNav active={tab === 'billing'} icon="lucide:receipt" label="Plans & Billing" onClick={() => setTab('billing')} />
              <SettingsNav active={tab === 'git'} icon="lucide:git-branch" label="Git Connect" onClick={() => setTab('git')} />
              <SettingsNav active={tab === 'icons'} icon="lucide:star" label="Custom icons" badge="UPGRADE" onClick={() => setTab('icons')} />
              <SettingsNav active={tab === 'tokens'} icon="lucide:key-round" label="API Tokens" badge="UPGRADE" onClick={() => setTab('tokens')} />
              <SettingsNav active={tab === 'team'} icon="lucide:settings" label="Team Settings" onClick={() => setTab('team')} />
            </SettingsGroup>
            <SettingsGroup title="Personal">
              <SettingsNav active={tab === 'profile'} icon="lucide:user-circle" label="Profile" onClick={() => setTab('profile')} />
              <SettingsNav active={tab === 'appearance'} icon="lucide:eye" label="Appearance" onClick={() => setTab('appearance')} />
              <SettingsNav active={tab === 'mcp'} icon="lucide:terminal-square" label="MCP" onClick={() => setTab('mcp')} />
            </SettingsGroup>
          </aside>

          <main className="overflow-y-auto px-8 py-7">
            {tab === 'members' && <MembersSettings context={context} inviteUrl={inviteUrl} copied={copied} copy={copy} />}
            {tab === 'team' && <TeamSettings context={context} setWorkspaceName={setWorkspaceName} resetWorkspace={resetWorkspace} />}
            {tab === 'appearance' && <AppearanceSettings />}
            {tab === 'mcp' && <McpSettings context={context} copied={copied} copy={copy} />}
            {tab === 'profile' && <ProfileSettings context={context} updateAuthProfile={updateAuthProfile} updateWorkspaceProfile={updateWorkspaceProfile} />}
            {tab === 'billing' && <BillingSettings context={context} />}
            {tab === 'git' && <GitSettings context={context} />}
            {tab === 'icons' && <CustomIconsSettings context={context} />}
            {tab === 'tokens' && <ApiTokensSettings context={context} copied={copied} copy={copy} />}
          </main>
        </div>
      </div>
    </div>
  )
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-grey-3">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function SettingsNav({ active, icon, label, badge, onClick }: { active: boolean; icon: string; label: string; badge?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ' + (active ? 'bg-[rgb(39,106,221)] text-white' : 'text-grey-4 hover:bg-grey-1 hover:text-ink')}>
      <Icon icon={icon} width={16} />
      <span className="flex-1 text-left">{label}</span>
      {badge && <span className={'rounded-md px-1.5 py-0.5 text-[10px] font-black ' + (active ? 'bg-white/20 text-white' : 'bg-grey-2 text-grey-4')}>{badge}</span>}
    </button>
  )
}

function MembersSettings({ context, inviteUrl, copied, copy }: { context: DashboardContext; inviteUrl: string; copied: string | null; copy: (label: string, value: string) => Promise<void> }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const updateProfile = useApp((s) => s.updateProfile)
  const invites = context.profile?.invitedEmails ?? []
  const inviteLinkEnabled = context.profile?.inviteLinkEnabled ?? true
  const invite = () => {
    const nextEmail = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      setStatus('Enter a valid email address.')
      return
    }
    if (invites.some((item) => item.toLowerCase() === nextEmail)) {
      setStatus('That teammate is already invited.')
      return
    }
    updateProfile({ invitedEmails: [...invites, nextEmail] })
    setEmail('')
    setStatus('Invite saved. Email delivery can be connected from the queued invite backend.')
  }
  const remove = (mail: string) => updateProfile({ invitedEmails: invites.filter((item) => item !== mail) })
  return (
    <div className="grid max-w-5xl gap-7 xl:grid-cols-[1fr_430px]">
      <section>
        <p className="max-w-4xl text-base leading-relaxed text-grey-4">
          nexusblock is made for collaborative architecture work. Teammates see the same workspace, while guests can be invited to specific files.
        </p>
        <div className="mt-7 flex max-w-xl overflow-hidden rounded-xl border border-line bg-paper focus-within:border-sky-500">
          <input
            value={email}
            onChange={(e) => { setEmail(e.target.value); setStatus(null) }}
            onKeyDown={(e) => { if (e.key === 'Enter') invite() }}
            placeholder="Invite via email address"
            className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-grey-3"
          />
          <button onClick={invite} disabled={!email.trim()} className="m-1 rounded-lg bg-ink px-5 text-sm font-semibold text-paper disabled:cursor-not-allowed disabled:bg-grey-2 disabled:text-grey-3">Invite</button>
        </div>
        {status && <div className="mt-2 text-sm font-semibold text-grey-3">{status}</div>}
        <div className="mt-6 flex items-center justify-between rounded-2xl border border-line bg-paper p-4">
          <div className="flex items-center gap-3">
            <Avatar name={context.displayName} photoUrl={context.photoUrl} />
            <div>
              <div className="text-sm font-semibold">{context.displayName} <span className="text-grey-3">(You)</span></div>
              <div className="text-xs text-grey-3">{context.displayEmail}</div>
            </div>
          </div>
          <span className="text-sm text-grey-3">Admin</span>
        </div>
        {invites.map((mail) => (
          <div key={mail} className="mt-3 flex items-center justify-between rounded-2xl border border-line bg-paper p-4">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={mail} photoUrl={null} />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{mail}</div>
                <div className="text-xs text-grey-3">Pending invite</div>
              </div>
            </div>
            <button onClick={() => remove(mail)} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-grey-4 hover:border-ink hover:text-ink">Remove</button>
          </div>
        ))}
      </section>
      <section className="rounded-2xl border border-line bg-paper p-7">
        <h3 className="font-display text-lg font-semibold">Settings</h3>
        <div className="mt-7 flex items-center justify-between">
          <span className="text-sm font-semibold">Invite Link</span>
          <button
            onClick={() => updateProfile({ inviteLinkEnabled: !inviteLinkEnabled })}
            className={'relative h-6 w-11 rounded-full transition-colors ' + (inviteLinkEnabled ? 'bg-[rgb(39,106,221)]' : 'bg-grey-2')}
            aria-label="Toggle invite link"
          >
            <span className={'absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ' + (inviteLinkEnabled ? 'translate-x-6' : 'translate-x-1')} />
          </button>
        </div>
        <div className="mt-6 flex items-center gap-3 text-sm text-grey-3">
          <span className="min-w-0 flex-1 truncate">{inviteLinkEnabled ? inviteUrl : 'Invite link disabled'}</span>
          <button disabled={!inviteLinkEnabled} onClick={() => copy('Invite link', inviteUrl)} className="shrink-0 font-semibold text-sky-500 hover:underline disabled:cursor-not-allowed disabled:text-grey-3">{copied === 'Invite link' ? 'Copied' : 'Copy link'}</button>
        </div>
      </section>
    </div>
  )
}

function TeamSettings({ context, setWorkspaceName, resetWorkspace }: { context: DashboardContext; setWorkspaceName: (name: string) => void; resetWorkspace: (ownerUid: string) => void }) {
  const updateProfile = useApp((s) => s.updateProfile)
  const uid = useAuth((s) => s.uid)
  const [workspaceNameDraft, setWorkspaceNameDraft] = useState(context.workspace)
  const [domainsDraft, setDomainsDraft] = useState((context.profile?.allowedInviteDomains ?? []).join(', '))
  const [confirmDelete, setConfirmDelete] = useState('')
  const saveWorkspace = () => setWorkspaceName(workspaceNameDraft)
  const saveDomains = () =>
    updateProfile({
      allowedInviteDomains: domainsDraft
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    })
  const deleteTeam = () => {
    if (confirmDelete !== context.workspace) return
    resetWorkspace(uid ?? crypto.randomUUID())
  }
  return (
    <div className="grid max-w-5xl gap-8 xl:grid-cols-[1fr_330px]">
      <section className="space-y-7">
        <EditableField label="Team Name" value={workspaceNameDraft} onChange={setWorkspaceNameDraft} onSave={saveWorkspace} hint="Renames the workspace across dashboard and cloud sync." />
        <SelectField
          label="Default File Link Access"
          value={context.profile?.defaultLinkAccess ?? 'restricted'}
          onChange={(value) => updateProfile({ defaultLinkAccess: value as Profile['defaultLinkAccess'] })}
          options={[
            ['restricted', 'Restricted'],
            ['view', 'Anyone with link can view'],
            ['edit', 'Anyone with link can edit'],
          ]}
          hint="Used as the default when new files open the share dialog."
        />
        <EditableField label="Allowed Invite Domains" value={domainsDraft} onChange={setDomainsDraft} onSave={saveDomains} hint="Comma-separated domains. Leave empty to allow every domain." />
        <SelectField
          label="Diagram Format"
          value={context.profile?.stylePreference ?? 'technical'}
          onChange={(value) => updateProfile({ stylePreference: value as Profile['stylePreference'] })}
          options={[
            ['technical', 'Technical'],
            ['product', 'Product system'],
            ['minimal', 'Minimal'],
          ]}
          hint="Default style for new architecture and flowchart diagrams."
        />
        <div className="max-w-md rounded-2xl border border-rose-500/50 bg-rose-500/5 p-6 text-rose-500">
          <h3 className="font-display text-lg font-semibold">Danger Zone</h3>
          <p className="mt-5 text-sm leading-relaxed">Type the workspace name to reset local team data. Cloud content is left untouched.</p>
          <input value={confirmDelete} onChange={(e) => setConfirmDelete(e.target.value)} placeholder={context.workspace} className="mt-4 w-full rounded-lg border border-rose-500/30 bg-paper px-3 py-2 text-sm text-ink outline-none" />
          <button onClick={deleteTeam} disabled={confirmDelete !== context.workspace} className="mt-4 rounded-lg border border-rose-500/40 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40">Delete Team</button>
        </div>
      </section>
      <section className="space-y-8">
        <UploadBox title="Upload icon" button="Upload Icon" hint="Used across the app. Square images work best. 512x512px." value={context.profile?.teamIconUrl ?? null} onUpload={(dataUrl) => updateProfile({ teamIconUrl: dataUrl })} />
        <UploadBox title="Team Logo" button="Upload Logo" hint="Watermark on PNG/PDF exports. Rectangular images work best." value={context.profile?.teamLogoUrl ?? null} onUpload={(dataUrl) => updateProfile({ teamLogoUrl: dataUrl })} />
      </section>
    </div>
  )
}

function AppearanceSettings() {
  return (
    <div className="max-w-3xl">
      <h3 className="font-display text-2xl font-semibold">Appearance</h3>
      <p className="mt-2 text-grey-3">Choose the two-mode visual system used across dashboard, editor, docs, and sharing screens.</p>
      <div className="mt-8 rounded-2xl border border-line bg-paper p-6">
        <ToneSwatches size={44} />
      </div>
    </div>
  )
}

function McpSettings({ context, copied, copy }: { context: DashboardContext; copied: string | null; copy: (label: string, value: string) => Promise<void> }) {
  const updateProfile = useApp((s) => s.updateProfile)
  const selected = context.profile?.mcpClient ?? 'codex'
  return (
    <div className="max-w-4xl">
      <h3 className="font-display text-2xl font-semibold">MCP</h3>
      <p className="mt-2 text-grey-3">Connect your agentic coding client to inspect diagrams, docs, code blocks, and architecture history.</p>
      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Object.keys(MCP_COMMANDS).map((client) => (
          <button
            key={client}
            onClick={() => updateProfile({ mcpClient: client })}
            className={'rounded-2xl border p-3 text-left text-sm font-semibold transition-colors ' + (selected === client ? 'border-ink bg-paper' : 'border-line bg-surface hover:border-ink')}
          >
            <Icon icon={clientIcon(client)} width={18} />
            <span className="mt-2 block truncate">{clientLabel(client)}</span>
          </button>
        ))}
      </div>
      <div className="mt-7 rounded-2xl border border-line bg-paper p-5">
        <div className="mb-3 text-sm font-semibold">Run in your terminal</div>
        <div className="flex items-center gap-3 rounded-xl bg-ink p-4 font-mono text-sm text-paper">
          <span className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap">{context.mcpCommand}</span>
          <button onClick={() => copy('MCP', context.mcpCommand)} className="rounded-lg bg-paper/12 px-3 py-1.5 font-sans text-xs font-semibold">{copied === 'MCP' ? 'Copied' : 'Copy'}</button>
        </div>
      </div>
    </div>
  )
}

function ProfileSettings({
  context,
  updateAuthProfile,
  updateWorkspaceProfile,
}: {
  context: DashboardContext
  updateAuthProfile: (profile: { name?: string; photoUrl?: string | null }) => Promise<{ error?: string; message?: string }>
  updateWorkspaceProfile: (profile: Partial<Profile>) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(context.displayName)
  const [photo, setPhoto] = useState(context.photoUrl)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  const choosePhoto = (file: File | undefined) => {
    if (!file) return
    if (!SAFE_IMAGE_TYPES.has(file.type) || file.size > MAX_IMAGE_UPLOAD_BYTES) {
      setStatus({ type: 'error', text: 'Choose a PNG, JPG, WebP, or safe SVG under 900 KB.' })
      return
    }
    void readSafeImageDataUrl(file).then((result) => {
      if (result) {
        setPhoto(result)
        setStatus(null)
      } else {
        setStatus({ type: 'error', text: 'That image could not be used safely.' })
      }
    })
  }

  const save = async () => {
    const nextName = name.trim()
    if (!nextName) {
      setStatus({ type: 'error', text: 'Name cannot be empty.' })
      return
    }
    setSaving(true)
    setStatus(null)
    const result = await updateAuthProfile({ name: nextName, photoUrl: photo })
    setSaving(false)
    if (result.error) {
      setStatus({ type: 'error', text: result.error })
      return
    }
    updateWorkspaceProfile({ name: nextName })
    setStatus({ type: 'ok', text: 'Profile updated.' })
  }

  return (
    <div className="max-w-4xl">
      <h3 className="font-display text-2xl font-semibold">Profile</h3>
      <p className="mt-2 text-grey-3">Update the identity shown in dashboard menus, share dialogs, comments, and live collaboration presence.</p>

      <div className="mt-7 rounded-2xl border border-line bg-paper p-6">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar name={name} photoUrl={photo} size="lg" />
          <div className="min-w-[240px] flex-1">
            <div className="text-sm font-semibold">Profile picture</div>
            <div className="mt-1 text-sm text-grey-3">Use your Gmail photo or upload a custom image.</div>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            hidden
            onChange={(e) => choosePhoto(e.target.files?.[0])}
          />
          <button onClick={() => inputRef.current?.click()} className="rounded-xl border border-line px-4 py-2 text-sm font-semibold hover:border-ink">
            Upload picture
          </button>
          {photo && (
            <button onClick={() => setPhoto(null)} className="rounded-xl border border-line px-4 py-2 text-sm font-semibold text-grey-4 hover:border-ink hover:text-ink">
              Remove
            </button>
          )}
        </div>

        <div className="mt-7 grid gap-5 md:grid-cols-2">
          <label className="block">
            <div className="mb-2 text-sm font-semibold">Display name</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink outline-none focus:border-sky-500"
              placeholder="Your name"
            />
          </label>
          <label className="block">
            <div className="mb-2 text-sm font-semibold">Email</div>
            <input
              value={context.displayEmail}
              readOnly
              className="w-full cursor-not-allowed rounded-xl border border-line bg-grey-1 px-4 py-3 text-sm text-grey-3 outline-none"
            />
          </label>
        </div>

        <div className="mt-7 flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-paper disabled:cursor-wait disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save profile'}
          </button>
          {status && (
            <span className={'text-sm font-semibold ' + (status.type === 'ok' ? 'text-emerald-600' : 'text-rose-500')}>
              {status.text}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function BillingSettings({ context }: { context: DashboardContext }) {
  const updateProfile = useApp((s) => s.updateProfile)
  const plan = context.profile?.plan ?? 'free'
  return (
    <div className="max-w-4xl">
      <h3 className="font-display text-2xl font-semibold">Plans & Billing</h3>
      <p className="mt-2 text-grey-3">Plan state is applied immediately to workspace limits. Payment checkout can attach here later.</p>
      <div className="mt-7 grid gap-4 md:grid-cols-2">
        <PlanCard active={plan === 'free'} title="Free" body="3 files, local-first editing, dashboard basics." action="Use Free" onClick={() => updateProfile({ plan: 'free' })} />
        <PlanCard active={plan === 'pro'} title="Pro" body="Unlimited files, private workflows, custom icons, Git and token workflows." action={plan === 'pro' ? 'Active' : 'Upgrade'} onClick={() => updateProfile({ plan: 'pro' })} />
      </div>
    </div>
  )
}

function PlanCard({ active, title, body, action, onClick }: { active: boolean; title: string; body: string; action: string; onClick: () => void }) {
  return (
    <div className={'rounded-2xl border p-5 ' + (active ? 'border-ink bg-paper' : 'border-line bg-surface')}>
      <div className="flex items-center justify-between">
        <h4 className="font-display text-xl font-semibold">{title}</h4>
        {active && <Icon icon="lucide:check-circle-2" width={18} />}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-grey-3">{body}</p>
      <button onClick={onClick} className="mt-5 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-paper">{action}</button>
    </div>
  )
}

function GitSettings({ context }: { context: DashboardContext }) {
  const updateProfile = useApp((s) => s.updateProfile)
  const [repo, setRepo] = useState(context.profile?.gitRepoUrl ?? '')
  const [status, setStatus] = useState<string | null>(null)
  const save = () => {
    const next = repo.trim()
    if (next && !/^https:\/\/(github\.com|gitlab\.com|bitbucket\.org)\/.+\/.+/i.test(next)) {
      setStatus('Use a GitHub, GitLab, or Bitbucket repository URL.')
      return
    }
    updateProfile({ gitRepoUrl: next })
    setStatus(next ? 'Repository connected.' : 'Repository disconnected.')
  }
  return (
    <div className="max-w-3xl">
      <h3 className="font-display text-2xl font-semibold">Git Connect</h3>
      <p className="mt-2 text-grey-3">Save the source repository for this workspace so files can reference implementation context.</p>
      <div className="mt-7 rounded-2xl border border-line bg-paper p-5">
        <label className="text-sm font-semibold">Repository URL</label>
        <div className="mt-3 flex gap-3">
          <input value={repo} onChange={(e) => { setRepo(e.target.value); setStatus(null) }} placeholder="https://github.com/org/repo" className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-4 py-3 text-sm outline-none focus:border-sky-500" />
          <button onClick={save} className="rounded-xl bg-ink px-5 py-2 text-sm font-semibold text-paper">Save</button>
        </div>
        {status && <p className="mt-3 text-sm font-semibold text-grey-3">{status}</p>}
      </div>
    </div>
  )
}

function CustomIconsSettings({ context }: { context: DashboardContext }) {
  const updateProfile = useApp((s) => s.updateProfile)
  const inputRef = useRef<HTMLInputElement>(null)
  const icons = context.profile?.customIcons ?? []
  const onPick = (file: File | undefined) => {
    if (!file) return
    void readSafeImageDataUrl(file).then((dataUrl) => {
      if (!dataUrl) return
      updateProfile({ customIcons: [{ id: crypto.randomUUID(), name: file.name, dataUrl, createdAt: Date.now() }, ...icons].slice(0, 24) })
    })
  }
  const remove = (id: string) => updateProfile({ customIcons: icons.filter((item) => item.id !== id) })
  return (
    <div className="max-w-4xl">
      <h3 className="font-display text-2xl font-semibold">Custom Icons</h3>
      <p className="mt-2 text-grey-3">Upload team-specific logos and icons. They persist with the workspace profile and can be surfaced in icon pickers.</p>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={(e) => onPick(e.target.files?.[0])} />
      <button onClick={() => inputRef.current?.click()} className="mt-6 rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-paper">Upload icon</button>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {icons.map((item) => (
          <div key={item.id} className="rounded-2xl border border-line bg-paper p-3">
            <div className="grid h-20 place-items-center rounded-xl bg-surface">
              <img src={item.dataUrl} alt="" className="max-h-14 max-w-20 object-contain" />
            </div>
            <div className="mt-3 truncate text-sm font-semibold">{item.name}</div>
            <button onClick={() => remove(item.id)} className="mt-2 text-xs font-semibold text-grey-3 hover:text-ink">Remove</button>
          </div>
        ))}
        {!icons.length && <div className="rounded-2xl border border-dashed border-line p-5 text-sm text-grey-3">No custom icons yet.</div>}
      </div>
    </div>
  )
}

function ApiTokensSettings({ context, copied, copy }: { context: DashboardContext; copied: string | null; copy: (label: string, value: string) => Promise<void> }) {
  const updateProfile = useApp((s) => s.updateProfile)
  const [name, setName] = useState('Automation token')
  const [freshToken, setFreshToken] = useState<{ id: string; secret: string } | null>(null)
  const tokens = context.profile?.apiTokens ?? []
  const create = async () => {
    const secret = `nb_${crypto.randomUUID().replaceAll('-', '')}${crypto.randomUUID().replaceAll('-', '')}`
    const id = crypto.randomUUID()
    updateProfile({
      apiTokens: [{
        id,
        name: name.trim() || 'API token',
        prefix: `${secret.slice(0, 7)}...${secret.slice(-4)}`,
        tokenHash: await sha256(secret),
        createdAt: Date.now(),
      }, ...tokens],
    })
    setFreshToken({ id, secret })
  }
  const revoke = (id: string) => updateProfile({ apiTokens: tokens.filter((item) => item.id !== id) })
  return (
    <div className="max-w-4xl">
      <h3 className="font-display text-2xl font-semibold">API Tokens</h3>
      <p className="mt-2 text-grey-3">Create scoped workspace tokens for automations. Secrets are shown once; only a hash is saved.</p>
      {freshToken && (
        <div className="mt-5 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm">
          <div className="font-semibold text-ink">Copy this token now. You will not be able to see it again.</div>
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-line bg-paper px-3 py-2">
            <code className="min-w-0 flex-1 truncate text-xs text-grey-4">{freshToken.secret}</code>
            <button onClick={() => copy('New API token', freshToken.secret)} className="rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-paper">
              {copied === 'New API token' ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}
      <div className="mt-7 flex max-w-xl gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-4 py-3 text-sm outline-none focus:border-sky-500" />
        <button onClick={create} className="rounded-xl bg-ink px-5 py-2 text-sm font-semibold text-paper">Create</button>
      </div>
      <div className="mt-6 space-y-3">
        {tokens.map((item) => (
          <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-line bg-paper p-4">
            <Icon icon="lucide:key-round" width={18} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{item.name}</div>
              <div className="truncate font-mono text-xs text-grey-3">{item.prefix}</div>
            </div>
            <button onClick={() => revoke(item.id)} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-rose-500">Revoke</button>
          </div>
        ))}
        {!tokens.length && <div className="rounded-2xl border border-dashed border-line p-5 text-sm text-grey-3">No API tokens yet.</div>}
      </div>
    </div>
  )
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function EditableField({ label, value, hint, onChange, onSave }: { label: string; value: string; hint: string; onChange: (value: string) => void; onSave: () => void }) {
  return (
    <label className="block max-w-md">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">{label}</div>
      <div className="flex gap-2">
        <input value={value} onChange={(e) => onChange(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-4 py-3 text-sm text-ink outline-none focus:border-sky-500" />
        <button type="button" onClick={onSave} className="rounded-lg bg-ink px-4 text-sm font-semibold text-paper">Save</button>
      </div>
      <p className="mt-2 text-sm italic text-grey-3">{hint}</p>
    </label>
  )
}

function SelectField({ label, value, options, hint, onChange }: { label: string; value: string; options: [string, string][]; hint: string; onChange: (value: string) => void }) {
  return (
    <label className="block max-w-md">
      <div className="mb-2 text-sm font-semibold">{label}</div>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-line bg-paper px-4 py-3 text-sm text-ink outline-none focus:border-sky-500">
        {options.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select>
      <p className="mt-2 text-sm italic text-grey-3">{hint}</p>
    </label>
  )
}

function UploadBox({ title, button, hint, value, onUpload }: { title: string; button: string; hint: string; value: string | null; onUpload: (dataUrl: string | null) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const pick = (file: File | undefined) => {
    if (!file) return
    void readSafeImageDataUrl(file).then(onUpload)
  }
  return (
    <div>
      <div className="mb-3 text-sm font-semibold">{title}</div>
      <div className="grid h-24 w-28 place-items-center rounded-xl border border-line bg-paper text-center text-sm text-grey-3">
        {value ? <img src={value} alt="" className="max-h-16 max-w-20 object-contain" /> : <>Upload<br />icon</>}
      </div>
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={(e) => pick(e.target.files?.[0])} />
      <div className="mt-3 flex gap-2">
        <button onClick={() => ref.current?.click()} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold hover:border-ink">{button}</button>
        {value && <button onClick={() => onUpload(null)} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-grey-4 hover:border-ink hover:text-ink">Remove</button>}
      </div>
      <p className="mt-3 text-sm italic leading-relaxed text-grey-3">{hint}</p>
    </div>
  )
}

function SideItem({ icon, label, hint, active, onClick }: { icon: string; label: string; hint: string; active?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={'flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-colors ' + (active ? 'bg-ink text-paper' : 'text-grey-4 hover:bg-grey-1 hover:text-ink')}>
      <Icon icon={icon} width={17} />
      <span className="flex-1 text-left">{label}</span>
      <span className={active ? 'text-paper/50' : 'text-grey-3'}>{hint}</span>
    </button>
  )
}

function FolderRow({ folder, active, count, onOpen, onRename, onDelete }: { folder: Folder; active: boolean; count: number; onOpen: () => void; onRename: (id: string, name: string) => void; onDelete: (id: string) => void }) {
  const [editing, setEditing] = useState(false)
  if (editing) {
    return (
      <input
        autoFocus
        defaultValue={folder.name}
        onBlur={(e) => { onRename(folder.id, e.target.value); setEditing(false) }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { onRename(folder.id, e.currentTarget.value); setEditing(false) }
          if (e.key === 'Escape') setEditing(false)
        }}
        className="w-full rounded-2xl border border-ink bg-paper px-4 py-2.5 text-sm text-ink outline-none"
      />
    )
  }
  return (
    <div className="group flex items-center gap-1">
      <button onClick={onOpen} onDoubleClick={() => setEditing(true)} className={'flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors ' + (active ? 'bg-ink text-paper' : 'text-grey-4 hover:bg-grey-1 hover:text-ink')}>
        <Icon icon="lucide:folder" width={16} />
        <span className="min-w-0 flex-1 truncate text-left">{folder.name}</span>
        <span className={active ? 'text-paper/60' : 'text-grey-3'}>{count}</span>
      </button>
      <button onClick={() => onDelete(folder.id)} className="hidden h-8 w-8 place-items-center rounded-xl text-grey-3 hover:bg-grey-1 hover:text-ink group-hover:grid">
        <Icon icon="lucide:x" width={14} />
      </button>
    </div>
  )
}

function FeatureLink({ icon, label, badge, onClick }: { icon: string; label: string; badge?: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-1.5 text-sm font-semibold text-grey-4 hover:bg-grey-1 hover:text-ink">
      <Icon icon={icon} width={16} />
      <span className="flex-1 text-left">{label}</span>
      {badge && <span className="rounded-full bg-grey-1 px-2 py-0.5 text-[10px] font-bold text-grey-4">{badge}</span>}
    </button>
  )
}

function ActionCard({ icon, title, body, meta, onClick }: { icon: string; title: string; body: string; meta?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group flex min-h-[78px] items-start gap-3 rounded-xl border border-line bg-surface p-3 text-left transition-colors hover:border-ink hover:bg-paper">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-grey-1 text-ink">
        <Icon icon={icon} width={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="block truncate text-sm font-semibold">{title}</span>
          {meta && <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold text-grey-4">{meta}</span>}
        </span>
        <span className="mt-1 block text-xs leading-4 text-grey-3">{body}</span>
      </span>
    </button>
  )
}

function FileRow({ file, snippet, folders, onOpen, onDelete, onMove }: { file: FileMeta; snippet: string | null; folders: Folder[]; onOpen: (id: string) => void; onDelete: (id: string) => void; onMove: (id: string, folderId: string | null) => void }) {
  const [menu, setMenu] = useState(false)
  const folderName = folders.find((f) => f.id === file.folderId)?.name ?? 'Unsorted'
  return (
    <div className="group grid grid-cols-[minmax(0,1fr)_120px_92px_72px] items-center gap-3 px-4 py-3 hover:bg-grey-1/50">
      <button onClick={() => onOpen(file.id)} className="flex min-w-0 items-center gap-3 text-left">
        <FileThumb id={file.id} template={file.template} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-ink">{file.title}</span>
          <span className="mt-1 block truncate text-xs text-grey-3">{snippet ?? getTemplate(file.template).name}</span>
        </span>
      </button>
      <div className="truncate text-xs text-grey-3">{folderName}</div>
      <div className="text-xs text-grey-3">{timeAgo(file.updatedAt)}</div>
      <div className="relative flex justify-end gap-1">
        <button onClick={() => setMenu((v) => !v)} className="grid h-8 w-8 place-items-center rounded-xl text-grey-3 hover:bg-surface hover:text-ink">
          <Icon icon="lucide:folder-input" width={15} />
        </button>
        <button onClick={() => onDelete(file.id)} className="grid h-8 w-8 place-items-center rounded-xl text-grey-3 hover:bg-surface hover:text-ink">
          <Icon icon="lucide:trash-2" width={15} />
        </button>
        {menu && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setMenu(false)} />
            <div className="absolute right-0 top-9 z-30 w-48 rounded-2xl border border-line bg-surface p-1 shadow-[0_20px_60px_-24px_rgba(0,0,0,.5)]">
              <MoveRow label="Unsorted" active={!file.folderId} onClick={() => { onMove(file.id, null); setMenu(false) }} />
              {folders.map((folder) => <MoveRow key={folder.id} label={folder.name} active={file.folderId === folder.id} onClick={() => { onMove(file.id, folder.id); setMenu(false) }} />)}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function MoveRow({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-grey-4 hover:bg-grey-1 hover:text-ink">
      <Icon icon="lucide:folder" width={14} />
      <span className="flex-1 truncate text-left">{label}</span>
      {active && <Icon icon="lucide:check" width={14} />}
    </button>
  )
}

function FileThumb({ id, template }: { id: string; template: TemplateId }) {
  const thumb = getThumb(id)
  return (
    <span className="grid h-11 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-[radial-gradient(circle,var(--color-canvas-dot)_1px,transparent_1px)] [background-size:10px_10px]">
      {thumb ? <img src={thumb} alt="" className="h-full w-full object-contain p-1.5" /> : <Icon icon={templateIcon(template)} width={22} className="text-grey-3" />}
    </span>
  )
}

function EmptyState({ onCreate, onCatalog }: { onCreate: () => void; onCatalog: () => void }) {
  return (
    <div className="grid min-h-[280px] place-items-center p-6 text-center">
      <div>
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-grey-1">
          <Icon icon="lucide:file-plus-2" width={22} />
        </div>
        <h3 className="mt-4 font-display text-xl font-semibold">Your workspace is ready.</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-grey-3">Start with a proven system diagram, or open a blank file and build docs plus canvas together.</p>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={onCreate} className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper">Create starter</button>
          <button onClick={onCatalog} className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold hover:border-ink">Browse catalog</button>
        </div>
      </div>
    </div>
  )
}

function tabLabel(tab: ViewTab) {
  switch (tab) {
    case 'all': return 'All'
    case 'recents': return 'Recents'
    case 'mine': return 'Created by me'
    case 'unsorted': return 'Unsorted'
  }
}

function templateIcon(template: TemplateId) {
  switch (template) {
    case 'system': return 'lucide:network'
    case 'micro': return 'lucide:boxes'
    case 'git-s3': return 'simple-icons:amazonaws'
    case 'notes': return 'lucide:file-text'
    default: return 'lucide:file'
  }
}

function clientLabel(client: string) {
  switch (client) {
    case 'claude-code': return 'Claude Code'
    case 'github-copilot': return 'Copilot'
    case 'vscode': return 'VS Code'
    default: return client[0]?.toUpperCase() + client.slice(1)
  }
}

function clientIcon(client: string) {
  switch (client) {
    case 'claude-code': return 'simple-icons:anthropic'
    case 'cursor': return 'simple-icons:cursor'
    case 'vscode': return 'simple-icons:visualstudiocode'
    case 'github-copilot': return 'simple-icons:github'
    default: return 'lucide:terminal-square'
  }
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
