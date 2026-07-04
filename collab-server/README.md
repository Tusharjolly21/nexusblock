# nexusblock collab server

Self-hosted Yjs WebSocket server that powers live (`?live=1`) collaboration.
No API keys, no third-party branding. Canvas edits sync here as a CRDT; your
Firestore snapshot remains the durable copy of each file.

## Run locally

```bash
npm install
npm start          # → nexusblock collab server listening on 0.0.0.0:1234
```

Point the app at it with `VITE_COLLAB_WS_URL` (defaults to `ws://localhost:1234`
if unset, so locally you can just run `npm start` here and `npm run dev` in the app).

> Tip: from the app folder, `npm run collab` runs the same server (via
> `node_modules/y-websocket/bin/server.js`). This folder is the **deployable**
> version with its own Dockerfile.

## Deploy

The server listens on `PORT` (defaults to `1234`) and binds `0.0.0.0`. Any Node
host works. After deploying, set the app's `VITE_COLLAB_WS_URL` to the public
`wss://` URL (must be `wss://`, not `ws://`, so a secure page can connect).

### Railway
1. New Project → Deploy from Repo → pick this `collab-server/` directory
   (or "Empty Service" + connect the repo, root = `collab-server`).
2. Railway auto-detects the `Dockerfile`. Deploy.
3. Settings → Networking → **Generate Domain**. Use `wss://<that-domain>`.

### Fly.io
```bash
cd collab-server
fly launch --no-deploy      # accept app name or edit fly.toml
fly deploy
```
URL: `wss://<app-name>.fly.dev`.

### Render
New → Web Service → this repo, root dir `collab-server`, runtime **Docker**.
URL: `wss://<service>.onrender.com`.

### Plain VPS (Docker)
```bash
docker build -t nexusblock-collab .
docker run -d -p 1234:1234 --restart unless-stopped nexusblock-collab
```
Put it behind a reverse proxy (Caddy/nginx) with TLS so clients reach it over
`wss://`.

## Notes

- **In-memory only.** Rooms live in RAM; a restart drops in-progress live state
  but never saved files (those are in Firestore). Add LevelDB/Redis persistence
  if you need rooms to survive restarts.
- **Health check:** `GET /` returns `200 nexusblock collab server ok`.
