import { getSnapshot, loadSnapshot, type Editor, type TLEditorSnapshot } from 'tldraw'

/**
 * Lightweight version history built on tldraw store snapshots.
 * Phase 1: localStorage. Maps to DOCUMENT_VERSIONS (append-only) in the arch
 * doc §3 and powers the visual diffs in §6.2 — snapshots are never mutated,
 * only appended.
 */
export type DocVersion = {
  id: string
  label: string
  createdAt: number
  snapshot: TLEditorSnapshot
}

const KEY = 'drawdocs-versions-phase1'

export function versionsStorageKey(fileId?: string) {
  return fileId ? `${KEY}-${fileId}` : KEY
}

export function loadVersions(fileId?: string): DocVersion[] {
  try {
    const raw = localStorage.getItem(versionsStorageKey(fileId))
    return raw ? (JSON.parse(raw) as DocVersion[]) : []
  } catch {
    return []
  }
}

export function saveVersions(fileId: string | undefined, versions: DocVersion[]) {
  localStorage.setItem(versionsStorageKey(fileId), JSON.stringify(versions))
}

export function saveVersion(editor: Editor, label?: string, fileId?: string): DocVersion[] {
  const versions = loadVersions(fileId)
  const snapshot = getSnapshot(editor.store)
  const version: DocVersion = {
    id: crypto.randomUUID(),
    label: label?.trim() || `v${versions.length + 1}`,
    createdAt: Date.now(),
    snapshot,
  }
  // Append-only: newest first for display, never overwrite existing snapshots.
  const next = [version, ...versions]
  saveVersions(fileId, next)
  return next
}

export function restoreVersion(editor: Editor, version: DocVersion) {
  loadSnapshot(editor.store, version.snapshot)
}
