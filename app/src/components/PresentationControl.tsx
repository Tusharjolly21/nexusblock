import { useEffect } from 'react'
import { Icon } from '@iconify/react'
import { useEditorUi } from '../store/useEditorUi'
import { useDocStore } from '../store/useDocStore'

export function PresentationControl() {
  const isPresenting = useEditorUi((s) => s.isPresenting)
  const currentSlideIndex = useEditorUi((s) => s.currentSlideIndex)
  const slideIds = useEditorUi((s) => s.slideIds)
  const nextSlide = useEditorUi((s) => s.nextSlide)
  const prevSlide = useEditorUi((s) => s.prevSlide)
  const stopPresentation = useEditorUi((s) => s.stopPresentation)
  const editor = useDocStore((s) => s.editor)

  const currentSlideId = slideIds[currentSlideIndex]
  const currentSlide = editor?.getShape(currentSlideId as any)
  const slideTitle = (currentSlide?.props as any)?.label || 'Untitled Slide'

  // Animate camera to current slide bounds on change
  useEffect(() => {
    if (!isPresenting || !editor || !currentSlideId) return
    
    // Brief delay to allow layout shifts to settle
    const t = setTimeout(() => {
      const bounds = editor.getShapePageBounds(currentSlideId as any)
      if (bounds) {
        // Zoom to frame bounds with clean padding
        editor.zoomToBounds(bounds, { inset: 48, animation: { duration: 420 } })
        
        // Deselect everything during presentation to keep view clean
        editor.select()
      }
    }, 60)

    return () => clearTimeout(t)
  }, [currentSlideIndex, currentSlideId, editor, isPresenting])

  // Keyboard navigation listeners
  useEffect(() => {
    if (!isPresenting) return

    const onKeyDown = (e: KeyboardEvent) => {
      // Ignore keys if typing in contenteditable, inputs, etc.
      const active = document.activeElement
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.getAttribute('contenteditable') === 'true')) {
        return
      }

      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        nextSlide()
      } else if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
        e.preventDefault()
        prevSlide()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        stopPresentation()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isPresenting, nextSlide, prevSlide, stopPresentation])

  if (!isPresenting || slideIds.length === 0) return null

  const isFirst = currentSlideIndex === 0
  const isLast = currentSlideIndex === slideIds.length - 1

  return (
    <div className="pointer-events-none absolute bottom-6 left-0 right-0 z-50 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-4 rounded-full border border-line bg-surface/95 px-4 py-2 text-sm shadow-[0_18px_45px_-12px_rgba(0,0,0,.35)] backdrop-blur transition-all">
        {/* Navigation group */}
        <div className="flex items-center gap-1">
          <button
            onClick={prevSlide}
            disabled={isFirst}
            title="Previous slide (Left Arrow)"
            className="grid h-8 w-8 place-items-center rounded-full text-grey-4 transition-colors hover:bg-grey-1 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Icon icon="lucide:chevron-left" width={18} />
          </button>
          
          <span className="font-mono text-xs font-semibold text-grey-3 px-1">
            {currentSlideIndex + 1} / {slideIds.length}
          </span>

          <button
            onClick={nextSlide}
            disabled={isLast}
            title="Next slide (Right Arrow / Space)"
            className="grid h-8 w-8 place-items-center rounded-full text-grey-4 transition-colors hover:bg-grey-1 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Icon icon="lucide:chevron-right" width={18} />
          </button>
        </div>

        {/* Separator */}
        <span className="h-4 w-px bg-line" />

        {/* Slide Title */}
        <span className="max-w-[200px] truncate font-semibold text-ink sm:max-w-[320px]">
          {slideTitle}
        </span>

        {/* Separator */}
        <span className="h-4 w-px bg-line" />

        {/* Exit action */}
        <button
          onClick={stopPresentation}
          title="Exit slideshow (Esc)"
          className="flex h-8 items-center gap-1.5 rounded-full bg-ink px-4 text-xs font-bold text-paper transition-opacity hover:opacity-90"
        >
          <Icon icon="lucide:x" width={12} />
          Exit
        </button>
      </div>
    </div>
  )
}
