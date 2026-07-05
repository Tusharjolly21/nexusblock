/**
 * Real-time collaboration transport (self-hosted Yjs over WebSocket).
 *
 * No third-party keys or badges: live rooms sync through our own y-websocket
 * server. Point `VITE_COLLAB_WS_URL` at it (defaults to the local dev server
 * started by `npm run collab`).
 */
const url = (import.meta.env.VITE_COLLAB_WS_URL as string | undefined) || 'ws://localhost:1234'

/** Live collaboration is always available (self-hosted, no API key needed). */
export const isCollabConfigured = true

/** WebSocket endpoint of the Yjs sync server. */
export const collabWsUrl = url

/** Deterministic room per owner+file. Owner namespacing prevents cross-workspace room collisions. */
export const roomIdForFile = (fileId: string, ownerUid: string | null | undefined) => `nb-file-${ownerUid || 'unknown'}__${fileId}`
