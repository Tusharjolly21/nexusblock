import { LandingNav, LandingFooter } from './landing/LandingChrome'
import { PricingSection } from './landing/PricingSection'

const FAQ = [
  ['Is there really no per-seat pricing?', 'Correct — Pro and Team are flat monthly prices. Invite the whole company; the bill does not move.'],
  ['What counts as an AI credit?', 'One diagram or document generation. Editing and regenerating a selection each cost one credit.'],
  ['Can I self-host?', 'The sync server is self-hostable on the privacy tier, so your documents never leave your network.'],
  ['Do guests need an account?', 'No. Anyone with a share link can view (or comment/edit, if you allow it) without signing in.'],
]

export function PricingPage() {
  return (
    <div className="min-h-full bg-paper text-ink">
      <LandingNav />
      <section className="mx-auto max-w-3xl px-6 pb-4 pt-24 text-center">
        <div className="mb-4 font-mono text-xs uppercase tracking-widest text-grey-3">Pricing</div>
        <h1 className="font-display text-[clamp(36px,5vw,60px)] font-medium tracking-[-0.035em]">
          Simple, flat, honest.
        </h1>
        <p className="mx-auto mt-5 max-w-[46ch] text-lg text-grey-4">
          Free forever for individuals. One flat price per plan — no counting seats, no surprises at renewal.
        </p>
      </section>

      <PricingSection heading={false} />

      <section className="mx-auto max-w-3xl px-6 pb-28">
        <h2 className="mb-8 text-center font-display text-2xl font-semibold tracking-tight">Questions</h2>
        <div className="divide-y divide-line rounded-2xl border border-line">
          {FAQ.map(([q, a]) => (
            <div key={q} className="p-6">
              <div className="font-semibold text-ink">{q}</div>
              <p className="mt-1.5 text-sm text-grey-4">{a}</p>
            </div>
          ))}
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}
