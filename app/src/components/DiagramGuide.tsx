import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { Logo } from './Logo'
import { ToneToggle } from './ToneToggle'

/**
 * Standalone "How to use diagram-as-code" guide. Linked from the DSL panel's
 * "How to use" button (opens in a new tab). Step-by-step syntax + a tour of
 * every canvas tool and feature.
 */
export function DiagramGuide() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-50 border-b border-line bg-paper/80 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/app" className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
            <Logo /> nexusblock
          </Link>
          <div className="flex items-center gap-4">
            <ToneToggle />
            <Link
              to="/app"
              className="flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper transition-transform hover:-translate-y-px"
            >
              <Icon icon="lucide:arrow-left" width={15} /> Back to canvas
            </Link>
          </div>
        </nav>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* hero */}
        <div className="mb-12 max-w-2xl">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-grey-3">
            <Icon icon="lucide:code-2" width={12} /> Diagram as code
          </span>
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Draw diagrams by typing them.
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-grey-4">
            Describe nodes, entities, and relationships in a tiny, readable DSL. nexusblock compiles it
            to real, editable shapes with automatic layout — no dragging boxes into place. The panel's
            <b className="text-ink"> Type</b> switch covers <b className="text-ink">Flow charts</b> and{' '}
            <b className="text-ink">ERDs</b>; this guide walks through both plus every tool on the canvas.
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-[220px_1fr]">
          {/* TOC */}
          <aside className="hidden lg:block">
            <nav className="sticky top-24 space-y-1">
              {TOC.map((t) => (
                <a
                  key={t.id}
                  href={`#${t.id}`}
                  className="block rounded-lg px-3 py-1.5 text-sm text-grey-4 transition-colors hover:bg-grey-1 hover:text-ink"
                >
                  {t.label}
                </a>
              ))}
            </nav>
          </aside>

          <main className="min-w-0 space-y-16">
            {/* how it works */}
            <Section id="how" title="How it works" kicker="Overview">
              <p className="text-grey-4">
                The code pane is one-way for now: you write the DSL, hit{' '}
                <Kbd>Apply to canvas</Kbd>, and nexusblock parses it, runs an{' '}
                <b className="text-ink">ELK layered auto-layout</b>, and draws native shapes. Edit the
                shapes by hand afterwards, or keep iterating in code.
              </p>
              <Flow steps={['Write DSL', 'Parse + validate', 'ELK auto-layout', 'Native shapes on canvas']} />
            </Section>

            {/* open the panel */}
            <Section id="open" title="Open the code panel" kicker="Step 1">
              <StepList
                steps={[
                  <>Click the <b className="text-ink">DSL</b> button (<Icon icon="lucide:code" width={14} className="inline" />) in the left icon rail — the editor slides in on the right.</>,
                  <>Or open the command palette with <Kbd>⌘K</Kbd> / <Kbd>Ctrl K</Kbd> and run <b className="text-ink">Toggle diagram-as-code</b>.</>,
                  <>Drag the panel's left edge to resize it. Click <b className="text-ink">How to use</b> anytime to reopen this guide.</>,
                ]}
              />
            </Section>

            {/* nodes */}
            <Section id="nodes" title="Declare nodes & groups" kicker="Step 2">
              <p className="text-grey-4">A node is a <b className="text-ink">name</b> plus optional <b className="text-ink">[properties]</b>. Names are unique and can contain spaces and <code className="rounded bg-grey-1 px-1 py-0.5 font-mono text-xs">?</code>. A referenced-but-undefined name auto-creates a blank node.</p>
              <Code>{`Issue type? [shape: oval, icon: file-text]
//  └name──┘  └──── properties (optional) ────┘`}</Code>
              <p className="mt-4 mb-2 text-sm font-semibold">Properties</p>
              <div className="overflow-hidden rounded-xl border border-line">
                <table className="w-full text-sm">
                  <tbody>
                    {PROPS.map(([prop, desc], i) => (
                      <tr key={prop} className={i % 2 ? 'bg-surface' : 'bg-paper'}>
                        <td className="w-24 px-4 py-2.5 font-mono text-ink">{prop}</td>
                        <td className="px-4 py-2.5 text-grey-4">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 mb-1 text-sm text-grey-3">Shapes: <span className="font-mono text-xs text-ink">{SHAPES.join(', ')}</span> (default <span className="font-mono text-xs">rectangle</span>).</p>
              <p className="mt-4 mb-2 text-sm font-semibold">Groups</p>
              <p className="mb-2 text-grey-4">Wrap nodes in <code className="rounded bg-grey-1 px-1 py-0.5 font-mono text-xs">{'{ }'}</code> to cluster them in a titled, colored container. Groups can nest and take <span className="font-mono text-xs">color</span> + <span className="font-mono text-xs">label</span>.</p>
              <Code>{`BugPath [color: red] {
  Bug [icon: bug, color: red]
  Duplicate? [shape: diamond, icon: copy]
}`}</Code>
            </Section>

            {/* edges */}
            <Section id="edges" title="Connect them" kicker="Step 3">
              <p className="text-grey-4">Connect two names with a connector, and add a label after <code className="rounded bg-grey-1 px-1 py-0.5 font-mono text-xs">:</code>.</p>
              <Code>{`Duplicate? > Mark duplicate: Yes
Duplicate? > Has repro?: No`}</Code>
              <div className="mt-4 mb-3 overflow-hidden rounded-xl border border-line">
                <table className="w-full text-sm">
                  <tbody>
                    {CONNECTORS.map(([sym, desc], i) => (
                      <tr key={sym} className={i % 2 ? 'bg-surface' : 'bg-paper'}>
                        <td className="w-20 px-4 py-2.5 font-mono text-ink">{sym}</td>
                        <td className="px-4 py-2.5 text-grey-4">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-grey-4"><b className="text-ink">Branch</b> to many with commas, and <b className="text-ink">chain</b> in one line:</p>
              <Code>{`Issue > Bug, Feature        // one-to-many
Issue > Bug > Duplicate?    // chained
direction right             // down (default), up, left, right`}</Code>
            </Section>

            {/* autocomplete */}
            <Section id="editor" title="Autocomplete, highlighting & errors" kicker="The editor">
              <FeatureRows
                rows={[
                  ['lucide:sparkles', 'Autocomplete', 'Declared node names anywhere, and shape / icon / color values inside [ ]. Triggered as you type or with Ctrl+Space.'],
                  ['lucide:palette', 'Syntax highlighting', 'Names, connectors, strings, properties and comments are colour-coded (Monaco, same engine as VS Code).'],
                  ['lucide:alert-circle', 'Live errors', 'Unknown shapes and malformed connections are underlined inline and listed at the bottom of the panel before you apply.'],
                  ['lucide:hash', 'Comments', 'Lines starting with // or # are ignored.'],
                ]}
              />
            </Section>

            {/* full example */}
            <Section id="example" title="A complete example" kicker="Copy & paste">
              <p className="mb-3 text-grey-4">The issue-triage flow — paste it into the panel and hit Apply.</p>
              <Code>{`Issue type? [shape: oval, icon: file-text]

BugPath [color: red] {
  Bug [icon: bug, color: red]
  Duplicate? [shape: diamond, icon: copy]
  Mark duplicate [shape: oval, icon: copy]
  Has repro? [shape: diamond, icon: repeat]
  Ask for repro [shape: oval, icon: repeat]
}

Issue ready to claim [shape: oval, icon: send]

Issue type? > Bug
Bug > Duplicate?
Duplicate? > Mark duplicate: Yes
Duplicate? > Has repro?: No
Has repro? > Issue ready to claim: Yes
Has repro? > Ask for repro: No`}</Code>
            </Section>

            {/* ERD */}
            <Section id="erd" title="Entity Relationship Diagrams" kicker="The other type">
              <p className="text-grey-4">
                Switch the panel's <b className="text-ink">Type</b> to <b className="text-ink">ERD</b> to model a database.
                An entity is a name + <code className="rounded bg-grey-1 px-1 py-0.5 font-mono text-xs">{'{ }'}</code> block of
                attributes; each attribute is <span className="font-mono text-xs">name type</span> with an optional{' '}
                <span className="font-mono text-xs">pk</span>. Entities take <span className="font-mono text-xs">icon</span> and{' '}
                <span className="font-mono text-xs">color</span>.
              </p>
              <Code>{`users [icon: user, color: blue] {
  id string pk
  displayName string
  teamId string
}`}</Code>
              <p className="mt-4 mb-2 text-sm font-semibold">Relationships & cardinality</p>
              <p className="mb-2 text-grey-4">
                Relate two attributes with <code className="rounded bg-grey-1 px-1 py-0.5 font-mono text-xs">entity.attr</code>{' '}
                on each side (or just entity names). The connector sets the cardinality, drawn as <span className="font-mono text-xs">1</span> /{' '}
                <span className="font-mono text-xs">*</span> markers on the line.
              </p>
              <div className="mb-3 overflow-hidden rounded-xl border border-line">
                <table className="w-full text-sm">
                  <tbody>
                    {ERD_CONNECTORS.map(([sym, desc], i) => (
                      <tr key={sym} className={i % 2 ? 'bg-surface' : 'bg-paper'}>
                        <td className="w-20 px-4 py-2.5 font-mono text-ink">{sym}</td>
                        <td className="px-4 py-2.5 text-grey-4">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mb-3 text-grey-4">A referenced-but-undefined entity or attribute is created automatically. Full example:</p>
              <Code>{`users [icon: user, color: blue] {
  id string pk
  displayName string
  teamId string
}

teams [icon: users, color: blue] {
  id string pk
  name string
}

posts [icon: file-text, color: green] {
  id string pk
  authorId string
  title string
}

users.teamId > teams.id
posts.authorId > users.id`}</Code>
            </Section>

            {/* tools tour */}
            <Section id="tools" title="Every tool on the canvas" kicker="Beyond code">
              <div className="grid gap-3 sm:grid-cols-2">
                {TOOLS.map(([icon, title, desc]) => (
                  <div key={title} className="rounded-2xl border border-line bg-surface p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-grey-1 text-ink">
                        <Icon icon={icon} width={16} />
                      </span>
                      <span className="text-sm font-semibold">{title}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-grey-4">{desc}</p>
                  </div>
                ))}
              </div>
            </Section>

            {/* shortcuts */}
            <Section id="shortcuts" title="Keyboard shortcuts" kicker="Move faster">
              <div className="overflow-hidden rounded-xl border border-line">
                <table className="w-full text-sm">
                  <tbody>
                    {SHORTCUTS.map(([keys, desc], i) => (
                      <tr key={desc} className={i % 2 ? 'bg-surface' : 'bg-paper'}>
                        <td className="w-40 px-4 py-2.5"><Kbd>{keys}</Kbd></td>
                        <td className="px-4 py-2.5 text-grey-4">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            {/* CTA */}
            <div className="rounded-3xl border border-line bg-surface p-8 text-center">
              <h3 className="font-display text-2xl font-semibold tracking-tight">Ready to draw?</h3>
              <p className="mx-auto mt-2 max-w-md text-grey-4">Open the canvas, hit the DSL button, and turn text into a diagram.</p>
              <Link
                to="/app"
                className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition-transform hover:-translate-y-px"
              >
                Open the canvas <Icon icon="lucide:arrow-right" width={15} />
              </Link>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

const TOC = [
  { id: 'how', label: 'How it works' },
  { id: 'open', label: '1 · Open the panel' },
  { id: 'nodes', label: '2 · Nodes & groups' },
  { id: 'edges', label: '3 · Connect them' },
  { id: 'editor', label: 'Autocomplete & errors' },
  { id: 'example', label: 'Full example' },
  { id: 'erd', label: 'ERD diagrams' },
  { id: 'tools', label: 'Every canvas tool' },
  { id: 'shortcuts', label: 'Keyboard shortcuts' },
]

const PROPS: [string, string][] = [
  ['shape', 'Node shape — diamond, oval, cylinder, hexagon… (default rectangle).'],
  ['icon', 'Icon name (file-text, bug, repeat…) or a tech logo (excel, amazon).'],
  ['color', 'Named color (red, green, blue…) or a "#hex" — tints fill, stroke & group.'],
  ['label', 'Display text if it should differ from the (unique) name. Quote if spaced.'],
]

const SHAPES = ['rectangle', 'oval', 'ellipse', 'diamond', 'cylinder', 'hexagon', 'parallelogram', 'trapezoid', 'triangle', 'document', 'star']

const CONNECTORS: [string, string][] = [
  ['>', 'Arrow, left-to-right'],
  ['<', 'Arrow, right-to-left'],
  ['<>', 'Bi-directional arrow'],
  ['-', 'Plain line (no arrowhead)'],
  ['--', 'Dotted line'],
  ['-->', 'Dotted arrow'],
]

const ERD_CONNECTORS: [string, string][] = [
  ['>', 'Many-to-one'],
  ['<', 'One-to-many'],
  ['-', 'One-to-one'],
  ['<>', 'Many-to-many'],
]

const TOOLS: [string, string, string][] = [
  ['lucide:search', 'Insert menu ( / )', 'Press / on the canvas to drop any shape, element, or Iconify icon at your cursor — searched live.'],
  ['lucide:group', 'Group frames', 'Titled containers that cluster related services (like an "AWS Cloud" boundary). Double-click the title to rename.'],
  ['lucide:shapes', 'Shapes & tools', 'Rectangle, ellipse, arrows, text, sticky notes, draw, and a full geo-shape picker in the floating toolbar.'],
  ['lucide:image', 'Icon library', '1000+ tech logos and cloud icons. Drag onto the canvas or click to insert.'],
  ['lucide:columns-2', 'View modes', 'Canvas only, split (canvas + doc), or full document — switch from the top bar.'],
  ['lucide:git-fork', 'Live diagrams in docs', 'In the note editor type / → "Diagram from canvas" to embed a snapshot that you can refresh.'],
  ['lucide:shield-check', 'Diagram linter', 'Flags orphan nodes, unlabeled edges, dangling connectors and duplicates in the inspector.'],
  ['lucide:command', 'Command palette', '⌘K for every action: tools, insert, view, export, mode, and file switching.'],
  ['lucide:download', 'Export', 'PNG, SVG, PDF for the canvas and Markdown for the doc.'],
]

const SHORTCUTS: [string, string][] = [
  ['⌘K / Ctrl K', 'Open the command palette'],
  ['/', 'Insert menu on the canvas'],
  ['V', 'Select tool'],
  ['R', 'Rectangle'],
  ['O', 'Ellipse'],
  ['A', 'Arrow / connector'],
  ['T', 'Text'],
  ['Ctrl \\', 'Toggle canvas focus mode'],
  ['⇧1', 'Zoom to fit'],
]

function Section({ id, title, kicker, children }: { id: string; title: string; kicker: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-grey-3">{kicker}</div>
      <h2 className="mb-4 font-display text-2xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  )
}

function Code({ children }: { children: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(children).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    })
  }
  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-[var(--color-surface)]">
      <div className="flex items-center justify-between border-b border-line bg-paper px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-widest text-grey-3">nbdsl</span>
        <button onClick={copy} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-grey-4 hover:text-ink">
          <Icon icon={copied ? 'lucide:check' : 'lucide:copy'} width={12} /> {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-ink"><code>{children}</code></pre>
    </div>
  )
}

function StepList({ steps }: { steps: React.ReactNode[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-3">
          <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-ink text-xs font-bold text-paper">{i + 1}</span>
          <span className="pt-0.5 text-grey-4">{s}</span>
        </li>
      ))}
    </ol>
  )
}

function FeatureRows({ rows }: { rows: [string, string, string][] }) {
  return (
    <div className="space-y-3">
      {rows.map(([icon, title, desc]) => (
        <div key={title} className="flex gap-3 rounded-2xl border border-line bg-surface p-4">
          <span className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-grey-1 text-ink">
            <Icon icon={icon} width={16} />
          </span>
          <div>
            <div className="text-sm font-semibold">{title}</div>
            <p className="mt-0.5 text-sm leading-relaxed text-grey-4">{desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function Flow({ steps }: { steps: string[] }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {steps.map((s, i) => (
        <span key={s} className="flex items-center gap-2">
          <span className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium">{s}</span>
          {i < steps.length - 1 && <Icon icon="lucide:arrow-right" width={15} className="text-grey-3" />}
        </span>
      ))}
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded-md border border-line bg-paper px-1.5 py-0.5 font-mono text-[11px] text-ink">{children}</kbd>
}
