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
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

// y-websocket's server utils are CommonJS; load them from this ESM file.
// Using the classic y-websocket (yjs@13) keeps the server on the exact same
// Yjs version as the tldraw client — no CRDT encoding mismatch.
const require = createRequire(import.meta.url)
const { setupWSConnection } = require('y-websocket/bin/utils')

// Bind 0.0.0.0 so it works inside containers; PORT is provided by most hosts.
const host = process.env.HOST || '0.0.0.0'
const port = Number(process.env.PORT || 1234)
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:4173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

function initFirebaseAdmin() {
  if (getApps().length) return
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (json) {
    initializeApp({ credential: cert(JSON.parse(json)) })
    return
  }
  initializeApp({ credential: applicationDefault() })
}

initFirebaseAdmin()

const server = http.createServer((_req, res) => {
  // Plain HTTP health check for uptime probes / load balancers.
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('nexusblock collab server ok')
})

const wss = new WebSocketServer({ noServer: true })
wss.on('connection', (conn, req) => setupWSConnection(conn, req))

function reject(socket, status, message) {
  socket.write(`HTTP/1.1 ${status} ${message}\r\nConnection: close\r\n\r\n`)
  socket.destroy()
}

function roomPartsFromUrl(req) {
  const reqUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const room = decodeURIComponent(reqUrl.pathname.replace(/^\/+/, ''))
  if (!room.startsWith('nb-file-')) return null
  const core = room.slice('nb-file-'.length).split(':')[0] || ''
  const [ownerUid, fileId] = core.split('__')
  if (!ownerUid || !fileId) return null
  return { ownerUid, fileId }
}

async function canJoinLiveRoom(room, user) {
  if (!room?.fileId || !room?.ownerUid || !user?.uid) return false
  const db = getFirestore()
  const { fileId, ownerUid } = room

  if (ownerUid === user.uid) {
    const content = await db.doc(`workspaces/${ownerUid}/content/${fileId}`).get()
    const privateShare = await db.doc(`shares/${fileId}`).get()
    return content.exists || privateShare.data()?.ownerUid === ownerUid
  }

  const publicSnap = await db.doc(`publicShares/${fileId}`).get()
  if (publicSnap.exists) {
    const share = publicSnap.data()
    if (share?.ownerUid === ownerUid && share?.access === 'link' && share?.linkRole === 'edit') return true
  }

  const privateSnap = await db.doc(`shares/${fileId}`).get()
  if (privateSnap.exists && privateSnap.data()?.ownerUid === user.uid && privateSnap.data()?.ownerUid === ownerUid) return true

  const email = String(user.email || '').toLowerCase()
  if (!email) return false
  const grantSnap = await db.doc(`shareGrants/${fileId}/recipients/${email}`).get()
  return grantSnap.exists && grantSnap.data()?.ownerUid === ownerUid && grantSnap.data()?.role === 'edit'
}

server.on('upgrade', async (req, socket, head) => {
  const origin = req.headers.origin
  if (origin && !allowedOrigins.includes(origin)) {
    reject(socket, 403, 'Forbidden')
    return
  }

  const reqUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const token = reqUrl.searchParams.get('token')
  if (!token) {
    reject(socket, 401, 'Unauthorized')
    return
  }

  try {
    req.user = await getAuth().verifyIdToken(token)
  } catch {
    reject(socket, 401, 'Unauthorized')
    return
  }

  if (!(await canJoinLiveRoom(roomPartsFromUrl(req), req.user))) {
    reject(socket, 403, 'Forbidden')
    return
  }

  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req))
})

server.listen(port, host, () => {
  console.log(`nexusblock collab server listening on ${host}:${port}`)
})
