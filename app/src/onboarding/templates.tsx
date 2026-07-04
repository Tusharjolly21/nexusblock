import type { Editor } from 'tldraw'
import type { PartialBlock } from '@blocknote/core'
import { createArchNode, connectShapes, createGroupFrame } from '../canvas/createNode'

export type TemplateId = 'blank' | 'system' | 'micro' | 'notes' | 'git-s3'

export type Template = {
  id: TemplateId
  name: string
  description: string
  /** Seed the canvas with starter shapes. Omitted = blank canvas. */
  seedCanvas?: (editor: Editor) => void
  /** Seed the doc pane with starter blocks. */
  seedDoc?: () => PartialBlock[]
}

export const TEMPLATES: Template[] = [
  {
    id: 'blank',
    name: 'Blank canvas',
    description: 'Start from scratch.',
  },
  {
    id: 'system',
    name: 'System architecture',
    description: 'Client → API → database, with a worker queue.',
    seedCanvas: (editor) => {
      const web = createArchNode(editor, { kind: 'client', label: 'Web client', tech: 'Next.js', point: { x: -320, y: -30 } })
      const api = createArchNode(editor, { kind: 'service', label: 'API', tech: 'Fastify', point: { x: -40, y: -30 } })
      const db = createArchNode(editor, { kind: 'db', label: 'Postgres', tech: 'RDS', point: { x: 260, y: -130 } })
      const q = createArchNode(editor, { kind: 'queue', label: 'Workers', tech: 'BullMQ', point: { x: 260, y: 70 } })
      connectShapes(editor, web, api)
      connectShapes(editor, api, db)
      connectShapes(editor, api, q)
      editor.zoomToFit({ animation: { duration: 0 } })
    },
    seedDoc: () => [
      { type: 'heading', props: { level: 1 }, content: 'System architecture' },
      { type: 'paragraph', content: 'Overview of the request path and background processing.' },
      { type: 'heading', props: { level: 2 }, content: 'Components' },
      { type: 'bulletListItem', content: 'Web client — Next.js SPA' },
      { type: 'bulletListItem', content: 'API — Fastify service' },
      { type: 'bulletListItem', content: 'Postgres — primary datastore' },
      { type: 'bulletListItem', content: 'Workers — async jobs via BullMQ' },
    ],
  },
  {
    id: 'micro',
    name: 'Microservices',
    description: 'Gateway fanning out to services over a shared store.',
    seedCanvas: (editor) => {
      const gw = createArchNode(editor, { kind: 'service', label: 'Gateway', tech: 'Fastify', point: { x: -320, y: 0 } })
      const a = createArchNode(editor, { kind: 'service', label: 'Auth', point: { x: 0, y: -140 } })
      const b = createArchNode(editor, { kind: 'service', label: 'Payments', point: { x: 0, y: 0 } })
      const c = createArchNode(editor, { kind: 'service', label: 'Notifications', point: { x: 0, y: 140 } })
      const db = createArchNode(editor, { kind: 'db', label: 'Postgres', tech: 'RDS', point: { x: 300, y: 0 } })
      connectShapes(editor, gw, a)
      connectShapes(editor, gw, b)
      connectShapes(editor, gw, c)
      connectShapes(editor, b, db)
      editor.zoomToFit({ animation: { duration: 0 } })
    },
    seedDoc: () => [
      { type: 'heading', props: { level: 1 }, content: 'Microservices' },
      { type: 'paragraph', content: 'Gateway routes to independently deployable services.' },
    ],
  },
  {
    id: 'git-s3',
    name: 'Git to S3 using Webhooks',
    description: 'AWS reference: a Git push triggers a webhook that builds and syncs to S3.',
    seedCanvas: (editor) => {
      // Titled group containers first, so they render behind the nodes (Eraser look).
      // "AWS Cloud" trust boundary wraps every AWS service; the git source sits outside it.
      createGroupFrame(editor, { x: -592, y: -44, w: 1394, h: 334, label: 'AWS Cloud', accent: 'amber' })
      createGroupFrame(editor, { x: -1148, y: -44, w: 546, h: 140, label: 'Source', accent: 'violet' })

      // Main request path (left → right).
      const dev = createArchNode(editor, { kind: 'client', label: 'Developer', tech: 'git push', icon: 'lucide:user-round', point: { x: -1120, y: 0 } })
      const gh = createArchNode(editor, { kind: 'external', label: 'GitHub repo', tech: 'webhook', icon: 'logos:github-icon', point: { x: -840, y: 0 } })
      const api = createArchNode(editor, { kind: 'service', label: 'API Gateway', tech: 'HTTPS POST', icon: 'logos:aws-api-gateway', point: { x: -560, y: 0 } })
      const lam = createArchNode(editor, { kind: 'service', label: 'Webhook handler', tech: 'Lambda', icon: 'logos:aws-lambda', point: { x: -280, y: 0 } })
      const cp = createArchNode(editor, { kind: 'service', label: 'CodePipeline', tech: 'orchestrate', icon: 'logos:aws-codepipeline', point: { x: 0, y: 0 } })
      const cb = createArchNode(editor, { kind: 'service', label: 'CodeBuild', tech: 'clone + build', icon: 'logos:aws-codebuild', point: { x: 280, y: 0 } })
      const s3 = createArchNode(editor, { kind: 'db', label: 'S3 bucket', tech: 'artifacts', icon: 'logos:aws-s3', point: { x: 560, y: 0 } })

      // Supporting services (below).
      const sm = createArchNode(editor, { kind: 'external', label: 'Secrets Manager', tech: 'webhook secret', icon: 'logos:aws-secrets-manager', point: { x: -280, y: 190 } })
      const sns = createArchNode(editor, { kind: 'queue', label: 'SNS', tech: 'notify', icon: 'logos:aws-sns', point: { x: 0, y: 190 } })
      const cw = createArchNode(editor, { kind: 'external', label: 'CloudWatch', tech: 'logs', icon: 'logos:aws-cloudwatch', point: { x: 280, y: 190 } })

      // Flow
      connectShapes(editor, dev, gh)
      connectShapes(editor, gh, api)
      connectShapes(editor, api, lam)
      connectShapes(editor, lam, cp)
      connectShapes(editor, cp, cb)
      connectShapes(editor, cb, s3)
      // Supporting
      connectShapes(editor, sm, lam)
      connectShapes(editor, cp, sns)
      connectShapes(editor, cb, cw)

      editor.zoomToFit({ animation: { duration: 0 } })
    },
    seedDoc: () => [
      { type: 'heading', props: { level: 1 }, content: 'Git to S3 using Webhooks' },
      { type: 'paragraph', content: 'A push to the Git repository triggers a webhook that builds the source and syncs the output to an S3 bucket — no polling, no manual deploys.' },
      { type: 'heading', props: { level: 2 }, content: 'Request path' },
      { type: 'numberedListItem', content: 'Developer pushes to the GitHub repo.' },
      { type: 'numberedListItem', content: 'GitHub sends a signed webhook (HTTPS POST) to API Gateway.' },
      { type: 'numberedListItem', content: 'API Gateway invokes the Lambda webhook handler.' },
      { type: 'numberedListItem', content: 'Lambda verifies the signature (secret from Secrets Manager) and starts CodePipeline.' },
      { type: 'numberedListItem', content: 'CodePipeline runs CodeBuild to clone + build the repo.' },
      { type: 'numberedListItem', content: 'CodeBuild uploads the artifacts to the S3 bucket.' },
      { type: 'heading', props: { level: 2 }, content: 'Operational concerns' },
      { type: 'bulletListItem', content: 'Secrets Manager stores the webhook signing secret (rotate regularly).' },
      { type: 'bulletListItem', content: 'CloudWatch captures Lambda + CodeBuild logs and metrics.' },
      { type: 'bulletListItem', content: 'SNS notifies on pipeline success/failure.' },
      { type: 'bulletListItem', content: 'Validate the webhook signature before doing any work (reject spoofed requests).' },
    ],
  },
  {
    id: 'notes',
    name: 'Design note',
    description: 'Docs-first: a structured design doc, blank canvas.',
    seedDoc: () => [
      { type: 'heading', props: { level: 1 }, content: 'Design note' },
      { type: 'heading', props: { level: 2 }, content: 'Problem' },
      { type: 'paragraph', content: '' },
      { type: 'heading', props: { level: 2 }, content: 'Proposed approach' },
      { type: 'paragraph', content: '' },
      { type: 'heading', props: { level: 2 }, content: 'Open questions' },
      { type: 'checkListItem', content: '' },
    ],
  },
]

export function getTemplate(id: TemplateId): Template {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0]
}
