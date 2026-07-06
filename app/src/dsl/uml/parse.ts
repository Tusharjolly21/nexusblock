export type UmlClass = {
  name: string
  icon?: string
  color?: string
  pos?: string
  members: { name: string; type: string }[]
}

export type UmlRelation = {
  fromClass: string
  toClass: string
  type: string
  label?: string
}

export type UmlError = { line: number; message: string }

export function parseUml(src: string): { classes: Map<string, UmlClass>; rels: UmlRelation[]; errors: UmlError[] } {
  const classes = new Map<string, UmlClass>()
  const rels: UmlRelation[] = []
  const errors: UmlError[] = []

  const lines = src.split('\n')
  let currentClass: UmlClass | null = null

  lines.forEach((line, index) => {
    const lineNum = index + 1
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('//')) return

    if (trimmed.startsWith('class ') && trimmed.includes('{')) {
      const match = trimmed.match(/^class\s+([\w-]+)/)
      if (!match) {
        errors.push({ line: lineNum, message: 'Invalid class definition' })
        return
      }
      const name = match[1]
      let icon = ''
      let color = ''
      
      const iconMatch = trimmed.match(/icon:\s*([\w:-]+)/)
      if (iconMatch) icon = iconMatch[1]

      const colorMatch = trimmed.match(/color:\s*([\w-]+)/)
      if (colorMatch) color = colorMatch[1]

      currentClass = { name, icon, color, members: [] }
      classes.set(name, currentClass)
      return
    }

    if (trimmed === '}') {
      currentClass = null
      return
    }

    if (currentClass) {
      const colonIndex = trimmed.indexOf(':')
      if (colonIndex > 0) {
        const namePart = trimmed.substring(0, colonIndex).trim()
        const typePart = trimmed.substring(colonIndex + 1).trim()
        currentClass.members.push({ name: namePart, type: typePart })
      } else {
        currentClass.members.push({ name: trimmed, type: '' })
      }
      return
    }

    const relMatch = trimmed.match(/^([\w-]+)\s*(-->|<|--|\*--|o--|<\|--)\s*([\w-]+)(?:\s*:\s*(.*))?$/)
    if (relMatch) {
      rels.push({
        fromClass: relMatch[1],
        toClass: relMatch[3],
        type: relMatch[2],
        label: relMatch[4] || ''
      })
      return
    }

    errors.push({ line: lineNum, message: `Syntax error: "${trimmed}"` })
  })

  return { classes, rels, errors }
}
