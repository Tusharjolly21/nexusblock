// nexusblock live-collaboration server.
//
// A minimal Yjs sync server: every `?live=1` canvas connects here over a
// WebSocket, and edits merge as a CRDT. No API keys, no third-party badge.
// The room name is the URL path (the client uses `nb-file-<fileId>`).
//
// Docs are held in memory (fine for live sessions — Firestore keeps the durable
// snapshot). Restarting drops in-progress live state but not saved files.

import http from 'http'
import { createRequire } from 'module'
import { WebSocketServer } from 'ws'

// y-websocket's server utils are CommonJS; load them from this ESM file.
// Using the classic y-websocket (yjs@13) keeps the server on the exact same
// Yjs version as the tldraw client — no CRDT encoding mismatch.
const require = createRequire(import.meta.url)
const { setupWSConnection } = require('y-websocket/bin/utils')

// Bind 0.0.0.0 so it works inside containers; PORT is provided by most hosts.
const host = process.env.HOST || '0.0.0.0'
const port = Number(process.env.PORT || 1234)

const server = http.createServer((_req, res) => {
  // Plain HTTP health check for uptime probes / load balancers.
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('nexusblock collab server ok')
})

const wss = new WebSocketServer({ noServer: true })
wss.on('connection', (conn, req) => setupWSConnection(conn, req))

server.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req))
})

server.listen(port, host, () => {
  console.log(`nexusblock collab server listening on ${host}:${port}`)
})
