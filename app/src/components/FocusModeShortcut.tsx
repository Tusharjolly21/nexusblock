import { useEffect } from 'react'
import { useEditorUi } from '../store/useEditorUi'

export const FOCUS_SHORTCUT_LABEL = 'Ctrl+\\'

/** Global focus-mode shortcut. Cmd+\ also works on macOS. */
export function FocusModeShortcut() {
  const toggleFocusMode = useEditorUi((s) => s.toggleFocusMode)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((!e.ctrlKey && !e.metaKey) || e.altKey || e.shiftKey) return
      if (e.key !== '\\' && e.code !== 'Backslash') return
      e.preventDefault()
      e.stopPropagation()
      toggleFocusMode()
    }
    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true })
  }, [toggleFocusMode])

  return null
}
