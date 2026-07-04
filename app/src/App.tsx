import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useParams, useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { TopBar } from './components/TopBar'
import { EditorLayout } from './components/EditorLayout'
import { CommandPalette } from './components/CommandPalette'
import { Onboarding } from './components/Onboarding'
import { Dashboard } from './components/Dashboard'
import { Landing } from './components/Landing'
import { PricingPage } from './components/PricingPage'
import { TemplatesPage } from './components/TemplatesPage'
import { DiagramGuide } from './components/DiagramGuide'
import { Signup } from './components/auth/Signup'
import { Login } from './components/auth/Login'
import { useApp } from './store/useApp'
import { useAuth } from './store/useAuth'
import { useEditorUi } from './store/useEditorUi'
import { FocusModeShortcut } from './components/FocusModeShortcut'
import { PageUrlSync } from './components/PageUrlSync'
import { CloudSync } from './components/CloudSync'
import { CommentsSync } from './components/CommentsSync'
import { cloudEnabled, resolveShareAccess } from './sync/cloud'
import { AuthProvider } from './auth/AuthProvider'
import { LoadingAnimation } from './components/LoadingAnimation'
import { FeatureTour } from './components/FeatureTour'

/**
 * Routes:
 *   /                     marketing Landing
 *   /signup /login        auth
 *   /onboarding           first-run survey (auth-gated)
 *   /dashboard/all        dashboard — all files (auth + onboarding gated)
 *   /dashboard/folder/:folderId dashboard scoped to a folder
 *   /app                  legacy dashboard alias
 *   /app/file/:fileId     the editor for one file
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CloudSync />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/guide/diagram-as-code" element={<DiagramGuide />} />
          <Route path="/callback" element={<AuthCallback />} />
          <Route path="/signup" element={<AuthGate><Signup /></AuthGate>} />
          <Route path="/login" element={<AuthGate><Login /></AuthGate>} />
          <Route path="/onboarding" element={<OnboardingRoute />} />
          <Route path="/dashboard" element={<ProductLayout />}>
            <Route index element={<Navigate to="/dashboard/all" replace />} />
            <Route path="all" element={<Dashboard />} />
            <Route path="folder/:folderId" element={<Dashboard />} />
          </Route>
          <Route path="/app" element={<ProductLayout />}>
            <Route index element={<Navigate to="/dashboard/all" replace />} />
            <Route path="folder/:folderId" element={<Dashboard />} />
            <Route path="file/:fileId" element={<FileEditorRoute />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

/** Minimal placeholder shown while auth resolves route/session state. */
function AuthLoading({ label = 'Checking your session...' }: { label?: string }) {
  return (
    <div className="grid h-screen place-items-center bg-paper">
      <LoadingAnimation size="lg" label={label} />
    </div>
  )
}

/** OAuth redirect target: wait for Supabase to parse the session, then route. */
function AuthCallback() {
  const authed = useAuth((s) => s.authed)
  const isLoading = useAuth((s) => s.isLoading)
  if (isLoading) return <AuthLoading label="Finishing sign in..." />
  return <Navigate to={authed ? '/dashboard/all' : '/login'} replace />
}

/** Keep already-signed-in users off the auth pages. */
function AuthGate({ children }: { children: React.ReactNode }) {
  const authed = useAuth((s) => s.authed)
  const isLoading = useAuth((s) => s.isLoading)
  const onboarded = useApp((s) => s.onboarded)
  if (isLoading) return <AuthLoading label="Checking your session..." />
  if (authed) return <Navigate to={onboarded ? '/dashboard/all' : '/onboarding'} replace />
  return <>{children}</>
}

/** Onboarding requires auth; skip it if already done. */
function OnboardingRoute() {
  const authed = useAuth((s) => s.authed)
  const isLoading = useAuth((s) => s.isLoading)
  const onboarded = useApp((s) => s.onboarded)
  if (isLoading) return <AuthLoading label="Preparing your workspace..." />
  if (!authed) return <Navigate to="/signup" replace />
  if (onboarded) return <Navigate to="/dashboard/all" replace />
  return <Onboarding />
}

/**
 * The product shell: requires auth, then onboarding. Child routes render into
 * the outlet.
 */
function ProductLayout() {
  const authed = useAuth((s) => s.authed)
  const isLoading = useAuth((s) => s.isLoading)
  const onboarded = useApp((s) => s.onboarded)

  if (isLoading) return <AuthLoading label="Opening your workspace..." />
  if (!authed) return <Navigate to="/login" replace />
  if (!onboarded) return <Navigate to="/onboarding" replace />
  return <Outlet />
}

/**
 * /app/file/:fileId — opens one file. Validates the id against the user's files;
 * an unknown or deleted id bounces back to the dashboard. Mirrors the id into
 * the store so selectors work, and keys the Editor so panes remount per file.
 */
function FileEditorRoute() {
  const { fileId } = useParams()
  // "Owned" = a real file in this user's workspace (not a shared one).
  const owned = useApp((s) => s.files.some((f) => f.id === fileId && !f.sharedFrom))
  const setCurrentFile = useApp((s) => s.setCurrentFile)

  useEffect(() => {
    if (fileId && owned) setCurrentFile(fileId)
    return () => setCurrentFile(null)
  }, [fileId, owned, setCurrentFile])

  if (!fileId) return <Navigate to="/dashboard/all" replace />
  if (owned) return <Editor fileId={fileId} />
  // Not in your workspace — it may be a file someone shared with you.
  return <SharedFileRoute fileId={fileId} />
}

/**
 * Opens a file the current user doesn't own by resolving the `shares/{fileId}`
 * doc: if link-access or an invite grants them a role, the file is loaded from
 * the owner's cloud copy (read-only for viewers); otherwise access is denied.
 */
function SharedFileRoute({ fileId }: { fileId: string }) {
  const uid = useAuth((s) => s.uid)
  const email = useAuth((s) => s.email)
  const openSharedFile = useApp((s) => s.openSharedFile)
  const setCurrentFile = useApp((s) => s.setCurrentFile)
  const ready = useApp((s) => s.files.some((f) => f.id === fileId && f.sharedFrom))
  const [state, setState] = useState<'checking' | 'granted' | 'denied' | 'notfound'>('checking')

  useEffect(() => {
    if (!cloudEnabled()) { setState('notfound'); return }
    let cancelled = false
    resolveShareAccess(fileId, uid, email)
      .then((r) => {
        if (cancelled) return
        if (r.status !== 'granted') { setState(r.status); return }
        openSharedFile({
          id: fileId,
          title: r.title,
          template: 'blank',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          folderId: null,
          sharedFrom: r.ownerUid,
          sharedRole: r.role,
        })
        setState('granted')
      })
      .catch((err) => {
        // A rejected read (e.g. Firestore rules not deployed) must not hang the
        // page on a spinner — surface it as "unavailable" instead.
        // eslint-disable-next-line no-console
        console.error('[share] access check failed:', err)
        if (!cancelled) setState('notfound')
      })
    return () => { cancelled = true; setCurrentFile(null) }
  }, [fileId, uid, email, openSharedFile, setCurrentFile])

  if (state === 'checking' || (state === 'granted' && !ready)) return <AuthLoading label="Opening shared file..." />
  if (state === 'granted') return <Editor fileId={fileId} />
  return <AccessDenied reason={state} />
}

/** Shown when a shared link can't be opened (no access, or the share is gone). */
function AccessDenied({ reason }: { reason: 'denied' | 'notfound' }) {
  const navigate = useNavigate()
  const denied = reason === 'denied'
  return (
    <div className="grid h-screen place-items-center bg-paper px-6 text-center">
      <div className="max-w-sm">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-grey-1 text-ink">
          <Icon icon={denied ? 'lucide:lock' : 'lucide:unlink'} width={22} />
        </div>
        <h1 className="font-display text-lg font-semibold tracking-tight text-ink">
          {denied ? 'You don’t have access' : 'This link isn’t available'}
        </h1>
        <p className="mt-1.5 text-sm text-grey-3">
          {denied
            ? 'Ask the file’s owner to invite your account or turn on link sharing.'
            : 'The file may have been deleted or its sharing turned off.'}
        </p>
        <button
          onClick={() => navigate('/dashboard/all')}
          className="mt-5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper hover:opacity-90"
        >
          Back to your files
        </button>
      </div>
    </div>
  )
}

/** The editor view for one file. Keyed by fileId so panes remount per file. */
function Editor({ fileId }: { fileId: string }) {
  const focusMode = useEditorUi((s) => s.focusMode)
  const file = useApp((s) => s.files.find((f) => f.id === fileId) ?? null)
  return (
    <div className="flex h-full flex-col overflow-hidden bg-paper text-ink">
      <FocusModeShortcut />
      {!focusMode && <TopBar />}
      {!focusMode && file?.sharedFrom && <SharedFileBanner role={file.sharedRole ?? 'view'} />}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <EditorLayout key={fileId} />
      </div>
      <PageUrlSync />
      <CommentsSync />
      {!focusMode && <CommandPalette />}
      {!focusMode && <FeatureTour />}
    </div>
  )
}

function SharedFileBanner({ role }: { role: 'view' | 'edit' }) {
  const canEdit = role === 'edit'
  return (
    <div className="flex h-10 shrink-0 items-center justify-center gap-2 border-b border-line bg-surface px-4 text-xs text-grey-4">
      <span className={'grid h-5 w-5 place-items-center rounded-full ' + (canEdit ? 'bg-emerald-500/15 text-emerald-600' : 'bg-grey-1 text-ink')}>
        <Icon icon={canEdit ? 'lucide:pencil' : 'lucide:eye'} width={12} />
      </span>
      <span>
        {canEdit
          ? 'Shared with you. Your edits update the owner’s file.'
          : 'Shared with you as view only. The canvas, docs, and code are locked for review.'}
      </span>
    </div>
  )
}
