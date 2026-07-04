import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth, type AuthProvider } from '../../store/useAuth'
import { AuthLayout, SsoButtons, OrDivider, authInputCls } from './AuthLayout'

/** Sign-up (social-first, like eraser). On success Supabase signs the user in
 * and the auth guard routes them into onboarding. */
export function Signup() {
  const signIn = useAuth((s) => s.signIn)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [notice, setNotice] = useState<{ kind: 'error' | 'info'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  // OAuth redirects away; email/password signs up inline. On success the auth
  // guard redirects (authed users can't stay on /signup).
  const go = async (provider: AuthProvider) => {
    setNotice(null)
    setBusy(true)
    const res = await signIn({ email: email || undefined, name: name || undefined, password: password || undefined, provider, signup: true })
    setBusy(false)
    if (res?.error) setNotice({ kind: 'error', text: res.error })
    else if (res?.message) setNotice({ kind: 'info', text: res.message })
  }

  return (
    <AuthLayout>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Create your account</h1>
      <p className="mb-7 mt-2 text-sm text-grey-3">Free forever for individuals. No credit card.</p>

      {notice && (
        <div className={'mb-4 rounded-xl border px-3.5 py-2.5 text-sm ' + (notice.kind === 'error' ? 'border-[#e03131]/40 bg-[#e03131]/10 text-[#c92a2a]' : 'border-line bg-surface text-grey-4')}>
          {notice.text}
        </div>
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
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className={authInputCls} />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Work email" required className={authInputCls} />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required minLength={6} className={authInputCls} />
        <button type="submit" disabled={busy} className="mt-1 rounded-xl bg-ink py-2.5 text-sm font-semibold text-paper transition-opacity hover:opacity-90 disabled:opacity-50">
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>

      <p className="mt-5 text-center text-xs text-grey-3">
        By continuing you agree to our <a href="#" className="text-grey-4 underline hover:text-ink">Terms</a> and{' '}
        <a href="#" className="text-grey-4 underline hover:text-ink">Privacy Policy</a>.
      </p>
      <p className="mt-6 text-center text-sm text-grey-4">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-ink hover:opacity-80">Log in</Link>
      </p>
    </AuthLayout>
  )
}
