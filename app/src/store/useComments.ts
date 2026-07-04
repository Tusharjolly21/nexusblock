import { create } from 'zustand'

export type CommentTarget =
  | { kind: 'canvas'; shapeId: string; label: string }
  | { kind: 'doc'; blockId: string; label: string }
  /** A pin dropped at an arbitrary page coordinate on the canvas. */
  | { kind: 'point'; x: number; y: number; label: string }

export type CommentThread = {
  id: string
  target: CommentTarget
  author: string
  body: string
  status: 'open' | 'resolved'
  createdAt: number
  updatedAt: number
}

type CommentsState = {
  threadsByFile: Record<string, CommentThread[]>
  setThreads: (fileId: string, threads: CommentThread[]) => void
  addThread: (fileId: string, thread: Omit<CommentThread, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => CommentThread
  updateThread: (fileId: string, id: string, patch: Partial<Pick<CommentThread, 'body' | 'status'>>) => void
  deleteThread: (fileId: string, id: string) => void
}

export const useComments = create<CommentsState>((set) => ({
  threadsByFile: {},
  setThreads: (fileId, threads) => set((s) => ({ threadsByFile: { ...s.threadsByFile, [fileId]: threads } })),
  addThread: (fileId, thread) => {
    const now = Date.now()
    const next: CommentThread = {
      ...thread,
      id: `thread-${now}-${Math.random().toString(36).slice(2, 8)}`,
      status: 'open',
      createdAt: now,
      updatedAt: now,
    }
    set((s) => ({ threadsByFile: { ...s.threadsByFile, [fileId]: [...(s.threadsByFile[fileId] ?? []), next] } }))
    return next
  },
  updateThread: (fileId, id, patch) => {
    set((s) => ({
      threadsByFile: {
        ...s.threadsByFile,
        [fileId]: (s.threadsByFile[fileId] ?? []).map((thread) =>
          thread.id === id ? { ...thread, ...patch, updatedAt: Date.now() } : thread,
        ),
      },
    }))
  },
  deleteThread: (fileId, id) => {
    set((s) => ({
      threadsByFile: {
        ...s.threadsByFile,
        [fileId]: (s.threadsByFile[fileId] ?? []).filter((thread) => thread.id !== id),
      },
    }))
  },
}))

export function commentsStorageKey(fileId: string) {
  return `nb-comments-${fileId}`
}

export function loadLocalComments(fileId: string): CommentThread[] {
  try {
    const raw = localStorage.getItem(commentsStorageKey(fileId))
    return raw ? (JSON.parse(raw) as CommentThread[]) : []
  } catch {
    return []
  }
}

export function saveLocalComments(fileId: string, threads: CommentThread[]) {
  localStorage.setItem(commentsStorageKey(fileId), JSON.stringify(threads))
}
