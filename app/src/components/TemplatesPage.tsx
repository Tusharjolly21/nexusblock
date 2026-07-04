import { LandingNav, LandingFooter } from './landing/LandingChrome'
import { TemplatesSection } from './landing/TemplatesSection'

export function TemplatesPage() {
  return (
    <div className="min-h-full bg-paper text-ink">
      <LandingNav />
      <section className="mx-auto max-w-3xl px-6 pb-4 pt-24 text-center">
        <div className="mb-4 font-mono text-xs uppercase tracking-widest text-grey-3">Templates</div>
        <h1 className="font-display text-[clamp(36px,5vw,60px)] font-medium tracking-[-0.035em]">
          A running start for any diagram.
        </h1>
        <p className="mx-auto mt-5 max-w-[46ch] text-lg text-grey-4">
          Cloud architectures, sequence diagrams, ERDs, flowcharts, and design docs — open one and make it yours.
        </p>
      </section>

      <TemplatesSection full />

      <LandingFooter />
    </div>
  )
}
