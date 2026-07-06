#!/usr/bin/env node

/**
 * DrawDocs Developer MCP Server & Local Sync CLI.
 * 
 * Functions:
 * 1. JSON-RPC 2.0 Stdio Model Context Protocol (MCP) server for local AI agents.
 * 2. Bidirectional local directory sync over WebSockets (port 8788).
 * 3. Codebase reverse engineering (Docker Compose & Prisma schema parser).
 */

import fs from 'fs'
import path from 'path'
import { WebSocketServer } from 'ws'
import readline from 'readline'

const DIAGRAMS_DIR = path.resolve(process.cwd(), 'diagrams')
if (!fs.existsSync(DIAGRAMS_DIR)) {
  fs.mkdirSync(DIAGRAMS_DIR, { recursive: true })
}

// -----------------------------------------------------------------------------
// 1. Bidirectional WebSocket File Watcher (Port 8788)
// -----------------------------------------------------------------------------
const wss = new WebSocketServer({
  port: 8788,
  verifyClient: (info, callback) => {
    const origin = info.origin || info.req.headers.origin || ''
    const allowed = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4173']
    if (
      allowed.includes(origin) ||
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:') ||
      !origin // Allow non-browser CLI connections (curls, MCP client tools)
    ) {
      callback(true)
    } else {
      console.error(`[Security] Rejected connection from unauthorized origin: ${origin}`)
      callback(false, 403, 'Forbidden')
    }
  }
})
let frontendSocket = null

wss.on('connection', (ws) => {
  frontendSocket = ws
  console.error('[Sync] Frontend client connected.')

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString())
      if (msg.type === 'update') {
        const ext = msg.dslType === 'erd' ? 'nberd' : msg.dslType === 'sequence' ? 'nbseq' : 'nbdsl'
        const filepath = path.join(DIAGRAMS_DIR, `local_sync_${msg.dslType}.${ext}`)
        
        // Temporarily disable fs watch to avoid echoing back the change
        disableWatch = true
        fs.writeFileSync(filepath, msg.dsl || '', 'utf-8')
        setTimeout(() => { disableWatch = false }, 100)
        
        console.error(`[Sync] Written frontend updates back to: diagrams/local_sync_${msg.dslType}.${ext}`)
      }
    } catch (err) {
      console.error('[Sync] Failed to process message from client:', err)
    }
  })

  ws.on('close', () => {
    frontendSocket = null
    console.error('[Sync] Frontend client disconnected.')
  })
})

console.error('[Sync] Bidirectional Sync Web Server listening on ws://localhost:8788')

// FS Directory Watcher
let disableWatch = false
fs.watch(DIAGRAMS_DIR, (event, filename) => {
  if (disableWatch || !filename || !frontendSocket) return

  const ext = path.extname(filename)
  let dslType = null
  if (ext === '.nbdsl') dslType = 'flow'
  else if (ext === '.nberd') dslType = 'erd'
  else if (ext === '.nbseq') dslType = 'sequence'

  if (!dslType) return

  const filepath = path.join(DIAGRAMS_DIR, filename)
  if (!fs.existsSync(filepath)) return

  try {
    const content = fs.readFileSync(filepath, 'utf-8')
    frontendSocket.send(JSON.stringify({
      type: 'update',
      dslType,
      dsl: content,
      filename
    }))
    console.error(`[Sync] Broadcast file updates from local disk: ${filename}`)
  } catch (err) {
    console.error(`[Sync] Error reading file: ${filename}`, err)
  }
})

// -----------------------------------------------------------------------------
// 2. Codebase Reverse-Engineering (Auto-Diagramming CLI)
// -----------------------------------------------------------------------------
function reverseEngineerCodebase() {
  const result = []

  // Prisma Schema parsing
  const prismaPath = path.resolve(process.cwd(), 'prisma/schema.prisma')
  if (fs.existsSync(prismaPath)) {
    try {
      const content = fs.readFileSync(prismaPath, 'utf-8')
      const erdDsl = parsePrismaToErd(content)
      const filepath = path.join(DIAGRAMS_DIR, 'auto_generated_database.nberd')
      fs.writeFileSync(filepath, erdDsl, 'utf-8')
      result.push({ file: 'auto_generated_database.nberd', type: 'erd', source: 'prisma/schema.prisma' })
    } catch (err) {
      console.error('[Reverse] Failed to parse Prisma schema:', err)
    }
  }

  // Docker Compose parsing
  let composePath = path.resolve(process.cwd(), 'docker-compose.yml')
  if (!fs.existsSync(composePath)) {
    composePath = path.resolve(process.cwd(), 'docker-compose.yaml')
  }

  if (fs.existsSync(composePath)) {
    try {
      const content = fs.readFileSync(composePath, 'utf-8')
      const flowDsl = parseDockerComposeToFlow(content)
      const filepath = path.join(DIAGRAMS_DIR, 'auto_generated_architecture.nbdsl')
      fs.writeFileSync(filepath, flowDsl, 'utf-8')
      result.push({ file: 'auto_generated_architecture.nbdsl', type: 'flow', source: composePath })
    } catch (err) {
      console.error('[Reverse] Failed to parse Docker Compose:', err)
    }
  }

  return result
}

function parsePrismaToErd(content) {
  const models = []
  const modelRegex = /model\s+(\w+)\s*\{([\s\S]*?)\}/g
  let match
  while ((match = modelRegex.exec(content)) !== null) {
    const name = match[1]
    const body = match[2]
    const fields = []
    const lines = body.split('\n')
    for (let line of lines) {
      line = line.trim()
      if (!line || line.startsWith('//') || line.startsWith('@@')) continue
      const parts = line.split(/\s+/)
      const fieldName = parts[0]
      const fieldType = parts[1]
      if (!fieldName || !fieldType) continue
      const isPk = line.includes('@id')
      fields.push({ name: fieldName, type: fieldType, pk: isPk })
    }
    models.push({ name, fields })
  }

  let dsl = `// Auto-generated ERD from Prisma Schema\n\n`
  for (const m of models) {
    dsl += `${m.name.toLowerCase()} [icon: table, color: blue] {\n`
    for (const f of m.fields) {
      dsl += `  ${f.name} ${f.type.toLowerCase().replace('?', '')}${f.pk ? ' pk' : ''}\n`
    }
    dsl += `}\n\n`
  }
  return dsl
}

function parseDockerComposeToFlow(content) {
  const services = []
  const lines = content.split('\n')
  let currentService = null
  let state = 'root'
  let indentSize = 0

  for (let line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const matchIndent = line.match(/^(\s*)/)
    const indent = matchIndent ? matchIndent[1].length : 0

    if (trimmed === 'services:') {
      state = 'services'
      indentSize = indent
      continue
    }

    if (state === 'services') {
      const serviceMatch = trimmed.match(/^([\w-]+)\s*:/)
      if (serviceMatch && indent > indentSize) {
        currentService = {
          name: serviceMatch[1],
          image: '',
          depends_on: []
        }
        services.push(currentService)
      } else if (currentService && indent > indentSize + 2) {
        if (trimmed.startsWith('image:')) {
          currentService.image = trimmed.replace('image:', '').trim()
        }
      }
    }
  }

  let dsl = `// Auto-generated architecture from Docker Compose\ndirection right\n\n`
  for (const s of services) {
    let icon = 'server'
    let color = 'green'
    let shape = 'rectangle'

    if (s.name.includes('db') || s.name.includes('postgres') || s.image.includes('postgres')) {
      icon = 'logos:postgresql'
      color = 'blue'
      shape = 'cylinder'
    } else if (s.name.includes('redis') || s.image.includes('redis')) {
      icon = 'logos:redis'
      color = 'red'
      shape = 'cylinder'
    } else if (s.name.includes('kafka') || s.image.includes('kafka')) {
      icon = 'logos:kafka-icon'
      color = 'pink'
      shape = 'cylinder'
    } else if (s.name.includes('mongo') || s.image.includes('mongo')) {
      icon = 'logos:mongodb'
      color = 'green'
      shape = 'cylinder'
    } else if (s.name.includes('rabbitmq') || s.image.includes('rabbitmq')) {
      icon = 'logos:rabbitmq-icon'
      color = 'orange'
      shape = 'cylinder'
    }

    dsl += `"${s.name}" [icon: "${icon}", color: ${color}, shape: ${shape}]\n`
  }

  dsl += `\n`
  const names = services.map(s => s.name)
  for (const s of services) {
    if (s.name === 'web' || s.name === 'app' || s.name === 'api' || s.name === 'server') {
      for (const other of names) {
        if (other !== s.name && (other.includes('db') || other.includes('redis') || other.includes('postgres') || other.includes('kafka') || other.includes('broker') || other.includes('cache'))) {
          dsl += `"${s.name}" > "${other}"\n`
        }
      }
    }
  }
  return dsl
}

// -----------------------------------------------------------------------------
// 3. Stdio Model Context Protocol (MCP) JSON-RPC 2.0 Implementation
// -----------------------------------------------------------------------------
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
})

rl.on('line', (line) => {
  if (!line.trim()) return
  try {
    const request = JSON.parse(line)
    handleMcpRequest(request)
  } catch (err) {
    sendMcpError(null, -32700, 'Parse error')
  }
})

function sendMcpResponse(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n')
}

function sendMcpError(id, code, message) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n')
}

function handleMcpRequest(req) {
  const { id, method, params } = req

  switch (method) {
    case 'initialize':
      return sendMcpResponse(id, {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: 'drawdocs-mcp',
          version: '1.0.0'
        }
      })

    case 'tools/list':
      return sendMcpResponse(id, {
        tools: [
          {
            name: 'list_diagrams',
            description: 'List all text-based DrawDocs diagrams in the workspace diagrams/ folder.',
            inputSchema: { type: 'object', properties: {} }
          },
          {
            name: 'read_diagram',
            description: 'Read the DSL source code content of a specific diagram file.',
            inputSchema: {
              type: 'object',
              properties: {
                filename: { type: 'string', description: 'The file name to read (e.g. payment.nbdsl).' }
              },
              required: ['filename']
            }
          },
          {
            name: 'write_diagram',
            description: 'Create or overwrite a diagram file in the local diagrams/ directory. This immediately updates the canvas on the screen.',
            inputSchema: {
              type: 'object',
              properties: {
                filename: { type: 'string', description: 'The file name to write (e.g. billing.nberd).' },
                dsl: { type: 'string', description: 'The nexusblock DSL code content.' }
              },
              required: ['filename', 'dsl']
            }
          },
          {
            name: 'generate_diagram_from_code',
            description: 'Scan the workspace codebase (e.g. Prisma schemas, Docker Compose configuration) and auto-generate flowcharts or ERD diagrams.',
            inputSchema: { type: 'object', properties: {} }
          }
        ]
      })

    case 'tools/call': {
      const { name, arguments: args } = params || {}
      return executeTool(id, name, args)
    }

    default:
      return sendMcpError(id, -32601, 'Method not found')
  }
}

function executeTool(id, name, args) {
  switch (name) {
    case 'list_diagrams': {
      try {
        const files = fs.readdirSync(DIAGRAMS_DIR).filter(
          (f) => f.endsWith('.nbdsl') || f.endsWith('.nberd') || f.endsWith('.nbseq')
        )
        return sendMcpResponse(id, { content: [{ type: 'text', text: JSON.stringify(files, null, 2) }] })
      } catch (err) {
        return sendMcpResponse(id, { content: [{ type: 'text', text: `Failed to list diagrams: ${err.message}` }] })
      }
    }

    case 'read_diagram': {
      const filename = args?.filename
      if (!filename) return sendMcpError(id, -32602, 'Invalid params: filename is required')
      const filepath = path.join(DIAGRAMS_DIR, path.basename(filename))
      if (!fs.existsSync(filepath)) {
        return sendMcpResponse(id, { content: [{ type: 'text', text: `Error: File ${filename} not found in diagrams/ folder.` }] })
      }
      try {
        const content = fs.readFileSync(filepath, 'utf-8')
        return sendMcpResponse(id, { content: [{ type: 'text', text: content }] })
      } catch (err) {
        return sendMcpResponse(id, { content: [{ type: 'text', text: `Failed to read diagram: ${err.message}` }] })
      }
    }

    case 'write_diagram': {
      const filename = args?.filename
      const dsl = args?.dsl
      if (!filename || dsl === undefined) return sendMcpError(id, -32602, 'Invalid params: filename and dsl are required')
      const filepath = path.join(DIAGRAMS_DIR, path.basename(filename))
      try {
        fs.writeFileSync(filepath, dsl, 'utf-8')

        // If local sync websocket is alive, also broadcast it immediately to the browser
        if (frontendSocket) {
          const ext = path.extname(filename)
          let dslType = null
          if (ext === '.nbdsl') dslType = 'flow'
          else if (ext === '.nberd') dslType = 'erd'
          else if (ext === '.nbseq') dslType = 'sequence'

          if (dslType) {
            frontendSocket.send(JSON.stringify({ type: 'update', dslType, dsl, filename }))
          }
        }

        return sendMcpResponse(id, { content: [{ type: 'text', text: `Successfully wrote diagram: diagrams/${filename}. Live sync triggered.` }] })
      } catch (err) {
        return sendMcpResponse(id, { content: [{ type: 'text', text: `Failed to write diagram: ${err.message}` }] })
      }
    }

    case 'generate_diagram_from_code': {
      try {
        const generated = reverseEngineerCodebase()
        if (generated.length === 0) {
          return sendMcpResponse(id, { content: [{ type: 'text', text: 'No Docker Compose or Prisma schema files found. No diagrams generated.' }] })
        }
        return sendMcpResponse(id, { content: [{ type: 'text', text: `Auto-generated ${generated.length} diagrams from codebase:\n${JSON.stringify(generated, null, 2)}` }] })
      } catch (err) {
        return sendMcpResponse(id, { content: [{ type: 'text', text: `Auto-generation failed: ${err.message}` }] })
      }
    }

    default:
      return sendMcpError(id, -32601, 'Tool not found')
  }
}

if (process.argv.includes('generate') || process.argv.includes('--generate')) {
  try {
    const generated = reverseEngineerCodebase()
    console.log(`[CLI] Successfully generated diagrams: ${JSON.stringify(generated, null, 2)}`)
  } catch (err) {
    console.error(`[CLI] Generation failed: ${err.message}`)
  }
  process.exit(0)
}

