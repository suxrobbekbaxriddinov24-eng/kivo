import { create } from 'zustand'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  description?: string
}

interface UIState {
  sidebarOpen: boolean
  toasts: Toast[]

  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  toasts: [],

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  addToast: (toast) => {
    const id = Math.random().toString(36).slice(2)
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 4000)
  },

  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

/** Convenience helpers */
export const toast = {
  success: (title: string, description?: string) =>
    useUIStore.getState().addToast({ type: 'success', title, description }),
  error: (title: string, description?: string) =>
    useUIStore.getState().addToast({ type: 'error', title, description }),
  warning: (title: string, description?: string) =>
    useUIStore.getState().addToast({ type: 'warning', title, description }),
  info: (title: string, description?: string) =>
    useUIStore.getState().addToast({ type: 'info', title, description }),
}
