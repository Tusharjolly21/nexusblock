import { isFlowShape, type FlowShape, type FlowConnector } from './lib'

export type FlowNode = { name: string; label: string; shape: FlowShape; icon: string; color?: string; group?: string }
export type FlowGroup = { name: string; label: string; color?: string; parent?: string; children: string[] }
export type FlowEdge = { from: string; to: string; label: string; connector: FlowConnector; color?: string }
export type Direction = 'down' | 'up' | 'left' | 'right'
export type FlowError = { line: number; message: string }

export type FlowDoc = {
  direction: Direction
  nodes: Map<string, FlowNode>
  groups: Map<string, FlowGroup>
  order: string[] // node/group names in declaration order
  edges: FlowEdge[]
  errors: FlowError[]
}

const CONNECTORS: FlowConnector[] = ['-->', '<>', '--', '>', '<', '-'] // longest-first for scanning

/** Remove `//` and `#` line comments, ignoring occurrences inside quotes. */
function stripComment(line: string): string {
  let q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') q = !q
    if (!q && ((c === '/' && line[i + 1] === '/') || c === '#')) return line.slice(0, i)
  }
  return line
}

/** Split `text` on top-level newlines (depth 0 for [] {} and quotes). */
function splitTopLevelLines(text: string): string[] {
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

/** Split on a single-char separator at depth 0. */
function splitTopLevel(text: string, sep: string): string[] {
  const out: string[] = []
  let depth = 0
  let q = false
  let buf = ''
  for (const c of text) {
    if (c === '"') q = !q
    if (!q && (c === '[' || c === '{')) depth++
    if (!q && (c === ']' || c === '}')) depth--
    if (c === sep && depth === 0 && !q) {
      out.push(buf)
      buf = ''
    } else buf += c
  }
  out.push(buf)
  return out
}

type Props = { shape?: string; icon?: string; color?: string; label?: string }

function parseProps(inner: string): Props {
  const props: Props = {}
  for (const pair of splitTopLevel(inner, ',')) {
    const idx = pair.indexOf(':')
    if (idx === -1) continue
    const key = pair.slice(0, idx).trim().toLowerCase()
    const val = pair.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
    if (key === 'shape' || key === 'icon' || key === 'color' || key === 'label') props[key] = val
  }
  return props
}

/** Parse a name token: `Name`, `Name [props]`, `"quoted name" [props]`. */
function parseNameToken(token: string): { name: string; props: Props } | null {
  const t = token.trim()
  if (!t) return null
  const b = t.indexOf('[')
  const head = (b === -1 ? t : t.slice(0, b)).trim()
  const name = head.replace(/^["']|["']$/g, '').trim()
  if (!name) return null
  let props: Props = {}
  if (b !== -1) {
    const close = t.lastIndexOf(']')
    if (close > b) props = parseProps(t.slice(b + 1, close))
  }
  return { name, props }
}

/** Find the first connector token (longest match) at depth 0; return index+token. */
function findConnector(text: string): { index: number; token: FlowConnector } | null {
  let depth = 0
  let q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') q = !q
    if (!q && (c === '[' || c === '{')) depth++
    if (!q && (c === ']' || c === '}')) depth--
    if (depth !== 0 || q) continue
    for (const tok of CONNECTORS) {
      if (text.startsWith(tok, i)) return { index: i, token: tok }
    }
  }
  return null
}

/** Split a connection chain into [segment, connector, segment, …]. */
function splitChain(text: string): { segments: string[]; connectors: FlowConnector[] } {
  const segments: string[] = []
  const connectors: FlowConnector[] = []
  let rest = text
  while (true) {
    const found = findConnector(rest)
    if (!found) {
      segments.push(rest)
      break
    }
    segments.push(rest.slice(0, found.index))
    connectors.push(found.token)
    rest = rest.slice(found.index + found.token.length)
  }
  return { segments, connectors }
}

export function parseFlow(source: string): FlowDoc {
  const doc: FlowDoc = { direction: 'down', nodes: new Map(), groups: new Map(), order: [], edges: [], errors: [] }

  const ensureNode = (name: string, props: Props = {}, group?: string): void => {
    let node = doc.nodes.get(name)
    if (!node) {
      node = { name, label: name, shape: 'rectangle', icon: '' }
      doc.nodes.set(name, node)
      doc.order.push(name)
    }
    if (props.label) node.label = props.label
    if (props.icon) node.icon = props.icon
    if (props.color) node.color = props.color
    if (props.shape) {
      if (isFlowShape(props.shape)) node.shape = props.shape
      else doc.errors.push({ line: 0, message: `Unknown shape “${props.shape}”.` })
    }
    if (group) node.group = group
  }

  const parseBlock = (text: string, parent?: string) => {
    for (const rawLine of splitTopLevelLines(text)) {
      const line = stripComment(rawLine).trim()
      if (!line) continue

      // direction statement
      const dir = /^direction\s+(down|up|left|right)\b/i.exec(line)
      if (dir) {
        doc.direction = dir[1].toLowerCase() as Direction
        continue
      }

      // group: `Name [props]? { body }`
      const brace = line.indexOf('{')
      if (brace !== -1 && line.trimEnd().endsWith('}')) {
        const header = line.slice(0, brace).trim()
        const body = line.slice(brace + 1, line.lastIndexOf('}'))
        const parsed = parseNameToken(header)
        if (!parsed) {
          doc.errors.push({ line: 0, message: `Group is missing a name.` })
          continue
        }
        const g: FlowGroup =
          doc.groups.get(parsed.name) ?? { name: parsed.name, label: parsed.name, children: [] }
        if (parsed.props.label) g.label = parsed.props.label
        if (parsed.props.color) g.color = parsed.props.color
        if (parent) g.parent = parent
        doc.groups.set(parsed.name, g)
        if (!doc.order.includes(parsed.name)) doc.order.push(parsed.name)
        if (parent) doc.groups.get(parent)?.children.push(parsed.name)

        // Track membership: capture names declared/referenced directly in this body.
        const before = new Set(doc.nodes.keys())
        parseBlock(body, parsed.name)
        for (const name of doc.nodes.keys()) {
          if (!before.has(name)) {
            const n = doc.nodes.get(name)!
            if (n.group === parsed.name && !g.children.includes(name)) g.children.push(name)
          }
        }
        continue
      }

      // connection: contains a connector at depth 0
      if (findConnector(line)) {
        parseConnection(line, parent)
        continue
      }

      // plain node(s): comma-separated enumeration
      for (const tok of splitTopLevel(line, ',')) {
        const parsed = parseNameToken(tok)
        if (parsed) ensureNode(parsed.name, parsed.props, parent)
      }
    }
  }

  const parseConnection = (line: string, parent?: string) => {
    let color: string | undefined
    let label = ''

    // Split off the label at the first depth-0 ':'. Node props (`[shape: …]`)
    // live in the chain BEFORE the colon; connection props (`[color: …]`) live
    // at the end of the label segment AFTER it.
    const colonParts = splitTopLevel(line, ':')
    let chainText = colonParts[0].trim()
    if (colonParts.length > 1) {
      let labelText = colonParts.slice(1).join(':').trim()
      const lo = labelText.lastIndexOf('[')
      if (lo !== -1 && labelText.trimEnd().endsWith(']')) {
        const p = parseProps(labelText.slice(lo + 1, labelText.lastIndexOf(']')))
        if (p.color) color = p.color
        labelText = labelText.slice(0, lo).trim()
      }
      label = labelText
    }

    const { segments, connectors } = splitChain(chainText)
    if (segments.length < 2) {
      doc.errors.push({ line: 0, message: `Connection needs two endpoints.` })
      return
    }

    // Resolve each segment into a list of node names (branching via commas).
    const resolved: string[][] = segments.map((seg) =>
      splitTopLevel(seg, ',')
        .map(parseNameToken)
        .filter((x): x is { name: string; props: Props } => !!x)
        .map((x) => {
          ensureNode(x.name, x.props, parent)
          return x.name
        }),
    )

    // Chain adjacent segments; label applies to the final hop.
    for (let i = 0; i < connectors.length; i++) {
      const conn = connectors[i]
      const isLast = i === connectors.length - 1
      for (const from of resolved[i]) {
        for (const to of resolved[i + 1]) {
          doc.edges.push({ from, to, connector: conn, label: isLast ? label : '', color })
        }
      }
    }
  }

  parseBlock(source)

  if (doc.nodes.size === 0 && doc.errors.length === 0) {
    doc.errors.push({ line: 0, message: 'Nothing to draw yet — define a node or a connection.' })
  }
  return doc
}
