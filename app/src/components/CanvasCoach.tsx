import { useEffect, useState } from 'react'
import { react } from 'tldraw'
import { useDocStore } from '../store/useDocStore'

const TIPS = [
  'Press T to add text, or drag an icon from the left rail',
  'Draw a box, then hover it — grab a dot to connect it to another',
  'Everything autosaves; open History up top to snapshot a version',
]

/**
 * Empty-canvas coaching. Appears only while the page has no shapes and fades out
 * the moment the user creates something — the gentle "what do I do now?" nudge.
 */
export function CanvasCoach() {
  const editor = useDocStore((s) => s.editor)
  const [empty, setEmpty] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!editor) return
    return react('coach: page empty?', () => {
      setEmpty(editor.getCurrentPageShapeIds().size === 0)
    })
  }, [editor])

  if (!editor || !empty || dismissed) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
      <div className="pointer-events-auto max-w-sm rounded-2xl border border-line bg-paper/95 p-5 text-center shadow-[0_20px_50px_-24px_rgba(0,0,0,.35)] backdrop-blur">
        <p className="font-display text-lg font-semibold tracking-tight">This canvas is yours</p>
        <ul className="mt-3 space-y-1.5 text-sm text-grey-4">
          {TIPS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <button
          onClick={() => setDismissed(true)}
          className="mt-4 rounded-full border border-grey-2 px-4 py-1.5 text-xs font-semibold text-ink hover:border-ink"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
