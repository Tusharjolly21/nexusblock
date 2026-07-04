import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { useAuth } from '../store/useAuth'
import { useApp } from '../store/useApp'

/** Account popover: identity + log out (frontend-only session). */
export function AccountMenu() {
  const navigate = useNavigate()
  const signOut = useAuth((s) => s.signOut)
  const email = useAuth((s) => s.email)
  const provider = useAuth((s) => s.provider)
  const profile = useApp((s) => s.profile)
  const workspace = useApp((s) => s.workspaceName)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const name = profile?.name && profile.name !== 'there' ? profile.name : email || 'Your account'
  const initial = (name[0] || 'N').toUpperCase()

  const logout = () => {
    signOut()
    navigate('/')
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="grid h-8 w-8 place-items-center rounded-full bg-ink text-sm font-semibold text-paper transition-transform hover:scale-105"
      >
        {initial}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-60 rounded-xl border border-line bg-surface p-2 shadow-[0_16px_40px_-16px_rgba(0,0,0,.3)]">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-sm font-semibold text-paper">{initial}</span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-ink">{name}</div>
              <div className="truncate font-mono text-[10px] text-grey-3">
                {provider ? `via ${provider}` : 'signed in'} · {workspace}
              </div>
            </div>
          </div>
          <div className="my-1 h-px bg-line" />
          <MenuItem icon="lucide:settings" label="Workspace settings" onClick={() => setOpen(false)} />
          <MenuItem icon="lucide:credit-card" label="Billing" onClick={() => setOpen(false)} />
          <div className="my-1 h-px bg-line" />
          <MenuItem icon="lucide:log-out" label="Log out" onClick={logout} />
        </div>
      )}
    </div>
  )
}

function MenuItem({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-grey-4 transition-colors hover:bg-grey-1 hover:text-ink"
    >
      <Icon icon={icon} width={16} /> {label}
    </button>
  )
}
