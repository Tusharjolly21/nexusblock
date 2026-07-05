import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@iconify/react'
import { QRCodeSVG } from 'qrcode.react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../store/useAuth'
import { useApp, selectCurrentFile } from '../store/useApp'
import { cloudEnabled, defaultShare, pullShare, pushShare, queueShareInvite, type ShareRole, type ShareSettings } from '../sync/cloud'
import { isCollabConfigured } from '../lib/collab'

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
const roleLabel: Record<ShareRole, string> = { edit: 'Can edit', view: 'Can view' }

export function ShareModal({ fileId, title, onClose }: { fileId: string; title: string; onClose: () => void }) {
  const uid = useAuth((s) => s.uid)
  const ownerEmail = useAuth((s) => s.email)
  const file = useApp(selectCurrentFile)
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [share, setShare] = useState<ShareSettings>(defaultShare())
  const [email, setEmail] = useState('')
  const [newInviteRole, setNewInviteRole] = useState<ShareRole>('edit')
  const [copied, setCopied] = useState(false)
  const [liveCopied, setLiveCopied] = useState(false)
  const [inviteCopied, setInviteCopied] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [queuedInvite, setQueuedInvite] = useState<string | null>(null)

  const url = `${window.location.origin}/app/file/${fileId}`
  const liveUrl = `${url}?live=1`
  const isLive = params.get('live') === '1'
  const isSharedRecipient = !!file?.sharedFrom
  const linkRole = share.access === 'link' ? share.linkRole : null
  const summary = share.access === 'link' ? `Anyone with link ${share.linkRole === 'edit' ? 'can edit' : 'can view'}` : 'Invite only'

  useEffect(() => {
    if (!cloudEnabled()) { setLoaded(true); return }
    let cancelled = false
    void pullShare(fileId).then((s) => {
      if (cancelled) return
      if (s) setShare({ access: s.access, linkRole: s.linkRole, invites: s.invites ?? [] })
      setLoaded(true)
    })
    return () => { cancelled = true }
  }, [fileId])

  useEffect(() => {
    if (!loaded || !uid || !cloudEnabled()) return
    const t = window.setTimeout(() => { void pushShare(fileId, uid, title, share) }, 400)
    return () => window.clearTimeout(t)
  }, [share, loaded, uid, fileId, title])

  const copy = (value: string, kind: 'link' | 'live' | string = 'link') => {
    navigator.clipboard?.writeText(value).then(() => {
      if (kind === 'live') {
        setLiveCopied(true)
        window.setTimeout(() => setLiveCopied(false), 1500)
      } else if (kind === 'link') {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1500)
      } else {
        setInviteCopied(kind)
        window.setTimeout(() => setInviteCopied(null), 1500)
      }
    })
  }

  const mailInvite = (targetEmail: string, role: ShareRole) => {
    const subject = encodeURIComponent(`${ownerEmail || 'Someone'} shared "${title}" with you`)
    const body = encodeURIComponent([
      `You have been invited to ${role === 'edit' ? 'edit' : 'view'} "${title}" in nexusblock.`,
      '',
      url,
      '',
      'Sign in with this email address to open the shared file.',
    ].join('\n'))
    window.location.href = `mailto:${targetEmail}?subject=${subject}&body=${body}`
  }

  const addInvite = () => {
    const e = email.trim().toLowerCase()
    if (!isEmail(e) || share.invites.some((i) => i.email === e) || !uid) return
    setShare((s) => ({ ...s, invites: [...s.invites, { email: e, role: newInviteRole }] }))
    if (cloudEnabled()) {
      queueShareInvite({
        fileId,
        title,
        ownerUid: uid,
        ownerEmail,
        recipientEmail: e,
        role: newInviteRole,
        url,
      }).then(() => {
        setQueuedInvite(e)
        window.setTimeout(() => setQueuedInvite(null), 1800)
      }).catch(() => {})
    }
    setEmail('')
  }

  const setInviteRole = (targetEmail: string, role: ShareRole) =>
    setShare((s) => ({ ...s, invites: s.invites.map((i) => (i.email === targetEmail ? { ...i, role } : i)) }))

  const removeInvite = (targetEmail: string) =>
    setShare((s) => ({ ...s, invites: s.invites.filter((i) => i.email !== targetEmail) }))

  const goLive = () => {
    if (uid && cloudEnabled()) void pushShare(fileId, uid, title, share)
    navigate(`/app/file/${fileId}?live=1`)
    onClose()
  }

  const leaveLive = () => {
    navigate(`/app/file/${fileId}`)
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-100 grid place-items-center bg-ink/28 p-6 backdrop-blur-md" onClick={onClose}>
      <div
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-line bg-paper shadow-[0_30px_90px_-36px_rgba(0,0,0,.7)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-ink text-paper">
              <Icon icon="lucide:share-2" width={17} />
            </span>
            <div className="min-w-0">
              <h2 className="truncate font-display text-lg font-semibold tracking-tight text-ink">Share “{title}”</h2>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-grey-3">
                <span>{summary}</span>
                <span className="h-1 w-1 rounded-full bg-grey-2" />
                <span>{share.invites.length} guest{share.invites.length === 1 ? '' : 's'}</span>
                {isLive && (
                  <>
                    <span className="h-1 w-1 rounded-full bg-grey-2" />
                    <span className="inline-flex items-center gap-1 text-emerald-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-xl text-grey-3 hover:bg-grey-1 hover:text-ink">
            <Icon icon="lucide:x" width={17} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <section className="rounded-2xl border border-line bg-surface p-3">
            <div className="flex items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-paper px-3 py-2.5">
                <Icon icon="lucide:link" width={15} className="shrink-0 text-grey-3" />
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-grey-4">{url}</span>
                <span className="hidden rounded-full bg-grey-1 px-2 py-0.5 text-[11px] font-semibold text-grey-4 sm:inline-flex">
                  {linkRole ? roleLabel[linkRole] : 'Restricted'}
                </span>
              </div>
              <button onClick={() => copy(url)} className="shrink-0 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper hover:opacity-90">
                {copied ? 'Copied' : 'Copy link'}
              </button>
            </div>
          </section>

          <section className="mt-5">
            <SectionTitle icon="lucide:user-plus" title="Invite" subtitle="Give specific people view or edit access." />
            <div className="mt-3 grid grid-cols-[1fr_118px_86px] gap-2 max-sm:grid-cols-1">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addInvite() }}
                type="email"
                placeholder="teammate@company.com"
                className="min-w-0 rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none placeholder:text-grey-3 focus:border-ink"
              />
              <select
                value={newInviteRole}
                onChange={(e) => setNewInviteRole(e.target.value as ShareRole)}
                className="rounded-xl border border-line bg-surface px-2 text-sm font-semibold text-ink outline-none"
              >
                <option value="edit">Can edit</option>
                <option value="view">Can view</option>
              </select>
              <button onClick={addInvite} disabled={!isEmail(email.trim())} className="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper hover:opacity-90 disabled:opacity-35">
                Invite
              </button>
            </div>

            {share.invites.length > 0 && (
              <div className="mt-3 divide-y divide-line rounded-2xl border border-line bg-surface">
                {share.invites.map((invite) => (
                  <div key={invite.email} className="flex items-center gap-2 px-3 py-2.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-paper">
                      {invite.email[0].toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-ink">{invite.email}</div>
                      <div className="text-xs text-grey-3">{queuedInvite === invite.email ? 'Email queued' : 'Pending'} · {roleLabel[invite.role]}</div>
                    </div>
                    <select
                      value={invite.role}
                      onChange={(e) => setInviteRole(invite.email, e.target.value as ShareRole)}
                      className="rounded-lg border border-line bg-paper px-2 py-1.5 text-xs font-semibold text-grey-4"
                    >
                      <option value="edit">Can edit</option>
                      <option value="view">Can view</option>
                    </select>
                    <IconButton title="Copy invite link" icon={inviteCopied === invite.email ? 'lucide:check' : 'lucide:copy'} onClick={() => copy(url, invite.email)} />
                    <IconButton title="Open email invite" icon="lucide:mail" onClick={() => mailInvite(invite.email, invite.role)} />
                    <IconButton title="Remove invite" icon="lucide:x" onClick={() => removeInvite(invite.email)} />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mt-5">
            <SectionTitle icon="lucide:shield" title="Link access" subtitle="Control what the copied link allows." />
            <div className="mt-3 grid grid-cols-3 gap-2 max-sm:grid-cols-1">
              <AccessOption
                active={share.access === 'restricted'}
                icon="lucide:lock"
                title="Restricted"
                onClick={() => setShare((s) => ({ ...s, access: 'restricted' }))}
              />
              <AccessOption
                active={share.access === 'link' && share.linkRole === 'view'}
                icon="lucide:eye"
                title="Link can view"
                onClick={() => setShare((s) => ({ ...s, access: 'link', linkRole: 'view' }))}
              />
              <AccessOption
                active={share.access === 'link' && share.linkRole === 'edit'}
                icon="lucide:pencil"
                title="Link can edit"
                onClick={() => setShare((s) => ({ ...s, access: 'link', linkRole: 'edit' }))}
              />
            </div>
          </section>

          <section className="mt-5 grid grid-cols-[1fr_148px] gap-3 max-sm:grid-cols-1">
            <div className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-center gap-3">
                <span className={'grid h-10 w-10 shrink-0 place-items-center rounded-2xl ' + (isLive ? 'bg-emerald-500/15 text-emerald-600' : 'bg-grey-1 text-ink')}>
                  <Icon icon="lucide:radio" width={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                    Live session
                    {isLive && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
                  </div>
                  <p className="text-xs leading-5 text-grey-3">
                    {isCollabConfigured ? 'Invite people into the same multiplayer room.' : 'Configure collaboration to enable live cursors.'}
                  </p>
                </div>
              </div>
              {isCollabConfigured && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={isLive ? leaveLive : goLive}
                    className={
                      'flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ' +
                      (isLive
                        ? 'border-red-500/25 bg-red-500/10 text-red-600 hover:bg-red-500/15'
                        : 'border-line bg-paper text-ink hover:bg-grey-1')
                    }
                  >
                    {isLive ? (isSharedRecipient ? 'Leave live' : 'End live') : 'Go live'}
                  </button>
                  <button onClick={() => copy(liveUrl, 'live')} className="flex-1 rounded-xl bg-ink px-3 py-2 text-sm font-semibold text-paper hover:opacity-90">
                    {liveCopied ? 'Copied' : 'Copy live'}
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-line bg-surface p-3">
              <div className="mx-auto w-fit rounded-xl bg-white p-1.5">
                <QRCodeSVG value={url} size={86} bgColor="#ffffff" fgColor="#18181b" />
              </div>
              <p className="mt-2 text-center text-xs font-medium text-grey-3">Open on mobile</p>
            </div>
          </section>

          <section className="mt-5 rounded-2xl border border-line bg-surface px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-grey-3">
              <span className="flex items-center gap-1.5"><Icon icon="lucide:eye" width={14} className="text-ink" /> Viewers get a locked canvas.</span>
              <span className="flex items-center gap-1.5"><Icon icon="lucide:pencil" width={14} className="text-ink" /> Editors update this file.</span>
              <span className="flex items-center gap-1.5"><Icon icon="lucide:mail" width={14} className="text-ink" /> Invites are queued for Firebase email delivery.</span>
            </div>
          </section>

          {!cloudEnabled() && (
            <p className="mt-4 rounded-2xl border border-line bg-surface p-3 text-center text-xs text-grey-3">Set Firebase env vars to make share links work for others.</p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function SectionTitle({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-grey-1 text-ink">
        <Icon icon={icon} width={15} />
      </span>
      <div>
        <div className="text-sm font-semibold text-ink">{title}</div>
        <p className="text-xs text-grey-3">{subtitle}</p>
      </div>
    </div>
  )
}

function AccessOption({ active, icon, title, onClick }: { active: boolean; icon: string; title: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={
        'flex min-h-20 flex-col items-start justify-between rounded-2xl border p-3 text-left transition-colors ' +
        (active ? 'border-ink bg-surface text-ink' : 'border-line bg-surface text-grey-4 hover:border-ink hover:text-ink')
      }
    >
      <span className="flex w-full items-center justify-between gap-2">
        <span className={'grid h-8 w-8 place-items-center rounded-xl ' + (active ? 'bg-ink text-paper' : 'bg-grey-1 text-ink')}>
          <Icon icon={icon} width={15} />
        </span>
        {active && <Icon icon="lucide:check" width={15} />}
      </span>
      <span className="text-sm font-semibold">{title}</span>
    </button>
  )
}

function IconButton({ title, icon, onClick }: { title: string; icon: string; onClick: () => void }) {
  return (
    <button title={title} aria-label={title} onClick={onClick} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-grey-4 hover:bg-grey-1 hover:text-ink">
      <Icon icon={icon} width={14} />
    </button>
  )
}
