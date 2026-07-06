import { create } from 'zustand'
import type { NexusGraphIR } from '../catalog/seedTemplates'

export type InsertedTemplate = {
  templateId: string
  origin: { x: number; y: number }
  graph: NexusGraphIR
  detailLevel: number
  isAnimated: boolean
  activeScenarioId?: string
  currentStepIndex?: number
  isPlaying?: boolean
  speed?: number // speed factor (e.g. 1, 1.5, 2)
  isSpiked?: boolean
  isChaos?: boolean
}

type CatalogStore = {
  insertedTemplates: InsertedTemplate[]
  addInsertedTemplate: (tpl: InsertedTemplate) => void
  updateInsertedTemplate: (id: string, patch: Partial<InsertedTemplate>) => void
  removeInsertedTemplate: (id: string) => void

  favorites: string[]
  setFavorites: (favs: string[]) => void

  recents: string[]
  setRecents: (recents: string[]) => void
}

export const useCatalogStore = create<CatalogStore>((set) => ({
  insertedTemplates: [],
  addInsertedTemplate: (tpl) =>
    set((s) => ({
      insertedTemplates: [...s.insertedTemplates.filter((x) => x.templateId !== tpl.templateId), tpl],
    })),
  updateInsertedTemplate: (id, patch) =>
    set((s) => ({
      insertedTemplates: s.insertedTemplates.map((t) => (t.templateId === id ? { ...t, ...patch } : t)),
    })),
  removeInsertedTemplate: (id) =>
    set((s) => ({
      insertedTemplates: s.insertedTemplates.filter((t) => t.templateId !== id),
    })),
  favorites: [],
  setFavorites: (favorites) => set({ favorites }),
  recents: [],
  setRecents: (recents) => set({ recents }),
}))
