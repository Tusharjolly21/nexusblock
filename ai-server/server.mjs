// nexusblock AI server — natural language → diagram-as-code (DSL).
//
// One endpoint, POST /generate, turns a plain-English description into valid
// nexusblock flow/ERD DSL using Claude (official Anthropic SDK). The client
// pipes the returned `dsl` straight into applyFlow / applyErd, so the model's
// job is purely to emit grammar-correct DSL — enforced with structured outputs.
//
// Requires ANTHROPIC_API_KEY in the environment (the SDK reads it automatically).

import http from 'http'
import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'

const host = process.env.HOST || '0.0.0.0'
const port = Number(process.env.PORT || 8787)

const anthropic = new Anthropic() // reads ANTHROPIC_API_KEY

const FLOW_GRAMMAR = `nexusblock FLOW DSL:
- Optional first line: \`direction right\` (or left/up/down).
- Nodes are quoted: "Node label" with optional attributes in [ ]:
    "API" [icon: logos:aws-api-gateway, color: orange, shape: rectangle]
  shapes: rectangle | diamond | hexagon | cylinder | oval | document.
  colors: blue, cyan, green, orange, pink, purple, violet, red, slate.
  icons: lucide names (monitor, database, boxes, shield-check) or logos:* (logos:kafka-icon).
- Groups wrap nodes in braces:
    "Core" [color: green] { "A" [icon: box] "B" }
- Edges use > (arrow) or --> (dashed), with optional label after a colon:
    "A" > "B": publish
    "A" --> "B" [color: red]: on error
Every node referenced in an edge must be defined (a bare "X" in an edge auto-defines it).`

const ERD_GRAMMAR = `nexusblock ERD DSL:
- Entities are: name [icon: users, color: blue] { field type modifiers ... }
    users [icon: users, color: blue] {
      id uuid pk
      email citext
    }
  Field line: <name> <type> [pk]. Common types: uuid, varchar, citext, int, bigint, boolean, timestamptz.
- Relationships between entity.field pairs, cardinality symbol between them:
    users.id < projects.ownerId      // one-to-many
    a.id > b.aId                      // many-to-one
    a.id - b.aId                      // one-to-one
    a.id <> b.bId                     // many-to-many`

function systemPrompt(kind) {
  const grammar = kind === 'erd' ? ERD_GRAMMAR : FLOW_GRAMMAR
  return `You generate nexusblock diagram-as-code. Output ONLY valid ${kind === 'erd' ? 'ERD' : 'flow'} DSL — no markdown fences, no prose, no explanation outside the schema.

${grammar}

Rules:
- Produce a complete, self-consistent diagram that captures the user's request.
- Use clear, human-readable labels and relevant icons/colors.
- If the user provided existing DSL, treat it as the current diagram and modify it per the request rather than starting over.
- Never invent DSL syntax not described above.`
}

const app = express()
app.set('trust proxy', 1) // honor X-Forwarded-For so req.ip is the real client behind a proxy
app.use(cors())
app.use(express.json({ limit: '256kb' }))

app.get('/', (_req, res) => res.type('text').send('nexusblock ai server ok'))

// --- Rate limiting -------------------------------------------------------
// Fixed-window limiter to protect the Claude bill: caps requests per IP and a
// global ceiling across all clients. In-memory (fine for a single instance);
// use a shared store (Redis) if you run multiple replicas. Tune via env.
const WINDOW_MS = Number(process.env.RATE_WINDOW_MS || 60_000)
const MAX_PER_IP = Number(process.env.RATE_MAX_PER_IP || 20)
const MAX_GLOBAL = Number(process.env.RATE_MAX_GLOBAL || 120)

const ipHits = new Map() // ip -> { count, resetAt }
let globalCount = 0
let globalResetAt = Date.now() + WINDOW_MS

function rateLimit(req, res, next) {
  const now = Date.now()
  if (now > globalResetAt) { globalCount = 0; globalResetAt = now + WINDOW_MS }

  const ip = req.ip || 'unknown'
  let entry = ipHits.get(ip)
  if (!entry || now > entry.resetAt) { entry = { count: 0, resetAt: now + WINDOW_MS }; ipHits.set(ip, entry) }

  // Occasional prune so the map doesn't grow unbounded.
  if (ipHits.size > 5000) for (const [k, v] of ipHits) if (now > v.resetAt) ipHits.delete(k)

  if (globalCount >= MAX_GLOBAL) {
    res.set('Retry-After', String(Math.ceil((globalResetAt - now) / 1000)))
    return res.status(429).json({ error: 'The AI service is busy right now. Please try again in a moment.' })
  }
  if (entry.count >= MAX_PER_IP) {
    res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)))
    return res.status(429).json({ error: 'Too many requests — please slow down and try again shortly.' })
  }

  entry.count++
  globalCount++
  next()
}

app.post('/generate', rateLimit, async (req, res) => {
  const { kind, prompt, currentDsl } = req.body ?? {}
  if (kind !== 'flow' && kind !== 'erd') return res.status(400).json({ error: 'kind must be "flow" or "erd"' })
  if (typeof prompt !== 'string' || !prompt.trim()) return res.status(400).json({ error: 'prompt is required' })

  const userText =
    (currentDsl && String(currentDsl).trim()
      ? `Current diagram DSL:\n\n${currentDsl}\n\n---\n\nRequest: `
      : 'Request: ') + prompt.trim()

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 4096,
      thinking: { type: 'adaptive' },
      system: systemPrompt(kind),
      messages: [{ role: 'user', content: userText }],
      output_config: {
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: { dsl: { type: 'string', description: 'The complete diagram DSL' } },
            required: ['dsl'],
            additionalProperties: false,
          },
        },
      },
    })
    if (message.stop_reason === 'refusal') return res.status(422).json({ error: 'Request was declined.' })
    const text = message.content.find((b) => b.type === 'text')?.text ?? ''
    const dsl = JSON.parse(text).dsl
    if (typeof dsl !== 'string' || !dsl.trim()) return res.status(502).json({ error: 'Empty diagram returned.' })
    res.json({ dsl })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[ai] generate failed:', err?.message || err)
    res.status(502).json({ error: 'Generation failed. Check the server logs and ANTHROPIC_API_KEY.' })
  }
})

http.createServer(app).listen(port, host, () => {
  console.log(`nexusblock ai server listening on ${host}:${port}`)
  if (!process.env.ANTHROPIC_API_KEY) console.warn('[ai] ANTHROPIC_API_KEY is not set — /generate will fail until it is.')
})
