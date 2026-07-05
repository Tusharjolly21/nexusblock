import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { useApp, type FileMeta, type Folder } from '../store/useApp'
import { useAuth } from '../store/useAuth'
import { cloudEnabled, deleteContent } from '../sync/cloud'
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
    const fileId = createFile(template, title, activeFolder === 'all' ? null : activeFolder)
    navigate(`/app/file/${fileId}`)
  }
  const removeFile = (id: string) => {
    deleteFile(id)
    const uid = useAuth.getState().uid
    if (uid && cloudEnabled()) deleteContent(uid, id).catch(() => {})
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
    setImported((existing) => [...existing, ...Array.from(list).map((f) => f.name)].slice(0, 8))
  }

  const folderCount = (id: string) => files.filter((f) => f.folderId === id).length
  const mcpCommand = MCP_COMMANDS[profile?.mcpClient ?? 'codex'] ?? MCP_COMMANDS.codex
  const displayName = profile?.name || authName || authEmail || 'Your account'
  const displayEmail = authEmail || 'Signed in locally'
  const inviteUrl = `https://app.nexusblock.io/invite/${workspace.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  const dashboardContext = { workspace, profile, files, folders, imported, mcpCommand, displayName, displayEmail, photoUrl }

  if (!folderExists) return <Navigate to="/dashboard/all" replace />

  return (
    <div className="grid h-full min-h-screen grid-cols-[264px_1fr] overflow-hidden bg-paper text-ink">
      <aside className="flex min-h-0 flex-col border-r border-line bg-surface/80 px-4 py-4 backdrop-blur-xl">
        <div className="relative">
          <button
            onClick={() => setTeamMenuOpen((v) => !v)}
            className="flex w-full items-center gap-2.5 rounded-2xl border border-line bg-paper px-3 py-2.5 text-left shadow-[0_16px_36px_-30px_rgba(0,0,0,.55)] transition-colors hover:border-ink"
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

        <nav className="mt-6 space-y-1">
          <SideItem active={activeFolder === 'all' && tab === 'all'} icon="lucide:layout-grid" label="All files" hint="A" onClick={() => { setTab('all'); openFolder('all') }} />
          <SideItem icon="lucide:clock-3" label="Recents" hint="R" active={tab === 'recents'} onClick={() => { setTab('recents'); openFolder('all') }} />
          <SideItem icon="lucide:user-round" label="Created by me" hint="M" active={tab === 'mine'} onClick={() => setTab('mine')} />
          <SideItem icon="lucide:inbox" label="Unsorted" hint="U" active={tab === 'unsorted'} onClick={() => setTab('unsorted')} />
        </nav>

        <div className="mt-6">
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

        <div className="mt-auto space-y-3 pt-5">
          <div className="rounded-2xl border border-line bg-paper p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Free workspace</div>
              <span className="rounded-full bg-grey-1 px-2 py-1 text-[11px] font-bold text-grey-4">{files.length}/3</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-grey-1">
              <div className="h-full rounded-full bg-ink" style={{ width: `${Math.min(100, (files.length / 3) * 100)}%` }} />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-grey-3">Private files, versions, and team history.</p>
            <button className="mt-3 w-full rounded-xl bg-ink px-3 py-2 text-sm font-semibold text-paper">Upgrade</button>
          </div>

          <div className="space-y-1">
            <FeatureLink icon="lucide:bot" label="Nexusbot" badge="BETA" />
            <FeatureLink icon="lucide:sparkles" label="AI presets" />
            <FeatureLink icon="lucide:palette" label="Custom styles" />
            <FeatureLink icon="simple-icons:github" label="GitHub sync" badge="BETA" />
            <FeatureLink icon="lucide:lock" label="Private files" badge="PRO" />
            <FeatureLink icon="lucide:archive" label="Archive" />
            <FeatureLink icon="lucide:terminal-square" label="MCP" />
          </div>

          <button onClick={() => create('blank')} className="flex w-full items-center justify-between rounded-2xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper">
            New file <Icon icon="lucide:chevron-down" width={16} />
          </button>
        </div>
      </aside>

      <main className="min-w-0 overflow-y-auto">
        <header className="sticky top-0 z-20 border-b border-line bg-paper/86 px-6 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex rounded-full border border-line bg-surface p-1">
              {(['all', 'recents', 'mine', 'unsorted'] as ViewTab[]).map((item) => (
                <button
                  key={item}
                  onClick={() => setTab(item)}
                  className={'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ' + (tab === item ? 'bg-ink text-paper' : 'text-grey-3 hover:text-ink')}
                >
                  {tabLabel(item)}
                </button>
              ))}
            </div>

            <div className="ml-auto flex w-[min(360px,34vw)] items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-2 focus-within:border-ink">
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
              onClick={() => copy('Invite link', inviteUrl)}
              className="inline-flex items-center gap-2 rounded-2xl bg-ink px-3.5 py-2 text-sm font-semibold text-paper"
            >
              <Icon icon="lucide:send" width={16} /> {copied === 'Invite link' ? 'Copied' : 'Invite'}
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

        <section className="px-6 py-5">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-grey-4">
                <Icon icon="lucide:activity" width={14} /> {greeting()}, {profile?.name || 'there'}
              </div>
              <h1 className="font-display text-3xl font-semibold tracking-tight">Build the architecture workspace.</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-grey-3">
                Create files, import diagrams, connect coding tools, and keep docs plus canvas history together in {workspace}.
              </p>
            </div>
            <div className="hidden items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-2.5 2xl:flex">
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

          <div className="mt-5 grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
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

          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
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

            <aside className="space-y-4">
              <Panel title="Recommended next" icon="lucide:wand-sparkles">
                <MiniAction icon="lucide:git-branch" title="Create version review file" body="Seed a diagram with visual diff examples." onClick={() => create('system', 'Version review workspace')} />
                <MiniAction icon="lucide:message-square" title="Try anchored comments" body="Open a file and comment on exact shapes." onClick={() => files[0] ? openFile(files[0].id) : create('system')} />
                <MiniAction icon="lucide:file-code-2" title="Diagram as code" body="Open DSL panel and generate native shapes." onClick={() => create('git-s3', 'Diagram as code starter')} />
              </Panel>

              <Panel title="Setup status" icon="lucide:clipboard-check">
                <Checklist done label={`Workspace: ${workspace}`} />
                <Checklist done={!!profile?.preferredTone} label={`Mode: ${profile?.preferredTone ?? 'light'}`} />
                <Checklist done={!!profile?.mcpClient} label={`MCP: ${profile?.mcpClient ?? 'not selected'}`} />
                <Checklist done={!!profile?.invitedEmails?.length} label={profile?.invitedEmails?.length ? `${profile.invitedEmails.length} teammate invite${profile.invitedEmails.length > 1 ? 's' : ''}` : 'No teammates invited'} />
                <Checklist done={!!imported.length} label={imported.length ? `${imported.length} diagram reference${imported.length > 1 ? 's' : ''}` : 'No references imported'} />
              </Panel>
            </aside>
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
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  )
}

function BrandMark() {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-ink text-paper">
      <Logo size={18} />
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
  onClose,
}: {
  context: DashboardContext
  tab: SettingsTab
  setTab: (tab: SettingsTab) => void
  inviteUrl: string
  copied: string | null
  copy: (label: string, value: string) => Promise<void>
  updateAuthProfile: (profile: { name?: string; photoUrl?: string | null }) => Promise<{ error?: string; message?: string }>
  updateWorkspaceProfile: (profile: { name?: string }) => void
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
            Your team has {Math.max(1, context.profile?.invitedEmails?.length ? context.profile.invitedEmails.length + 1 : 1)} member on the free plan. <button className="font-semibold underline decoration-grey-3 underline-offset-4">Manage plan</button>
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
            {tab === 'team' && <TeamSettings context={context} />}
            {tab === 'appearance' && <AppearanceSettings />}
            {tab === 'mcp' && <McpSettings context={context} copied={copied} copy={copy} />}
            {tab === 'profile' && <ProfileSettings context={context} updateAuthProfile={updateAuthProfile} updateWorkspaceProfile={updateWorkspaceProfile} />}
            {tab === 'billing' && <SimpleSettings icon="lucide:receipt" title="Plans & Billing" body="Track usage, team seats, private files, and export limits. Billing hooks are ready to connect to your payment backend." />}
            {tab === 'git' && <SimpleSettings icon="simple-icons:github" title="Git Connect" body="Connect repositories so diagrams, docs, ADRs, and architecture snapshots stay close to source changes." />}
            {tab === 'icons' && <SimpleSettings icon="lucide:star" title="Custom Icons" body="Upload private icon packs for your team. Keep this behind upgrade while still showing the premium surface." />}
            {tab === 'tokens' && <SimpleSettings icon="lucide:key-round" title="API Tokens" body="Issue scoped tokens for MCP, automations, imports, and CI exports. Tokens will appear here once backend issuance is enabled." />}
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
  return (
    <div className="grid max-w-5xl gap-7 xl:grid-cols-[1fr_430px]">
      <section>
        <p className="max-w-4xl text-base leading-relaxed text-grey-4">
          nexusblock is made for collaborative architecture work. Teammates see the same workspace, while guests can be invited to specific files.
        </p>
        <div className="mt-7 flex max-w-xl overflow-hidden rounded-xl border border-line bg-paper focus-within:border-sky-500">
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Invite via email address" className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-grey-3" />
          <button disabled={!email.trim()} className="m-1 rounded-lg bg-ink px-5 text-sm font-semibold text-paper disabled:cursor-not-allowed disabled:bg-grey-2 disabled:text-grey-3">Invite</button>
        </div>
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
      </section>
      <section className="rounded-2xl border border-line bg-paper p-7">
        <h3 className="font-display text-lg font-semibold">Settings</h3>
        <div className="mt-7 flex items-center justify-between">
          <span className="text-sm font-semibold">Invite Link</span>
          <span className="relative h-6 w-11 rounded-full bg-[rgb(39,106,221)]"><span className="absolute right-1 top-1 h-4 w-4 rounded-full bg-white" /></span>
        </div>
        <div className="mt-6 flex items-center gap-3 text-sm text-grey-3">
          <span className="min-w-0 flex-1 truncate">{inviteUrl}</span>
          <button onClick={() => copy('Invite link', inviteUrl)} className="shrink-0 font-semibold text-sky-500 hover:underline">{copied === 'Invite link' ? 'Copied' : 'Copy link'}</button>
        </div>
      </section>
    </div>
  )
}

function TeamSettings({ context }: { context: DashboardContext }) {
  return (
    <div className="grid max-w-5xl gap-8 xl:grid-cols-[1fr_330px]">
      <section className="space-y-7">
        <Field label="Team Name" value={context.workspace} hint="Can be changed at any time." />
        <Field label="Default File Link Access" value="Anyone with the link can edit" badge="UPGRADE" hint="Applied to all new team files." />
        <Field label="Allowed Invite Domains" value="e.g. company.com, partner.org" badge="UPGRADE" hint="Leave empty to allow all domains." />
        <Field label="Diagram Format" value={context.profile?.stylePreference === 'product' ? 'Product system' : context.profile?.stylePreference === 'minimal' ? 'Minimal' : 'Freeform'} hint="Default format for new architecture and flowchart diagrams." />
        <div className="max-w-md rounded-2xl border border-rose-500/50 bg-rose-500/5 p-6 text-rose-500">
          <h3 className="font-display text-lg font-semibold">Danger Zone</h3>
          <p className="mt-5 text-sm leading-relaxed">Proceed with caution. Once completed, these actions cannot be undone.</p>
          <button className="mt-6 rounded-lg border border-rose-500/40 px-4 py-2 text-sm font-semibold">Delete Team</button>
        </div>
      </section>
      <section className="space-y-8">
        <UploadBox title="Upload icon" button="Upload Icon" hint="Used across the app. Square images work best. 512x512px." />
        <UploadBox title="Team Logo" button="Upload Logo" hint="Watermark on PNG/PDF exports. Rectangular images work best." />
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
  return (
    <div className="max-w-4xl">
      <h3 className="font-display text-2xl font-semibold">MCP</h3>
      <p className="mt-2 text-grey-3">Connect your agentic coding client to inspect diagrams, docs, code blocks, and architecture history.</p>
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
  updateWorkspaceProfile: (profile: { name?: string }) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(context.displayName)
  const [photo, setPhoto] = useState(context.photoUrl)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  const choosePhoto = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setStatus({ type: 'error', text: 'Choose an image file for your profile picture.' })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null
      if (result) {
        setPhoto(result)
        setStatus(null)
      }
    }
    reader.readAsDataURL(file)
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

function SimpleSettings({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="max-w-3xl">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-grey-1"><Icon icon={icon} width={22} /></span>
      <h3 className="mt-5 font-display text-2xl font-semibold">{title}</h3>
      <p className="mt-2 leading-relaxed text-grey-3">{body}</p>
    </div>
  )
}

function Field({ label, value, hint, badge }: { label: string; value: string; hint: string; badge?: string }) {
  return (
    <label className="block max-w-md">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">{label} {badge && <span className="rounded-md bg-grey-2 px-1.5 py-0.5 text-[10px] font-black text-grey-4">{badge}</span>}</div>
      <div className="rounded-lg border border-line bg-paper px-4 py-3 text-sm text-grey-4">{value}</div>
      <p className="mt-2 text-sm italic text-grey-3">{hint}</p>
    </label>
  )
}

function UploadBox({ title, button, hint }: { title: string; button: string; hint: string }) {
  return (
    <div>
      <div className="mb-3 text-sm font-semibold">{title}</div>
      <div className="grid h-24 w-28 place-items-center rounded-xl border border-line bg-paper text-center text-sm text-grey-3">Upload<br />icon</div>
      <button className="mt-3 rounded-lg border border-line px-4 py-2 text-sm font-semibold hover:border-ink">{button}</button>
      <p className="mt-3 text-sm italic leading-relaxed text-grey-3">{hint}</p>
    </div>
  )
}

function SideItem({ icon, label, hint, active, onClick }: { icon: string; label: string; hint: string; active?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ' + (active ? 'bg-ink text-paper' : 'text-grey-4 hover:bg-grey-1 hover:text-ink')}>
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

function FeatureLink({ icon, label, badge }: { icon: string; label: string; badge?: string }) {
  return (
    <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-grey-4 hover:bg-grey-1 hover:text-ink">
      <Icon icon={icon} width={16} />
      <span className="flex-1 text-left">{label}</span>
      {badge && <span className="rounded-full bg-grey-1 px-2 py-0.5 text-[10px] font-bold text-grey-4">{badge}</span>}
    </button>
  )
}

function ActionCard({ icon, title, body, meta, onClick }: { icon: string; title: string; body: string; meta?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group rounded-3xl border border-line bg-surface p-5 text-left transition-colors hover:border-ink">
      <div className="flex items-start justify-between gap-4">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-grey-1 text-ink">
          <Icon icon={icon} width={22} />
        </span>
        {meta && <span className="rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-grey-4">{meta}</span>}
      </div>
      <div className="mt-8 font-display text-xl font-semibold">{title}</div>
      <p className="mt-1 text-sm leading-relaxed text-grey-3">{body}</p>
      <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-grey-4 group-hover:text-ink">
        Open <Icon icon="lucide:arrow-right" width={15} />
      </div>
    </button>
  )
}

function FileRow({ file, snippet, folders, onOpen, onDelete, onMove }: { file: FileMeta; snippet: string | null; folders: Folder[]; onOpen: (id: string) => void; onDelete: (id: string) => void; onMove: (id: string, folderId: string | null) => void }) {
  const [menu, setMenu] = useState(false)
  const folderName = folders.find((f) => f.id === file.folderId)?.name ?? 'Unsorted'
  return (
    <div className="group grid grid-cols-[minmax(0,1fr)_180px_150px_100px] items-center gap-4 px-5 py-4 hover:bg-grey-1/50">
      <button onClick={() => onOpen(file.id)} className="flex min-w-0 items-center gap-4 text-left">
        <FileThumb id={file.id} template={file.template} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-ink">{file.title}</span>
          <span className="mt-1 block truncate text-xs text-grey-3">{snippet ?? getTemplate(file.template).name}</span>
        </span>
      </button>
      <div className="truncate text-sm text-grey-3">{folderName}</div>
      <div className="text-sm text-grey-3">{timeAgo(file.updatedAt)}</div>
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
    <span className="grid h-14 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-line bg-[radial-gradient(circle,var(--color-canvas-dot)_1px,transparent_1px)] [background-size:12px_12px]">
      {thumb ? <img src={thumb} alt="" className="h-full w-full object-contain p-1.5" /> : <Icon icon={templateIcon(template)} width={22} className="text-grey-3" />}
    </span>
  )
}

function EmptyState({ onCreate, onCatalog }: { onCreate: () => void; onCatalog: () => void }) {
  return (
    <div className="grid min-h-[340px] place-items-center p-8 text-center">
      <div>
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-grey-1">
          <Icon icon="lucide:file-plus-2" width={28} />
        </div>
        <h3 className="mt-5 font-display text-2xl font-semibold">Your workspace is ready.</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-grey-3">Start with a proven system diagram, or open a blank file and build docs plus canvas together.</p>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={onCreate} className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper">Create starter</button>
          <button onClick={onCatalog} className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold hover:border-ink">Browse catalog</button>
        </div>
      </div>
    </div>
  )
}

function Panel({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-line bg-surface p-5">
      <div className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
        <Icon icon={icon} width={18} /> {title}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function MiniAction({ icon, title, body, onClick }: { icon: string; title: string; body: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full gap-3 rounded-2xl border border-line p-3 text-left hover:border-ink">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-grey-1"><Icon icon={icon} width={17} /></span>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-grey-3">{body}</span>
      </span>
    </button>
  )
}

function Checklist({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className={'grid h-6 w-6 place-items-center rounded-full ' + (done ? 'bg-emerald-500/12 text-emerald-600' : 'bg-grey-1 text-grey-3')}>
        <Icon icon={done ? 'lucide:check' : 'lucide:minus'} width={13} />
      </span>
      <span className={done ? 'text-ink' : 'text-grey-3'}>{label}</span>
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

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
