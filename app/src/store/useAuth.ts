import { create } from 'zustand'

export type AuthProvider = 'google' | 'github' | 'microsoft' | 'email'
export type OAuthProvider = 'google' | 'github' | 'microsoft'

/** Result of a sign-in / sign-up attempt (email flows are inline). */
export type AuthResult = { error?: string; message?: string }

/** Auth actions injected by the Supabase bridge. */
type AuthActions = {
  oauth: (provider: OAuthProvider) => Promise<AuthResult>
  emailIn: (email: string, password: string) => Promise<AuthResult>
  emailUp: (email: string, password: string, name?: string) => Promise<AuthResult>
  updateUserProfile: (profile: { name?: string; photoUrl?: string | null }) => Promise<AuthResult>
  logout: () => Promise<void>
}

type AuthState = {
  /** Real session state, mirrored from Firebase by <AuthBridge>. */
  authed: boolean
  uid: string | null
  email: string | null
  name: string | null
  photoUrl: string | null
  provider: AuthProvider | null
  /** True while Supabase is still resolving the session on load. */
  isLoading: boolean

  /** Kick off sign-in. OAuth providers redirect; email/password is inline and
   * resolves with an optional error/message. Kept API-compatible with the UI. */
  signIn: (info: { email?: string; name?: string; password?: string; provider: AuthProvider; signup?: boolean }) => Promise<AuthResult>
  updateProfile: (profile: { name?: string; photoUrl?: string | null }) => Promise<AuthResult>
  /** Log out via Supabase. */
  signOut: () => void

  // --- wired by the bridge, not called by UI ---
  _actions: AuthActions | null
  _setActions: (a: AuthActions) => void
  _sync: (s: { authed: boolean; uid: string | null; email: string | null; name: string | null; photoUrl: string | null; provider: AuthProvider | null; isLoading: boolean }) => void
}

/**
 * Auth state backed by Supabase. `useAuth` stays the single source of truth the
 * app reads (authed / email / name / provider); <AuthBridge> keeps it in sync
 * with the Supabase session and injects the real login/logout actions. Not
 * persisted — Supabase owns the session.
 */
export const useAuth = create<AuthState>((set, get) => ({
  authed: false,
  uid: null,
  email: null,
  name: null,
  photoUrl: null,
  provider: null,
  isLoading: true,

  signIn: async (info) => {
    const a = get()._actions
    if (!a) return { error: 'Auth is not configured yet.' }
    if (info.provider === 'email') {
      if (!info.email || !info.password) return { error: 'Enter an email and password.' }
      return info.signup ? a.emailUp(info.email, info.password, info.name) : a.emailIn(info.email, info.password)
    }
    return a.oauth(info.provider) // redirects away
  },
  updateProfile: async (profile) => {
    const a = get()._actions
    if (!a) {
      set((s) => ({
        name: profile.name?.trim() || s.name,
        photoUrl: profile.photoUrl ?? s.photoUrl,
      }))
      return {}
    }
    const result = await a.updateUserProfile(profile)
    if (!result.error) {
      set((s) => ({
        name: profile.name?.trim() || s.name,
        photoUrl: profile.photoUrl ?? s.photoUrl,
      }))
    }
    return result
  },
  signOut: () => void get()._actions?.logout(),

  _actions: null,
  _setActions: (a) => set({ _actions: a }),
  _sync: (s) => set(s),
}))
