import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TemplateId } from '../onboarding/templates'

export type Role = 'engineer' | 'pm' | 'designer' | 'other'
export type TeamKind = 'solo' | 'team'

export type Profile = {
  name: string
  role: Role
  team: TeamKind
  useCase: string
  teamName?: string
  invitedEmails?: string[]
  inviteLinkEnabled?: boolean
  preferredTone?: 'light' | 'obsidian'
  mcpClient?: string
  importedDiagramNames?: string[]
  stylePreference?: 'technical' | 'product' | 'minimal'
  plan?: 'free' | 'pro'
  gitRepoUrl?: string
  apiTokens?: { id: string; name: string; prefix: string; tokenHash: string; createdAt: number }[]
  customIcons?: { id: string; name: string; dataUrl: string; createdAt: number }[]
  teamIconUrl?: string | null
  teamLogoUrl?: string | null
  defaultLinkAccess?: 'restricted' | 'view' | 'edit'
  allowedInviteDomains?: string[]
}

export type FileMeta = {
  id: string
  title: string
  template: TemplateId
  createdAt: number
  updatedAt: number
  /** Folder this file lives in; null/undefined = unfiled (top level). */
  folderId?: string | null
  /** If set, this file is shared with the viewer by this owner's uid — not
   * owned locally. Excluded from the persisted/synced workspace index. */
  sharedFrom?: string | null
  /** The viewer's permission on a shared file. */
  sharedRole?: 'view' | 'edit'
}

export type Folder = {
  id: string
  name: string
  createdAt: number
}

/** The user-owned slice that syncs to the cloud (Firestore). */
export type WorkspaceIndex = {
  onboarded: boolean
  profile: Profile | null
  workspaceName: string
  files: FileMeta[]
  folders: Folder[]
}

type AppState = {
  onboarded: boolean
  profile: Profile | null
  workspaceName: string
  files: FileMeta[]
  folders: Folder[]
  /** Which file is open. The URL (/app/file/:id) is the source of truth; the
   * file route mirrors it here so selectors keep working. */
  currentFileId: string | null
  /** Firebase uid that the locally-persisted workspace belongs to. Guards
   * against showing one user's files to another on a shared browser. */
  ownerUid: string | null

  completeOnboarding: (profile: Profile, workspaceName: string) => void
  updateProfile: (profile: Partial<Profile>) => void
  setWorkspaceName: (name: string) => void
  /** Replace the local workspace with a cloud copy (on login / device switch). */
  hydrateWorkspace: (data: WorkspaceIndex, ownerUid: string) => void
  /** Start a clean workspace for a different user on this browser. */
  resetWorkspace: (ownerUid: string) => void
  setOwner: (ownerUid: string) => void
  createFile: (template: TemplateId, title?: string, folderId?: string | null) => string
  /** Open a file shared by another user (resolved from a share link). Held in
   * memory only — never persisted or pushed to this user's own workspace. */
  openSharedFile: (file: FileMeta) => void
  openFile: (id: string) => void
  renameFile: (id: string, title: string) => void
  deleteFile: (id: string) => void
  touchFile: (id: string) => void
  moveFile: (id: string, folderId: string | null) => void
  createFolder: (name: string) => string
  renameFolder: (id: string, name: string) => void
  deleteFolder: (id: string) => void
  setCurrentFile: (id: string | null) => void
}

const uid = () => crypto.randomUUID()

/** App-level state: local profile + files + which view we're on (no server yet). */
export const useApp = create<AppState>()(
  persist(
    (set) => ({
      onboarded: false,
      profile: null,
      workspaceName: 'My workspace',
      files: [],
      folders: [],
      currentFileId: null,
      ownerUid: null,

      completeOnboarding: (profile, workspaceName) =>
        set({ onboarded: true, profile, workspaceName: workspaceName || 'My workspace' }),

      updateProfile: (profile) =>
        set((s) => ({ profile: s.profile ? { ...s.profile, ...profile } : null })),

      setWorkspaceName: (name) =>
        set((s) => {
          const workspaceName = name.trim() || s.workspaceName
          return {
            workspaceName,
            profile: s.profile ? { ...s.profile, teamName: workspaceName } : s.profile,
          }
        }),

      hydrateWorkspace: (data, ownerUid) =>
        set({
          onboarded: data.onboarded,
          profile: sanitizeProfile(data.profile),
          workspaceName: data.workspaceName || 'My workspace',
          files: data.files ?? [],
          folders: data.folders ?? [],
          ownerUid,
        }),

      resetWorkspace: (ownerUid) =>
        set({ onboarded: false, profile: null, workspaceName: 'My workspace', files: [], folders: [], currentFileId: null, ownerUid }),

      setOwner: (ownerUid) => set({ ownerUid }),

      createFile: (template, title, folderId = null) => {
        const id = uid()
        const now = Date.now()
        const file: FileMeta = {
          id,
          title: title?.trim() || defaultTitle(template),
          template,
          createdAt: now,
          updatedAt: now,
          folderId,
        }
        set((s) => ({ files: [file, ...s.files], currentFileId: id }))
        return id
      },

      openSharedFile: (file) =>
        set((s) => ({
          files: s.files.some((f) => f.id === file.id)
            ? s.files.map((f) => (f.id === file.id ? { ...f, ...file } : f))
            : [file, ...s.files],
          currentFileId: file.id,
        })),

      openFile: (id) => set({ currentFileId: id }),

      renameFile: (id, title) =>
        set((s) => ({
          files: s.files.map((f) => (f.id === id ? { ...f, title, updatedAt: Date.now() } : f)),
        })),

      deleteFile: (id) => {
        // Also drop the per-file canvas/doc snapshots.
        localStorage.removeItem(`nb-doc-${id}`)
        localStorage.removeItem(`nb-seeded-${id}`)
        set((s) => ({
          files: s.files.filter((f) => f.id !== id),
          currentFileId: s.currentFileId === id ? null : s.currentFileId,
        }))
      },

      touchFile: (id) =>
        set((s) => ({
          files: s.files.map((f) => (f.id === id ? { ...f, updatedAt: Date.now() } : f)),
        })),

      moveFile: (id, folderId) =>
        set((s) => ({
          files: s.files.map((f) => (f.id === id ? { ...f, folderId, updatedAt: Date.now() } : f)),
        })),

      createFolder: (name) => {
        const id = uid()
        set((s) => ({ folders: [...s.folders, { id, name: name.trim() || 'New folder', createdAt: Date.now() }] }))
        return id
      },

      renameFolder: (id, name) =>
        set((s) => ({ folders: s.folders.map((f) => (f.id === id ? { ...f, name: name.trim() || f.name } : f)) })),

      deleteFolder: (id) =>
        set((s) => ({
          folders: s.folders.filter((f) => f.id !== id),
          // Unfile any files that lived in the deleted folder (keep the files).
          files: s.files.map((f) => (f.folderId === id ? { ...f, folderId: null } : f)),
        })),

      setCurrentFile: (id) => set({ currentFileId: id }),
    }),
    {
      name: 'nexusblock-app',
      partialize: (s) => ({
        onboarded: s.onboarded,
        profile: sanitizeProfile(s.profile),
        workspaceName: s.workspaceName,
        // Shared files are held in memory only — don't persist them as owned.
        files: s.files.filter((f) => !f.sharedFrom),
        folders: s.folders,
        ownerUid: s.ownerUid,
      }),
      merge: (persisted, current) => {
        const data = persisted as Partial<AppState>
        return {
          ...current,
          ...data,
          profile: sanitizeProfile(data.profile ?? null),
          files: data.files ?? current.files,
          folders: data.folders ?? current.folders,
        }
      },
    },
  ),
)

/** The cloud-synced slice of app state. */
export const selectWorkspaceIndex = (s: AppState): WorkspaceIndex => ({
  onboarded: s.onboarded,
  profile: sanitizeProfileForCloud(s.profile),
  workspaceName: s.workspaceName,
  // Only the user's own files sync to their cloud workspace, never shared ones.
  files: s.files.filter((f) => !f.sharedFrom),
  folders: s.folders,
})

function sanitizeProfile(profile: Profile | null): Profile | null {
  if (!profile) return null
  const apiTokens = profile.apiTokens?.map((token) => {
    const maybeLegacy = token as typeof token & { token?: string }
    return {
      id: token.id,
      name: token.name,
      prefix: token.prefix || (maybeLegacy.token ? `${maybeLegacy.token.slice(0, 7)}...${maybeLegacy.token.slice(-4)}` : 'nb_...'),
      tokenHash: token.tokenHash || '',
      createdAt: token.createdAt,
    }
  })
  return { ...profile, apiTokens }
}

function sanitizeProfileForCloud(profile: Profile | null): Profile | null {
  const clean = sanitizeProfile(profile)
  if (!clean) return null
  return {
    ...clean,
    customIcons: clean.customIcons?.map((icon) => ({ ...icon, dataUrl: icon.dataUrl.startsWith('data:') ? '' : icon.dataUrl })),
    teamIconUrl: clean.teamIconUrl?.startsWith('data:') ? null : clean.teamIconUrl,
    teamLogoUrl: clean.teamLogoUrl?.startsWith('data:') ? null : clean.teamLogoUrl,
  }
}

function defaultTitle(template: TemplateId): string {
  switch (template) {
    case 'system':
      return 'System architecture'
    case 'micro':
      return 'Microservices'
    case 'notes':
      return 'Design note'
    case 'git-s3':
      return 'Git to S3 using Webhooks'
    default:
      return 'Untitled diagram'
  }
}

/** Selector helper for the currently open file. */
export const selectCurrentFile = (s: AppState): FileMeta | null =>
  s.files.find((f) => f.id === s.currentFileId) ?? null
