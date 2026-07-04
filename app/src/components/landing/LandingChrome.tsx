import { Link } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { Logo } from '../Logo'
import { ToneToggle } from '../ToneToggle'
import { useAuth } from '../../store/useAuth'

const NAV = [
  { label: 'Features', to: '/#features' },
  { label: 'Diagram as code', to: '/#code' },
  { label: 'Templates', to: '/templates' },
  { label: 'Pricing', to: '/pricing' },
]

export function LandingNav() {
  const authed = useAuth((s) => s.authed)
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/75 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
          <Logo /> nexusblock
        </Link>
        <div className="flex items-center gap-6">
          {NAV.map((n) => (
            <Link key={n.label} to={n.to} className="hidden text-sm font-medium text-grey-4 hover:text-ink md:block">
              {n.label}
            </Link>
          ))}
          <ToneToggle />
          {authed ? (
            <Link
              to="/app"
              className="flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper transition-transform hover:-translate-y-px"
            >
              Open the canvas <Icon icon="lucide:arrow-right" width={15} />
            </Link>
          ) : (
            <>
              <Link to="/login" className="hidden text-sm font-semibold text-ink hover:opacity-80 sm:block">
                Log in
              </Link>
              <Link
                to="/signup"
                className="flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper transition-transform hover:-translate-y-px"
              >
                Get started — free <Icon icon="lucide:arrow-right" width={15} />
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}

const FOOTER_COLS = [
  { title: 'Product', links: ['Features', 'Diagram as code', 'Templates', 'Pricing', 'Changelog'] },
  { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
  { title: 'Resources', links: ['Docs', 'Community', 'Status', 'Keyboard shortcuts'] },
  { title: 'Legal', links: ['Privacy', 'Terms', 'Security'] },
]

export function LandingFooter() {
  return (
    <footer className="border-t border-line bg-paper">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 font-display font-semibold tracking-tight">
              <Logo size={18} /> nexusblock
            </div>
            <p className="mt-3 max-w-[24ch] text-sm text-grey-3">
              Diagrams and docs that stay true to your system.
            </p>
          </div>
          {FOOTER_COLS.map((col) => (
            <div key={col.title}>
              <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-grey-3">{col.title}</div>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-grey-4 hover:text-ink">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-line pt-8 text-sm text-grey-3 sm:flex-row">
          <span>© 2026 nexusblock</span>
          <span className="font-mono text-xs">Made with restraint. No emojis were harmed.</span>
        </div>
      </div>
    </footer>
  )
}
