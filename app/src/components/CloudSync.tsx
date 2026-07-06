import { useEffect, useRef } from 'react'
import { useAuth } from '../store/useAuth'
import { useApp, selectWorkspaceIndex } from '../store/useApp'
import { cloudEnabled, pullWorkspace, pushWorkspace } from '../sync/cloud'

/**
 * Syncs the workspace index (files / folders / profile) to Firestore per user,
 * so a login carries a user's file list across devices. Content (canvas / doc /
 * code) syncs per-file from the panes; this handles the index + reconciliation.
 *
 * Reconcile on login:
 *  - cloud copy exists → it wins (you switched devices).
 *  - no cloud, local belongs to a different user → clean slate for this user.
 *  - no cloud, local is unowned/ours → adopt local and upload it.
 */
export function CloudSync() {
  const uid = useAuth((s) => s.uid)
  const syncedUid = useRef<string | null>(null)
  const ready = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (!uid || !cloudEnabled()) {
      ready.current = false
      syncedUid.current = null
      useApp.getState().setCloudSyncReady(true)
      return
    }
    if (syncedUid.current === uid) return
    syncedUid.current = uid
    ready.current = false
    let cancelled = false

    void (async () => {
      try {
        const remote = await pullWorkspace(uid)
        if (cancelled) return
        const s = useApp.getState()
        if (remote) {
          s.hydrateWorkspace(remote, uid)
          // eslint-disable-next-line no-console
          console.info(`[cloud] loaded workspace from cloud for ${uid} (${remote.files.length} files).`)
        } else if (s.ownerUid && s.ownerUid !== uid) {
          s.resetWorkspace(uid)
          // eslint-disable-next-line no-console
          console.info(`[cloud] new user ${uid} — started a clean workspace.`)
        } else {
          s.setOwner(uid)
          await pushWorkspace(uid, selectWorkspaceIndex(useApp.getState()))
          // eslint-disable-next-line no-console
          console.info(`[cloud] uploaded local workspace to cloud for ${uid}.`)
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[cloud] workspace reconcile failed:', e)
      } finally {
        if (!cancelled) {
          ready.current = true
          useApp.getState().setCloudSyncReady(true)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [uid])

  // Push index changes (debounced) after the initial reconcile.
  useEffect(() => {
    if (!cloudEnabled()) return
    return useApp.subscribe((state, prev) => {
      if (!ready.current) return
      const u = useAuth.getState().uid
      if (!u || u !== syncedUid.current) return
      const changed =
        state.files !== prev.files ||
        state.folders !== prev.folders ||
        state.profile !== prev.profile ||
        state.workspaceName !== prev.workspaceName ||
        state.onboarded !== prev.onboarded
      if (!changed) return
      clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        pushWorkspace(u, selectWorkspaceIndex(useApp.getState()))
          // eslint-disable-next-line no-console
          .then(() => console.info('[cloud] workspace saved.'))
          // eslint-disable-next-line no-console
          .catch((e) => console.warn('[cloud] workspace push failed:', e))
      }, 800)
    })
  }, [])

  return null
}
