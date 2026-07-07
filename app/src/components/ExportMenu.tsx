import { useState } from 'react'
import { useApp, selectCurrentFile } from '../store/useApp'
import { ExportModal } from './ExportModal'

/** Export button: opens the premium unified Export modal dialog directly. */
export function ExportMenu() {
  const [showModal, setShowModal] = useState(false)
  const file = useApp(selectCurrentFile)
  const title = file?.title ?? 'nexusblock'

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex min-w-[76px] items-center justify-center rounded-full border border-grey-2 px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-ink"
      >
        Export
      </button>

      {showModal && <ExportModal title={title} onClose={() => setShowModal(false)} />}
    </>
  )
}
