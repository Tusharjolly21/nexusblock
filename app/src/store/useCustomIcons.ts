import { create } from 'zustand'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from './useAuth'

export type IconGroup = {
  id: string
  name: string
  createdAt: number
}

export type CustomIcon = {
  id: string
  name: string
  src: string
  type: string
  groupId?: string
  createdAt: number
}

const KEY = 'nb-custom-icons-v2'
const MAX_ICON_BYTES = 900_000

type CustomIconsState = {
  icons: CustomIcon[]
  groups: IconGroup[]
  hydrated: boolean
  hydrate: () => void
  addFiles: (files: FileList | File[]) => Promise<{ added: number; skipped: string[] }>
  removeIcon: (id: string) => void
  renameIcon: (id: string, name: string) => void
  createGroup: (name: string) => void
  deleteGroup: (id: string) => void
  moveIcon: (iconId: string, groupId: string | null) => void
}

export const useCustomIcons = create<CustomIconsState>((set, get) => ({
  icons: [],
  groups: [],
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return
    const local = readLocal()
    set({ icons: local.icons, groups: local.groups, hydrated: true })
    
    // Attempt cloud pull on startup
    const uid = useAuth.getState().uid
    if (uid && db) {
      getDoc(doc(db, 'customIcons', uid)).then((snap) => {
        if (snap.exists()) {
          const data = snap.data()
          const cloudIcons = Array.isArray(data.icons) ? data.icons : []
          const cloudGroups = Array.isArray(data.groups) ? data.groups : []
          set({ icons: cloudIcons, groups: cloudGroups })
          persistLocal(cloudIcons, cloudGroups)
        }
      }).catch((e) => {
        console.error('[cloud-icons] initial pull failed:', e)
      })
    }
  },
  addFiles: async (files) => {
    const added: CustomIcon[] = []
    const skipped: string[] = []
    for (const file of Array.from(files)) {
      if (!isIconFile(file)) {
        skipped.push(`${file.name} is not SVG, PNG, JPG, or WebP`)
        continue
      }
      if (file.size > MAX_ICON_BYTES) {
        skipped.push(`${file.name} is larger than 900 KB`)
        continue
      }
      const src = await fileToDataUrl(file)
      added.push({
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: cleanName(file.name),
        src,
        type: file.type || 'image/svg+xml',
        createdAt: Date.now(),
      })
    }
    const nextIcons = [...added, ...get().icons]
    set({ icons: nextIcons })
    persistLocal(nextIcons, get().groups)
    syncToFirebase(nextIcons, get().groups)
    return { added: added.length, skipped }
  },
  removeIcon: (id) => {
    const nextIcons = get().icons.filter((icon) => icon.id !== id)
    set({ icons: nextIcons })
    persistLocal(nextIcons, get().groups)
    syncToFirebase(nextIcons, get().groups)
  },
  renameIcon: (id, name) => {
    const nextIcons = get().icons.map((icon) => icon.id === id ? { ...icon, name: name.trim() || icon.name } : icon)
    set({ icons: nextIcons })
    persistLocal(nextIcons, get().groups)
    syncToFirebase(nextIcons, get().groups)
  },
  createGroup: (name) => {
    const nextGroup: IconGroup = {
      id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim() || 'New group',
      createdAt: Date.now(),
    }
    const nextGroups = [...get().groups, nextGroup]
    set({ groups: nextGroups })
    persistLocal(get().icons, nextGroups)
    syncToFirebase(get().icons, nextGroups)
  },
  deleteGroup: (id) => {
    const nextGroups = get().groups.filter((g) => g.id !== id)
    const nextIcons = get().icons.map((icon) =>
      icon.groupId === id ? { ...icon, groupId: undefined } : icon
    )
    set({ groups: nextGroups, icons: nextIcons })
    persistLocal(nextIcons, nextGroups)
    syncToFirebase(nextIcons, nextGroups)
  },
  moveIcon: (iconId, groupId) => {
    const nextIcons = get().icons.map((icon) =>
      icon.id === iconId ? { ...icon, groupId: groupId || undefined } : icon
    )
    set({ icons: nextIcons })
    persistLocal(nextIcons, get().groups)
    syncToFirebase(nextIcons, get().groups)
  },
}))

export function isCustomIconSrc(icon: string) {
  return icon.startsWith('data:image/')
}

function readLocal(): { icons: CustomIcon[]; groups: IconGroup[] } {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { icons: [], groups: [] }
    const parsed = JSON.parse(raw)
    const icons = Array.isArray(parsed?.icons) ? parsed.icons : (Array.isArray(parsed) ? parsed : [])
    const groups = Array.isArray(parsed?.groups) ? parsed.groups : []
    return {
      icons: icons.filter((i: any) => i?.src?.startsWith('data:image/')),
      groups
    }
  } catch {
    return { icons: [], groups: [] }
  }
}

function persistLocal(icons: CustomIcon[], groups: IconGroup[]) {
  localStorage.setItem(KEY, JSON.stringify({ icons, groups }))
}

async function syncToFirebase(icons: CustomIcon[], groups: IconGroup[]) {
  const uid = useAuth.getState().uid
  if (!uid || !db) return
  try {
    await setDoc(doc(db, 'customIcons', uid), {
      icons,
      groups,
      updatedAt: Date.now()
    }, { merge: true })
  } catch (err) {
    console.error('[cloud-icons] push failed:', err)
  }
}

// Watch user session changes to sync icons
useAuth.subscribe((state, prevState) => {
  if (state.uid !== prevState.uid && state.uid && db) {
    getDoc(doc(db, 'customIcons', state.uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data()
        const cloudIcons = Array.isArray(data.icons) ? data.icons : []
        const cloudGroups = Array.isArray(data.groups) ? data.groups : []
        useCustomIcons.setState({ icons: cloudIcons, groups: cloudGroups, hydrated: true })
        persistLocal(cloudIcons, cloudGroups)
      }
    }).catch(() => {})
  }
})

function isIconFile(file: File) {
  return ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'].includes(file.type)
}

function cleanName(name: string) {
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase()) || 'Custom icon'
}

async function fileToDataUrl(file: File): Promise<string> {
  if (file.type === 'image/svg+xml') {
    const raw = await file.text()
    const sanitized = raw
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
      .replace(/\s(href|xlink:href)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, '')
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(sanitized)))}`
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
