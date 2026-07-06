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

export async function exportAnimatedHtml(editor: Editor, title: string, flowStyle: 'particle' | 'dashes' | 'laser' | 'droplet') {
  const ids = pageIds(editor)
  if (ids.length === 0) return
  const res = await editor.toImage(ids, {
    format: 'svg',
    background: true,
    padding: 24,
  })
  if (!res?.blob) return
  
  const svgText = await res.blob.text()
  const arrows = editor.getCurrentPageShapes().filter((s) => s.type === 'arrow')
  
  let animationsSvg = ''
  for (const arrow of arrows) {
    const geom = editor.getShapeGeometry(arrow.id)
    if (!geom || !geom.vertices || geom.vertices.length < 2) continue
    const localPath = geom.vertices.map((v, i) => `${i === 0 ? 'M' : 'L'} ${v.x} ${v.y}`).join(' ')
    
    let animatedElement = ''
    if (flowStyle === 'particle') {
      animatedElement = `<circle r="4.5" fill="#60a5fa" style="offset-path: path('${localPath}'); animation: trace-flow-move 2.2s infinite linear; filter: drop-shadow(0 0 4px #3b82f6) drop-shadow(0 0 8px #60a5fa);" />`
    } else if (flowStyle === 'dashes') {
      animatedElement = `<path d="${localPath}" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-dasharray="12,12" style="animation: trace-flow-dashes 1.2s infinite linear; filter: drop-shadow(0 0 4px #0ea5e9);" />`
    } else if (flowStyle === 'laser') {
      animatedElement = `<path d="${localPath}" fill="none" stroke="#f43f5e" stroke-width="3" style="animation: trace-flow-laser 2.5s infinite linear, trace-flow-hue 6s infinite linear; filter: drop-shadow(0 0 5px #f43f5e);" />`
    } else if (flowStyle === 'droplet') {
      animatedElement = `
        <circle r="5" fill="#10b981" style="offset-path: path('${localPath}'); animation: trace-flow-move 2s infinite linear; filter: drop-shadow(0 0 4px #10b981);" />
        <circle r="3.5" fill="#34d399" style="offset-path: path('${localPath}'); animation: trace-flow-move 2s infinite linear; animation-delay: -0.12s; filter: drop-shadow(0 0 3px #34d399); opacity: 0.75;" />
        <circle r="2.2" fill="#a7f3d0" style="offset-path: path('${localPath}'); animation: trace-flow-move 2s infinite linear; animation-delay: -0.24s; filter: drop-shadow(0 0 2px #a7f3d0); opacity: 0.45;" />
      `
    }
    
    animationsSvg += `\\n<g transform="translate(${arrow.x}, ${arrow.y})">${animatedElement}</g>`
  }
  
  const animatedSvg = svgText.replace('</svg>', `${animationsSvg}\\n</svg>`)
  
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title} — Animated Flow Diagram</title>
  <style>
    body {
      margin: 0;
      padding: 48px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #0b0f19;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #f8fafc;
    }
    h1 {
      font-size: 24px;
      font-weight: 700;
      margin: 0 0 8px 0;
      text-align: center;
      background: linear-gradient(to right, #60a5fa, #34d399);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p {
      color: #64748b;
      font-size: 13px;
      margin: 0 0 32px 0;
      text-align: center;
    }
    .wrapper {
      position: relative;
      background: #111827;
      border: 1px solid #1f2937;
      padding: 24px;
      border-radius: 20px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
      max-width: 95vw;
      overflow: auto;
    }
    svg {
      display: block;
      width: 100%;
      height: auto;
      max-width: 1000px;
    }
    @keyframes trace-flow-move {
      0% { offset-distance: 0%; }
      100% { offset-distance: 100%; }
    }
    @keyframes trace-flow-dashes {
      to { stroke-dashoffset: -40; }
    }
    @keyframes trace-flow-laser {
      0%, 100% { stroke-dasharray: 20, 160; stroke-dashoffset: 0; }
      50% { stroke-dasharray: 80, 100; stroke-dashoffset: -80; }
    }
    @keyframes trace-flow-hue {
      from { filter: hue-rotate(0deg) drop-shadow(0 0 5px #f43f5e); }
      to { filter: hue-rotate(360deg) drop-shadow(0 0 5px #f43f5e); }
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>Interactive animated diagram exported from nexusblock</p>
  <div class="wrapper">
    ${animatedSvg}
  </div>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html' })
  download(blob, `${slug(title)}-animated.html`)
}

/** Export all slide frames sequentially as a multi-page PDF presentation. */
export async function exportSlidesPdf(editor: Editor, title: string) {
  const slides = editor.getCurrentPageShapes().filter((s) => s.type === 'slide-frame')
  if (slides.length === 0) return

  const rowTolerance = 120
  const sortedSlides = [...slides].sort((a, b) => {
    if (Math.abs(a.y - b.y) > rowTolerance) return a.y - b.y
    return a.x - b.x
  })

  let pdf: jsPDF | null = null

  for (let i = 0; i < sortedSlides.length; i++) {
    const slide = sortedSlides[i]
    const slideBounds = editor.getShapePageBounds(slide.id)
    if (!slideBounds) continue

    const children = editor.getCurrentPageShapes().filter((shape) => {
      const shapeBounds = editor.getShapePageBounds(shape.id)
      if (!shapeBounds) return false
      return (
        shapeBounds.x >= slideBounds.x - 5 &&
        shapeBounds.y >= slideBounds.y - 5 &&
        shapeBounds.x + shapeBounds.w <= slideBounds.x + slideBounds.w + 5 &&
        shapeBounds.y + shapeBounds.h <= slideBounds.y + slideBounds.h + 5
      )
    })

    const shapeIds = children.map((s) => s.id)
    if (shapeIds.length === 0) continue

    const res = await editor.toImage(shapeIds, {
      format: 'png',
      scale: 2,
      background: true,
      padding: 0,
    })

    if (!res?.blob) continue

    const dataUrl = await blobToDataUrl(res.blob)
    const w = res.width
    const h = res.height

    if (!pdf) {
      pdf = new jsPDF({
        orientation: w >= h ? 'landscape' : 'portrait',
        unit: 'px',
        format: [w, h],
      })
    } else {
      pdf.addPage([w, h], w >= h ? 'landscape' : 'portrait')
    }

    pdf.addImage(dataUrl, 'PNG', 0, 0, w, h)
  }

  if (pdf) {
    pdf.save(`${slug(title)}-presentation.pdf`)
  }
}
