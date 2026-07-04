import { useEffect } from 'react'
import { createTable } from '../canvas/createNode'
import { useDocStore } from '../store/useDocStore'

const isEditableTarget = (target: EventTarget | null) => {
  const node = target as HTMLElement | null
  if (!node) return false
  return !!node.closest('input, textarea, select, [contenteditable="true"], .monaco-editor, [data-canvas-editor-block="true"]')
}

export function TableShortcuts() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 't') return
      if (!(event.metaKey || event.ctrlKey) || !event.altKey || event.shiftKey) return
      if (isEditableTarget(event.target)) return
      const editor = useDocStore.getState().editor
      if (!editor || editor.getEditingShapeId()) return

      event.preventDefault()
      createTable(editor)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return null
}
