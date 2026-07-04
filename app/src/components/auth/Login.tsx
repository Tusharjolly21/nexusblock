import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth, type AuthProvider } from '../../store/useAuth'
import { AuthLayout, SsoButtons, OrDivider, authInputCls } from './AuthLayout'

/** Sign-in. On success Supabase authenticates and the auth guard routes to
 * /app (or /onboarding if not yet set up). */
export function Login() {
  const signIn = useAuth((s) => s.signIn)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const go = async (provider: AuthProvider) => {
    setError('')
    setBusy(true)
    const res = await signIn({ email: email || undefined, password: password || undefined, provider })
    setBusy(false)
    if (res?.error) setError(res.error)
  }

  return (
    <AuthLayout>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mb-7 mt-2 text-sm text-grey-3">Log in to your workspace.</p>

      {error && (
        <div className="mb-4 rounded-xl border border-[#e03131]/40 bg-[#e03131]/10 px-3.5 py-2.5 text-sm text-[#c92a2a]">{error}</div>
      )}

      <SsoButtons onPick={go} />
      <OrDivider />

      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          void go('email')
        }}
      >
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Work email" required className={authInputCls} />
        <div className="relative">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required className={authInputCls} />
          <a href="#" className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-grey-3 hover:text-ink">Forgot?</a>
        </div>
        <button type="submit" disabled={busy} className="mt-1 rounded-xl bg-ink py-2.5 text-sm font-semibold text-paper transition-opacity hover:opacity-90 disabled:opacity-50">
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-grey-4">
        New to nexusblock?{' '}
        <Link to="/signup" className="font-semibold text-ink hover:opacity-80">Create an account</Link>
      </p>
    </AuthLayout>
  )
}
