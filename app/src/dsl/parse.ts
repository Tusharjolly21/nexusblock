import { NODE_KINDS, type NodeKind } from '../shapes/ArchNodeShape'

export type DslNode = { id: string; kind: NodeKind; label: string; tech: string }
export type DslEdge = { from: string; to: string; label: string }
export type DslError = { line: number; message: string }
export type ParseResult = { nodes: DslNode[]; edges: DslEdge[]; errors: DslError[] }

const KINDS = new Set<string>(NODE_KINDS)

// `service api "API gateway" [fastify]`  — tech in [] optional
const NODE_RE = /^(\w+)\s+([A-Za-z][\w-]*)\s+"([^"]*)"(?:\s+\[([^\]]*)\])?$/
// `web -> api : "HTTPS"`  — label optional
const EDGE_RE = /^([A-Za-z][\w-]*)\s*->\s*([A-Za-z][\w-]*)(?:\s*:\s*"([^"]*)")?$/

/**
 * Parse the nexusblock diagram DSL into nodes + edges. Line-based and forgiving:
 * blank lines and `#`/`//` comments are ignored; unknown lines become errors.
 * Grammar (see the Code pane placeholder):
 *   <kind> <id> "<label>" [tech]
 *   <id> -> <id> : "<label>"
 */
export function parseDsl(source: string): ParseResult {
  const nodes: DslNode[] = []
  const edges: DslEdge[] = []
  const errors: DslError[] = []
  const seen = new Set<string>()

  source.split('\n').forEach((raw, i) => {
    const line = raw.trim()
    const n = i + 1
    if (!line || line.startsWith('#') || line.startsWith('//')) return

    const edge = EDGE_RE.exec(line)
    if (edge) {
      edges.push({ from: edge[1], to: edge[2], label: edge[3] ?? '' })
      return
    }

    const node = NODE_RE.exec(line)
    if (node) {
      const kind = node[1]
      if (!KINDS.has(kind)) {
        errors.push({ line: n, message: `Unknown kind “${kind}”. Use: ${[...KINDS].join(', ')}.` })
        return
      }
      if (seen.has(node[2])) {
        errors.push({ line: n, message: `Duplicate id “${node[2]}”.` })
        return
      }
      seen.add(node[2])
      nodes.push({ id: node[2], kind: kind as NodeKind, label: node[3], tech: node[4] ?? '' })
      return
    }

    errors.push({ line: n, message: `Couldn't parse this line.` })
  })

  // Edges must reference declared nodes.
  for (const e of edges) {
    if (!seen.has(e.from)) errors.push({ line: 0, message: `Edge references unknown node “${e.from}”.` })
    if (!seen.has(e.to)) errors.push({ line: 0, message: `Edge references unknown node “${e.to}”.` })
  }

  return { nodes, edges, errors }
}
