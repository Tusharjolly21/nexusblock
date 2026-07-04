import { useEffect, useState } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import {
  computed,
  createPresenceStateDerivation,
  createTLStore,
  defaultBindingUtils,
  defaultShapeUtils,
  getUserPreferences,
  InstancePresenceRecordType,
  react,
  transact,
  type TLAnyShapeUtilConstructor,
  type TLInstancePresence,
  type TLRecord,
  type TLStoreWithStatus,
} from 'tldraw'
import { collabWsUrl } from '../lib/collab'

/**
 * A tldraw store synced in real time through a self-hosted Yjs WebSocket server.
 * Documents merge as a CRDT (concurrent edits don't clobber), and collaborator
 * cursors/selection flow through Yjs awareness. Returns a loading status until
 * the room syncs.
 *
 * Local persistence is intentionally off here — the sync server is the source
 * of truth for a collaborative room.
 */
export function useCollabStore(roomId: string, shapeUtils: TLAnyShapeUtilConstructor[], enabled: boolean): TLStoreWithStatus {
  const [store] = useState(() =>
    createTLStore({ shapeUtils: [...defaultShapeUtils, ...shapeUtils], bindingUtils: defaultBindingUtils }),
  )
  const [status, setStatus] = useState<TLStoreWithStatus>({ status: 'not-synced', store })

  useEffect(() => {
    if (!enabled) return
    setStatus({ status: 'loading' })

    const yDoc = new Y.Doc()
    const yProvider = new WebsocketProvider(collabWsUrl, roomId, yDoc)
    const yStore = yDoc.getMap<TLRecord>('tl_records')
    const { awareness } = yProvider
    const disposers: (() => void)[] = []
    let started = false

    const start = () => {
      if (started) return
      started = true

      // Yjs → store.
      const observer = (events: Y.YEvent<Y.Map<TLRecord>>[], tx: Y.Transaction) => {
        if (tx.local) return
        const ids = new Set<string>()
        events.forEach((e) => e.changes.keys.forEach((_c, id) => ids.add(id)))
        const toPut: TLRecord[] = []
        const toRemove: TLRecord['id'][] = []
        ids.forEach((id) => {
          const rec = yStore.get(id)
          if (rec) toPut.push(rec)
          else toRemove.push(id as TLRecord['id'])
        })
        store.mergeRemoteChanges(() => {
          if (toRemove.length) store.remove(toRemove)
          if (toPut.length) store.put(toPut)
        })
      }
      yStore.observeDeep(observer)
      disposers.push(() => yStore.unobserveDeep(observer))

      // Store → Yjs.
      disposers.push(
        store.listen(
          ({ changes }) => {
            yDoc.transact(() => {
              Object.values(changes.added).forEach((r) => yStore.set(r.id, r))
              Object.values(changes.updated).forEach(([, r]) => yStore.set(r.id, r))
              Object.values(changes.removed).forEach((r) => yStore.delete(r.id))
            })
          },
          { source: 'user', scope: 'document' },
        ),
      )

      // Initial hydrate (skip presence records — those flow through awareness).
      transact(() => {
        if (yStore.size === 0) {
          yDoc.transact(() => {
            store.allRecords().forEach((r) => { if (r.typeName !== 'instance_presence') yStore.set(r.id, r) })
          })
        } else {
          store.clear()
          store.put([...yStore.values()].filter((r) => r.typeName !== 'instance_presence'))
        }
      })

      // Presence: publish our cursor/selection, read others'.
      const $user = computed('presenceUser', () => {
        const p = getUserPreferences()
        return { id: p.id, color: p.color ?? '#4465e9', name: p.name ?? 'Anonymous', imageUrl: '', meta: {} }
      })
      const presenceId = InstancePresenceRecordType.createId(yDoc.clientID.toString())
      // Cast: presence derivation only reads id/name/color; the full TLUser record type is stricter than needed.
      const presenceDerivation = createPresenceStateDerivation($user as never, { instanceId: presenceId })(store)
      disposers.push(
        react('presence → awareness', () => {
          const presence = presenceDerivation.get()
          requestAnimationFrame(() => awareness.setLocalStateField('presence', presence as never))
        }),
      )
      const handleAwareness = () => {
        const toPut: TLInstancePresence[] = []
        awareness.getStates().forEach((state, clientId) => {
          if (clientId === yDoc.clientID) return
          const p = (state as { presence?: TLInstancePresence })?.presence
          if (p) toPut.push(p)
        })
        if (toPut.length) store.mergeRemoteChanges(() => store.put(toPut))
      }
      awareness.on('change', handleAwareness)
      disposers.push(() => awareness.off('change', handleAwareness))

      setStatus({ status: 'synced-remote', connectionStatus: 'online', store })
    }

    const onSync = (synced: boolean) => {
      // eslint-disable-next-line no-console
      console.log(`[collab] ${roomId} sync:`, synced)
      if (synced) start()
    }
    yProvider.on('sync', onSync)
    disposers.push(() => yProvider.off('sync', onSync))

    // Surface connection trouble instead of hanging silently on "loading".
    const onStatus = (e: { status: string }) => {
      // eslint-disable-next-line no-console
      console.log(`[collab] ${roomId} status:`, e.status)
    }
    yProvider.on('status', onStatus)
    disposers.push(() => yProvider.off('status', onStatus))
    yProvider.on('connection-error', (err: unknown) => {
      // eslint-disable-next-line no-console
      console.error(`[collab] ${roomId} connection error:`, err)
    })

    // If the room already synced before we attached the listener, start now.
    if (yProvider.synced) start()

    return () => {
      disposers.forEach((d) => d())
      yProvider.destroy()
      yDoc.destroy()
    }
  }, [roomId, store, enabled])

  return status
}
