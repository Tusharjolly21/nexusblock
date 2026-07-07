import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@iconify/react'
import { createShapeId, type TLShapeId } from 'tldraw'
import { jsPDF } from 'jspdf'
import { useDocStore } from '../store/useDocStore'
import { useEditorUi } from '../store/useEditorUi'
import { useTheme } from '../store/useTheme'
import {
  recordCanvasAnimation,
  exportCanvasAsGif,
  exportMarkdown,
  exportDocHtml,
  exportDocPdf,
  exportAnimatedHtml,
  getCommonBoundsOfIds,
  getAspectRatioBounds,
  drawWatermarkOnImageBlob,
  appendWatermarkToSvgText,
} from '../canvas/exporters'

type AspectRatioOption = {
  id: string
  label: string
  ratio: number
}

const ASPECT_RATIOS: AspectRatioOption[] = [
  { id: 'free', label: 'Freeform', ratio: 0 },
  { id: 'square', label: 'Square (1:1)', ratio: 1.0 },
  { id: 'portrait', label: 'Feed (4:5)', ratio: 0.8 },
  { id: 'story', label: 'Story / Reel (9:16)', ratio: 0.5625 },
  { id: 'presentation', label: 'Landscape (16:9)', ratio: 1.7778 },
]

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = reject
    r.readAsDataURL(blob)
  })
}

const slug = (s: string) => s.trim().replace(/[^\w-]+/g, '-').toLowerCase() || 'nexusblock'

export function ExportModal({ title, onClose }: { title: string; onClose: () => void }) {
  const editor = useDocStore((s) => s.editor)
  const flowStyle = useEditorUi((s) => s.flowAnimationStyle)
  
  // Selection check
  const hasSelection = editor ? editor.getSelectedShapeIds().length > 0 : false

  // State options matching Eraser UI
  const [exportArea, setExportArea] = useState<'all' | 'canvas' | 'selection'>('canvas')
  const [fileType, setFileType] = useState<'image' | 'document' | 'animation'>('image')
  
  // Image Options
  const [imageType, setImageType] = useState<'png' | 'svg' | 'pdf'>('png')
  const [imageQuality, setImageQuality] = useState<'1x' | '2x'>('2x')
  const [imageBackground, setImageBackground] = useState<'solid' | 'dots' | 'grid' | 'gradient' | 'transparent'>('solid')
  const [colorMode, setColorMode] = useState<'dark' | 'light'>('dark')
  const [aspectRatio, setAspectRatio] = useState<string>('free')

  // Document Options
  const [documentType, setDocumentType] = useState<'md' | 'html' | 'pdf'>('md')

  // Animation Options
  const [animationType, setAnimationType] = useState<'gif' | 'video' | 'html'>('gif')
  const [duration, setDuration] = useState(3) // seconds

  const [includeWatermark, setIncludeWatermark] = useState(true)
  const [watermarkFont, setWatermarkFont] = useState<'sans-serif' | 'monospace' | 'serif' | 'cursive'>('sans-serif')
  const [progress, setProgress] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  const handleExport = async () => {
    if (!editor) return
    setBusy(true)
    try {
      // 1. Resolve which shape IDs to export
      let ids: TLShapeId[] = []
      if (exportArea === 'selection') {
        ids = editor.getSelectedShapeIds()
      } else {
        ids = Array.from(editor.getCurrentPageShapeIds())
      }

      if (ids.length === 0 && fileType !== 'document') {
        alert('No shapes selected or found to export.')
        return
      }

      // Determine aspect ratio scale or bounds
      const ar = aspectRatio === 'free' ? 0 : ASPECT_RATIOS.find((x) => x.id === aspectRatio)?.ratio ?? 0

      // 2. Process based on File Type
      if (fileType === 'document') {
        const docExporter = useDocStore.getState().docExporter
        if (!docExporter) {
          alert('Document content is empty.')
          return
        }
        if (documentType === 'md') {
          const markdown = await docExporter.toMarkdown()
          await exportMarkdown(markdown, title)
        } else if (documentType === 'html') {
          const html = await docExporter.toHTML()
          await exportDocHtml(html, title)
        } else if (documentType === 'pdf') {
          const html = await docExporter.toHTML()
          await exportDocPdf(html, title)
        }
      } else if (fileType === 'animation') {
        const resolvedAR = ar === 0 ? 16 / 9 : ar
        if (animationType === 'gif') {
          await exportCanvasAsGif(editor, title, duration, resolvedAR, flowStyle, (p) => {
            setProgress(Math.round(p * 100))
          }, includeWatermark ? watermarkFont : undefined)
        } else if (animationType === 'video') {
          await recordCanvasAnimation(editor, title, duration, resolvedAR, flowStyle, (p) => {
            setProgress(Math.round(p * 100))
          }, includeWatermark ? watermarkFont : undefined)
        } else if (animationType === 'html') {
          await exportAnimatedHtml(editor, title, flowStyle)
        }
      } else {
        const formatType = imageType === 'svg' ? 'svg' : 'png'
        
        // Handle color mode override via useTheme
        const originalTone = useTheme.getState().tone
        const targetTone = colorMode === 'dark' ? 'obsidian' : 'light'
        if (targetTone !== originalTone) {
          useTheme.getState().setTone(targetTone)
        }

        const bounds = ar === 0 ? getCommonBoundsOfIds(editor, ids) : getAspectRatioBounds(editor, ids, ar)
        if (!bounds) return

        const tempId = createShapeId()
        const shapesToCreate: any[] = []

        if (ar !== 0) {
          shapesToCreate.push({
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
          })
        }

        if (shapesToCreate.length > 0) {
          editor.createShapes(shapesToCreate)
        }

        try {
          const exportIds = [...ids]
          if (ar !== 0) exportIds.push(tempId)

          if (imageType === 'pdf') {
            const res = await editor.toImage(exportIds, {
              format: 'png',
              scale: imageQuality === '2x' ? 2 : 1,
              background: false,
              padding: ar === 0 ? 32 : 0,
            })
            if (res?.blob) {
              const finalBlob = await drawWatermarkOnImageBlob(
                res.blob,
                res.width,
                res.height,
                watermarkFont,
                imageBackground,
                colorMode,
                includeWatermark
              )
              const dataUrl = await blobToDataUrl(finalBlob)
              const w = res.width
              const h = res.height
              const pdf = new jsPDF({ orientation: w >= h ? 'landscape' : 'portrait', unit: 'px', format: [w, h] })
              pdf.addImage(dataUrl, 'PNG', 0, 0, w, h)
              pdf.save(`${slug(title)}.pdf`)
            }
          } else {
            const res = await editor.toImage(exportIds, {
              format: formatType,
              scale: formatType === 'png' && imageQuality === '2x' ? 2 : 1,
              background: false,
              padding: ar === 0 ? 32 : 0,
            })
            if (res?.blob) {
              let finalBlob = res.blob
              if (formatType === 'png') {
                finalBlob = await drawWatermarkOnImageBlob(
                  res.blob,
                  res.width,
                  res.height,
                  watermarkFont,
                  imageBackground,
                  colorMode,
                  includeWatermark
                )
              } else if (formatType === 'svg') {
                const svgText = await res.blob.text()
                const watermarkedSvg = appendWatermarkToSvgText(
                  svgText,
                  watermarkFont,
                  imageBackground,
                  colorMode,
                  includeWatermark
                )
                finalBlob = new Blob([watermarkedSvg], { type: 'image/svg+xml' })
              }
              const url = URL.createObjectURL(finalBlob)
              const a = document.createElement('a')
              a.href = url
              a.download = `${title.toLowerCase().replace(/\s+/g, '-')}.${formatType}`
              a.click()
              URL.revokeObjectURL(url)
            }
          }
        } finally {
          const shapesToDelete: TLShapeId[] = []
          if (ar !== 0) shapesToDelete.push(tempId)
          if (shapesToDelete.length > 0) editor.deleteShapes(shapesToDelete)
          
          if (targetTone !== originalTone) {
            useTheme.getState().setTone(originalTone)
          }
        }
      }
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] grid place-items-center bg-black/60 p-6 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex w-full max-w-[480px] flex-col rounded-2xl border border-[#2e2e33] bg-[#18181b] p-6 shadow-[0_25px_80px_-20px_rgba(0,0,0,.75)] text-[#f4f4f5]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-5 flex items-center justify-between">
          <h3 className="font-display text-base font-semibold tracking-tight text-white">Export</h3>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg text-grey-3 hover:bg-[#27272a] hover:text-white transition-colors">
            <Icon icon="lucide:x" width={16} />
          </button>
        </header>

        <div className="space-y-3.5">
          {/* Export Area Radio Row */}
          <div className="flex items-center justify-between py-1.5 border-b border-[#27272a]">
            <span className="text-[11px] font-medium text-[#a1a1aa] uppercase tracking-wider">Export Area</span>
            <div className="flex items-center gap-3">
              {(['all', 'canvas', 'selection'] as const).map((area) => {
                const isSel = area === 'selection'
                const label = area.charAt(0).toUpperCase() + area.slice(1)
                return (
                  <label
                    key={area}
                    className={`flex items-center gap-1.5 cursor-pointer text-xs font-semibold ${
                      isSel && !hasSelection ? 'opacity-40 cursor-not-allowed' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="exportArea"
                      checked={exportArea === area}
                      disabled={isSel && !hasSelection}
                      onChange={() => setExportArea(area)}
                      className="accent-blue-500 cursor-pointer"
                    />
                    <span>{label}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* File Type Dropdown */}
          <div className="flex items-center justify-between py-1 border-b border-[#27272a]">
            <span className="text-[11px] font-medium text-[#a1a1aa] uppercase tracking-wider">File Type</span>
            <select
              value={fileType}
              onChange={(e) => setFileType(e.target.value as any)}
              className="bg-[#27272a] border border-[#3e3e42] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer min-w-[140px] hover:bg-[#323238] transition-colors"
            >
              <option value="image">Image</option>
              <option value="document">Document</option>
              <option value="animation">Animation / Video</option>
            </select>
          </div>

          {/* Render controls based on File Type */}
          {fileType === 'image' && (
            <>
              <div className="flex items-center justify-between py-1 border-b border-[#27272a] animate-fade-in">
                <span className="text-[11px] font-medium text-[#a1a1aa] uppercase tracking-wider">Image Type</span>
                <select
                  value={imageType}
                  onChange={(e) => setImageType(e.target.value as any)}
                  className="bg-[#27272a] border border-[#3e3e42] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer min-w-[140px] hover:bg-[#323238] transition-colors"
                >
                  <option value="png">PNG</option>
                  <option value="svg">SVG</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#27272a] animate-fade-in">
                <span className="text-[11px] font-medium text-[#a1a1aa] uppercase tracking-wider">Image Quality</span>
                <select
                  value={imageQuality}
                  onChange={(e) => setImageQuality(e.target.value as any)}
                  className="bg-[#27272a] border border-[#3e3e42] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer min-w-[140px] hover:bg-[#323238] transition-colors"
                >
                  <option value="1x">1x</option>
                  <option value="2x">2x (Retina)</option>
                </select>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#27272a] animate-fade-in">
                <span className="text-[11px] font-medium text-[#a1a1aa] uppercase tracking-wider">Image Background</span>
                <select
                  value={imageBackground}
                  onChange={(e) => setImageBackground(e.target.value as any)}
                  className="bg-[#27272a] border border-[#3e3e42] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer min-w-[140px] hover:bg-[#323238] transition-colors"
                >
                  <option value="solid">Solid Color</option>
                  <option value="dots">Dots Pattern</option>
                  <option value="grid">Grid Pattern</option>
                  <option value="gradient">Obsidian Gradient</option>
                  <option value="transparent">Transparent</option>
                </select>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#27272a] animate-fade-in">
                <span className="text-[11px] font-medium text-[#a1a1aa] uppercase tracking-wider">Color Mode</span>
                <select
                  value={colorMode}
                  onChange={(e) => setColorMode(e.target.value as any)}
                  className="bg-[#27272a] border border-[#3e3e42] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer min-w-[140px] hover:bg-[#323238] transition-colors"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#27272a] animate-fade-in">
                <span className="text-[11px] font-medium text-[#a1a1aa] uppercase tracking-wider">Aspect Ratio</span>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="bg-[#27272a] border border-[#3e3e42] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer min-w-[140px] hover:bg-[#323238] transition-colors"
                >
                  {ASPECT_RATIOS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {fileType === 'document' && (
            <div className="flex items-center justify-between py-1 border-b border-[#27272a] animate-fade-in">
              <span className="text-[11px] font-medium text-[#a1a1aa] uppercase tracking-wider">Document Type</span>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as any)}
                className="bg-[#27272a] border border-[#3e3e42] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer min-w-[140px] hover:bg-[#323238] transition-colors"
              >
                <option value="md">Markdown (.md)</option>
                <option value="html">HTML (.html)</option>
                <option value="pdf">PDF (.pdf)</option>
              </select>
            </div>
          )}

          {fileType === 'animation' && (
            <>
              <div className="flex items-center justify-between py-1 border-b border-[#27272a] animate-fade-in">
                <span className="text-[11px] font-medium text-[#a1a1aa] uppercase tracking-wider">Animation Type</span>
                <select
                  value={animationType}
                  onChange={(e) => setAnimationType(e.target.value as any)}
                  className="bg-[#27272a] border border-[#3e3e42] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer min-w-[140px] hover:bg-[#323238] transition-colors"
                >
                  <option value="gif">Animated GIF</option>
                  <option value="video">Loop MP4/WebM</option>
                  <option value="html">Animated HTML</option>
                </select>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#27272a] animate-fade-in">
                <span className="text-[11px] font-medium text-[#a1a1aa] uppercase tracking-wider">Aspect Ratio</span>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="bg-[#27272a] border border-[#3e3e42] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer min-w-[140px] hover:bg-[#323238] transition-colors"
                >
                  {ASPECT_RATIOS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {(animationType === 'gif' || animationType === 'video') && (
                <div className="flex items-center justify-between py-2 border-b border-[#27272a] animate-fade-in">
                  <span className="text-[11px] font-medium text-[#a1a1aa] uppercase tracking-wider">Loop Duration</span>
                  <div className="flex items-center gap-3 w-[140px]">
                    <input
                      type="range"
                      min="2"
                      max="8"
                      step="1"
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="flex-1 accent-blue-500 h-1 bg-[#2e2e33] rounded appearance-none cursor-pointer"
                    />
                    <span className="font-mono text-xs text-white w-6 text-right">{duration}s</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Watermark Checkbox & Font selector */}
          {fileType !== 'document' && (
            <div className="space-y-3.5 pt-2">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs text-[#a1a1aa] select-none">
                <input
                  type="checkbox"
                  checked={includeWatermark}
                  onChange={(e) => setIncludeWatermark(e.target.checked)}
                  className="accent-blue-600 rounded border-[#3e3e42] bg-[#27272a] h-3.5 w-3.5 cursor-pointer"
                />
                <span>Include watermark with logo</span>
              </label>

              {includeWatermark && (
                <div className="flex items-center justify-between border-t border-[#27272a] pt-3.5 animate-fade-in text-xs">
                  <span className="text-[11px] font-medium text-[#a1a1aa] uppercase tracking-wider">Watermark Font</span>
                  <select
                    value={watermarkFont}
                    onChange={(e) => setWatermarkFont(e.target.value as any)}
                    className="bg-[#27272a] border border-[#3e3e42] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer min-w-[140px] hover:bg-[#323238] transition-colors"
                  >
                    <option value="sans-serif">Sans-serif</option>
                    <option value="monospace">Monospace</option>
                    <option value="serif">Serif</option>
                    <option value="cursive">Cursive</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Progress bar for animations rendering */}
        {progress !== null && (
          <div className="mt-5 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#a1a1aa]">
              <span>Generating output frames</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1 w-full bg-[#27272a] rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 transition-all duration-200" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <footer className="mt-8 flex justify-end gap-3 border-t border-[#2e2e33] pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-[#3e3e42] bg-transparent text-xs font-semibold text-white hover:bg-[#27272a] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={busy}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-xs font-bold text-white transition-colors flex items-center justify-center min-w-[80px]"
          >
            {busy ? 'Processing...' : 'Export'}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  )
}
