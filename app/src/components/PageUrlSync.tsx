import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { react, type TLPageId } from 'tldraw'
import { useDocStore } from '../store/useDocStore'

/**
 * Keeps the active tldraw page in the URL as `?page=<id>` so a file's page is
 * deep-linkable and survives refresh. Hydrates from the URL once the editor is
 * ready, then mirrors page switches back into the query string.
 */
export function PageUrlSync() {
  const editor = useDocStore((s) => s.editor)
  const [, setSearchParams] = useSearchParams()

  useEffect(() => {
    if (!editor) return

    // tldraw page ids are `page:<slug>`; keep the URL clean by storing only the
    // slug (`?page=abc123`) and re-adding the prefix when reading it back.
    const toSlug = (id: TLPageId) => id.replace(/^page:/, '')
    const fromSlug = (slug: string) => `page:${slug}` as TLPageId

    // Hydrate: apply ?page= from the URL if it's a real page in this file.
    const slug = new URLSearchParams(window.location.search).get('page')
    if (slug) {
      const initial = fromSlug(slug)
      if (editor.getPage(initial) && editor.getCurrentPageId() !== initial) {
        editor.setCurrentPage(initial)
      }
    }

    // Then mirror the active page into the URL whenever it changes.
    return react('page-url-sync', () => {
      const current = toSlug(editor.getCurrentPageId())
      const sp = new URLSearchParams(window.location.search)
      if (sp.get('page') !== current) {
        sp.set('page', current)
        setSearchParams(sp, { replace: true })
      }
    })
  }, [editor, setSearchParams])

  return null
}
