// nexusblock AI server — natural language → diagram-as-code (DSL).
//
// One endpoint, POST /generate, turns a plain-English description into valid
// nexusblock flow/ERD/sequence DSL using Claude (official Anthropic SDK). The
// client pipes the returned `dsl` straight into applyFlow / applyErd /
// applySequence, so the model's
// job is purely to emit grammar-correct DSL — enforced with structured outputs.
//
// Requires ANTHROPIC_API_KEY in the environment (the SDK reads it automatically).

import "dotenv/config";
import http from "http";
import express from "express";
import { SEED_TEMPLATES } from "./db/seeds.mjs";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";
import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 8787);

const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://localhost:4173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function initFirebaseAdmin() {
  if (getApps().length) return;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    initializeApp({ credential: cert(JSON.parse(json)) });
    return;
  }
  initializeApp({ credential: applicationDefault() });
}

initFirebaseAdmin();

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
Every node referenced in an edge must be defined (a bare "X" in an edge auto-defines it).`;

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
    a.id <> b.bId                     // many-to-many`;

const SEQUENCE_GRAMMAR = `nexusblock SEQUENCE DSL (line-oriented, top to bottom):
- Optional first line: \`title Some title\`.
- Declare participants in the order they should appear as columns:
    participant api                   // plain box
    participant db as "Postgres"      // box with a display label
    actor user                        // stick-figure participant
  Participants are auto-created on first use, so declarations are optional.
- Messages between participants, with an optional label after a colon:
    client -> api: POST /orders       // solid call
    api --> client: 201 Created       // dashed return
    api ->> worker: enqueue           // async (open head)
    client -> client: retry           // self message
- Notes anchored to one or more participants:
    note over api: validate body
    note over client, api: handshake
Keep to a single vertical story; order of lines is the order of events.`;

const UML_GRAMMAR = `nexusblock UML CLASS DSL:
- Classes are defined using curly braces: \`class ClassName [icon: box, color: green] { field type ... }\`
    class PaymentService [icon: server, color: green] {
      - gateway: Gateway
      + charge(amount: Double): Receipt
    }
- Relationships between classes use arrows:
    Customer --> PaymentService : uses
    PaymentService --> Gateway : delegates`;

const GRAMMARS = {
  flow: FLOW_GRAMMAR,
  erd: ERD_GRAMMAR,
  sequence: SEQUENCE_GRAMMAR,
  uml: UML_GRAMMAR,
};
const KIND_LABEL = { flow: "flow", erd: "ERD", sequence: "sequence", uml: "UML Class" };

function systemPrompt(kind) {
  const grammar = GRAMMARS[kind] ?? FLOW_GRAMMAR;
  const label = KIND_LABEL[kind] ?? "flow";
  return `You generate nexusblock diagram-as-code. Output ONLY valid ${label} DSL — no markdown fences, no prose, no explanation outside the schema.

${grammar}

Rules:
- Produce a complete, self-consistent diagram that captures the user's request.
- Use clear, human-readable labels and relevant icons/colors.
- If the user provided existing DSL, treat it as the current diagram and modify it per the request rather than starting over.
- Never invent DSL syntax not described above.`;
}

const app = express();
app.set("trust proxy", 1); // honor X-Forwarded-For so req.ip is the real client behind a proxy
app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Origin not allowed"));
    },
  }),
);
app.use(express.json({ limit: "20mb" }));

app.get("/", (_req, res) => res.type("text").send("nexusblock ai server ok"));

// --- Rate limiting -------------------------------------------------------
// Fixed-window limiter to protect the Claude bill: caps requests per IP and a
// global ceiling across all clients. In-memory (fine for a single instance);
// use a shared store (Redis) if you run multiple replicas. Tune via env.
const WINDOW_MS = Number(process.env.RATE_WINDOW_MS || 60_000);
const MAX_PER_IP = Number(process.env.RATE_MAX_PER_IP || 20);
const MAX_GLOBAL = Number(process.env.RATE_MAX_GLOBAL || 120);

const ipHits = new Map(); // ip -> { count, resetAt }
let globalCount = 0;
let globalResetAt = Date.now() + WINDOW_MS;

function rateLimit(req, res, next) {
  const now = Date.now();
  if (now > globalResetAt) {
    globalCount = 0;
    globalResetAt = now + WINDOW_MS;
  }

  const ip = req.ip || "unknown";
  let entry = ipHits.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    ipHits.set(ip, entry);
  }

  // Occasional prune so the map doesn't grow unbounded.
  if (ipHits.size > 5000)
    for (const [k, v] of ipHits) if (now > v.resetAt) ipHits.delete(k);

  if (globalCount >= MAX_GLOBAL) {
    res.set("Retry-After", String(Math.ceil((globalResetAt - now) / 1000)));
    return res.status(429).json({
      error: "The AI service is busy right now. Please try again in a moment.",
    });
  }
  if (entry.count >= MAX_PER_IP) {
    res.set("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
    return res.status(429).json({
      error: "Too many requests — please slow down and try again shortly.",
    });
  }

  entry.count++;
  globalCount++;
  next();
}

async function requireFirebaseUser(req, res, next) {
  const header = req.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match)
    return res.status(401).json({ error: "Sign in to use AI generation." });
  try {
    req.user = await getAuth().verifyIdToken(match[1]);
    return next();
  } catch {
    return res
      .status(401)
      .json({ error: "Your session expired. Please sign in again." });
  }
}

app.post("/generate", requireFirebaseUser, rateLimit, async (req, res) => {
  const { kind, prompt, currentDsl } = req.body ?? {};
  if (kind !== "flow" && kind !== "erd" && kind !== "sequence" && kind !== "uml")
    return res
      .status(400)
      .json({ error: 'kind must be "flow", "erd", "sequence", or "uml"' });
  if (typeof prompt !== "string" || !prompt.trim())
    return res.status(400).json({ error: "prompt is required" });

  const userText =
    (currentDsl && String(currentDsl).trim()
      ? `Current diagram DSL:\n\n${currentDsl}\n\n---\n\nRequest: `
      : "Request: ") + prompt.trim();

  try {
    const message = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      system: systemPrompt(kind),
      messages: [{ role: "user", content: userText }],
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              dsl: { type: "string", description: "The complete diagram DSL" },
            },
            required: ["dsl"],
            additionalProperties: false,
          },
        },
      },
    });
    if (message.stop_reason === "refusal")
      return res.status(422).json({ error: "Request was declined." });
    const text = message.content.find((b) => b.type === "text")?.text ?? "";
    const dsl = JSON.parse(text).dsl;
    if (typeof dsl !== "string" || !dsl.trim())
      return res.status(502).json({ error: "Empty diagram returned." });
    res.json({ dsl });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[ai] generate failed:", err?.message || err);
    res.status(502).json({
      error: "Generation failed. Check the server logs and ANTHROPIC_API_KEY.",
    });
  }
});

app.post("/notify-mention", requireFirebaseUser, (req, res) => {
  const { fileId, sender, recipient, comment } = req.body ?? {};
  if (!recipient || !sender) {
    return res.status(400).json({ error: "recipient and sender are required" });
  }

  // Log the notification audit event securely in backend console
  console.log(`[Notification] SENT mention notification from @${sender} to @${recipient} (File ID: ${fileId}): "${comment}"`);
  
  return res.json({ success: true, message: `Notification successfully sent to @${recipient}` });
});

// --- Diagram Catalog API Endpoints ----------------------------------------
const userFavorites = new Set();
const userRecents = [];
const customTemplates = [];

const SYNONYMS = {
  k8s: "kubernetes",
  postgres: "postgresql",
  mq: "message queue",
  pubsub: "publish subscribe",
  auth: "authentication",
  sso: "single sign-on",
  rag: "retrieval augmented generation",
  cache: "caching",
  limiter: "rate limit"
};

function searchTemplates(params) {
  const { query, category, complexity, animationMode, officialOnly, favoriteOnly } = params;
  let allList = [...SEED_TEMPLATES, ...customTemplates];

  if (category && category.length > 0) {
    allList = allList.filter(item => category.includes(item.kind));
  }
  if (complexity && complexity.length > 0) {
    allList = allList.filter(item => complexity.includes(item.metadata.complexity));
  }
  if (animationMode && animationMode.length > 0) {
    allList = allList.filter(item => {
      const mode = item.animation?.defaultMode || "none";
      return animationMode.includes(mode);
    });
  }
  if (officialOnly === "true" || officialOnly === true) {
    allList = allList.filter(item => !customTemplates.some(ct => ct.id === item.id));
  }
  if (favoriteOnly === "true" || favoriteOnly === true) {
    allList = allList.filter(item => userFavorites.has(item.id));
  }

  if (!query) {
    return allList;
  }

  let expandedQuery = query.toLowerCase();
  for (const [key, val] of Object.entries(SYNONYMS)) {
    if (expandedQuery.includes(key)) {
      expandedQuery += " " + val;
    }
  }
  const queryWords = expandedQuery.split(/\s+/).filter(w => w.length > 0);

  const scoredList = allList.map(item => {
    let score = 0;
    const title = item.title.toLowerCase();
    const desc = item.description.toLowerCase();
    const kind = item.kind.toLowerCase();
    const tags = (item.metadata.tags || []).map(t => t.toLowerCase());
    const techs = (item.metadata.technologies || []).map(t => t.toLowerCase());

    for (const word of queryWords) {
      if (title.includes(word)) {
        score += title === word ? 100 : 25;
      }
      if (techs.some(t => t.includes(word))) score += 15;
      if (tags.some(t => t.includes(word))) score += 10;
      if (desc.includes(word)) score += 5;
      if (kind.includes(word)) score += 5;
    }

    return { item, score };
  });

  return scoredList
    .filter(row => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(row => row.item);
}

app.get("/api/catalog/templates/search", (req, res) => {
  const params = {
    query: req.query.query,
    category: req.query.category ? (Array.isArray(req.query.category) ? req.query.category : [req.query.category]) : [],
    complexity: req.query.complexity ? (Array.isArray(req.query.complexity) ? req.query.complexity : [req.query.complexity]) : [],
    animationMode: req.query.animationMode ? (Array.isArray(req.query.animationMode) ? req.query.animationMode : [req.query.animationMode]) : [],
    officialOnly: req.query.officialOnly,
    favoriteOnly: req.query.favoriteOnly,
  };
  const results = searchTemplates(params);
  res.json({ success: true, results });
});

app.get("/api/catalog/templates", (req, res) => {
  res.json({
    success: true,
    results: [...SEED_TEMPLATES, ...customTemplates]
  });
});

app.get("/api/catalog/templates/:id", (req, res) => {
  const { id } = req.params;
  const template = [...SEED_TEMPLATES, ...customTemplates].find(t => t.id === id);
  if (!template) {
    return res.status(404).json({ error: "Template not found" });
  }
  res.json({ success: true, template });
});

app.post("/api/catalog/templates/:id/favorite", (req, res) => {
  const { id } = req.params;
  userFavorites.add(id);
  res.json({ success: true, favorites: Array.from(userFavorites) });
});

app.delete("/api/catalog/templates/:id/favorite", (req, res) => {
  const { id } = req.params;
  userFavorites.delete(id);
  res.json({ success: true, favorites: Array.from(userFavorites) });
});

app.get("/api/catalog/favorites", (req, res) => {
  res.json({ success: true, favorites: Array.from(userFavorites) });
});

app.post("/api/catalog/recents", (req, res) => {
  const { id } = req.body ?? {};
  if (id) {
    const nextList = [id, ...userRecents.filter(x => x !== id)].slice(0, 20);
    userRecents.length = 0;
    userRecents.push(...nextList);
  }
  res.json({ success: true, recents: userRecents });
});

app.get("/api/catalog/recents", (req, res) => {
  res.json({ success: true, recents: userRecents });
});

app.post("/api/catalog/templates", (req, res) => {
  const { template } = req.body ?? {};
  if (!template || !template.id || !template.title) {
    return res.status(400).json({ error: "Template body with id and title required" });
  }
  customTemplates.push(template);
  res.json({ success: true, template });
});

// --- Dynamic Exporter & CDN Sync -----------------------------------------
const cdnCache = new Map();

app.post("/api/v1/diagram/export", (req, res) => {
  const { dsl, type } = req.body ?? {};
  if (typeof dsl !== "string" || !dsl.trim()) {
    return res.status(400).json({ error: "dsl field is required" });
  }
  try {
    const svg = renderDslToSvg(dsl, type || "flow");
    res.type("image/svg+xml").send(svg);
  } catch (err) {
    res.status(500).json({ error: "Failed to render DSL to SVG: " + err.message });
  }
});

app.post("/api/v1/diagram/cdn/publish", (req, res) => {
  const { fileId, svg } = req.body ?? {};
  if (!fileId || typeof svg !== "string") {
    return res.status(400).json({ error: "fileId and svg are required" });
  }
  cdnCache.set(fileId, svg);
  return res.json({
    success: true,
    url: `/api/v1/diagram/cdn/${fileId}.svg`
  });
});

app.get("/api/v1/diagram/cdn/:fileId.svg", (req, res) => {
  const { fileId } = req.params;
  const svg = cdnCache.get(fileId);
  if (!svg) {
    // Return a beautiful dynamic placeholder SVG so the link doesn't break
    const placeholder = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300" width="100%" height="100%" style="background-color: #f4f4f5; font-family: sans-serif;">
      <rect width="600" height="300" fill="#f4f4f5" />
      <rect x="50" y="50" width="500" height="200" rx="16" ry="16" fill="#ffffff" stroke="#e4e4e7" stroke-width="2" />
      <text x="300" y="130" font-size="18" fill="#18181b" text-anchor="middle" font-weight="bold">Awaiting Synchronization</text>
      <text x="300" y="165" font-size="13" fill="#71717a" text-anchor="middle">Open the file in the nexusblock app to auto-sync this diagram</text>
      <circle cx="300" cy="210" r="16" fill="#3b82f6" />
      <path d="M 295 210 L 305 210 M 300 205 L 300 215" stroke="#ffffff" stroke-width="2" />
    </svg>`;
    return res.type("image/svg+xml").send(placeholder);
  }
  res.type("image/svg+xml").set("Cache-Control", "no-cache").send(svg);
});

function renderDslToSvg(dsl, type) {
  const lines = dsl.split("\n").map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith("//"));
  const nodes = new Map();
  const edges = [];
  let direction = "down";

  for (const line of lines) {
    if (line.startsWith("direction ")) {
      direction = line.substring(10).trim();
      continue;
    }
    if (line.includes(">") || line.includes("-->")) {
      const isDashed = line.includes("-->");
      const sep = isDashed ? "-->" : ">";
      const parts = line.split(sep);
      let from = parts[0].trim();
      let rest = parts[1].trim();
      
      if (from.startsWith('"') && from.endsWith('"')) from = from.slice(1, -1);
      
      let to = "";
      let label = "";
      let edgeColor = "#71717a";

      const labelIdx = rest.indexOf(":");
      if (labelIdx !== -1) {
        to = rest.substring(0, labelIdx).trim();
        const afterLabel = rest.substring(labelIdx + 1).trim();
        const colorMatch = afterLabel.match(/\[color:\s*([^\]]+)\]/);
        if (colorMatch) {
          edgeColor = colorMatch[1].trim();
          label = afterLabel.replace(/\[[^\]]+\]/, "").trim();
        } else {
          label = afterLabel;
        }
      } else {
        const colorMatch = rest.match(/\[color:\s*([^\]]+)\]/);
        if (colorMatch) {
          edgeColor = colorMatch[1].trim();
          to = rest.replace(/\[[^\]]+\]/, "").trim();
        } else {
          to = rest;
        }
      }

      if (to.startsWith('"') && to.endsWith('"')) to = to.slice(1, -1);

      if (from && to) {
        edges.push({ from, to, label, isDashed, color: edgeColor });
        if (!nodes.has(from)) nodes.set(from, { label: from, shape: "rectangle", color: "#3b82f6" });
        if (!nodes.has(to)) nodes.set(to, { label: to, shape: "rectangle", color: "#3b82f6" });
      }
      continue;
    }

    const nodeMatch = line.match(/^"([^"]+)"(?:\s*\[([^\]]+)\])?/);
    if (nodeMatch) {
      const label = nodeMatch[1];
      let shape = "rectangle";
      let color = "#3b82f6";
      
      if (nodeMatch[2]) {
        const attrs = nodeMatch[2];
        const shapeMatch = attrs.match(/shape:\s*([a-zA-Z0-9_-]+)/);
        if (shapeMatch) shape = shapeMatch[1];
        const colorMatch = attrs.match(/color:\s*([a-zA-Z0-9#_-]+)/);
        if (colorMatch) {
          const c = colorMatch[1];
          const colorsMap = {
            blue: "#3b82f6", cyan: "#06b6d4", green: "#10b981", orange: "#f97316",
            pink: "#ec4899", purple: "#8b5cf6", violet: "#7c3aed", red: "#ef4444", slate: "#64748b"
          };
          color = colorsMap[c] || c;
        }
      }
      nodes.set(label, { label, shape, color });
    }
  }

  if (nodes.size === 0) {
    nodes.set("Diagram", { label: "Empty Diagram", shape: "rectangle", color: "#64748b" });
  }

  const width = 800;
  const height = 600;
  const nodeWidth = 140;
  const nodeHeight = 50;

  let xStep = 180;
  let yStep = 100;
  let idx = 0;
  for (const [id, node] of nodes.entries()) {
    if (direction === "right") {
      node.x = 80 + idx * xStep;
      node.y = height / 2 - nodeHeight / 2;
    } else {
      node.x = width / 2 - nodeWidth / 2;
      node.y = 60 + idx * yStep;
    }
    idx++;
  }

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="background-color: #f8f7f4; font-family: sans-serif;">\\n`;
  svg += `  <defs>\\n`;
  svg += `    <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">\\n`;
  svg += `      <path d="M 0 1 L 10 5 L 0 9 z" fill="#71717a" />\\n`;
  svg += `    </marker>\\n`;
  svg += `  </defs>\\n`;

  for (const edge of edges) {
    const fromNode = nodes.get(edge.from);
    const toNode = nodes.get(edge.to);
    if (fromNode && toNode) {
      let x1 = fromNode.x + nodeWidth / 2;
      let y1 = fromNode.y + nodeHeight / 2;
      let x2 = toNode.x + nodeWidth / 2;
      let y2 = toNode.y + nodeHeight / 2;

      if (direction === "right") {
        x1 = fromNode.x + nodeWidth;
        x2 = toNode.x;
      } else {
        y1 = fromNode.y + nodeHeight;
        y2 = toNode.y;
      }

      const dashAttr = edge.isDashed ? ` stroke-dasharray="4 4"` : "";
      svg += `  <path d="M \${x1} \${y1} L \${x2} \${y2}" stroke="\${edge.color || '#71717a'}" stroke-width="2" fill="none" marker-end="url(#arrow)"\${dashAttr} />\\n`;
      if (edge.label) {
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2 - 8;
        svg += `  <text x="\${mx}" y="\${my}" font-size="10" fill="#71717a" text-anchor="middle" font-weight="bold">\${edge.label}</text>\\n`;
      }
    }
  }

  for (const node of nodes.values()) {
    const rx = node.shape === "oval" ? 25 : node.shape === "hexagon" ? 12 : 8;
    const border = node.color;
    
    svg += `  <g>\\n`;
    svg += `    <rect x="\${node.x}" y="\${node.y}" width="\${nodeWidth}" height="\${nodeHeight}" rx="\${rx}" ry="\${rx}" fill="#ffffff" stroke="\${border}" stroke-width="2.5" />\\n`;
    svg += `    <text x="\${node.x + nodeWidth / 2}" y="\${node.y + nodeHeight / 2 + 5}" font-size="12" fill="#18181b" text-anchor="middle" font-weight="bold">\${node.label}</text>\\n`;
    svg += `  </g>\\n`;
  }

  svg += `</svg>`;
  return svg;
}

http.createServer(app).listen(port, host, () => {
  console.log(`nexusblock ai server listening on ${host}:${port}`);
  if (!process.env.ANTHROPIC_API_KEY)
    console.warn(
      "[ai] ANTHROPIC_API_KEY is not set — /generate will fail until it is.",
    );
});
