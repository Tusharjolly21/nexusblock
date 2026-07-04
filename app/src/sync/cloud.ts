import { addDoc, collection, doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { WorkspaceIndex } from '../store/useApp'

/** Whether cloud sync is available (Firestore configured). */
export const cloudEnabled = () => !!db

/** Firestore never accepts `undefined`; coerce optional file fields to null. */
function sanitizeIndex(index: WorkspaceIndex): WorkspaceIndex {
  return {
    onboarded: index.onboarded,
    profile: index.profile ?? null,
    workspaceName: index.workspaceName || 'My workspace',
    files: index.files.map((f) => ({ ...f, folderId: f.folderId ?? null })),
    folders: index.folders,
  }
}

const wsRef = (uid: string) => doc(db!, 'workspaces', uid)
const contentRef = (uid: string, fileId: string) => doc(db!, 'workspaces', uid, 'content', fileId)

/** Load a user's workspace index, or null if they have none yet. */
export async function pullWorkspace(uid: string): Promise<WorkspaceIndex | null> {
  if (!db) return null
  const snap = await getDoc(wsRef(uid))
  if (!snap.exists()) return null
  const d = snap.data() as Partial<WorkspaceIndex>
  return {
    onboarded: !!d.onboarded,
    profile: d.profile ?? null,
    workspaceName: d.workspaceName || 'My workspace',
    files: d.files ?? [],
    folders: d.folders ?? [],
  }
}

/** Upsert the user's workspace index. */
export async function pushWorkspace(uid: string, index: WorkspaceIndex): Promise<void> {
  if (!db) return
  await setDoc(wsRef(uid), { ...sanitizeIndex(index), updatedAt: serverTimestamp() }, { merge: true })
}

export type FileContent = {
  doc?: string
  canvas?: string
  code?: Record<string, string>
  comments?: string
  versions?: string
}

/** Load one file's content (doc / canvas snapshot / code), or null. */
export async function pullContent(uid: string, fileId: string): Promise<FileContent | null> {
  if (!db) return null
  const snap = await getDoc(contentRef(uid, fileId))
  return snap.exists() ? (snap.data() as FileContent) : null
}

// Firestore document hard limit is ~1 MB; skip oversized canvas snapshots.
const MAX_FIELD = 900_000

/** Upsert part of a file's content. Oversized fields are skipped (kept local). */
export async function pushContent(uid: string, fileId: string, partial: FileContent): Promise<void> {
  if (!db) return
  const payload: FileContent & { updatedAt: unknown } = { updatedAt: serverTimestamp() }
  if (partial.doc !== undefined && partial.doc.length < MAX_FIELD) payload.doc = partial.doc
  if (partial.canvas !== undefined && partial.canvas.length < MAX_FIELD) payload.canvas = partial.canvas
  if (partial.code) payload.code = partial.code
  if (partial.comments !== undefined && partial.comments.length < MAX_FIELD) payload.comments = partial.comments
  if (partial.versions !== undefined && partial.versions.length < MAX_FIELD) payload.versions = partial.versions
  await setDoc(contentRef(uid, fileId), payload, { merge: true })
}

// --- Sharing ---------------------------------------------------------------

export type ShareRole = 'view' | 'edit'
export type ShareSettings = {
  /** 'restricted' = only invited people; 'link' = anyone with the link. */
  access: 'restricted' | 'link'
  /** Role granted to anyone with the link (when access = 'link'). */
  linkRole: ShareRole
  /** Explicitly invited people. */
  invites: { email: string; role: ShareRole }[]
}

export const defaultShare = (): ShareSettings => ({ access: 'restricted', linkRole: 'view', invites: [] })

const shareRef = (fileId: string) => doc(db!, 'shares', fileId)

export type ShareDoc = ShareSettings & { ownerUid: string; title?: string }

/** Load a file's share settings (owner + who can access), or null. */
export async function pullShare(fileId: string): Promise<ShareDoc | null> {
  if (!db) return null
  const snap = await getDoc(shareRef(fileId))
  if (!snap.exists()) return null
  return snap.data() as ShareDoc
}

/** Save a file's share settings. */
export async function pushShare(fileId: string, ownerUid: string, title: string, settings: ShareSettings): Promise<void> {
  if (!db) return
  await setDoc(shareRef(fileId), { ownerUid, title, ...settings, updatedAt: serverTimestamp() }, { merge: true })
}

export async function queueShareInvite(input: {
  fileId: string
  title: string
  ownerUid: string
  ownerEmail: string | null
  recipientEmail: string
  role: ShareRole
  url: string
}): Promise<void> {
  if (!db) return
  await addDoc(collection(db, 'shareInvites'), {
    ...input,
    status: 'queued',
    createdAt: serverTimestamp(),
  })
}

/** The access a viewer has to a shared file. */
export type ShareAccess =
  | { status: 'granted'; ownerUid: string; role: ShareRole; title: string }
  | { status: 'denied' }
  | { status: 'notfound' }

/** Decide a viewer's role for a share doc: owner > explicit invite > link. */
function roleFor(s: ShareDoc, viewerUid: string | null, viewerEmail: string | null): ShareRole | null {
  if (viewerUid && viewerUid === s.ownerUid) return 'edit'
  const email = viewerEmail?.toLowerCase()
  const invite = email ? s.invites?.find((i) => i.email.toLowerCase() === email) : undefined
  if (invite) return invite.role
  if (s.access === 'link') return s.linkRole
  return null
}

/**
 * Resolve whether a viewer may open a shared file, and with what role. Reads the
 * `shares/{fileId}` doc — the single source of truth an owner controls from the
 * Share dialog.
 */
export async function resolveShareAccess(
  fileId: string,
  viewerUid: string | null,
  viewerEmail: string | null,
): Promise<ShareAccess> {
  const s = await pullShare(fileId)
  if (!s) return { status: 'notfound' }
  const role = roleFor(s, viewerUid, viewerEmail)
  if (!role) return { status: 'denied' }
  return { status: 'granted', ownerUid: s.ownerUid, role, title: s.title || 'Shared file' }
}

/** Remove a file's cloud content (on delete). */
export async function deleteContent(uid: string, fileId: string): Promise<void> {
  if (!db) return
  try {
    await deleteDoc(contentRef(uid, fileId))
  } catch {
    /* best-effort */
  }
}
