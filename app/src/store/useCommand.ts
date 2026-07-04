import { create } from 'zustand'

type CommandState = {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
}

/** Global ⌘K command-palette visibility. */
export const useCommand = create<CommandState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}))
