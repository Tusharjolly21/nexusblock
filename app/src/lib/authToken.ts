import { auth } from './firebase'
import { useEffect, useState } from 'react'

/** Return the current Firebase ID token for server-authenticated app APIs. */
export async function getFirebaseIdToken(forceRefresh = false): Promise<string | null> {
  const user = auth?.currentUser
  if (!user) return null
  try {
    return await user.getIdToken(forceRefresh)
  } catch {
    return null
  }
}

/** React helper for Yjs providers that need a token at construction time. */
export function useFirebaseIdToken(enabled: boolean) {
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) {
      setToken(null)
      return
    }
    let cancelled = false
    void getFirebaseIdToken().then((next) => {
      if (!cancelled) setToken(next)
    })
    return () => { cancelled = true }
  }, [enabled])

  return token
}
