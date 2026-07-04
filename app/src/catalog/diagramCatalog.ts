import { createShapeId, toRichText, type Editor, type TLShapeId, type VecLike } from 'tldraw'
import { createArchNode, connectShapes, createCodeBlock, createGroupFrame } from '../canvas/createNode'
import type { NodeKind } from '../shapes/ArchNodeShape'
import type { GroupAccent } from '../shapes/GroupFrameShape'

export type DiagramCatalogKind = 'architecture' | 'data' | 'flow' | 'sequence' | 'security'

export type DiagramCatalogItem = {
  id: string
  title: string
  subtitle: string
  description: string
  kind: DiagramCatalogKind
  icon: string
  logos: string[]
  tags: string[]
  accent: 'blue' | 'green' | 'orange' | 'pink' | 'purple' | 'slate' | 'red' | 'cyan'
  complexity: 'Starter' | 'Team' | 'Senior'
  insert: (editor: Editor) => void
}

type NodeSpec = {
  key: string
  x: number
  y: number
  label: string
  tech?: string
  kind?: NodeKind
  icon?: string
}

type FrameSpec = {
  x: number
  y: number
  w: number
  h: number
  label: string
  tint?: string
  accent?: GroupAccent
}

type EdgeSpec = [string, string] | [string, string, string]

const catalogOrigin = (editor: Editor, width: number, height: number): VecLike => {
  const center = editor.getViewportPageBounds().center
  return { x: center.x - width / 2, y: center.y - height / 2 }
}

function node(editor: Editor, origin: VecLike, spec: NodeSpec) {
  return createArchNode(editor, {
    kind: spec.kind ?? 'service',
    label: spec.label,
    tech: spec.tech ?? '',
    icon: spec.icon,
    point: { x: origin.x + spec.x, y: origin.y + spec.y },
  })
}

function frame(editor: Editor, origin: VecLike, spec: FrameSpec) {
  return createGroupFrame(editor, {
    x: origin.x + spec.x,
    y: origin.y + spec.y,
    w: spec.w,
    h: spec.h,
    label: spec.label,
    tint: spec.tint ?? '',
    accent: spec.accent ?? 'grey',
  })
}

function connect(editor: Editor, ids: Record<string, TLShapeId>, edges: EdgeSpec[]) {
  return edges.map(([from, to, label]) => {
    const arrow = connectShapes(editor, ids[from], ids[to])
    if (label) {
      editor.updateShape({ id: arrow, type: 'arrow', props: { richText: toRichText(label) } as never })
    }
    return arrow
  })
}

function note(editor: Editor, origin: VecLike, x: number, y: number, title: string, body: string) {
  const id = createShapeId()
  editor.createShape({
    id,
    type: 'note',
    x: origin.x + x,
    y: origin.y + y,
    props: { richText: toRichText(`${title}\n${body}`), color: 'yellow', size: 'm' } as never,
  })
  return id
}

function finish(editor: Editor, ids: TLShapeId[]) {
  editor.select(...ids)
  editor.zoomToSelection({ animation: { duration: 180 } })
}

function insertBlueprint(
  editor: Editor,
  opts: {
    history: string
    width: number
    height: number
    frames?: FrameSpec[]
    nodes: NodeSpec[]
    edges: EdgeSpec[]
    notes?: Array<[number, number, string, string]>
    code?: { x: number; y: number; title: string; language?: string; code: string }
  },
) {
  editor.markHistoryStoppingPoint(opts.history)
  const o = catalogOrigin(editor, opts.width, opts.height)
  const created: TLShapeId[] = []
  for (const f of opts.frames ?? []) created.push(frame(editor, o, f))
  const ids: Record<string, TLShapeId> = {}
  for (const spec of opts.nodes) {
    ids[spec.key] = node(editor, o, spec)
    created.push(ids[spec.key])
  }
  const arrows = connect(editor, ids, opts.edges)
  created.push(...arrows)
  for (const n of opts.notes ?? []) created.push(note(editor, o, ...n))
  if (opts.code) {
    created.push(createCodeBlock(editor, {
      point: { x: o.x + opts.code.x, y: o.y + opts.code.y },
      title: opts.code.title,
      language: opts.code.language,
      code: opts.code.code,
    }))
  }
  finish(editor, created)
}

function insertEventCommerce(editor: Editor) {
  insertBlueprint(editor, {
    history: 'insert event-driven commerce architecture',
    width: 1180,
    height: 620,
    frames: [
      { x: -24, y: 40, w: 250, h: 210, label: 'Channels', tint: 'blue', accent: 'sky' },
      { x: 280, y: -10, w: 260, h: 300, label: 'API boundary', tint: 'cyan', accent: 'sky' },
      { x: 600, y: -10, w: 310, h: 470, label: 'Domain services', tint: 'green', accent: 'grey' },
      { x: 970, y: 40, w: 260, h: 360, label: 'Async consumers', tint: 'pink', accent: 'violet' },
    ],
    nodes: [
      { key: 'web', x: 0, y: 90, label: 'Web storefront', tech: 'Next.js', kind: 'client' },
      { key: 'mobile', x: 0, y: 190, label: 'Mobile app', tech: 'React Native', kind: 'client' },
      { key: 'edge', x: 300, y: 80, label: 'CDN + WAF', tech: 'Cloudflare', icon: 'logos:cloudflare-icon' },
      { key: 'api', x: 300, y: 190, label: 'API gateway', tech: 'Fastify' },
      { key: 'auth', x: 300, y: 300, label: 'Auth service', tech: 'OAuth' },
      { key: 'catalog', x: 630, y: 50, label: 'Catalog', tech: 'OpenSearch' },
      { key: 'orders', x: 630, y: 170, label: 'Orders', tech: 'Node.js' },
      { key: 'payments', x: 630, y: 290, label: 'Payments', tech: 'Stripe' },
      { key: 'bus', x: 990, y: 110, label: 'Event bus', tech: 'Kafka', kind: 'queue', icon: 'logos:kafka-icon' },
      { key: 'inventory', x: 990, y: 230, label: 'Inventory worker', tech: 'Redis', kind: 'queue' },
      { key: 'warehouse', x: 990, y: 350, label: 'Warehouse DB', tech: 'Postgres', kind: 'db' },
      { key: 'metrics', x: 630, y: 440, label: 'Telemetry', tech: 'Prometheus', icon: 'logos:prometheus' },
    ],
    edges: [
      ['web', 'edge'],
      ['mobile', 'edge'],
      ['edge', 'api'],
      ['api', 'auth'],
      ['api', 'catalog'],
      ['api', 'orders'],
      ['orders', 'payments'],
      ['orders', 'bus', 'order.created'],
      ['payments', 'bus', 'payment.authorized'],
      ['bus', 'inventory'],
      ['inventory', 'warehouse'],
      ['orders', 'metrics'],
      ['payments', 'metrics'],
    ],
    code: {
      x: 0,
      y: 390,
      title: 'events/order-created.ts',
      code: `await publish('order.created', {
  orderId,
  customerId,
  items,
  traceId,
})`,
    },
  })
}

function insertSaasControlPlane(editor: Editor) {
  insertBlueprint(editor, {
    history: 'insert saas control plane architecture',
    width: 1120,
    height: 560,
    frames: [
      { x: -20, y: 36, w: 260, h: 300, label: 'Workspace UI', tint: 'blue', accent: 'sky' },
      { x: 300, y: 36, w: 300, h: 300, label: 'Control plane', tint: 'purple', accent: 'violet' },
      { x: 660, y: 36, w: 440, h: 300, label: 'Tenant data plane', tint: 'green', accent: 'grey' },
    ],
    nodes: [
      { key: 'browser', x: 0, y: 120, label: 'Web app', tech: 'React', kind: 'client', icon: 'logos:react' },
      { key: 'gateway', x: 320, y: 80, label: 'API gateway', tech: 'GraphQL' },
      { key: 'billing', x: 320, y: 190, label: 'Billing service', tech: 'Stripe' },
      { key: 'authz', x: 320, y: 300, label: 'Policy engine', tech: 'OPA' },
      { key: 'tenant', x: 690, y: 80, label: 'Tenant router', tech: 'Envoy' },
      { key: 'jobs', x: 690, y: 190, label: 'Job queue', tech: 'SQS', kind: 'queue' },
      { key: 'db', x: 930, y: 80, label: 'Tenant DB', tech: 'Postgres', kind: 'db' },
      { key: 'cache', x: 930, y: 190, label: 'Cache', tech: 'Redis', kind: 'db' },
      { key: 'audit', x: 690, y: 380, label: 'Audit trail', tech: 'CloudTrail', kind: 'queue' },
    ],
    edges: [
      ['browser', 'gateway'],
      ['gateway', 'authz'],
      ['gateway', 'billing'],
      ['gateway', 'tenant'],
      ['tenant', 'db'],
      ['tenant', 'cache'],
      ['tenant', 'jobs'],
      ['authz', 'audit'],
      ['billing', 'audit'],
    ],
    notes: [[912, 380, 'Boundary', 'Per-tenant routing keeps customer data isolated.']],
  })
}

function insertStreamingPlatform(editor: Editor) {
  insertBlueprint(editor, {
    history: 'insert video streaming platform',
    width: 1080,
    height: 560,
    frames: [
      { x: -24, y: 50, w: 250, h: 260, label: 'Playback clients', tint: 'blue', accent: 'sky' },
      { x: 300, y: 20, w: 320, h: 340, label: 'Playback services', tint: 'green', accent: 'grey' },
      { x: 700, y: 20, w: 360, h: 340, label: 'Media pipeline', tint: 'orange', accent: 'amber' },
    ],
    nodes: [
      { key: 'apps', x: 0, y: 135, label: 'Mobile / TV apps', tech: 'React Native', kind: 'client' },
      { key: 'edge', x: 320, y: 80, label: 'CDN edge', tech: 'CloudFront' },
      { key: 'api', x: 320, y: 200, label: 'Playback API', tech: 'Go' },
      { key: 'manifest', x: 320, y: 320, label: 'Manifest service', tech: 'HLS/DASH' },
      { key: 'origin', x: 730, y: 80, label: 'Origin storage', tech: 'S3', kind: 'db' },
      { key: 'queue', x: 730, y: 200, label: 'Encoding queue', tech: 'SQS', kind: 'queue' },
      { key: 'transcode', x: 730, y: 320, label: 'Transcode workers', tech: 'FFmpeg', kind: 'queue' },
      { key: 'analytics', x: 320, y: 450, label: 'QoE analytics', tech: 'ClickHouse', kind: 'db' },
    ],
    edges: [
      ['apps', 'edge'],
      ['edge', 'api'],
      ['edge', 'manifest'],
      ['manifest', 'origin'],
      ['api', 'origin'],
      ['origin', 'queue'],
      ['queue', 'transcode'],
      ['transcode', 'origin'],
      ['apps', 'analytics', 'beacons'],
    ],
  })
}

function insertBankingLedger(editor: Editor) {
  insertBlueprint(editor, {
    history: 'insert banking ledger model',
    width: 1040,
    height: 500,
    frames: [{ x: -28, y: 10, w: 1000, h: 360, label: 'Core banking model', tint: 'green', accent: 'grey' }],
    nodes: [
      { key: 'customer', x: 0, y: 130, label: 'Customer', tech: 'kyc_status', kind: 'db' },
      { key: 'account', x: 250, y: 130, label: 'Account', tech: 'currency, status', kind: 'db' },
      { key: 'ledger', x: 500, y: 130, label: 'Ledger entry', tech: 'debit / credit', kind: 'db' },
      { key: 'txn', x: 750, y: 130, label: 'Transaction', tech: 'state machine', kind: 'db' },
      { key: 'card', x: 250, y: 0, label: 'Card token', tech: 'network vault', kind: 'db' },
      { key: 'limit', x: 500, y: 0, label: 'Risk limit', tech: 'per account', kind: 'db' },
      { key: 'merchant', x: 750, y: 0, label: 'Merchant', tech: 'mcc, country', kind: 'db' },
      { key: 'audit', x: 500, y: 290, label: 'Audit log', tech: 'append-only', kind: 'queue' },
    ],
    edges: [
      ['customer', 'account', '1:N'],
      ['account', 'ledger', 'posts'],
      ['ledger', 'txn'],
      ['account', 'card'],
      ['account', 'limit'],
      ['txn', 'merchant'],
      ['txn', 'audit'],
      ['ledger', 'audit'],
    ],
    notes: [[0, 405, 'Ledger rule', 'Never mutate balances directly. Derive account state from posted ledger entries.']],
  })
}

function insertOrderFulfillment(editor: Editor) {
  insertBlueprint(editor, {
    history: 'insert order fulfillment workflow',
    width: 980,
    height: 420,
    nodes: [
      { key: 'cart', x: 0, y: 150, label: 'Cart submitted', tech: 'event', kind: 'queue' },
      { key: 'reserve', x: 230, y: 150, label: 'Reserve inventory', tech: '2m hold' },
      { key: 'payment', x: 460, y: 150, label: 'Authorize payment', tech: 'idempotent' },
      { key: 'fraud', x: 690, y: 150, label: 'Fraud decision', tech: 'rules + ML' },
      { key: 'fulfill', x: 920, y: 40, label: 'Fulfill order', tech: 'warehouse' },
      { key: 'review', x: 920, y: 260, label: 'Manual review', tech: 'ops queue', kind: 'queue' },
    ],
    edges: [
      ['cart', 'reserve'],
      ['reserve', 'payment'],
      ['payment', 'fraud'],
      ['fraud', 'fulfill', 'approved'],
      ['fraud', 'review', 'review'],
    ],
  })
}

function insertLoginSequence(editor: Editor) {
  insertBlueprint(editor, {
    history: 'insert login sequence',
    width: 980,
    height: 500,
    frames: [{ x: -20, y: -24, w: 970, h: 300, label: 'OIDC login sequence', tint: 'purple', accent: 'violet' }],
    nodes: [
      { key: 'user', x: 0, y: 80, label: 'User', tech: 'browser', kind: 'client' },
      { key: 'app', x: 240, y: 80, label: 'Web app', tech: 'Next.js', kind: 'client' },
      { key: 'auth', x: 480, y: 80, label: 'Auth API', tech: 'OAuth' },
      { key: 'redis', x: 720, y: 80, label: 'Session store', tech: 'Redis', kind: 'db' },
      { key: 'jwt', x: 480, y: 250, label: 'JWT issued', tech: '15m ttl', kind: 'queue' },
    ],
    edges: [
      ['user', 'app', 'login'],
      ['app', 'auth', 'code challenge'],
      ['auth', 'redis', 'session'],
      ['redis', 'auth'],
      ['auth', 'jwt'],
      ['jwt', 'app'],
      ['app', 'user'],
    ],
    code: {
      x: 0,
      y: 330,
      title: 'auth/callback.ts',
      code: `const session = await exchangeCode(code)
await sessionStore.set(session.id, session)
return issueJwt(session.userId)`,
    },
  })
}

function insertAwsThreatModel(editor: Editor) {
  insertBlueprint(editor, {
    history: 'insert aws threat model',
    width: 1100,
    height: 540,
    frames: [
      { x: -24, y: 50, w: 250, h: 250, label: 'Untrusted', tint: 'red', accent: 'violet' },
      { x: 300, y: 50, w: 280, h: 250, label: 'Public subnet', tint: 'orange', accent: 'amber' },
      { x: 660, y: 50, w: 400, h: 250, label: 'Private subnet', tint: 'green', accent: 'grey' },
    ],
    nodes: [
      { key: 'internet', x: 0, y: 140, label: 'Public internet', tech: 'untrusted', kind: 'external' },
      { key: 'waf', x: 320, y: 90, label: 'WAF + rate limit', tech: 'AWS WAF' },
      { key: 'alb', x: 320, y: 210, label: 'Load balancer', tech: 'ALB' },
      { key: 'app', x: 690, y: 90, label: 'Private app tier', tech: 'ECS' },
      { key: 'secrets', x: 690, y: 210, label: 'Secrets boundary', tech: 'KMS' },
      { key: 'db', x: 920, y: 150, label: 'Encrypted data', tech: 'RDS', kind: 'db' },
      { key: 'logs', x: 320, y: 400, label: 'Audit trail', tech: 'CloudTrail', kind: 'queue' },
    ],
    edges: [
      ['internet', 'waf'],
      ['waf', 'alb'],
      ['alb', 'app'],
      ['app', 'db'],
      ['app', 'secrets'],
      ['waf', 'logs'],
      ['app', 'logs'],
    ],
    notes: [[690, 400, 'Controls', 'Least-privilege IAM, encrypted storage, centralized audit trail.']],
  })
}

function insertZeroTrustAccess(editor: Editor) {
  insertBlueprint(editor, {
    history: 'insert zero trust access architecture',
    width: 1080,
    height: 480,
    frames: [
      { x: -20, y: 50, w: 260, h: 260, label: 'Identity', tint: 'blue', accent: 'sky' },
      { x: 310, y: 50, w: 300, h: 260, label: 'Policy decision', tint: 'purple', accent: 'violet' },
      { x: 690, y: 50, w: 330, h: 260, label: 'Protected apps', tint: 'green', accent: 'grey' },
    ],
    nodes: [
      { key: 'employee', x: 0, y: 140, label: 'Employee device', tech: 'managed', kind: 'client' },
      { key: 'idp', x: 330, y: 80, label: 'Identity provider', tech: 'Okta' },
      { key: 'posture', x: 330, y: 200, label: 'Device posture', tech: 'MDM' },
      { key: 'policy', x: 560, y: 140, label: 'Policy engine', tech: 'OPA' },
      { key: 'proxy', x: 720, y: 140, label: 'Access proxy', tech: 'Cloudflare' },
      { key: 'app', x: 940, y: 80, label: 'Internal app', tech: 'Kubernetes' },
      { key: 'audit', x: 940, y: 220, label: 'Access logs', tech: 'SIEM', kind: 'queue' },
    ],
    edges: [
      ['employee', 'idp'],
      ['employee', 'posture'],
      ['idp', 'policy'],
      ['posture', 'policy'],
      ['policy', 'proxy', 'allow / deny'],
      ['proxy', 'app'],
      ['proxy', 'audit'],
    ],
  })
}

function insertIncidentResponse(editor: Editor) {
  insertBlueprint(editor, {
    history: 'insert incident response flow',
    width: 1000,
    height: 480,
    nodes: [
      { key: 'alert', x: 0, y: 160, label: 'Alert fired', tech: 'PagerDuty', kind: 'queue' },
      { key: 'triage', x: 230, y: 160, label: 'Triage severity', tech: 'SLO impact' },
      { key: 'room', x: 460, y: 60, label: 'Incident room', tech: 'Slack' },
      { key: 'backlog', x: 460, y: 260, label: 'Backlog item', tech: 'Jira' },
      { key: 'stabilize', x: 690, y: 60, label: 'Stabilize service', tech: 'runbook' },
      { key: 'comms', x: 920, y: 60, label: 'Customer comms', tech: 'status page' },
      { key: 'postmortem', x: 920, y: 260, label: 'Postmortem', tech: 'actions', kind: 'queue' },
    ],
    edges: [
      ['alert', 'triage'],
      ['triage', 'room', 'SEV1/2'],
      ['triage', 'backlog', 'low impact'],
      ['room', 'stabilize'],
      ['stabilize', 'comms'],
      ['stabilize', 'postmortem'],
      ['backlog', 'postmortem'],
    ],
  })
}

function insertFeatureFlagRollout(editor: Editor) {
  insertBlueprint(editor, {
    history: 'insert feature flag rollout flow',
    width: 980,
    height: 420,
    nodes: [
      { key: 'proposal', x: 0, y: 150, label: 'Feature proposal', tech: 'RFC', kind: 'queue' },
      { key: 'flag', x: 230, y: 150, label: 'Create flag', tech: 'LaunchDarkly' },
      { key: 'internal', x: 460, y: 60, label: 'Internal rollout', tech: '1%' },
      { key: 'metrics', x: 460, y: 240, label: 'Guardrail metrics', tech: 'Datadog' },
      { key: 'decision', x: 690, y: 150, label: 'Healthy?', tech: 'error budget' },
      { key: 'full', x: 920, y: 60, label: 'Ramp to 100%', tech: 'progressive' },
      { key: 'rollback', x: 920, y: 240, label: 'Rollback', tech: 'kill switch' },
    ],
    edges: [
      ['proposal', 'flag'],
      ['flag', 'internal'],
      ['internal', 'metrics'],
      ['metrics', 'decision'],
      ['decision', 'full', 'yes'],
      ['decision', 'rollback', 'no'],
    ],
  })
}

function insertSupplyChainEr(editor: Editor) {
  insertBlueprint(editor, {
    history: 'insert supply chain ER overview',
    width: 1040,
    height: 500,
    frames: [{ x: -24, y: 40, w: 1000, h: 310, label: 'Supply chain entities', tint: 'orange', accent: 'amber' }],
    nodes: [
      { key: 'supplier', x: 0, y: 140, label: 'Supplier', tech: 'rating, region', kind: 'db' },
      { key: 'po', x: 240, y: 140, label: 'Purchase order', tech: 'status, terms', kind: 'db' },
      { key: 'shipment', x: 480, y: 140, label: 'Shipment', tech: 'carrier, eta', kind: 'db' },
      { key: 'warehouse', x: 720, y: 140, label: 'Warehouse', tech: 'capacity', kind: 'db' },
      { key: 'sku', x: 480, y: 0, label: 'SKU', tech: 'catalog item', kind: 'db' },
      { key: 'invoice', x: 720, y: 280, label: 'Invoice', tech: '3-way match', kind: 'db' },
    ],
    edges: [
      ['supplier', 'po', '1:N'],
      ['po', 'shipment'],
      ['shipment', 'warehouse'],
      ['sku', 'po'],
      ['po', 'invoice'],
    ],
  })
}

function insertAiRagPipeline(editor: Editor) {
  insertBlueprint(editor, {
    history: 'insert rag pipeline architecture',
    width: 1120,
    height: 520,
    frames: [
      { x: -20, y: 40, w: 260, h: 260, label: 'Ingestion', tint: 'blue', accent: 'sky' },
      { x: 320, y: 40, w: 330, h: 260, label: 'Retrieval', tint: 'purple', accent: 'violet' },
      { x: 730, y: 40, w: 330, h: 260, label: 'Generation', tint: 'green', accent: 'grey' },
    ],
    nodes: [
      { key: 'docs', x: 0, y: 140, label: 'Docs + tickets', tech: 'sources', kind: 'external' },
      { key: 'chunk', x: 320, y: 70, label: 'Chunker', tech: 'markdown' },
      { key: 'embed', x: 320, y: 190, label: 'Embedding worker', tech: 'OpenAI' },
      { key: 'vector', x: 560, y: 130, label: 'Vector index', tech: 'pgvector', kind: 'db' },
      { key: 'query', x: 740, y: 70, label: 'Query planner', tech: 'hybrid search' },
      { key: 'llm', x: 740, y: 190, label: 'LLM response', tech: 'GPT' },
      { key: 'evals', x: 970, y: 130, label: 'Evals + traces', tech: 'Langfuse', kind: 'queue' },
    ],
    edges: [
      ['docs', 'chunk'],
      ['chunk', 'embed'],
      ['embed', 'vector'],
      ['query', 'vector', 'retrieve'],
      ['vector', 'llm', 'context'],
      ['llm', 'evals'],
      ['query', 'evals'],
    ],
    code: {
      x: 0,
      y: 340,
      title: 'rag/query.ts',
      code: `const context = await retrieve(question)
const answer = await model.generate({
  question,
  context,
  citations: true,
})`,
    },
  })
}

export const DIAGRAM_CATALOG: DiagramCatalogItem[] = [
  {
    id: 'event-commerce',
    title: 'Event-driven commerce',
    subtitle: 'Checkout, payments, Kafka, workers, inventory',
    description: 'A clean production architecture for commerce systems with channels, API boundary, domain services, async consumers, and telemetry.',
    kind: 'architecture',
    icon: 'lucide:network',
    logos: ['logos:nextjs-icon', 'logos:cloudflare-icon', 'logos:kafka-icon', 'logos:postgresql'],
    tags: ['Kafka', 'Payments', 'Workers'],
    accent: 'green',
    complexity: 'Senior',
    insert: insertEventCommerce,
  },
  {
    id: 'saas-control-plane',
    title: 'SaaS control plane',
    subtitle: 'Tenants, billing, policy engine, routing, audit',
    description: 'A multi-tenant SaaS blueprint with a control plane, tenant router, billing service, policy checks, audit trail, and isolated data plane.',
    kind: 'architecture',
    icon: 'lucide:building-2',
    logos: ['logos:react', 'logos:stripe', 'logos:redis', 'logos:postgresql'],
    tags: ['Multi-tenant', 'Billing', 'OPA'],
    accent: 'purple',
    complexity: 'Senior',
    insert: insertSaasControlPlane,
  },
  {
    id: 'streaming-platform',
    title: 'Video streaming platform',
    subtitle: 'CDN, playback API, origin, transcode, analytics',
    description: 'Playback and media pipeline template for streaming platforms, including CDN edge, manifests, encoding queues, and QoE analytics.',
    kind: 'architecture',
    icon: 'lucide:cloud',
    logos: ['logos:aws-cloudfront', 'logos:aws-s3', 'logos:go', 'logos:clickhouse-icon'],
    tags: ['CDN', 'HLS', 'Analytics'],
    accent: 'orange',
    complexity: 'Team',
    insert: insertStreamingPlatform,
  },
  {
    id: 'rag-pipeline',
    title: 'RAG knowledge pipeline',
    subtitle: 'Ingestion, embeddings, vector search, LLM, evals',
    description: 'A modern AI retrieval pipeline with source ingestion, chunking, embeddings, vector retrieval, generation, citations, and evaluation traces.',
    kind: 'architecture',
    icon: 'lucide:sparkles',
    logos: ['logos:openai-icon', 'logos:postgresql', 'logos:python', 'logos:langchain-icon'],
    tags: ['AI', 'Vector DB', 'Evals'],
    accent: 'cyan',
    complexity: 'Senior',
    insert: insertAiRagPipeline,
  },
  {
    id: 'banking-ledger',
    title: 'Banking ledger model',
    subtitle: 'Customer, account, ledger, card, merchant, audit',
    description: 'A finance-grade data overview showing ledger-first account state, transactions, merchants, risk limits, and append-only audit logs.',
    kind: 'data',
    icon: 'lucide:database',
    logos: ['logos:postgresql', 'logos:redis', 'logos:aws-kms', 'logos:datadog'],
    tags: ['Ledger', 'Audit', 'Finance'],
    accent: 'blue',
    complexity: 'Senior',
    insert: insertBankingLedger,
  },
  {
    id: 'supply-chain-er',
    title: 'Supply chain ER overview',
    subtitle: 'Suppliers, POs, shipments, SKUs, warehouses',
    description: 'A compact entity relationship overview for procurement and fulfillment teams, including purchase orders and invoice matching.',
    kind: 'data',
    icon: 'lucide:warehouse',
    logos: ['lucide:warehouse', 'lucide:package', 'lucide:truck', 'lucide:receipt-text'],
    tags: ['ERP', 'Inventory', 'Invoices'],
    accent: 'orange',
    complexity: 'Team',
    insert: insertSupplyChainEr,
  },
  {
    id: 'order-fulfillment',
    title: 'Order fulfillment workflow',
    subtitle: 'Inventory, payment, fraud, fulfillment, review',
    description: 'A product workflow for checkout operations, with the happy path and review path separated clearly.',
    kind: 'flow',
    icon: 'lucide:workflow',
    logos: ['lucide:shopping-cart', 'lucide:shield-alert', 'lucide:warehouse', 'lucide:check-circle-2'],
    tags: ['Workflow', 'Fraud', 'Ops'],
    accent: 'green',
    complexity: 'Starter',
    insert: insertOrderFulfillment,
  },
  {
    id: 'incident-response',
    title: 'Incident response flow',
    subtitle: 'Alert, severity triage, room, comms, postmortem',
    description: 'A clear SEV workflow that separates urgent incident response from lower-impact backlog handling.',
    kind: 'flow',
    icon: 'lucide:badge-alert',
    logos: ['logos:slack-icon', 'logos:datadog', 'lucide:radio-tower', 'lucide:file-check-2'],
    tags: ['SRE', 'SEV', 'Postmortem'],
    accent: 'red',
    complexity: 'Team',
    insert: insertIncidentResponse,
  },
  {
    id: 'feature-flag-rollout',
    title: 'Feature flag rollout',
    subtitle: 'RFC, flag, canary, metrics, ramp, rollback',
    description: 'A rollout workflow for teams shipping risky features behind flags with guardrail metrics and rollback paths.',
    kind: 'flow',
    icon: 'lucide:flag',
    logos: ['lucide:flag', 'logos:datadog', 'lucide:trending-up', 'lucide:rotate-ccw'],
    tags: ['Release', 'Canary', 'Metrics'],
    accent: 'purple',
    complexity: 'Team',
    insert: insertFeatureFlagRollout,
  },
  {
    id: 'login-sequence',
    title: 'OIDC login sequence',
    subtitle: 'User, app, auth API, session store, JWT issue',
    description: 'A sequence-style template for auth flows with code exchange, session persistence, and token issue.',
    kind: 'sequence',
    icon: 'lucide:git-branch',
    logos: ['logos:nextjs-icon', 'logos:redis', 'lucide:key-round', 'lucide:user-check'],
    tags: ['OIDC', 'Session', 'JWT'],
    accent: 'purple',
    complexity: 'Team',
    insert: insertLoginSequence,
  },
  {
    id: 'aws-threat-model',
    title: 'AWS threat model',
    subtitle: 'Trust boundary, WAF, private tier, KMS, audit',
    description: 'Security architecture with untrusted/public/private zones, centralized logging, secrets boundary, and encrypted data.',
    kind: 'security',
    icon: 'lucide:shield-check',
    logos: ['logos:aws', 'logos:aws-waf', 'logos:aws-kms', 'logos:aws-cloudtrail'],
    tags: ['AWS', 'KMS', 'Audit'],
    accent: 'slate',
    complexity: 'Senior',
    insert: insertAwsThreatModel,
  },
  {
    id: 'zero-trust-access',
    title: 'Zero trust access',
    subtitle: 'Identity, device posture, policy engine, proxy',
    description: 'A zero-trust access pattern with identity, device posture, policy decision, protected applications, and audit logs.',
    kind: 'security',
    icon: 'lucide:lock-keyhole',
    logos: ['logos:okta', 'logos:cloudflare-icon', 'logos:kubernetes', 'lucide:shield-check'],
    tags: ['Identity', 'Policy', 'Access'],
    accent: 'cyan',
    complexity: 'Senior',
    insert: insertZeroTrustAccess,
  },
]
