import { useEffect, useRef, useState } from 'react'
import Editor, { type Monaco, type OnMount } from '@monaco-editor/react'
import { Icon } from '@iconify/react'
import { useDocStore } from '../store/useDocStore'
import { useApp, selectCurrentFile } from '../store/useApp'
import { useAuth } from '../store/useAuth'
import { useTheme, isDarkTone } from '../store/useTheme'
import { useEditorUi } from '../store/useEditorUi'
import { cloudEnabled, pullContent, pushContent } from '../sync/cloud'
import { applyFlow } from '../dsl/flow/compile'
import { parseFlow } from '../dsl/flow/parse'
import { applyErd } from '../dsl/erd/compile'
import { parseErd } from '../dsl/erd/parse'
import { setupDslLanguage, DSL_LANG } from '../dsl/monaco'
import { serializeErdFromCanvas, serializeFlowFromCanvas } from '../dsl/serialize'
import { generateDsl, isAiConfigured } from '../lib/ai'
import { LoadingAnimation } from './LoadingAnimation'

type DslError = { line: number; message: string }
type DslType = 'flow' | 'erd'

const FLOW_SENIOR_SAMPLE = `// Payment orchestration flow — clean production overview
// Change anything: direction, groups, shapes, icons, colors, labels, and edge text.
direction right

"Channels" [label: "Channels", color: blue] {
  "Web checkout" [icon: monitor, color: blue]
  "Mobile app" [icon: smartphone, color: blue]
}

"Edge" [label: "Edge and API", color: cyan] {
  "CDN / WAF" [shape: hexagon, icon: logos:cloudflare-icon, color: cyan]
  "API Gateway" [icon: logos:aws-api-gateway, color: orange]
  "Auth decision" [shape: diamond, icon: shield-check, color: purple, label: "Authorized?"]
}

"Core services" [label: "Core services", color: green] {
  "Checkout API" [icon: shopping-cart, color: green]
  "Payment service" [icon: workflow, color: green]
  "Provider router" [shape: diamond, icon: route, color: violet]
}

"Async and data" [label: "Async and data", color: pink] {
  "Orders DB" [shape: cylinder, icon: logos:postgresql, color: blue]
  "Payment events" [shape: cylinder, icon: logos:kafka-icon, color: pink]
  "Worker pool" [icon: boxes, color: orange]
  "Ledger DB" [shape: cylinder, icon: database, color: green]
}

"Operations" [label: "Operations", color: slate] {
  "Metrics" [icon: activity, color: slate]
  "Alerting" [icon: bell, color: red]
}

"Web checkout" > "CDN / WAF"
"Mobile app" > "CDN / WAF"
"CDN / WAF" > "API Gateway"
"API Gateway" > "Auth decision"
"Auth decision" > "Checkout API": valid
"Auth decision" > "Alerting" [color: red]: reject
"Checkout API" > "Orders DB"
"Checkout API" > "Payment service"
"Payment service" > "Provider router": route
"Provider router" > "Payment events": authorized
"Payment events" > "Worker pool"
"Worker pool" > "Ledger DB"
"Payment service" --> "Metrics": latency
"Metrics" > "Alerting": threshold
`
const ERD_SENIOR_SAMPLE = `// Commerce ERD — readable domain model
// Edit entities, fields, icons, colors, and relationship cardinality.
// Cardinality: < one-to-many, > many-to-one, - one-to-one, <> many-to-many

accounts [icon: building-2, color: blue] {
  id uuid pk
  name varchar
  status varchar
  createdAt timestamptz
}

customers [icon: users, color: green] {
  id uuid pk
  accountId uuid
  email citext
  lifecycle varchar
  createdAt timestamptz
}

orders [icon: shopping-cart, color: orange] {
  id uuid pk
  accountId uuid
  customerId uuid
  status varchar
  totalCents bigint
  placedAt timestamptz
}

order_items [icon: list, color: orange] {
  id uuid pk
  orderId uuid
  productId uuid
  quantity int
  unitPriceCents bigint
}

products [icon: package, color: purple] {
  id uuid pk
  sku varchar
  name varchar
  active boolean
}

payments [icon: credit-card, color: pink] {
  id uuid pk
  orderId uuid
  provider varchar
  status varchar
  amountCents bigint
  authorizedAt timestamptz
}

ledger_entries [icon: database, color: green] {
  id uuid pk
  paymentId uuid
  orderId uuid
  entryType varchar
  amountCents bigint
  bookedAt timestamptz
}

webhooks [icon: radio, color: cyan] {
  id uuid pk
  provider varchar
  eventType varchar
  paymentId uuid
  receivedAt timestamptz
}

accounts.id < customers.accountId
accounts.id < orders.accountId
customers.id < orders.customerId
orders.id < order_items.orderId
products.id < order_items.productId
orders.id < payments.orderId
payments.id < ledger_entries.paymentId
orders.id < ledger_entries.orderId
payments.id < webhooks.paymentId
`

const FLOW_INCIDENT_SAMPLE = `// Incident response workflow — escalation with explicit ownership
direction down

"Alert fired" [shape: oval, icon: bell, color: red] > "Triage severity" [shape: diamond, icon: alert-triangle, color: orange]
"Triage severity" > "Open incident room" [icon: message-square, color: orange]: SEV1 / SEV2
"Triage severity" > "Create backlog item" [icon: list-plus, color: blue]: low impact
"Open incident room" > "Assign incident commander" [icon: user-check, color: purple]
"Assign incident commander" > "Stabilize service" [shape: rectangle, icon: activity, color: green]
"Stabilize service" > "Rollback deployment" [icon: rotate-ccw, color: red]: bad release
"Stabilize service" > "Scale capacity" [icon: trending-up, color: green]: saturation
"Stabilize service" > "Patch config" [icon: settings, color: blue]: misconfig
"Rollback deployment" > "Customer comms" [icon: mail, color: blue]
"Scale capacity" > "Customer comms"
"Patch config" > "Customer comms"
"Customer comms" > "Postmortem" [shape: document, icon: file-text, color: slate]
"Postmortem" > "Action items" [shape: rectangle, icon: check-square, color: green]
`

const ERD_AUTH_SAMPLE = `// Multi-tenant auth and permissions model
organizations [icon: building-2, color: blue] {
  id uuid pk
  name varchar
  slug varchar
  createdAt timestamptz
}

memberships [icon: users, color: purple] {
  id uuid pk
  organizationId uuid
  userId uuid
  roleId uuid
  status varchar
}

users [icon: user, color: blue] {
  id uuid pk
  email citext
  displayName varchar
  mfaEnabled boolean
}

roles [icon: shield, color: orange] {
  id uuid pk
  organizationId uuid
  name varchar
  systemRole boolean
}

permissions [icon: key, color: green] {
  id uuid pk
  resource varchar
  action varchar
}

role_permissions [icon: link, color: green] {
  roleId uuid pk
  permissionId uuid pk
}

sessions [icon: monitor, color: cyan] {
  id uuid pk
  userId uuid
  organizationId uuid
  ipAddress inet
  expiresAt timestamptz
}

organizations.id < memberships.organizationId
users.id < memberships.userId
roles.id < memberships.roleId
organizations.id < roles.organizationId
roles.id < role_permissions.roleId
permissions.id < role_permissions.permissionId
users.id < sessions.userId
organizations.id < sessions.organizationId
`

const PRESETS: Record<DslType, { id: string; label: string; code: string }[]> = {
  flow: [
    { id: 'payments', label: 'Payment orchestration', code: FLOW_SENIOR_SAMPLE },
    { id: 'incident', label: 'Incident response', code: FLOW_INCIDENT_SAMPLE },
  ],
  erd: [
    { id: 'commerce', label: 'Commerce platform', code: ERD_SENIOR_SAMPLE },
    { id: 'auth', label: 'Auth + permissions', code: ERD_AUTH_SAMPLE },
  ],
}

const STARTERS: Record<DslType, string> = {
  flow: FLOW_SENIOR_SAMPLE,
  erd: ERD_SENIOR_SAMPLE,
}

const LEGACY_STARTER_MARKERS: Record<DslType, string> = {
  flow: '// Flow chart — define nodes and relationships "A > B"',
  erd: '// ERD — define entities in "{ }", then relationships',
}

function codeFromStorage(storageKey: string, dslType: DslType) {
  const saved = localStorage.getItem(storageKey)
  if (!saved) return STARTERS[dslType]
  const isOldBundledStarter =
    saved.includes(LEGACY_STARTER_MARKERS[dslType]) ||
    saved.includes('Payment orchestration flow — production checkout path') ||
    saved.includes('Commerce ERD — orders, payments, ledger, inventory, and audit')
  if (!isOldBundledStarter) return saved
  localStorage.setItem(storageKey, STARTERS[dslType])
  return STARTERS[dslType]
}

/**
 * Diagram-as-code pane (Phase 3). Flow-chart and ERD DSLs compile to native
 * shapes via ELK auto-layout, with syntax highlighting, autocomplete, and live
 * error markers. Apply writes code to canvas; Pull canvas serializes editable
 * diagram shapes back into source so the user can customize from either side.
 */
export function CodePane() {
  const editor = useDocStore((s) => s.editor)
  const markSaved = useDocStore((s) => s.markSaved)
  const file = useApp(selectCurrentFile)
  const tone = useTheme((s) => s.tone)
  const dslType = useEditorUi((s) => s.dslType)
  const canEdit = !file?.sharedFrom || file.sharedRole === 'edit'
  const uid = useAuth((s) => s.uid)
  const ownerUid = file?.sharedFrom ?? uid
  const storageKey = `nb-code-${file?.id ?? 'scratch'}-${dslType}`
  const parse = dslType === 'erd' ? parseErd : parseFlow
  const applyDiagram = dslType === 'erd' ? applyErd : applyFlow

  const [code, setCode] = useState(() => codeFromStorage(storageKey, dslType))
  const [errors, setErrors] = useState<DslError[]>([])
  const [busy, setBusy] = useState(false)
  const [presetId, setPresetId] = useState(() => PRESETS[dslType][0].id)
  const [aiOpen, setAiOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const monacoRef = useRef<Monaco | null>(null)
  const modelRef = useRef<ReturnType<Parameters<OnMount>[0]['getModel']>>(null)

  // Reload the per-type source when the diagram type switches.
  useEffect(() => {
    const next = codeFromStorage(storageKey, dslType)
    setCode(next)
    setPresetId(PRESETS[dslType][0].id)
    lint(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dslType])

  useEffect(() => {
    if (!file?.id || !ownerUid || !cloudEnabled()) return
    let cancelled = false
    void pullContent(ownerUid, file.id).then((content) => {
      const remote = content?.code?.[dslType]
      if (cancelled || !remote) return
      setCode(remote)
      localStorage.setItem(storageKey, remote)
      lint(remote)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file?.id, ownerUid, dslType, storageKey])

  const persistCode = (next: string) => {
    localStorage.setItem(storageKey, next)
    if (file?.id && ownerUid && cloudEnabled()) {
      pushContent(ownerUid, file.id, { code: { [dslType]: next } }).catch(() => {})
    }
  }

  // Recompute inline diagnostics (parse-level) and paint Monaco markers.
  const lint = (src: string) => {
    const { errors: errs } = parse(src)
    setErrors(errs)
    const monaco = monacoRef.current
    const model = modelRef.current
    if (!monaco || !model) return
    monaco.editor.setModelMarkers(
      model,
      'nbdsl',
      errs
        .filter((e) => e.line > 0)
        .map((e) => ({
          startLineNumber: e.line,
          endLineNumber: e.line,
          startColumn: 1,
          endColumn: model.getLineMaxColumn(e.line),
          message: e.message,
          severity: monaco.MarkerSeverity.Error,
        })),
    )
  }

  const onChange = (v?: string) => {
    if (!canEdit) return
    const next = v ?? ''
    setCode(next)
    persistCode(next)
    lint(next)
  }

  const applyToCanvas = async () => {
    if (!editor || !canEdit) return
    setBusy(true)
    try {
      setErrors(await applyDiagram(editor, code))
      markSaved()
    } finally {
      setBusy(false)
    }
  }

  const runAi = async () => {
    const prompt = aiPrompt.trim()
    if (!prompt || aiBusy || !canEdit) return
    setAiBusy(true)
    setAiError(null)
    try {
      const dsl = await generateDsl({ kind: dslType, prompt, currentDsl: code })
      setCode(dsl)
      persistCode(dsl)
      lint(dsl)
      setAiPrompt('')
      setAiOpen(false)
      // Draw it immediately so the user sees the result on the canvas.
      if (editor && canEdit) {
        setBusy(true)
        try {
          setErrors(await applyDiagram(editor, dsl))
          markSaved()
        } finally {
          setBusy(false)
        }
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Generation failed.')
    } finally {
      setAiBusy(false)
    }
  }

  const loadPreset = () => {
    if (!canEdit) return
    const preset = PRESETS[dslType].find((p) => p.id === presetId) ?? PRESETS[dslType][0]
    setCode(preset.code)
    persistCode(preset.code)
    lint(preset.code)
  }

  const pullCanvas = () => {
    if (!editor || !canEdit) return
    const next = dslType === 'erd' ? serializeErdFromCanvas(editor) : serializeFlowFromCanvas(editor)
    setCode(next)
    persistCode(next)
    lint(next)
  }

  const errCount = errors.filter((e) => e.line >= 0).length

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs">
          {errCount === 0 ? (
            <span className="flex items-center gap-1 font-medium text-grey-4">
              <Icon icon="lucide:check-circle-2" width={13} /> No issues
            </span>
          ) : (
            <span className="flex items-center gap-1 font-medium text-ink">
              <Icon icon="lucide:alert-circle" width={13} /> {errCount} issue{errCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <select
            value={presetId}
            onChange={(e) => setPresetId(e.currentTarget.value)}
            title="Choose a professional starter"
            className="h-8 max-w-[180px] rounded-lg border border-line bg-paper px-2 text-xs font-medium text-ink outline-none hover:border-ink"
          >
            {PRESETS[dslType].map((preset) => (
              <option key={preset.id} value={preset.id}>{preset.label}</option>
            ))}
          </select>
          <button
            onClick={loadPreset}
            disabled={!canEdit}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-xs font-semibold text-grey-4 transition-colors hover:border-ink hover:text-ink"
          >
            <Icon icon="lucide:wand-sparkles" width={12} />
            Load
          </button>
          {isAiConfigured && (
            <button
              onClick={() => { setAiOpen((v) => !v); setAiError(null) }}
              disabled={!canEdit}
              title="Generate this diagram from a description"
              className={
                'flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors disabled:opacity-40 ' +
                (aiOpen ? 'border-ink bg-ink text-paper' : 'border-line text-grey-4 hover:border-ink hover:text-ink')
              }
            >
              <Icon icon="lucide:sparkles" width={12} />
              Generate
            </button>
          )}
          <button
            onClick={pullCanvas}
            disabled={!editor || !canEdit}
            title="Generate editable DSL from the current canvas"
            className="flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-xs font-semibold text-grey-4 transition-colors hover:border-ink hover:text-ink disabled:opacity-40"
          >
            <Icon icon="lucide:download" width={12} />
            Pull canvas
          </button>
          <button
            onClick={applyToCanvas}
            disabled={busy || !editor || !canEdit}
            className="flex h-8 min-w-[72px] items-center justify-center gap-1.5 rounded-full bg-ink px-3.5 text-xs font-semibold text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {busy ? (
              <LoadingAnimation size="sm" variant="rotate8" label="" color="var(--color-paper)" className="-my-1 scale-75" />
            ) : (
              <>
                <Icon icon="lucide:play" width={12} />
                Apply
              </>
            )}
          </button>
        </div>
      </div>

      {aiOpen && (
        <div className="border-b border-line bg-paper px-3 py-2">
          <div className="flex items-center gap-2">
            <Icon icon="lucide:sparkles" width={14} className="shrink-0 text-grey-4" />
            <input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.currentTarget.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void runAi(); if (e.key === 'Escape') setAiOpen(false) }}
              autoFocus
              disabled={aiBusy}
              placeholder={dslType === 'erd' ? 'Describe a data model, e.g. “blog with users, posts, comments”' : 'Describe a flow, e.g. “checkout with a payment provider and webhook”'}
              className="h-8 w-full rounded-lg border border-line bg-surface px-2.5 text-sm text-ink outline-none placeholder:text-grey-3 focus:border-ink disabled:opacity-60"
            />
            <button
              onClick={() => void runAi()}
              disabled={!aiPrompt.trim() || aiBusy}
              className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-ink px-3 text-xs font-semibold text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {aiBusy ? <LoadingAnimation size="sm" variant="rotate8" label="" color="var(--color-paper)" className="-my-1 scale-75" /> : <><Icon icon="lucide:arrow-up" width={12} /> Generate</>}
            </button>
          </div>
          {aiError && <p className="mt-1.5 text-xs text-red-500">{aiError}</p>}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 border-b border-line bg-paper px-3 py-1.5 font-mono text-[10px] text-grey-3">
        {dslType === 'flow'
          ? ['direction', 'group { }', 'shape:', 'icon:', 'color:', 'label:', 'edge: text'].map((item) => <SyntaxChip key={item}>{item}</SyntaxChip>)
          : ['entity { }', 'pk', 'type', 'icon:', 'color:', '<', '>', '-', '<>'].map((item) => <SyntaxChip key={item}>{item}</SyntaxChip>)}
      </div>

      <div className="min-h-0 flex-1">
        <Editor
          height="100%"
          language={DSL_LANG}
          value={code}
          onChange={onChange}
          beforeMount={(monaco) => setupDslLanguage(monaco)}
          onMount={(ed, monaco) => {
            monacoRef.current = monaco
            modelRef.current = ed.getModel()
            lint(code)
          }}
          theme={isDarkTone(tone) ? 'vs-dark' : 'vs'}
          options={{
            readOnly: !canEdit,
            fontSize: 13,
            fontFamily: 'JetBrains Mono, monospace',
            minimap: { enabled: false },
            lineNumbers: 'on',
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            padding: { top: 12 },
            quickSuggestions: true,
            suggestOnTriggerCharacters: true,
            tabSize: 2,
          }}
        />
      </div>

      {errors.length > 0 && (
        <div className="max-h-32 overflow-y-auto border-t border-line bg-paper p-3">
          {errors.map((e, i) => (
            <p key={i} className="font-mono text-xs text-grey-4">
              {e.line ? `line ${e.line}: ` : ''}
              {e.message}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

function SyntaxChip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-md border border-line bg-surface px-1.5 py-0.5">{children}</span>
}
