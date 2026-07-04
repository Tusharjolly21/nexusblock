import type { Editor } from 'tldraw'
import { jsPDF } from 'jspdf'

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const slug = (s: string) => s.trim().replace(/[^\w-]+/g, '-').toLowerCase() || 'nexusblock'

/** All shapes on the current page (what we export). */
function pageIds(editor: Editor) {
  return Array.from(editor.getCurrentPageShapeIds())
}

/** Export the canvas as a PNG (2x) or SVG file. */
export async function exportImage(editor: Editor, title: string, format: 'png' | 'svg') {
  const ids = pageIds(editor)
  if (ids.length === 0) return
  const res = await editor.toImage(ids, {
    format,
    scale: format === 'png' ? 2 : 1,
    background: true,
    padding: 24,
  })
  if (res?.blob) download(res.blob, `${slug(title)}.${format}`)
}

/** Export the canvas as a PDF sized to the diagram. */
export async function exportPdf(editor: Editor, title: string) {
  const ids = pageIds(editor)
  if (ids.length === 0) return
  const res = await editor.toImage(ids, { format: 'png', scale: 2, background: true, padding: 24 })
  if (!res?.blob) return
  const dataUrl = await blobToDataUrl(res.blob)
  const w = res.width
  const h = res.height
  const pdf = new jsPDF({ orientation: w >= h ? 'landscape' : 'portrait', unit: 'px', format: [w, h] })
  pdf.addImage(dataUrl, 'PNG', 0, 0, w, h)
  pdf.save(`${slug(title)}.pdf`)
}

/**
 * Snapshot the current canvas to a PNG data URL — used to embed a live diagram
 * figure into the note editor (Eraser's "insert diagram from canvas"). Returns
 * null when the canvas is empty.
 */
export async function snapshotCanvas(editor: Editor): Promise<string | null> {
  const ids = pageIds(editor)
  if (ids.length === 0) return null
  const res = await editor.toImage(ids, { format: 'png', scale: 2, background: true, padding: 24 })
  if (!res?.blob) return null
  return blobToDataUrl(res.blob)
}

/** Export the doc pane's content as a Markdown file. */
export async function exportMarkdown(markdown: string, title: string) {
  const blob = new Blob([`# ${title}\n\n${markdown}`], { type: 'text/markdown' })
  download(blob, `${slug(title)}.md`)
}

/** Wrap a BlockNote HTML fragment in a standalone, lightly-styled document. */
function htmlDocument(title: string, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font:16px/1.65 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#18181b;max-width:720px;margin:48px auto;padding:0 24px}h1,h2,h3{line-height:1.25}pre{background:#f4f4f5;padding:12px 16px;border-radius:8px;overflow:auto}code{font-family:'JetBrains Mono',monospace;font-size:.9em}img{max-width:100%}table{border-collapse:collapse}td,th{border:1px solid #e4e4e7;padding:6px 10px}</style>
</head><body><h1>${title}</h1>${body}</body></html>`
}

/** Export the doc pane's content as an HTML file. */
export async function exportDocHtml(html: string, title: string) {
  const blob = new Blob([htmlDocument(title, html)], { type: 'text/html' })
  download(blob, `${slug(title)}.html`)
}

/** Export the doc pane's content as a PDF (renders the HTML via jsPDF). */
export async function exportDocPdf(html: string, title: string) {
  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:720px;padding:8px;font:15px/1.6 -apple-system,sans-serif;color:#111'
  container.innerHTML = `<h1 style="font-size:26px;margin:0 0 12px">${title}</h1>${html}`
  document.body.appendChild(container)
  const pdf = new jsPDF({ unit: 'px', format: 'a4' })
  await pdf.html(container, {
    x: 24,
    y: 24,
    width: 550,
    windowWidth: 760,
    autoPaging: 'text',
    callback: (doc) => {
      doc.save(`${slug(title)}.pdf`)
      container.remove()
    },
  })
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = reject
    r.readAsDataURL(blob)
  })
}
