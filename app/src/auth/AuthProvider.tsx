import { useEffect } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  linkWithCredential,
  updateProfile,
  signOut,
  GoogleAuthProvider,
  GithubAuthProvider,
  OAuthProvider,
  type Auth,
  type User,
  type AuthCredential,
  type AuthProvider as FirebaseAuthProvider,
} from 'firebase/auth'
import { auth, isFirebaseConfigured } from '../lib/firebase'
import { useAuth, type AuthProvider as Provider, type OAuthProvider as OAuth } from '../store/useAuth'

/** Build the Firebase provider for one of our OAuth buttons. */
function providerFor(provider: OAuth): FirebaseAuthProvider {
  if (provider === 'google') return new GoogleAuthProvider()
  if (provider === 'github') return new GithubAuthProvider()
  return new OAuthProvider('microsoft.com')
}

/** Map a Firebase user's sign-in provider to our label. */
function providerLabel(user: User | null): Provider | null {
  const id = user?.providerData[0]?.providerId
  if (!id) return null
  if (id.startsWith('google')) return 'google'
  if (id.startsWith('github')) return 'github'
  if (id.startsWith('microsoft')) return 'microsoft'
  return 'email'
}

function syncUser(user: User | null, isLoading: boolean) {
  useAuth.getState()._sync({
    authed: !!user,
    uid: user?.uid ?? null,
    email: user?.email ?? null,
    name: user?.displayName ?? user?.email ?? null,
    photoUrl: user?.photoURL ?? null,
    provider: providerLabel(user),
    isLoading,
  })
}

function clearLocalWorkspaceCache() {
  const exact = new Set(['nexusblock-app', 'nb-custom-icons-v1'])
  const prefixes = ['nb-doc-', 'nb-code-', 'nb-comments-', 'nb-canvas-', 'nb-thumb-', 'nb-versions-', 'nb-seeded-']
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i)
    if (!key) continue
    if (exact.has(key) || prefixes.some((prefix) => key.startsWith(prefix))) localStorage.removeItem(key)
  }
}

/** Firebase provider id → the label shown on our buttons. */
const PROVIDER_NAME: Record<string, string> = {
  'google.com': 'Google',
  'github.com': 'GitHub',
  'microsoft.com': 'Microsoft',
  password: 'email & password',
}

const friendly = (e: unknown) => {
  const code = (e as { code?: string })?.code ?? ''
  if (code.includes('popup-closed') || code.includes('cancelled-popup') || code.includes('popup-blocked'))
    return 'Sign-in was cancelled or the popup was blocked.'
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found'))
    return 'Wrong email or password. If you signed up with Google, GitHub, or Microsoft, use that button above instead.'
  if (code.includes('email-already-in-use')) return 'That email already has an account — log in instead.'
  if (code.includes('weak-password')) return 'Password should be at least 6 characters.'
  return (e as { message?: string })?.message ?? 'Something went wrong. Try again.'
}

const buttonName: Record<OAuth, string> = { google: 'Google', github: 'GitHub', microsoft: 'Microsoft' }

/** Pull the credential of the just-attempted provider out of a failed sign-in. */
function credentialFromError(provider: OAuth, e: unknown): AuthCredential | null {
  if (provider === 'google') return GoogleAuthProvider.credentialFromError(e as never)
  if (provider === 'github') return GithubAuthProvider.credentialFromError(e as never)
  return OAuthProvider.credentialFromError(e as never)
}

/**
 * Secure cross-provider account linking (pattern 1). When a provider collides
 * with an existing email, we stash its credential here. As soon as the user
 * signs in with their existing method (which proves they own the email), we
 * link the stashed credential onto that one account.
 */
let pendingLink: { cred: AuthCredential; email: string; label: string } | null = null

async function linkPendingTo(user: User): Promise<void> {
  if (!pendingLink || !user.email) return
  if (pendingLink.email.toLowerCase() !== user.email.toLowerCase()) return
  const { cred, label } = pendingLink
  pendingLink = null
  try {
    await linkWithCredential(user, cred)
    syncUser(user, false) // refresh providerData
    // eslint-disable-next-line no-console
    console.info(`[auth] linked ${label} to ${user.email}.`)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[auth] could not link ${label}:`, (err as { code?: string })?.code ?? err)
  }
}

/** OAuth errors, including the "same email, different provider" collision. */
async function friendlyOAuth(fb: Auth, provider: OAuth, e: unknown): Promise<string> {
  const code = (e as { code?: string })?.code ?? ''
  // eslint-disable-next-line no-console
  console.warn(`[auth] ${provider} sign-in error:`, code, e)

  const email = (e as { customData?: { email?: string } })?.customData?.email
  const cred = credentialFromError(provider, e)
  // A same-email collision. Firebase reports it as `account-exists-with-different-credential`,
  // OR (when email-enumeration protection is on) masks it as `invalid-credential`. If we can
  // still recover the email + credential, treat it as a link opportunity either way.
  const isCollision =
    code === 'auth/account-exists-with-different-credential' ||
    (code === 'auth/invalid-credential' && !!email && !!cred)

  if (isCollision && email && cred) {
    // Stash the new credential; link it once they sign in with the existing method.
    pendingLink = { cred, email, label: buttonName[provider] }
    let existing = ''
    try {
      existing = PROVIDER_NAME[(await fetchSignInMethodsForEmail(fb, email))[0]] ?? ''
    } catch {
      /* enumeration protection may hide it */
    }
    return existing
      ? `${email} already uses ${existing}. Continue with ${existing} — we'll connect ${buttonName[provider]} to it.`
      : `${email} already has an account. Sign in with the method you used first — we'll connect ${buttonName[provider]} to it.`
  }
  if (code === 'auth/account-exists-with-different-credential') {
    return 'This email already has an account with a different sign-in method.'
  }
  return friendly(e)
}

/**
 * Backs `useAuth` with Firebase Auth. Subscribes to the session and injects the
 * real login/logout actions. If env vars are missing, it marks auth "not
 * loading" so the UI still runs (login just won't work until configured).
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const fb = auth
    if (!fb) {
      // eslint-disable-next-line no-console
      console.warn('[auth] Firebase env vars not set — auth is disabled. See .env.example.')
      useAuth.getState()._sync({ authed: false, uid: null, email: null, name: null, photoUrl: null, provider: null, isLoading: false })
      return
    }

    useAuth.getState()._setActions({
      oauth: async (provider) => {
        try {
          const { user } = await signInWithPopup(fb, providerFor(provider))
          await linkPendingTo(user) // connect a stashed provider, if any
          return {}
        } catch (e) {
          return { error: await friendlyOAuth(fb, provider, e) }
        }
      },
      emailIn: async (email, password) => {
        try {
          const { user } = await signInWithEmailAndPassword(fb, email, password)
          await linkPendingTo(user) // existing account may be email/password
          return {}
        } catch (e) {
          return { error: friendly(e) }
        }
      },
      emailUp: async (email, password, name) => {
        try {
          const cred = await createUserWithEmailAndPassword(fb, email, password)
          if (name) await updateProfile(cred.user, { displayName: name })
          // Re-sync so the display name lands immediately.
          syncUser(fb.currentUser, false)
          return {}
        } catch (e) {
          return { error: friendly(e) }
        }
      },
      updateUserProfile: async (profile) => {
        const user = fb.currentUser
        if (!user) return { error: 'Sign in again to update your profile.' }
        try {
          await updateProfile(user, {
            displayName: profile.name?.trim() || user.displayName,
            photoURL: profile.photoUrl ?? user.photoURL,
          })
          syncUser(fb.currentUser, false)
          return {}
        } catch (e) {
          return { error: friendly(e) }
        }
      },
      logout: async () => {
        await signOut(fb)
        clearLocalWorkspaceCache()
      },
    })

    const unsub = onAuthStateChanged(fb, (user) => syncUser(user, false))
    return unsub
  }, [])

  return <>{children}</>
}

export { isFirebaseConfigured }
