import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Icon } from '@iconify/react'
import { useApp, type Role } from '../store/useApp'
import { useAuth } from '../store/useAuth'
import { applyTone, useTheme, type Tone } from '../store/useTheme'
import { ToneSwatches } from './ToneToggle'
import { Logo } from './Logo'

type StepKey = 'team' | 'invite' | 'appearance' | 'mcp' | 'diagrams'
type McpClient = 'codex' | 'claude-code' | 'cursor' | 'vscode' | 'github-copilot'
type StylePreference = 'technical' | 'product' | 'minimal'

const STEPS: StepKey[] = ['team', 'invite', 'appearance', 'mcp', 'diagrams']
const LAST = STEPS.length - 1

const CLIENTS: { id: McpClient; label: string; icon: string; command: string; help: string }[] = [
  {
    id: 'codex',
    label: 'Codex',
    icon: 'simple-icons:openai',
    command: 'codex mcp add nexusblock https://app.nexusblock.io/api/mcp',
    help: 'Let Codex inspect diagrams, docs, and generated DSL from your workspace.',
  },
  {
    id: 'claude-code',
    label: 'Claude Code',
    icon: 'simple-icons:anthropic',
    command: 'claude mcp add --transport http nexusblock https://app.nexusblock.io/api/mcp',
    help: 'Connect architecture context to your terminal assistant.',
  },
  {
    id: 'cursor',
    label: 'Cursor',
    icon: 'simple-icons:cursor',
    command: 'cursor://settings/mcp?server=nexusblock',
    help: 'Use diagrams and docs as project context while coding.',
  },
  {
    id: 'vscode',
    label: 'VS Code',
    icon: 'devicon:vscode',
    command: 'code --add-mcp nexusblock=https://app.nexusblock.io/api/mcp',
    help: 'Bring canvas search and diagram references into your editor.',
  },
  {
    id: 'github-copilot',
    label: 'GitHub Copilot',
    icon: 'simple-icons:github',
    command: 'gh extension install nexusblock/mcp && gh nexusblock mcp connect',
    help: 'Use repository-aware diagrams while reviewing implementation plans.',
  },
]

const STYLE_PREFS: { id: StylePreference; label: string; icon: string; body: string }[] = [
  { id: 'technical', label: 'Senior architecture', icon: 'lucide:network', body: 'Dense service maps, queues, stores, ownership, and failure paths.' },
  { id: 'product', label: 'Product walkthrough', icon: 'lucide:route', body: 'Screens, APIs, events, and user journeys connected in one canvas.' },
  { id: 'minimal', label: 'Clean review board', icon: 'lucide:scan-line', body: 'Fewer elements, stronger labels, and polished review-ready diagrams.' },
]

const slugify = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'workspace'

export function Onboarding() {
  const complete = useApp((s) => s.completeOnboarding)
  const authName = useAuth((s) => s.name)
  const authEmail = useAuth((s) => s.email)
  const committedTone = useTheme((s) => s.tone)
  const setTone = useTheme((s) => s.setTone)
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState(0)
  const [teamName, setTeamName] = useState(defaultTeamName(authName, authEmail))
  const [inviteDraft, setInviteDraft] = useState('')
  const [invites, setInvites] = useState<string[]>([])
  const [selectedTone, setSelectedTone] = useState<Tone>(committedTone)
  const [mcpClient, setMcpClient] = useState<McpClient>('codex')
  const [stylePreference, setStylePreference] = useState<StylePreference>('technical')
  const [uploads, setUploads] = useState<string[]>([])
  const [copied, setCopied] = useState(false)

  const selectedClient = useMemo(() => CLIENTS.find((c) => c.id === mcpClient) ?? CLIENTS[0], [mcpClient])
  const current = STEPS[step]

  const addInvite = () => {
    const email = inviteDraft.trim().toLowerCase()
    if (!email || !email.includes('@') || invites.includes(email)) return
    setInvites((list) => [...list, email])
    setInviteDraft('')
  }

  const handleFiles = (files: FileList | null) => {
    if (!files?.length) return
    setUploads((list) => [...list, ...Array.from(files).slice(0, 5).map((f) => f.name)].slice(0, 5))
  }

  const previewTone = (tone: Tone | null) => applyTone(tone ?? selectedTone)
  const chooseTone = (tone: Tone) => {
    setSelectedTone(tone)
    setTone(tone)
  }

  const finish = () => {
    const name = authName || authEmail?.split('@')[0] || 'there'
    const role: Role = stylePreference === 'product' ? 'pm' : 'engineer'
    complete(
      {
        name,
        role,
        team: invites.length ? 'team' : 'solo',
        useCase: stylePreference === 'product' ? 'Product walkthroughs' : 'System architecture',
        teamName,
        invitedEmails: invites,
        preferredTone: selectedTone,
        mcpClient,
        importedDiagramNames: uploads,
        stylePreference,
      },
      teamName,
    )
    navigate('/dashboard/all')
  }

  const next = () => (step < LAST ? setStep((s) => s + 1) : finish())
  const back = () => setStep((s) => Math.max(0, s - 1))
  const skip = () => {
    if (current === 'mcp') setMcpClient('codex')
    if (current === 'diagrams') finish()
    else next()
  }

  const copyCommand = async () => {
    await navigator.clipboard?.writeText(selectedClient.command)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  return (
    <div className="relative flex h-full min-h-screen overflow-hidden bg-paper text-ink">
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 0%, color-mix(in srgb, var(--color-ink) 10%, transparent), transparent 30%), radial-gradient(circle, var(--color-canvas-dot) 1px, transparent 1px)',
          backgroundSize: 'auto, 28px 28px',
        }}
      />

      <aside className="relative hidden w-[360px] shrink-0 border-r border-line bg-surface/65 p-8 backdrop-blur-xl lg:flex lg:flex-col">
        <div className="flex items-center gap-2 font-display text-lg font-semibold">
          <Logo /> nexusblock
        </div>

        <div className="mt-16 space-y-3">
          {STEPS.map((s, i) => (
            <button
              key={s}
              onClick={() => setStep(i)}
              className={
                'flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ' +
                (i === step ? 'border-ink bg-ink text-paper' : i < step ? 'border-line bg-grey-1 text-ink' : 'border-transparent text-grey-3 hover:bg-grey-1 hover:text-ink')
              }
            >
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-surface/80 text-ink">
                <Icon icon={stepIcon(s)} width={16} />
              </span>
              <span>
                <span className="block text-sm font-semibold">{stepLabel(s)}</span>
                <span className={'block text-xs ' + (i === step ? 'text-paper/60' : 'text-grey-3')}>{i + 1} of {STEPS.length}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="mt-auto rounded-3xl border border-line bg-paper p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Icon icon="lucide:sparkles" width={16} />
            Setup creates real defaults
          </div>
          <p className="mt-2 text-sm leading-relaxed text-grey-3">
            Your choices shape starter files, dashboard actions, diagram catalog suggestions, and editor appearance.
          </p>
        </div>
      </aside>

      <main className="relative flex min-w-0 flex-1 flex-col">
        <header className="flex h-20 items-center justify-between px-6 lg:px-10">
          <div className="flex items-center gap-2 font-display font-semibold lg:hidden">
            <Logo /> nexusblock
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button onClick={skip} className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-grey-4 hover:border-ink hover:text-ink">
              {current === 'diagrams' ? 'Finish without upload' : 'Skip'}
            </button>
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center px-6 pb-10">
          <div className="w-full max-w-4xl">
            <AnimatePresence mode="wait">
              <motion.section
                key={current}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -18 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="mx-auto"
              >
                {current === 'team' && (
                  <Shell eyebrow="Team name" icon="lucide:users-round" title="What should we call your workspace?" subtitle="This becomes the name shown in your dashboard, share dialogs, and file ownership.">
                    <div className="mx-auto max-w-xl">
                      <label className="mb-2 block text-sm font-semibold text-grey-4">Workspace name</label>
                      <input
                        autoFocus
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        className="w-full rounded-2xl border border-line bg-surface px-5 py-4 text-lg font-semibold text-ink outline-none transition-colors focus:border-ink"
                        placeholder="Payments Platform"
                      />
                      <div className="mt-3 rounded-2xl border border-line bg-surface px-4 py-3 font-mono text-sm text-grey-3">
                        app.nexusblock.io/w/<span className="text-ink">{slugify(teamName)}</span>
                      </div>
                    </div>
                  </Shell>
                )}

                {current === 'invite' && (
                  <Shell eyebrow="Invite teammates" icon="lucide:send" title="Who should be in the room?" subtitle="Invite your core collaborators now, or do it later from the dashboard and Share modal.">
                    <div className="mx-auto max-w-2xl">
                      <div className="flex rounded-2xl border border-line bg-surface p-1.5 focus-within:border-ink">
                        <input
                          value={inviteDraft}
                          onChange={(e) => setInviteDraft(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') addInvite() }}
                          className="min-w-0 flex-1 bg-transparent px-4 text-sm text-ink outline-none placeholder:text-grey-3"
                          placeholder="teammate@company.com"
                        />
                        <button onClick={addInvite} className="rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-paper">
                          Invite
                        </button>
                      </div>
                      <button
                        onClick={() => navigator.clipboard?.writeText(`https://app.nexusblock.io/invite/${slugify(teamName)}`)}
                        className="mx-auto mt-4 flex items-center gap-2 text-sm font-semibold text-grey-4 hover:text-ink"
                      >
                        <Icon icon="lucide:link" width={15} /> Copy invite link
                      </button>
                      <div className="mt-6 grid gap-2">
                        {invites.length ? invites.map((email) => (
                          <div key={email} className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
                            <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-sm font-bold text-paper">{email[0].toUpperCase()}</span>
                            <span className="flex-1 truncate text-sm font-semibold">{email}</span>
                            <span className="rounded-full bg-grey-1 px-2.5 py-1 text-xs font-semibold text-grey-4">Can edit</span>
                            <button onClick={() => setInvites((list) => list.filter((x) => x !== email))} className="text-grey-3 hover:text-ink">
                              <Icon icon="lucide:x" width={16} />
                            </button>
                          </div>
                        )) : (
                          <div className="rounded-2xl border border-dashed border-line bg-surface/70 px-4 py-6 text-center text-sm text-grey-3">
                            No invites yet. Your dashboard will still be ready for solo work.
                          </div>
                        )}
                      </div>
                    </div>
                  </Shell>
                )}

                {current === 'appearance' && (
                  <Shell eyebrow="Appearance" icon="lucide:palette" title="Choose your workspace mood." subtitle="Two modes only: a crisp light board and an Obsidian workbench. Your choice is personal and can be changed anytime.">
                    <div onMouseLeave={() => previewTone(null)} className="flex flex-col items-center gap-6">
                      <ToneSwatches size={54} onHover={previewTone} />
                      <div className="grid w-full max-w-2xl grid-cols-2 gap-4">
                        {(['light', 'obsidian'] as Tone[]).map((tone) => (
                          <button
                            key={tone}
                            onClick={() => chooseTone(tone)}
                            className={'rounded-3xl border p-5 text-left transition-colors ' + (selectedTone === tone ? 'border-ink bg-surface' : 'border-line bg-surface/70 hover:border-ink')}
                          >
                            <Icon icon={tone === 'light' ? 'lucide:sun' : 'lucide:moon'} width={20} />
                            <div className="mt-8 font-display text-xl font-semibold">{tone === 'light' ? 'Light' : 'Obsidian'}</div>
                            <p className="mt-1 text-sm text-grey-3">{tone === 'light' ? 'Bright canvas, clean docs, strong contrast.' : 'Dark command-center feel without muddy gradients.'}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </Shell>
                )}

                {current === 'mcp' && (
                  <Shell eyebrow="Integrations" icon="lucide:plug-zap" title="Connect your coding context." subtitle="Pick the MCP client you use most. We will pin the setup action on your dashboard so you can finish it anytime.">
                    <div className="mx-auto max-w-4xl">
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                        {CLIENTS.map((client) => (
                          <button
                            key={client.id}
                            onClick={() => setMcpClient(client.id)}
                            className={'relative rounded-2xl border p-4 text-center transition-colors ' + (mcpClient === client.id ? 'border-ink bg-surface' : 'border-line bg-surface/60 hover:border-ink')}
                          >
                            {mcpClient === client.id && <Icon icon="lucide:check-circle-2" width={18} className="absolute right-3 top-3" />}
                            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-grey-1 text-ink">
                              <Icon icon={client.icon} width={24} />
                            </span>
                            <span className="mt-3 block text-sm font-semibold">{client.label}</span>
                          </button>
                        ))}
                      </div>
                      <div className="mt-5 rounded-3xl border border-line bg-surface p-5">
                        <div className="flex items-start gap-3">
                          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-grey-1">
                            <Icon icon={selectedClient.icon} width={22} />
                          </span>
                          <div>
                            <div className="font-display text-lg font-semibold">Set up {selectedClient.label}</div>
                            <p className="mt-1 text-sm text-grey-3">{selectedClient.help}</p>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-ink p-3 text-paper">
                          <code className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-sm">{selectedClient.command}</code>
                          <button onClick={copyCommand} className="rounded-xl bg-paper px-3 py-2 text-sm font-semibold text-ink">
                            {copied ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </Shell>
                )}

                {current === 'diagrams' && (
                  <Shell eyebrow="Diagram defaults" icon="lucide:upload-cloud" title="Bring your diagram taste with you." subtitle="Upload examples or choose a style. We use this to bias catalog suggestions and starter files, without locking you in.">
                    <input ref={fileRef} type="file" multiple hidden accept=".vsdx,.drawio,.pdf,.svg,.png,.jpg,.jpeg" onChange={(e) => handleFiles(e.target.files)} />
                    <div className="mx-auto max-w-4xl">
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
                        className="grid min-h-44 place-items-center rounded-3xl border border-dashed border-grey-2 bg-surface/70 p-8 text-center"
                      >
                        <div>
                          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-grey-1 text-ink">
                            <Icon icon="lucide:upload-cloud" width={24} />
                          </span>
                          <div className="mt-4 text-lg font-semibold">Drag diagrams here, or <button onClick={() => fileRef.current?.click()} className="underline decoration-grey-2 underline-offset-4">browse</button></div>
                          <p className="mt-2 text-sm text-grey-3">.vsdx, .drawio, .pdf, .svg, .png, .jpg - up to 5 files</p>
                        </div>
                      </div>
                      {uploads.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {uploads.map((name) => <span key={name} className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-grey-4">{name}</span>)}
                        </div>
                      )}
                      <div className="mt-5 grid gap-3 md:grid-cols-3">
                        {STYLE_PREFS.map((pref) => (
                          <button
                            key={pref.id}
                            onClick={() => setStylePreference(pref.id)}
                            className={'rounded-3xl border p-5 text-left transition-colors ' + (stylePreference === pref.id ? 'border-ink bg-surface' : 'border-line bg-surface/70 hover:border-ink')}
                          >
                            <Icon icon={pref.icon} width={20} />
                            <div className="mt-5 font-display text-lg font-semibold">{pref.label}</div>
                            <p className="mt-1 text-sm leading-relaxed text-grey-3">{pref.body}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </Shell>
                )}
              </motion.section>
            </AnimatePresence>
          </div>
        </div>

        <footer className="flex items-center justify-between border-t border-line bg-paper/70 px-6 py-5 backdrop-blur lg:px-10">
          <button
            onClick={back}
            disabled={step === 0}
            className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-grey-4 transition-colors hover:border-ink hover:text-ink disabled:opacity-0"
          >
            Back
          </button>
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => <span key={s} className={'h-1.5 rounded-full transition-all ' + (i <= step ? 'w-8 bg-ink' : 'w-2 bg-grey-2')} />)}
          </div>
          <button onClick={next} className="rounded-full bg-ink px-6 py-2.5 text-sm font-semibold text-paper hover:opacity-90">
            {step < LAST ? 'Continue' : 'Open dashboard'}
          </button>
        </footer>
      </main>
    </div>
  )
}

function Shell({ eyebrow, icon, title, subtitle, children }: { eyebrow: string; icon: string; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-grey-4">
        <Icon icon={icon} width={15} /> {eyebrow}
      </div>
      <h1 className="mx-auto max-w-3xl font-display text-[clamp(34px,5vw,64px)] font-semibold leading-[0.98] tracking-tight">{title}</h1>
      <p className="mx-auto mb-8 mt-4 max-w-2xl text-base leading-relaxed text-grey-3">{subtitle}</p>
      {children}
    </div>
  )
}

function stepLabel(step: StepKey) {
  switch (step) {
    case 'team': return 'Workspace'
    case 'invite': return 'Collaborators'
    case 'appearance': return 'Appearance'
    case 'mcp': return 'Integrations'
    case 'diagrams': return 'Diagram style'
  }
}

function stepIcon(step: StepKey) {
  switch (step) {
    case 'team': return 'lucide:users-round'
    case 'invite': return 'lucide:send'
    case 'appearance': return 'lucide:palette'
    case 'mcp': return 'lucide:plug-zap'
    case 'diagrams': return 'lucide:upload-cloud'
  }
}

function defaultTeamName(name: string | null, email: string | null) {
  const base = name || email?.split('@')[0] || 'My'
  return `${base.replace(/\b\w/g, (m) => m.toUpperCase())}'s Workspace`
}
