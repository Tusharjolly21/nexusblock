import { Icon } from '@iconify/react'

const LOGOS = [
  'logos:aws', 'logos:google-cloud', 'logos:kubernetes',
  'logos:postgresql', 'logos:redis', 'logos:kafka-icon',
  'logos:terraform-icon', 'logos:docker-icon', 'logos:stripe', 'logos:vercel-icon',
]

/** "Trusted by teams who ship" — infinite greyscale marquee (spec 5.1 §3). */
export function LogoStrip() {
  const row = [...LOGOS, ...LOGOS]
  return (
    <section className="border-y border-line py-10">
      <p className="mb-7 text-center font-mono text-xs uppercase tracking-widest text-grey-3">
        Trusted by teams who ship
      </p>
      <div className="relative overflow-hidden" style={{ maskImage: 'linear-gradient(90deg,transparent,black 12%,black 88%,transparent)', WebkitMaskImage: 'linear-gradient(90deg,transparent,black 12%,black 88%,transparent)' }}>
        <div className="flex w-max animate-[marquee_38s_linear_infinite] items-center gap-16 pr-16">
          {row.map((l, i) => (
            <Icon key={l + i} icon={l} width={42} height={42} className="shrink-0 opacity-85 grayscale-[15%] transition duration-300 hover:scale-110 hover:grayscale-0" />
          ))}
        </div>
      </div>
      <style>{`@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
    </section>
  )
}
