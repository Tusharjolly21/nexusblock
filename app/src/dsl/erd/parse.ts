/** Parser for the Eraser-style ERD DSL: entities, attributes, relationships. */

export type ErdAttr = { name: string; type: string; pk: boolean }
export type ErdEntity = { name: string; icon: string; color?: string; attrs: ErdAttr[]; pos?: string }
export type ErdConnector = '<' | '>' | '-' | '<>'
export type ErdEnd = { entity: string; attr?: string }
export type ErdRel = { from: ErdEnd; to: ErdEnd; connector: ErdConnector; color?: string }
export type ErdError = { line: number; message: string }

export type ErdDoc = {
  entities: Map<string, ErdEntity>
  order: string[]
  rels: ErdRel[]
  errors: ErdError[]
}

const CONNECTORS: ErdConnector[] = ['<>', '>', '<', '-'] // longest-first

function stripComment(line: string): string {
  let q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') q = !q
    if (!q && ((c === '/' && line[i + 1] === '/') || c === '#')) return line.slice(0, i)
  }
  return line
}

/** Split on top-level newlines (depth 0 for [] {} and quotes). */
function splitStatements(text: string): string[] {
  const out: string[] = []
  let depth = 0
  let q = false
  let buf = ''
  for (const c of text) {
    if (c === '"') q = !q
    if (!q && (c === '[' || c === '{')) depth++
    if (!q && (c === ']' || c === '}')) depth--
    if (c === '\n' && depth <= 0 && !q) {
      out.push(buf)
      buf = ''
    } else buf += c
  }
  if (buf.trim()) out.push(buf)
  return out
}

function parseProps(inner: string): { icon?: string; color?: string; pos?: string } {
  const props: { icon?: string; color?: string; pos?: string } = {}
  for (const pair of inner.split(',')) {
    const idx = pair.indexOf(':')
    if (idx === -1) continue
    const key = pair.slice(0, idx).trim().toLowerCase()
    const val = pair.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
    if (key === 'icon') props.icon = val
    if (key === 'color') props.color = val
    if (key === 'pos') props.pos = val
  }
  return props
}

const unquote = (s: string) => s.trim().replace(/^"|"$/g, '').trim()

/** Find a connector token (longest match) at depth 0. */
function findConnector(text: string): { index: number; token: ErdConnector } | null {
  let depth = 0
  let q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') q = !q
    if (!q && (c === '[' || c === '{')) depth++
    if (!q && (c === ']' || c === '}')) depth--
    if (depth !== 0 || q) continue
    for (const tok of CONNECTORS) if (text.startsWith(tok, i)) return { index: i, token: tok }
  }
  return null
}

function parseEnd(raw: string): ErdEnd {
  const t = unquote(raw)
  const dot = t.indexOf('.')
  if (dot === -1) return { entity: t }
  return { entity: t.slice(0, dot).trim(), attr: t.slice(dot + 1).trim() }
}

export function parseErd(source: string): ErdDoc {
  const doc: ErdDoc = { entities: new Map(), order: [], rels: [], errors: [] }

  const ensureEntity = (name: string): ErdEntity => {
    let e = doc.entities.get(name)
    if (!e) {
      e = { name, icon: '', attrs: [] }
      doc.entities.set(name, e)
      doc.order.push(name)
    }
    return e
  }

  const ensureAttr = (entity: string, attr?: string) => {
    if (!attr) return
    const e = ensureEntity(entity)
    if (!e.attrs.some((a) => a.name === attr)) e.attrs.push({ name: attr, type: '', pk: false })
  }

  for (const rawStmt of splitStatements(source)) {
    const stmt = stripComment(rawStmt).trim()
    if (!stmt) continue

    // Entity block: `Name [props]? { ...attrs }`
    const brace = stmt.indexOf('{')
    if (brace !== -1 && stmt.trimEnd().endsWith('}')) {
      const header = stmt.slice(0, brace).trim()
      const body = stmt.slice(brace + 1, stmt.lastIndexOf('}'))
      const b = header.indexOf('[')
      const name = unquote(b === -1 ? header : header.slice(0, b))
      if (!name) {
        doc.errors.push({ line: 0, message: 'Entity is missing a name.' })
        continue
      }
      const entity = ensureEntity(name)
      if (b !== -1) {
        const props = parseProps(header.slice(b + 1, header.lastIndexOf(']')))
        if (props.icon) entity.icon = props.icon
        if (props.color) entity.color = props.color
        if (props.pos) entity.pos = props.pos
      }
      for (const rawAttr of body.split('\n')) {
        const attrLine = stripComment(rawAttr).trim()
        if (!attrLine) continue
        const parts = attrLine.split(/\s+/)
        const aName = parts[0]
        if (!aName) continue
        const meta = parts.slice(1).map((p) => p.toLowerCase())
        const pk = meta.includes('pk')
        const type = parts[1] && parts[1].toLowerCase() !== 'pk' ? parts[1] : ''
        const existing = entity.attrs.find((a) => a.name === aName)
        if (existing) {
          existing.type = type || existing.type
          existing.pk = existing.pk || pk
        } else {
          entity.attrs.push({ name: aName, type, pk })
        }
      }
      continue
    }

    // Relationship: `a.x > b.y [color: …]`
    const conn = findConnector(stmt)
    if (conn) {
      let text = stmt
      let color: string | undefined
      const lo = text.lastIndexOf('[')
      if (lo !== -1 && text.trimEnd().endsWith(']')) {
        const p = parseProps(text.slice(lo + 1, text.lastIndexOf(']')))
        if (p.color) color = p.color
        text = text.slice(0, lo).trim()
      }
      const c = findConnector(text)!
      const from = parseEnd(text.slice(0, c.index))
      const to = parseEnd(text.slice(c.index + c.token.length))
      if (!from.entity || !to.entity) {
        doc.errors.push({ line: 0, message: 'Relationship needs two endpoints.' })
        continue
      }
      ensureAttr(from.entity, from.attr)
      ensureAttr(to.entity, to.attr)
      doc.rels.push({ from, to, connector: c.token, color })
      continue
    }

    doc.errors.push({ line: 0, message: `Couldn't parse: “${stmt.slice(0, 40)}”.` })
  }

  if (doc.entities.size === 0 && doc.errors.length === 0) {
    doc.errors.push({ line: 0, message: 'Define an entity with { } to get started.' })
  }
  return doc
}
