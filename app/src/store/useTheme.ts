import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Tone = 'light' | 'obsidian'

export const TONES: { id: Tone; label: string; swatch: string; dark: boolean }[] = [
  { id: 'light', label: 'Light', swatch: '#f8f7f4', dark: false },
  { id: 'obsidian', label: 'Obsidian', swatch: '#0b0b0d', dark: true },
]

export const isDarkTone = (tone: Tone) => tone === 'obsidian'

type ThemeState = {
  tone: Tone
  setTone: (tone: Tone) => void
}

/** Persisted mode selection. Applied to <html data-tone> via applyTone(). */
export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      tone: 'light',
      setTone: (tone) => {
        const next = normalizeTone(tone)
        applyTone(next)
        set({ tone: next })
      },
    }),
    {
      name: 'nexusblock-tone',
      version: 2,
      partialize: (state) => ({ tone: state.tone }),
      migrate: (persistedState) => {
        const state = persistedState as Partial<ThemeState> | undefined
        return { tone: normalizeTone(state?.tone) }
      },
      onRehydrateStorage: () => (state) => {
        if (state) applyTone(state.tone)
      },
    },
  ),
)

/** Set the mode on <html>, with a brief crossfade class. */
export function applyTone(tone: Tone) {
  const el = document.documentElement
  el.dataset.tone = normalizeTone(tone)
  el.classList.add('tone-transition')
  window.setTimeout(() => el.classList.remove('tone-transition'), 450)
}

/** Apply the persisted mode immediately (call once on boot). */
export function bootTone() {
  const raw = localStorage.getItem('nexusblock-tone')
  let tone: Tone = 'light'
  try {
    if (raw) tone = normalizeTone(JSON.parse(raw).state?.tone)
  } catch {
    /* default */
  }
  document.documentElement.dataset.tone = tone
}

function normalizeTone(value: unknown): Tone {
  if (value === 'obsidian' || value === 'graphite' || value === 'void') return 'obsidian'
  return 'light'
}
