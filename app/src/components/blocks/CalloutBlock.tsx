import { Icon } from '@iconify/react'
import { createReactBlockSpec } from '@blocknote/react'

type Variant = 'info' | 'warn' | 'success' | 'tip'

const VARIANTS: Variant[] = ['info', 'warn', 'success', 'tip']

const STYLE: Record<Variant, { icon: string; border: string; bg: string; fg: string }> = {
  info: { icon: 'lucide:info', border: '#3b82f6', bg: 'rgba(59,130,246,.08)', fg: '#2563eb' },
  warn: { icon: 'lucide:alert-triangle', border: '#f5820e', bg: 'rgba(245,130,14,.08)', fg: '#c2610c' },
  success: { icon: 'lucide:check-circle-2', border: '#30a46c', bg: 'rgba(48,164,108,.08)', fg: '#188050' },
  tip: { icon: 'lucide:lightbulb', border: '#8b5cf6', bg: 'rgba(139,92,246,.08)', fg: '#6d3fd4' },
}

/**
 * A colored callout block (info / warning / success / tip) for the note editor.
 * Click the icon to cycle the variant. Holds inline, editable content.
 */
export const CalloutBlock = createReactBlockSpec(
  {
    type: 'callout',
    propSchema: { variant: { default: 'info' } },
    content: 'inline',
  },
  {
    render: ({ block, editor, contentRef }) => {
      const variant = (VARIANTS.includes(block.props.variant as Variant) ? block.props.variant : 'info') as Variant
      const s = STYLE[variant]
      const cycle = () => {
        const next = VARIANTS[(VARIANTS.indexOf(variant) + 1) % VARIANTS.length]
        editor.updateBlock(block, { props: { variant: next } })
      }
      return (
        <div
          style={{
            display: 'flex',
            gap: 10,
            width: '100%',
            padding: '10px 14px',
            borderRadius: 10,
            border: `1px solid ${s.border}`,
            borderLeft: `4px solid ${s.border}`,
            background: s.bg,
          }}
        >
          <button
            type="button"
            contentEditable={false}
            onClick={cycle}
            title="Change callout style"
            style={{ flex: 'none', marginTop: 2, background: 'none', border: 'none', cursor: 'pointer', color: s.fg, lineHeight: 0 }}
          >
            <Icon icon={s.icon} width={18} height={18} />
          </button>
          <div ref={contentRef} style={{ flex: 1, minWidth: 0 }} />
        </div>
      )
    },
  },
)
