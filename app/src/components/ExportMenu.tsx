import { useEffect, useRef, useState } from 'react'
import { useDocStore } from '../store/useDocStore'
import { useApp, selectCurrentFile } from '../store/useApp'
import { useEditorUi } from '../store/useEditorUi'
import { exportImage, exportPdf, exportMarkdown, exportDocHtml, exportDocPdf, exportAnimatedHtml, exportSlidesPdf } from '../canvas/exporters'
import { LoadingAnimation } from './LoadingAnimation'

/** Export popover: canvas → PNG/SVG/PDF, doc → Markdown. */
export function ExportMenu() {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const file = useApp(selectCurrentFile)
  const title = file?.title ?? 'nexusblock'
  const flowStyle = useEditorUi((s) => s.flowAnimationStyle)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    try {
      await fn()
    } finally {
      setBusy(false)
      setOpen(false)
    }
  }

  const canvas = () => useDocStore.getState().editor
  const doc = () => useDocStore.getState().docExporter

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-w-[76px] items-center justify-center rounded-full border border-grey-2 px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-ink"
      >
        {busy ? <LoadingAnimation size="sm" variant="rotate8" label="" className="-my-1 scale-75" /> : 'Export'}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-52 rounded-xl border border-line bg-paper p-1.5 shadow-[0_16px_40px_-16px_rgba(0,0,0,.3)]">
          <Group label="Canvas" />
          <Item disabled={busy} onClick={() => run(async () => { const e = canvas(); if (e) await exportImage(e, title, 'png') })}>
            PNG image
          </Item>
          <Item disabled={busy} onClick={() => run(async () => { const e = canvas(); if (e) await exportImage(e, title, 'svg') })}>
            SVG vector
          </Item>
          <Item disabled={busy} onClick={() => run(async () => { const e = canvas(); if (e) await exportPdf(e, title) })}>
            PDF document
          </Item>
          <Item disabled={busy} onClick={() => run(async () => { const e = canvas(); if (e) await exportAnimatedHtml(e, title, flowStyle) })}>
            Animated HTML (.html)
          </Item>
          <Item disabled={busy} onClick={() => run(async () => { const e = canvas(); if (e) await exportSlidesPdf(e, title) })}>
            Presentation slides (.pdf)
          </Item>
          <Group label="Document" />
          <Item
            disabled={busy}
            onClick={() =>
              run(async () => {
                const d = doc()
                if (d) await exportMarkdown(await d.toMarkdown(), title)
              })
            }
          >
            Markdown (.md)
          </Item>
          <Item
            disabled={busy}
            onClick={() =>
              run(async () => {
                const d = doc()
                if (d) await exportDocHtml(await d.toHTML(), title)
              })
            }
          >
            HTML (.html)
          </Item>
          <Item
            disabled={busy}
            onClick={() =>
              run(async () => {
                const d = doc()
                if (d) await exportDocPdf(await d.toHTML(), title)
              })
            }
          >
            PDF (.pdf)
          </Item>
        </div>
      )}
    </div>
  )
}

function Group({ label }: { label: string }) {
  return (
    <div className="px-2 pb-1 pt-1.5 font-mono text-[9.5px] uppercase tracking-widest text-grey-3">
      {label}
    </div>
  )
}

function Item({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="block w-full rounded-lg px-2.5 py-1.5 text-left text-sm font-medium text-grey-4 transition-colors hover:bg-grey-1 hover:text-ink disabled:opacity-40"
    >
      {children}
    </button>
  )
}
