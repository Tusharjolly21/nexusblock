import { create } from 'zustand'

export type CustomIcon = {
  id: string
  name: string
  src: string
  type: string
  createdAt: number
}

const KEY = 'nb-custom-icons-v1'
const MAX_ICON_BYTES = 900_000

type CustomIconsState = {
  icons: CustomIcon[]
  hydrated: boolean
  hydrate: () => void
  addFiles: (files: FileList | File[]) => Promise<{ added: number; skipped: string[] }>
  removeIcon: (id: string) => void
  renameIcon: (id: string, name: string) => void
}

export const useCustomIcons = create<CustomIconsState>((set, get) => ({
  icons: [],
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return
    set({ icons: readIcons(), hydrated: true })
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
    const next = [...added, ...get().icons]
    persist(next)
    set({ icons: next, hydrated: true })
    return { added: added.length, skipped }
  },
  removeIcon: (id) => {
    const next = get().icons.filter((icon) => icon.id !== id)
    persist(next)
    set({ icons: next })
  },
  renameIcon: (id, name) => {
    const next = get().icons.map((icon) => icon.id === id ? { ...icon, name: name.trim() || icon.name } : icon)
    persist(next)
    set({ icons: next })
  },
}))

export function isCustomIconSrc(icon: string) {
  return icon.startsWith('data:image/')
}

function readIcons(): CustomIcon[] {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? (JSON.parse(raw) as CustomIcon[]) : []
    return Array.isArray(parsed) ? parsed.filter((icon) => icon?.src?.startsWith('data:image/')) : []
  } catch {
    return []
  }
}

function persist(icons: CustomIcon[]) {
  localStorage.setItem(KEY, JSON.stringify(icons))
}

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

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
