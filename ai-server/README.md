# nexusblock AI server

Turns natural language into nexusblock diagram-as-code (flow / ERD DSL) using
Claude. One endpoint, `POST /generate`; the app's DSL panel calls it from the
**✨ Generate** button and pipes the result into `applyFlow` / `applyErd`.

Built on the official Anthropic SDK (`@anthropic-ai/sdk`) with `claude-opus-4-8`
and **structured outputs**, so the model can only return grammar-shaped DSL.

## Run locally

```bash
npm install
export ANTHROPIC_API_KEY=sk-ant-...     # required
npm start                                # → listening on 0.0.0.0:8787
```

Point the app at it with `VITE_AI_URL` (defaults to `http://localhost:8787`, so
locally you can just run this and `npm run dev` in the app).

## API

`POST /generate`
```json
{ "kind": "flow" | "erd", "prompt": "checkout flow with a payment provider", "currentDsl": "…optional existing DSL…" }
```
→ `{ "dsl": "…generated DSL…" }`

`GET /` → `200 nexusblock ai server ok` (health check).

## Deploy

Listens on `PORT` (default 8787), binds `0.0.0.0`. Set `ANTHROPIC_API_KEY` as a
secret on the host, deploy, then set the app's `VITE_AI_URL` to the public
`https://…` URL.

- **Fly.io:** `fly launch --no-deploy` then `fly secrets set ANTHROPIC_API_KEY=… && fly deploy`
- **Railway / Render:** deploy this dir (Docker), add `ANTHROPIC_API_KEY` env var.
- **Docker:** `docker build -t nexusblock-ai . && docker run -d -p 8787:8787 -e ANTHROPIC_API_KEY=… nexusblock-ai`

## Rate limiting

`/generate` is rate-limited (fixed window, in-memory) to protect your Claude
bill. Defaults: **20 requests/min per IP** and **120/min globally**. Over the
limit returns `429` with a `Retry-After` header (the app surfaces the message
inline). Tune via env:

| Env | Default | Meaning |
|---|---|---|
| `RATE_MAX_PER_IP` | `20` | Max requests per client IP per window |
| `RATE_MAX_GLOBAL` | `120` | Max requests across all clients per window |
| `RATE_WINDOW_MS` | `60000` | Window length in ms |

The limiter is per-instance (in-memory). If you scale to multiple replicas,
move the counters to a shared store (Redis).

## Notes

- The API key lives **only** on this server — never in the browser bundle.
- `trust proxy` is on, so `req.ip` is the real client behind Fly/Railway/Render.
- Restrict CORS to your app's origin in `server.mjs` before production (it's
  currently open for local dev).
