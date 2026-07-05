import { useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { useApp, selectCurrentFile } from '../store/useApp'
import { useAuth } from '../store/useAuth'
import { useComments, loadLocalComments, saveLocalComments, type CommentThread } from '../store/useComments'
import { cloudEnabled, pullContent, pushContent } from '../sync/cloud'
import { isCollabConfigured, collabWsUrl, roomIdForFile } from '../lib/collab'
import { useFirebaseIdToken } from '../lib/authToken'

/**
 * Loads/persists the current file's comment threads (local + cloud) and, in a
 * live session, syncs them through Yjs. Mounted once while a file is open so
 * canvas comment pins are available without opening the Comments panel.
 */
export function CommentsSync() {
  const file = useApp(selectCurrentFile)
  const fileId = file?.id ?? 'scratch'
  const sharedFrom = file?.sharedFrom ?? null
  const uid = useAuth((s) => s.uid)
  const ownerUid = sharedFrom ?? uid
  const canComment = !!file && (!sharedFrom || file.sharedRole === 'edit' || file.sharedRole === 'view')
  const setThreads = useComments((s) => s.setThreads)
  const threads = useComments((s) => s.threadsByFile[fileId] ?? [])
  const [params] = useSearchParams()
  const live = params.get('live') === '1' && isCollabConfigured
  const liveToken = useFirebaseIdToken(live)
  const applyingRemoteRef = useRef(false)

  // Load local, then the owner's cloud copy.
  useEffect(() => {
    setThreads(fileId, loadLocalComments(fileId))
    const ownerUid = sharedFrom ?? uid
    if (!ownerUid || !cloudEnabled()) return
    let cancelled = false
    void pullContent(ownerUid, fileId).then((content) => {
      if (cancelled || !content?.comments) return
      try {
        setThreads(fileId, JSON.parse(content.comments) as CommentThread[])
      } catch {
        /* ignore malformed comments */
      }
    })
    return () => { cancelled = true }
  }, [fileId, setThreads, sharedFrom, uid])

  // Persist to local + cloud on change (editors only).
  useEffect(() => {
    saveLocalComments(fileId, threads)
    const ownerUid = sharedFrom ?? uid
    if (ownerUid && canComment && cloudEnabled()) {
      pushContent(ownerUid, fileId, { comments: JSON.stringify(threads) }).catch(() => {})
    }
  }, [fileId, threads, sharedFrom, uid, canComment])

  // Live threads over Yjs.
  const commentsY = useMemo(() => {
    if (!live || !liveToken) return null
    const doc = new Y.Doc()
    const provider = new WebsocketProvider(collabWsUrl, `${roomIdForFile(fileId, ownerUid)}:comments`, doc, { params: { token: liveToken } })
    return { doc, provider, map: doc.getMap<CommentThread>('threads') }
  }, [live, liveToken, fileId, ownerUid])

  useEffect(() => () => { commentsY?.provider.destroy(); commentsY?.doc.destroy() }, [commentsY])

  useEffect(() => {
    if (!commentsY) return
    const { map, provider } = commentsY
    const apply = () => {
      applyingRemoteRef.current = true
      setThreads(fileId, [...map.values()].sort((a, b) => a.createdAt - b.createdAt))
      applyingRemoteRef.current = false
    }
    const onSync = (s: boolean) => { if (s) apply() }
    provider.on('sync', onSync)
    map.observe(apply)
    if (provider.synced) apply()
    return () => { map.unobserve(apply); provider.off('sync', onSync) }
  }, [commentsY, fileId, setThreads])

  useEffect(() => {
    if (!commentsY || applyingRemoteRef.current || !canComment) return
    const { doc, map } = commentsY
    doc.transact(() => {
      const ids = new Set(threads.map((t) => t.id))
      for (const t of threads) {
        const cur = map.get(t.id)
        if (!cur || JSON.stringify(cur) !== JSON.stringify(t)) map.set(t.id, t)
      }
      for (const k of [...map.keys()]) if (!ids.has(k)) map.delete(k)
    })
  }, [threads, commentsY, canComment])

  return null
}
