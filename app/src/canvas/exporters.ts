import { createShapeId, type Editor } from 'tldraw'
import { jsPDF } from 'jspdf'
// @ts-ignore
import gifshot from 'gifshot'

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

/** Calculate bounding box of multiple shapes. */
export function getCommonBoundsOfIds(editor: Editor, ids: string[]) {
  const boundsList = ids.map((id) => editor.getShapePageBounds(id as any)).filter(Boolean)
  if (boundsList.length === 0) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const b of boundsList) {
    if (!b) continue
    if (b.x < minX) minX = b.x
    if (b.y < minY) minY = b.y
    if (b.x + b.w > maxX) maxX = b.x + b.w
    if (b.y + b.h > maxY) maxY = b.y + b.h
  }

  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
  }
}

/** Export the canvas as a PNG (2x) or SVG file. */
export async function exportImage(editor: Editor, title: string, format: 'png' | 'svg') {
  const ids = pageIds(editor)
  if (ids.length === 0) return

  const res = await editor.toImage(ids, {
    format,
    scale: format === 'png' ? 2 : 1,
    background: true,
    padding: 32,
  })
  if (!res?.blob) return

  let finalBlob = res.blob
  if (format === 'png') {
    finalBlob = await drawWatermarkOnImageBlob(res.blob, res.width, res.height)
  } else if (format === 'svg') {
    const svgText = await res.blob.text()
    const watermarkedSvg = appendWatermarkToSvgText(svgText)
    finalBlob = new Blob([watermarkedSvg], { type: 'image/svg+xml' })
  }
  download(finalBlob, `${slug(title)}.${format}`)
}

/** Export the canvas as a PDF sized to the diagram. */
export async function exportPdf(editor: Editor, title: string) {
  const ids = pageIds(editor)
  if (ids.length === 0) return

  const res = await editor.toImage(ids, { format: 'png', scale: 2, background: true, padding: 32 })
  if (!res?.blob) return

  const finalBlob = await drawWatermarkOnImageBlob(res.blob, res.width, res.height)
  const dataUrl = await blobToDataUrl(finalBlob)
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

export async function exportAnimatedHtml(editor: Editor, title: string, flowStyle: 'particle' | 'dashes' | 'laser' | 'droplet' | 'aurora' | 'pill') {
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
    } else if (flowStyle === 'aurora') {
      const color = (arrow.props as any)?.color || '#3b82f6'
      animatedElement = [...Array(6)].map((_, i) => {
        const delaySec = -(i * 0.08)
        const opacity = 1.0 - (i / 6)
        const r = Math.max(1, 6.0 - i * 0.75)
        return `<circle r="${r}" fill="${color}" style="offset-path: path('${localPath}'); animation: trace-flow-move 2.2s infinite linear; animation-delay: ${delaySec}s; filter: drop-shadow(0 0 ${12 - i * 1.5}px ${color}); opacity: ${opacity};" />`
      }).join('')
    } else if (flowStyle === 'pill') {
      const color = (arrow.props as any)?.color || '#3b82f6'
      const label = ((arrow.props as any)?.text || 'DATA').substring(0, 7)
      animatedElement = `
        <g style="offset-path: path('${localPath}'); animation: trace-flow-move 2.8s infinite linear;">
          <circle cx="18" cy="0" r="3.5" fill="${color}" style="filter: drop-shadow(0 0 6px ${color});" />
          <rect x="-22" y="-7" width="44" height="14" rx="4" fill="rgba(15, 23, 42, 0.9)" stroke="${color}" stroke-width="1.2" style="filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.5));" />
          <text x="0" y="1.5" text-anchor="middle" fill="#ffffff" font-size="7.5px" font-family="monospace" font-weight="bold">${label}</text>
        </g>
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

/** Calculate bounding box padded to match a target aspect ratio. */
export function getAspectRatioBounds(editor: Editor, ids: string[], targetAR: number) {
  const bounds = getCommonBoundsOfIds(editor, ids)
  if (!bounds) return null

  const w = bounds.w
  const h = bounds.h
  const ar = w / h
  let targetW = w
  let targetH = h

  if (ar < targetAR) {
    // Too tall, widen it
    targetW = h * targetAR
  } else {
    // Too wide, tallen it
    targetH = w / targetAR
  }

  const cx = bounds.x + w / 2
  const cy = bounds.y + h / 2
  return {
    x: cx - targetW / 2,
    y: cy - targetH / 2,
    w: targetW,
    h: targetH,
  }
}

/** Export PNG or SVG cropped and padded to fit a specific aspect ratio. */
export async function exportImageWithAspectRatio(
  editor: Editor,
  title: string,
  format: 'png' | 'svg',
  targetAR: number
) {
  const ids = pageIds(editor)
  if (ids.length === 0) return

  const bounds = getAspectRatioBounds(editor, ids, targetAR)
  if (!bounds) return

  // Insert temporary transparent shape to force padded bounds
  const tempId = createShapeId()
  editor.createShape({
    id: tempId,
    type: 'geo',
    x: bounds.x,
    y: bounds.y,
    opacity: 0,
    props: {
      w: bounds.w,
      h: bounds.h,
      geo: 'rectangle',
      fill: 'none',
      color: 'white',
    },
  } as any)

  try {
    const res = await editor.toImage([...ids, tempId], {
      format,
      scale: format === 'png' ? 2 : 1,
      background: false,
    })
    if (!res?.blob) return

    let finalBlob = res.blob
    if (format === 'png') {
      finalBlob = await drawWatermarkOnImageBlob(res.blob, res.width, res.height, undefined, 'solid')
    } else if (format === 'svg') {
      const svgText = await res.blob.text()
      const watermarkedSvg = appendWatermarkToSvgText(svgText, undefined, 'solid')
      finalBlob = new Blob([watermarkedSvg], { type: 'image/svg+xml' })
    }
    download(finalBlob, `${slug(title)}-${format === 'png' ? 'aspect' : 'vector'}.${format}`)
  } finally {
    editor.deleteShapes([tempId])
  }
}

/** Render and record tldraw canvas SVG background and animated particles to WebM/MP4. */
export async function recordCanvasAnimation(
  editor: Editor,
  title: string,
  durationSeconds: number,
  targetAR: number,
  flowStyle: 'particle' | 'dashes' | 'laser' | 'droplet' | 'aurora' | 'pill',
  onProgress?: (progress: number) => void,
  watermarkFont = 'sans-serif'
): Promise<Blob | null> {
  const ids = pageIds(editor)
  if (ids.length === 0) return null

  const bounds = getAspectRatioBounds(editor, ids, targetAR)
  if (!bounds) return null

  // 1. Render static background SVG containing layout shapes
  const tempId = createShapeId()
  editor.createShape({
    id: tempId,
    type: 'geo',
    x: bounds.x,
    y: bounds.y,
    opacity: 0,
    props: {
      w: bounds.w,
      h: bounds.h,
      geo: 'rectangle',
      fill: 'none',
      color: 'white',
    },
  } as any)

  let bgDataUrl = ''
  try {
    const res = await editor.toImage([...ids, tempId], {
      format: 'png',
      scale: 2,
      background: true,
    })
    if (!res?.blob) return null
    bgDataUrl = await blobToDataUrl(res.blob)
  } finally {
    editor.deleteShapes([tempId])
  }

  // 2. Load background image
  const bgImg = new Image()
  bgImg.src = bgDataUrl
  await new Promise((resolve) => {
    bgImg.onload = resolve
  })

  // 3. Extract arrow connection lines and construct paths
  const arrows = editor.getCurrentPageShapes().filter((s) => s.type === 'arrow')
  const paths = arrows
    .map((arrow) => {
      const geom = editor.getShapeGeometry(arrow.id)
      if (!geom || !geom.vertices || geom.vertices.length < 2) return null
      const globalPath = geom.vertices
        .map((v, i) => `${i === 0 ? 'M' : 'L'} ${arrow.x + v.x} ${arrow.y + v.y}`)
        .join(' ')
      const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      pathEl.setAttribute('d', globalPath)

      return {
        pathEl,
        totalLength: pathEl.getTotalLength(),
        color: (arrow.meta as any)?.flowColor || (arrow.props as any)?.color || '#3b82f6',
        speed: (arrow.meta as any)?.flowSpeed || (arrow.props as any)?.speed || 2,
        label: (arrow.meta as any)?.flowLabel || (arrow.props as any)?.text || '',
        style: (arrow.meta as any)?.flowStyle || 'default',
      }
    })
    .filter(Boolean) as { pathEl: SVGPathElement; totalLength: number; color: string; speed: number; label: string; style: string }[]

  // 4. Create recording canvas
  const canvas = document.createElement('canvas')
  const baseW = 1080
  canvas.width = baseW
  canvas.height = Math.round(baseW / targetAR)
  const ctx = canvas.getContext('2d')!

  const scaleX = canvas.width / bounds.w
  const scaleY = canvas.height / bounds.h
  const rx = bounds.x
  const ry = bounds.y

  // 5. Start MediaRecorder
  const fps = 30
  const interval = 1000 / fps
  const totalFrames = durationSeconds * fps
  let currentFrame = 0

  const stream = canvas.captureStream(fps)
  let mimeType = 'video/webm;codecs=vp9'
  if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm'
  if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/mp4'

  const recordedChunks: Blob[] = []
  const recorder = new MediaRecorder(stream, { mimeType })

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      recordedChunks.push(e.data)
    }
  }

  const resultPromise = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      resolve(new Blob(recordedChunks, { type: mimeType }))
    }
  })

  recorder.start()

  // 6. Loop render frames
  return new Promise((resolve) => {
    const renderFrame = () => {
      ctx.fillStyle = '#0b0f19' // premium dark background
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height)

      // Draw brand watermark
      ctx.save()
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
      ctx.font = `bold 13px ${watermarkFont}`
      ctx.textAlign = 'right'
      ctx.fillText('Made with nexusblock', canvas.width - 24, canvas.height - 24)

      // Draw interlocking squares logo
      ctx.translate(canvas.width - 195, canvas.height - 36) // position logo
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
      ctx.lineWidth = 1.5
      // rect 1
      ctx.strokeRect(3, 3, 6, 6)
      // rect 2
      ctx.strokeRect(11, 11, 6, 6)
      // path connector
      ctx.beginPath()
      ctx.moveTo(9, 6)
      ctx.lineTo(12, 6)
      ctx.quadraticCurveTo(14, 6, 14, 8)
      ctx.lineTo(14, 11)
      ctx.stroke()
      ctx.restore()

      const elapsedMs = currentFrame * interval

      for (const path of paths) {
        const durationMs = path.speed * 1000
        const progress = (elapsedMs % durationMs) / durationMs
        const point = path.pathEl.getPointAtLength(progress * path.totalLength)

        const px = (point.x - rx) * scaleX
        const py = (point.y - ry) * scaleY

        const localFlowStyle = path.style === 'default' ? flowStyle : path.style

        // 1. Draw pulsating neon conduit line backdrop
        ctx.save()
        const pulse = 0.2 + 0.3 * Math.abs(Math.sin((currentFrame / fps) * Math.PI)) // pulse alpha from 0.2 to 0.5
        ctx.globalAlpha = pulse
        ctx.strokeStyle = path.color
        ctx.lineWidth = 1.8
        ctx.shadowBlur = 4
        ctx.shadowColor = path.color
        ctx.beginPath()
        const stepCount = 40
        for (let sVal = 0; sVal <= stepCount; sVal++) {
          const pt = path.pathEl.getPointAtLength((sVal / stepCount) * path.totalLength)
          const sx = (pt.x - rx) * scaleX
          const sy = (pt.y - ry) * scaleY
          if (sVal === 0) ctx.moveTo(sx, sy)
          else ctx.lineTo(sx, sy)
        }
        ctx.stroke()
        ctx.restore()

        // 2. Draw particle representation based on style
        ctx.save()
        if (localFlowStyle === 'laser') {
          ctx.strokeStyle = path.color
          ctx.lineWidth = 3.5
          ctx.setLineDash([40, 100])
          ctx.lineDashOffset = -currentFrame * 3.5
          ctx.shadowBlur = 12
          ctx.shadowColor = path.color
          ctx.beginPath()
          const stepCount = 50
          for (let sVal = 0; sVal <= stepCount; sVal++) {
            const pt = path.pathEl.getPointAtLength((sVal / stepCount) * path.totalLength)
            const sx = (pt.x - rx) * scaleX
            const sy = (pt.y - ry) * scaleY
            if (sVal === 0) ctx.moveTo(sx, sy)
            else ctx.lineTo(sx, sy)
          }
          ctx.stroke()
        } else if (localFlowStyle === 'droplet') {
          ctx.shadowBlur = 10
          ctx.shadowColor = path.color
          ctx.fillStyle = path.color
          // Main droplet
          ctx.beginPath()
          ctx.arc(px, py, 6, 0, Math.PI * 2)
          ctx.fill()
          // Tail
          ctx.globalAlpha = 0.5
          const tailPoint = path.pathEl.getPointAtLength(Math.max(0, progress - 0.05) * path.totalLength)
          const tpx = (tailPoint.x - rx) * scaleX
          const tpy = (tailPoint.y - ry) * scaleY
          ctx.beginPath()
          ctx.arc(tpx, tpy, 4, 0, Math.PI * 2)
          ctx.fill()
        } else if (localFlowStyle === 'aurora') {
          // Draw multiple trailing points
          for (let i = 0; i < 6; i++) {
            const trailingProgress = Math.max(0, progress - i * 0.012)
            const pPoint = path.pathEl.getPointAtLength(trailingProgress * path.totalLength)
            const tpx = (pPoint.x - rx) * scaleX
            const tpy = (pPoint.y - ry) * scaleY

            const alpha = 1.0 - i / 6
            const radius = Math.max(1, 6.0 - i * 0.75)

            ctx.save()
            ctx.globalAlpha = alpha
            ctx.shadowBlur = 12 - i * 1.5
            ctx.shadowColor = path.color
            ctx.fillStyle = path.color
            ctx.beginPath()
            ctx.arc(tpx, tpy, radius, 0, Math.PI * 2)
            ctx.fill()
            ctx.restore()
          }
        } else if (localFlowStyle === 'pill') {
          const badgeText = path.label || 'DATA'
          ctx.save()
          ctx.font = 'bold 15px monospace'
          const textWidth = ctx.measureText(badgeText).width
          const badgeW = Math.max(70, textWidth + 24)
          const badgeH = 26

          // Draw floating card border and back shadow
          ctx.shadowBlur = 14
          ctx.shadowColor = path.color
          ctx.fillStyle = 'rgba(15, 23, 42, 0.92)' // deep dark slate
          ctx.strokeStyle = path.color
          ctx.lineWidth = 2

          ctx.beginPath()
          if ((ctx as any).roundRect) {
            ;(ctx as any).roundRect(px - badgeW / 2, py - badgeH / 2, badgeW, badgeH, 8)
          } else {
            ctx.rect(px - badgeW / 2, py - badgeH / 2, badgeW, badgeH)
          }
          ctx.fill()
          ctx.stroke()

          // Text inside the pill badge
          ctx.shadowBlur = 0
          ctx.fillStyle = '#ffffff'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.font = 'bold 13px monospace'
          ctx.fillText(badgeText.substring(0, 9), px, py)
          ctx.restore()

          // Glowing leader dot
          ctx.save()
          ctx.shadowBlur = 16
          ctx.shadowColor = path.color
          ctx.fillStyle = path.color
          const leadProgress = Math.min(1.0, progress + 0.03)
          const leadPoint = path.pathEl.getPointAtLength(leadProgress * path.totalLength)
          const lpx = (leadPoint.x - rx) * scaleX
          const lpy = (leadPoint.y - ry) * scaleY
          ctx.beginPath()
          ctx.arc(lpx, lpy, 6, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        } else if (localFlowStyle === 'dashes') {
          // Draw dashed trailing lines
          ctx.strokeStyle = path.color
          ctx.lineWidth = 3
          ctx.setLineDash([12, 12])
          ctx.lineDashOffset = -currentFrame * 2
          ctx.shadowBlur = 10
          ctx.shadowColor = path.color
          ctx.beginPath()
          // Recreate full path in canvas space
          ctx.moveTo((path.pathEl.getPointAtLength(0).x - rx) * scaleX, (path.pathEl.getPointAtLength(0).y - ry) * scaleY)
          // Just stroke the path outline
          // Wait, path has pathEl
          const stepCount = 50
          for (let sVal = 0; sVal <= stepCount; sVal++) {
            const pt = path.pathEl.getPointAtLength((sVal / stepCount) * path.totalLength)
            const sx = (pt.x - rx) * scaleX
            const sy = (pt.y - ry) * scaleY
            if (sVal === 0) ctx.moveTo(sx, sy)
            else ctx.lineTo(sx, sy)
          }
          ctx.stroke()
        } else {
          // Standard particle or dashes fallback
          ctx.shadowBlur = 12
          ctx.shadowColor = path.color
          ctx.fillStyle = path.color
          ctx.beginPath()
          ctx.arc(px, py, 5.5, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      }

      currentFrame++
      if (onProgress) {
        onProgress(Math.min(1, currentFrame / totalFrames))
      }

      if (currentFrame < totalFrames) {
        setTimeout(renderFrame, interval)
      } else {
        recorder.stop()
        resultPromise.then((blob) => {
          download(blob, `${slug(title)}-animated.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`)
          resolve(blob)
        })
      }
    }

    renderFrame()
  })
}

/** Export the canvas trace animation as a looped animated GIF using gifshot. */
export async function exportCanvasAsGif(
  editor: Editor,
  title: string,
  durationSeconds: number,
  targetAR: number,
  flowStyle: 'particle' | 'dashes' | 'laser' | 'droplet' | 'aurora' | 'pill',
  onProgress?: (progress: number) => void,
  watermarkFont = 'sans-serif'
): Promise<Blob | null> {
  const ids = pageIds(editor)
  if (ids.length === 0) return null

  const bounds = getAspectRatioBounds(editor, ids, targetAR)
  if (!bounds) return null

  // 1. Render static background SVG containing layout shapes
  const tempId = createShapeId()
  editor.createShape({
    id: tempId,
    type: 'geo',
    x: bounds.x,
    y: bounds.y,
    opacity: 0,
    props: {
      w: bounds.w,
      h: bounds.h,
      geo: 'rectangle',
      fill: 'none',
      color: 'white',
    },
  } as any)

  let bgDataUrl = ''
  try {
    const res = await editor.toImage([...ids, tempId], {
      format: 'png',
      scale: 2,
      background: true,
    })
    if (!res?.blob) return null
    bgDataUrl = await blobToDataUrl(res.blob)
  } finally {
    editor.deleteShapes([tempId])
  }

  // 2. Load background image
  const bgImg = new Image()
  bgImg.src = bgDataUrl
  await new Promise((resolve) => {
    bgImg.onload = resolve
  })

  // 3. Extract arrow connection lines and construct paths
  const arrows = editor.getCurrentPageShapes().filter((s) => s.type === 'arrow')
  const paths = arrows
    .map((arrow) => {
      const geom = editor.getShapeGeometry(arrow.id)
      if (!geom || !geom.vertices || geom.vertices.length < 2) return null
      const globalPath = geom.vertices
        .map((v, i) => `${i === 0 ? 'M' : 'L'} ${arrow.x + v.x} ${arrow.y + v.y}`)
        .join(' ')
      const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      pathEl.setAttribute('d', globalPath)

      return {
        pathEl,
        totalLength: pathEl.getTotalLength(),
        color: (arrow.meta as any)?.flowColor || (arrow.props as any)?.color || '#3b82f6',
        speed: (arrow.meta as any)?.flowSpeed || (arrow.props as any)?.speed || 2,
        label: (arrow.meta as any)?.flowLabel || (arrow.props as any)?.text || '',
        style: (arrow.meta as any)?.flowStyle || 'default',
      }
    })
    .filter(Boolean) as { pathEl: SVGPathElement; totalLength: number; color: string; speed: number; label: string; style: string }[]

  // 4. Create canvas for drawing frames
  const canvas = document.createElement('canvas')
  const baseW = 720
  canvas.width = baseW
  canvas.height = Math.round(baseW / targetAR)
  const ctx = canvas.getContext('2d')!

  const scaleX = canvas.width / bounds.w
  const scaleY = canvas.height / bounds.h
  const rx = bounds.x
  const ry = bounds.y

  // 5. Generate frames at 15fps (standard for high quality GIF)
  const fps = 15
  const interval = 1000 / fps
  const totalFrames = durationSeconds * fps
  const framesDataUrls: string[] = []

  for (let currentFrame = 0; currentFrame < totalFrames; currentFrame++) {
    ctx.fillStyle = '#0b0f19'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height)

    // Draw watermark
    ctx.save()
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
    ctx.font = `bold 11px ${watermarkFont}`
    ctx.textAlign = 'right'
    ctx.fillText('Made with nexusblock', canvas.width - 16, canvas.height - 16)

    // Draw interlocking squares logo next to it
    ctx.translate(canvas.width - 170, canvas.height - 26) // position logo
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
    ctx.lineWidth = 1.2
    ctx.strokeRect(3, 3, 5, 5)
    ctx.strokeRect(10, 10, 5, 5)
    ctx.beginPath()
    ctx.moveTo(8, 5.5)
    ctx.lineTo(11, 5.5)
    ctx.quadraticCurveTo(12.5, 5.5, 12.5, 7)
    ctx.lineTo(12.5, 10)
    ctx.stroke()
    ctx.restore()

    const elapsedMs = currentFrame * interval

    for (const path of paths) {
      const durationMs = path.speed * 1000
      const progress = (elapsedMs % durationMs) / durationMs
      const point = path.pathEl.getPointAtLength(progress * path.totalLength)

      const px = (point.x - rx) * scaleX
      const py = (point.y - ry) * scaleY

      const localFlowStyle = path.style === 'default' ? flowStyle : path.style

      // Draw pulsating neon conduit line backdrop
      ctx.save()
      const pulse = 0.2 + 0.3 * Math.abs(Math.sin((currentFrame / fps) * Math.PI))
      ctx.globalAlpha = pulse
      ctx.strokeStyle = path.color
      ctx.lineWidth = 1.4
      ctx.shadowBlur = 3
      ctx.shadowColor = path.color
      ctx.beginPath()
      const stepCount = 30
      for (let sVal = 0; sVal <= stepCount; sVal++) {
        const pt = path.pathEl.getPointAtLength((sVal / stepCount) * path.totalLength)
        const sx = (pt.x - rx) * scaleX
        const sy = (pt.y - ry) * scaleY
        if (sVal === 0) ctx.moveTo(sx, sy)
        else ctx.lineTo(sx, sy)
      }
      ctx.stroke()
      ctx.restore()

      // Draw particle representation based on style
      ctx.save()
      if (localFlowStyle === 'laser') {
        ctx.strokeStyle = path.color
        ctx.lineWidth = 2.5
        ctx.setLineDash([30, 80])
        ctx.lineDashOffset = -currentFrame * 3
        ctx.shadowBlur = 8
        ctx.shadowColor = path.color
        ctx.beginPath()
        const stepCount = 40
        for (let sVal = 0; sVal <= stepCount; sVal++) {
          const pt = path.pathEl.getPointAtLength((sVal / stepCount) * path.totalLength)
          const sx = (pt.x - rx) * scaleX
          const sy = (pt.y - ry) * scaleY
          if (sVal === 0) ctx.moveTo(sx, sy)
          else ctx.lineTo(sx, sy)
        }
        ctx.stroke()
      } else if (localFlowStyle === 'droplet') {
        ctx.shadowBlur = 8
        ctx.shadowColor = path.color
        ctx.fillStyle = path.color
        ctx.beginPath()
        ctx.arc(px, py, 4.5, 0, Math.PI * 2)
        ctx.fill()

        ctx.globalAlpha = 0.5
        const tailPoint = path.pathEl.getPointAtLength(Math.max(0, progress - 0.05) * path.totalLength)
        const tpx = (tailPoint.x - rx) * scaleX
        const tpy = (tailPoint.y - ry) * scaleY
        ctx.beginPath()
        ctx.arc(tpx, tpy, 3, 0, Math.PI * 2)
        ctx.fill()
      } else if (localFlowStyle === 'aurora') {
        for (let i = 0; i < 6; i++) {
          const trailingProgress = Math.max(0, progress - i * 0.015)
          const pPoint = path.pathEl.getPointAtLength(trailingProgress * path.totalLength)
          const tpx = (pPoint.x - rx) * scaleX
          const tpy = (pPoint.y - ry) * scaleY

          const alpha = 1.0 - i / 6
          const radius = Math.max(1, 4.5 - i * 0.6)

          ctx.save()
          ctx.globalAlpha = alpha
          ctx.shadowBlur = 8 - i
          ctx.shadowColor = path.color
          ctx.fillStyle = path.color
          ctx.beginPath()
          ctx.arc(tpx, tpy, radius, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }
      } else if (localFlowStyle === 'pill') {
        const badgeText = path.label || 'DATA'
        ctx.save()
        ctx.font = 'bold 11px monospace'
        const textWidth = ctx.measureText(badgeText).width
        const badgeW = Math.max(50, textWidth + 16)
        const badgeH = 18

        ctx.shadowBlur = 10
        ctx.shadowColor = path.color
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)'
        ctx.strokeStyle = path.color
        ctx.lineWidth = 1.5

        ctx.beginPath()
        if ((ctx as any).roundRect) {
          ;(ctx as any).roundRect(px - badgeW / 2, py - badgeH / 2, badgeW, badgeH, 6)
        } else {
          ctx.rect(px - badgeW / 2, py - badgeH / 2, badgeW, badgeH)
        }
        ctx.fill()
        ctx.stroke()

        ctx.shadowBlur = 0
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.font = 'bold 9px monospace'
        ctx.fillText(badgeText.substring(0, 7), px, py)
        ctx.restore()

        ctx.save()
        ctx.shadowBlur = 10
        ctx.shadowColor = path.color
        ctx.fillStyle = path.color
        const leadProgress = Math.min(1.0, progress + 0.03)
        const leadPoint = path.pathEl.getPointAtLength(leadProgress * path.totalLength)
        const lpx = (leadPoint.x - rx) * scaleX
        const lpy = (leadPoint.y - ry) * scaleY
        ctx.beginPath()
        ctx.arc(lpx, lpy, 4.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      } else if (localFlowStyle === 'dashes') {
        ctx.strokeStyle = path.color
        ctx.lineWidth = 2.2
        ctx.setLineDash([8, 8])
        ctx.lineDashOffset = -currentFrame * 1.5
        ctx.shadowBlur = 6
        ctx.shadowColor = path.color
        ctx.beginPath()
        ctx.moveTo((path.pathEl.getPointAtLength(0).x - rx) * scaleX, (path.pathEl.getPointAtLength(0).y - ry) * scaleY)
        const stepCount = 30
        for (let sVal = 0; sVal <= stepCount; sVal++) {
          const pt = path.pathEl.getPointAtLength((sVal / stepCount) * path.totalLength)
          const sx = (pt.x - rx) * scaleX
          const sy = (pt.y - ry) * scaleY
          if (sVal === 0) ctx.moveTo(sx, sy)
          else ctx.lineTo(sx, sy)
        }
        ctx.stroke()
      } else {
        ctx.shadowBlur = 8
        ctx.shadowColor = path.color
        ctx.fillStyle = path.color
        ctx.beginPath()
        ctx.arc(px, py, 4, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }

    framesDataUrls.push(canvas.toDataURL('image/png'))
    if (onProgress) {
      onProgress(0.2 * (currentFrame / totalFrames))
    }
  }

  return new Promise((resolve) => {
    // @ts-ignore
    gifshot.createGIF(
      {
        images: framesDataUrls,
        gifWidth: canvas.width,
        gifHeight: canvas.height,
        interval: 1 / fps,
        numWorkers: 2,
      },
      (obj: any) => {
        if (obj.error) {
          console.error('gifshot error:', obj.error)
          resolve(null)
          return
        }
        const base64Data = obj.image.split(',')[1]
        const byteCharacters = atob(base64Data)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const gifBlob = new Blob([byteArray], { type: 'image/gif' })
        download(gifBlob, `${slug(title)}-animated.gif`)
        if (onProgress) onProgress(1.0)
        resolve(gifBlob)
      }
    )
  })
}

export async function drawWatermarkOnImageBlob(
  blob: Blob,
  width: number,
  height: number,
  watermarkFont = 'sans-serif',
  backgroundStyle: 'solid' | 'dots' | 'grid' | 'gradient' | 'transparent' = 'transparent',
  colorMode: 'dark' | 'light' = 'dark',
  drawBrand = true
): Promise<Blob> {
  const img = new Image()
  img.src = URL.createObjectURL(blob)
  await new Promise((resolve) => {
    img.onload = resolve
  })

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  const isDark = colorMode === 'dark'
  const bgColor = isDark ? '#121216' : '#ffffff'
  const patternColor = isDark ? '#2e2e33' : '#cbd5e1'

  // 1. Draw custom background
  if (backgroundStyle !== 'transparent') {
    if (backgroundStyle === 'solid') {
      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, width, height)
    } else if (backgroundStyle === 'gradient') {
      const grad = ctx.createRadialGradient(width / 2, height / 2, 10, width / 2, height / 2, Math.max(width, height) * 0.7)
      if (isDark) {
        grad.addColorStop(0, '#1e293b') // slate-800
        grad.addColorStop(1, '#0b0f19') // deep dark
      } else {
        grad.addColorStop(0, '#f8fafc')
        grad.addColorStop(1, '#cbd5e1')
      }
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, width, height)
    } else if (backgroundStyle === 'dots') {
      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, width, height)
      
      ctx.fillStyle = patternColor
      const dotSpacing = 20
      for (let x = dotSpacing / 2; x < width; x += dotSpacing) {
        for (let y = dotSpacing / 2; y < height; y += dotSpacing) {
          ctx.beginPath()
          ctx.arc(x, y, 1.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    } else if (backgroundStyle === 'grid') {
      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, width, height)

      ctx.strokeStyle = patternColor
      ctx.lineWidth = 1
      const gridSpacing = 20
      ctx.beginPath()
      for (let x = 0; x < width; x += gridSpacing) {
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
      }
      for (let y = 0; y < height; y += gridSpacing) {
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
      }
      ctx.stroke()
    }
  }

  // 2. Draw the transparent source image on top of background
  ctx.drawImage(img, 0, 0, width, height)

  // 3. Draw logo icon next to text
  if (drawBrand) {
    ctx.save()
    // Align text to right padding
    ctx.translate(canvas.width - 190, canvas.height - 35) // position logo
    ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(120, 120, 120, 0.75)'
    ctx.lineWidth = 1.8
    // rect 1
    ctx.strokeRect(3, 3, 7, 7)
    // rect 2
    ctx.strokeRect(13, 13, 7, 7)
    // path connector
    ctx.beginPath()
    ctx.moveTo(10, 6.5)
    ctx.lineTo(14, 6.5)
    ctx.quadraticCurveTo(16.5, 6.5, 16.5, 9)
    ctx.lineTo(16.5, 13)
    ctx.stroke()
    ctx.restore()

    // 4. Draw text
    ctx.save()
    ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(120, 120, 120, 0.75)'
    ctx.font = `bold 13px ${watermarkFont}`
    ctx.textAlign = 'right'
    ctx.fillText('Made with nexusblock', canvas.width - 24, canvas.height - 22)
    ctx.restore()
  }

  return new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b || blob), 'image/png')
  })
}

export function appendWatermarkToSvgText(
  svgText: string,
  watermarkFont = 'sans-serif',
  backgroundStyle: 'solid' | 'dots' | 'grid' | 'gradient' | 'transparent' = 'transparent',
  colorMode: 'dark' | 'light' = 'dark',
  drawBrand = true
): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgText, 'image/svg+xml')
  const svg = doc.querySelector('svg')
  if (!svg) return svgText

  const w = parseFloat(svg.getAttribute('width') || '1000')
  const h = parseFloat(svg.getAttribute('height') || '800')

  const isDark = colorMode === 'dark'
  const bgColor = isDark ? '#121216' : '#ffffff'
  const patternColor = isDark ? '#2e2e33' : '#cbd5e1'

  // Insert background elements before any other contents
  if (backgroundStyle !== 'transparent') {
    const defs = doc.createElementNS('http://www.w3.org/2000/svg', 'defs')

    if (backgroundStyle === 'solid') {
      const bgRect = doc.createElementNS('http://www.w3.org/2000/svg', 'rect')
      bgRect.setAttribute('width', '100%')
      bgRect.setAttribute('height', '100%')
      bgRect.setAttribute('fill', bgColor)
      svg.insertBefore(bgRect, svg.firstChild)
    } else if (backgroundStyle === 'gradient') {
      const grad = doc.createElementNS('http://www.w3.org/2000/svg', 'radialGradient')
      grad.setAttribute('id', 'bg-grad')
      grad.setAttribute('cx', '50%')
      grad.setAttribute('cy', '50%')
      grad.setAttribute('r', '75%')

      const stop1 = doc.createElementNS('http://www.w3.org/2000/svg', 'stop')
      stop1.setAttribute('offset', '0%')
      stop1.setAttribute('stop-color', isDark ? '#1e293b' : '#f8fafc')

      const stop2 = doc.createElementNS('http://www.w3.org/2000/svg', 'stop')
      stop2.setAttribute('offset', '100%')
      stop2.setAttribute('stop-color', isDark ? '#0b0f19' : '#cbd5e1')

      grad.appendChild(stop1)
      grad.appendChild(stop2)
      defs.appendChild(grad)
      svg.insertBefore(defs, svg.firstChild)

      const bgRect = doc.createElementNS('http://www.w3.org/2000/svg', 'rect')
      bgRect.setAttribute('width', '100%')
      bgRect.setAttribute('height', '100%')
      bgRect.setAttribute('fill', 'url(#bg-grad)')
      svg.insertBefore(bgRect, defs.nextSibling)
    } else if (backgroundStyle === 'dots') {
      const pat = doc.createElementNS('http://www.w3.org/2000/svg', 'pattern')
      pat.setAttribute('id', 'bg-dots')
      pat.setAttribute('width', '20')
      pat.setAttribute('height', '20')
      pat.setAttribute('patternUnits', 'userSpaceOnUse')

      const circle = doc.createElementNS('http://www.w3.org/2000/svg', 'circle')
      circle.setAttribute('cx', '10')
      circle.setAttribute('cy', '10')
      circle.setAttribute('r', '1.5')
      circle.setAttribute('fill', patternColor)

      pat.appendChild(circle)
      defs.appendChild(pat)
      svg.insertBefore(defs, svg.firstChild)

      // Solid backdrop first
      const bgRect1 = doc.createElementNS('http://www.w3.org/2000/svg', 'rect')
      bgRect1.setAttribute('width', '100%')
      bgRect1.setAttribute('height', '100%')
      bgRect1.setAttribute('fill', bgColor)
      svg.insertBefore(bgRect1, defs.nextSibling)

      // Dots pattern on top of it
      const bgRect2 = doc.createElementNS('http://www.w3.org/2000/svg', 'rect')
      bgRect2.setAttribute('width', '100%')
      bgRect2.setAttribute('height', '100%')
      bgRect2.setAttribute('fill', 'url(#bg-dots)')
      svg.insertBefore(bgRect2, bgRect1.nextSibling)
    } else if (backgroundStyle === 'grid') {
      const pat = doc.createElementNS('http://www.w3.org/2000/svg', 'pattern')
      pat.setAttribute('id', 'bg-grid')
      pat.setAttribute('width', '20')
      pat.setAttribute('height', '20')
      pat.setAttribute('patternUnits', 'userSpaceOnUse')

      const path = doc.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('d', 'M 20 0 L 0 0 0 20')
      path.setAttribute('fill', 'none')
      path.setAttribute('stroke', patternColor)
      path.setAttribute('stroke-width', '1')

      pat.appendChild(path)
      defs.appendChild(pat)
      svg.insertBefore(defs, svg.firstChild)

      // Solid backdrop first
      const bgRect1 = doc.createElementNS('http://www.w3.org/2000/svg', 'rect')
      bgRect1.setAttribute('width', '100%')
      bgRect1.setAttribute('height', '100%')
      bgRect1.setAttribute('fill', bgColor)
      svg.insertBefore(bgRect1, defs.nextSibling)

      // Grid pattern on top of it
      const bgRect2 = doc.createElementNS('http://www.w3.org/2000/svg', 'rect')
      bgRect2.setAttribute('width', '100%')
      bgRect2.setAttribute('height', '100%')
      bgRect2.setAttribute('fill', 'url(#bg-grid)')
      svg.insertBefore(bgRect2, bgRect1.nextSibling)
    }
  }

  // Create watermark group
  if (drawBrand) {
    const g = doc.createElementNS('http://www.w3.org/2000/svg', 'g')
    g.setAttribute('transform', `translate(${w - 200}, ${h - 32})`)
    g.setAttribute('style', 'opacity: 0.75;')

    // Logo rect 1
    const r1 = doc.createElementNS('http://www.w3.org/2000/svg', 'rect')
    r1.setAttribute('x', '3')
    r1.setAttribute('y', '3')
    r1.setAttribute('width', '7')
    r1.setAttribute('height', '7')
    r1.setAttribute('rx', '1.5')
    r1.setAttribute('fill', 'none')
    r1.setAttribute('stroke', isDark ? '#a1a1aa' : '#787878')
    r1.setAttribute('stroke-width', '1.5')
    g.appendChild(r1)

    // Logo rect 2
    const r2 = doc.createElementNS('http://www.w3.org/2000/svg', 'rect')
    r2.setAttribute('x', '13')
    r2.setAttribute('y', '13')
    r2.setAttribute('width', '7')
    r2.setAttribute('height', '7')
    r2.setAttribute('rx', '1.5')
    r2.setAttribute('fill', 'none')
    r2.setAttribute('stroke', isDark ? '#a1a1aa' : '#787878')
    r2.setAttribute('stroke-width', '1.5')
    g.appendChild(r2)

    // Logo path
    const path = doc.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', 'M10 6.5h4a2 2 0 0 1 2 2v4')
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke', isDark ? '#a1a1aa' : '#787878')
    path.setAttribute('stroke-width', '1.5')
    g.appendChild(path)

    // Text element
    const text = doc.createElementNS('http://www.w3.org/2000/svg', 'text')
    text.setAttribute('x', '185')
    text.setAttribute('y', '11')
    text.setAttribute('fill', isDark ? '#a1a1aa' : '#787878')
    text.setAttribute('font-family', watermarkFont)
    text.setAttribute('font-size', '12px')
    text.setAttribute('font-weight', 'bold')
    text.setAttribute('text-anchor', 'end')
    text.textContent = 'Made with nexusblock'
    g.appendChild(text)

    svg.appendChild(g)
  }

  const serializer = new XMLSerializer()
  return serializer.serializeToString(doc)
}

