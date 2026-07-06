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

/** Apply customized workspace branding color, font family and grid variables. */
export function applyBrandStyle(primaryColor?: string, dotColor?: string, fontFamily?: string) {
  if (typeof document === 'undefined') return
  let styleEl = document.getElementById('nexusblock-brand-overrides') as HTMLStyleElement
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = 'nexusblock-brand-overrides'
    document.head.appendChild(styleEl)
  }

  let cssRules = ''
  
  if (primaryColor) {
    cssRules += `
      :root, [data-tone] {
        --color-brand-primary: ${primaryColor} !important;
      }
      .bg-\\[rgb\\(39\\,106\\,221\\)\\] {
        background-color: ${primaryColor} !important;
      }
      .bg-\\[rgb\\(39\\,106\\,222\\)\\] {
        background-color: ${primaryColor} !important;
      }
      .text-sky-500, .text-sky-600 {
        color: ${primaryColor} !important;
      }
      .border-sky-500 {
        border-color: ${primaryColor} !important;
      }
      .focus-within\\:border-sky-500:focus-within {
        border-color: ${primaryColor} !important;
      }
    `
  }
  
  if (dotColor) {
    cssRules += `
      :root, [data-tone] {
        --color-canvas-dot: ${dotColor} !important;
      }
      .tl-grid-dot {
        fill: ${dotColor} !important;
      }
    `
  }

  if (fontFamily) {
    cssRules += `
      body, input, button, select, textarea, .tl-container {
        font-family: "${fontFamily}", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
      }
    `
    let fontLink = document.getElementById('nexusblock-brand-font') as HTMLLinkElement
    if (!fontLink) {
      fontLink = document.createElement('link')
      fontLink.id = 'nexusblock-brand-font'
      fontLink.rel = 'stylesheet'
      document.head.appendChild(fontLink)
    }
    fontLink.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, '+')}:wght@300;400;500;600;700&display=swap`
  } else {
    const fontLink = document.getElementById('nexusblock-brand-font')
    if (fontLink) fontLink.remove()
  }

  styleEl.innerHTML = cssRules
}
