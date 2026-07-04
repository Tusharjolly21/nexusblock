import type { Monaco } from '@monaco-editor/react'
import type * as monacoNS from 'monaco-editor'
import { FLOW_SHAPES, FLOW_COLORS } from './flow/lib'
import { parseFlow } from './flow/parse'

export const DSL_LANG = 'nbdsl'

/** Common flowchart icons offered in autocomplete (Eraser "General" set). */
const FLOW_ICONS = [
  'flag', 'file-text', 'check', 'check-square', 'x', 'bug', 'zap', 'package',
  'copy', 'repeat', 'send', 'save', 'search', 'user', 'users', 'clock', 'database',
  'server', 'cloud', 'lock', 'mail', 'bell', 'settings', 'git-branch', 'dollar-sign',
  'alert-triangle', 'play', 'pause', 'download', 'upload', 'excel', 'amazon',
]

/**
 * Register the nexusblock flowchart DSL as a Monaco language: syntax
 * highlighting + context-aware autocomplete (node names, connectors, and the
 * shape / icon / color / label properties). Idempotent.
 */
export function setupDslLanguage(monaco: Monaco) {
  const already = monaco.languages.getLanguages().some((l: { id: string }) => l.id === DSL_LANG)
  if (already) return

  monaco.languages.register({ id: DSL_LANG })

  monaco.languages.setMonarchTokensProvider(DSL_LANG, {
    tokenizer: {
      root: [
        [/(\/\/|#).*$/, 'comment'],
        [/"[^"]*"/, 'string'],
        [/\bdirection\b/, 'keyword'],
        [/-->|<>|--|>|<|-/, 'operator'],
        [/\[/, { token: 'delimiter.square', next: '@props' }],
        [/[{}]/, 'delimiter.curly'],
        [/[A-Za-z0-9_?][\w ?/.-]*/, 'identifier'],
      ],
      props: [
        [/\]/, { token: 'delimiter.square', next: '@pop' }],
        [/\b(shape|icon|color|label|link)\b/, 'attribute.name'],
        [/"[^"]*"/, 'string'],
        [/[:,]/, 'delimiter'],
        [/#[0-9a-fA-F]{3,6}/, 'number'],
        [/[^,:\]]+/, 'attribute.value'],
      ],
    },
  })

  monaco.languages.setLanguageConfiguration(DSL_LANG, {
    comments: { lineComment: '//' },
    brackets: [['[', ']'], ['{', '}']],
    autoClosingPairs: [
      { open: '[', close: ']' },
      { open: '{', close: '}' },
      { open: '"', close: '"' },
    ],
  })

  monaco.languages.registerCompletionItemProvider(DSL_LANG, {
    triggerCharacters: [' ', '[', ':', ',', '>'],
    provideCompletionItems(model: monacoNS.editor.ITextModel, position: monacoNS.Position) {
      const before = model.getLineContent(position.lineNumber).slice(0, position.column - 1)
      const word = model.getWordUntilPosition(position)
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      }
      const list = (items: string[], kind: monacoNS.languages.CompletionItemKind, detail: string) => ({
        suggestions: items.map((label) => ({ label, kind, insertText: label, range, detail })),
      })

      // Inside a [ … ] property block?
      const open = before.lastIndexOf('[')
      const close = before.lastIndexOf(']')
      if (open > close) {
        const seg = before.slice(open + 1)
        const key = /(\w+)\s*:\s*[\w#-]*$/.exec(seg)?.[1]?.toLowerCase()
        if (key === 'shape') return list([...FLOW_SHAPES], monaco.languages.CompletionItemKind.EnumMember, 'shape')
        if (key === 'color') return list(FLOW_COLORS, monaco.languages.CompletionItemKind.Color, 'color')
        if (key === 'icon') return list(FLOW_ICONS, monaco.languages.CompletionItemKind.Value, 'icon')
        // property key position
        return {
          suggestions: ['shape', 'icon', 'color', 'label'].map((k) => ({
            label: k,
            kind: monaco.languages.CompletionItemKind.Property,
            insertText: `${k}: `,
            range,
            detail: 'property',
          })),
        }
      }

      // Outside brackets: suggest existing node names (to build connections).
      const names = [...parseFlow(model.getValue()).nodes.keys()]
      const nameSuggestions = names.map((n) => ({
        label: n,
        kind: monaco.languages.CompletionItemKind.Variable,
        insertText: n,
        range,
        detail: 'node',
      }))
      const snippet = {
        label: 'node [shape, icon]',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: '${1:Name} [shape: ${2:rectangle}, icon: ${3:file-text}]',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range,
        detail: 'new node',
      }
      return { suggestions: [...nameSuggestions, snippet] }
    },
  })
}
