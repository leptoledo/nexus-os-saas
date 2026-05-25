import { create } from 'zustand'
import type { Notification } from '@/types'
import { notificationsApi } from '@/lib/api'
import { getSupabaseBrowser } from '@/lib/supabase'

interface NotificationsState {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  hasMore: boolean
  page: number
}

interface NotificationsActions {
  fetchNotifications: (reset?: boolean) => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  addNotification: (notification: Notification) => void
  subscribeRealtime: (userId: string, organizationId: string) => () => void
}

type NotificationsStore = NotificationsState & NotificationsActions

export const useNotificationsStore = create<NotificationsStore>()((set, get) => ({
  // State
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  hasMore: true,
  page: 1,

  // Actions
  fetchNotifications: async (reset = false) => {
    const { page, notifications, isLoading, hasMore } = get()
    if (isLoading || (!reset && !hasMore)) return

    const currentPage = reset ? 1 : page
    set({ isLoading: true })

    try {
      const response = await notificationsApi.getNotifications({ page: currentPage })
      const newNotifications = reset
        ? response.data
        : [...notifications, ...response.data]

      set({
        notifications: newNotifications,
        unreadCount: newNotifications.filter((n) => !n.is_read).length,
        hasMore: false, // pagination not supported by current API
        page: currentPage + 1,
      })
    } catch {
      // silent fail
    } finally {
      set({ isLoading: false })
    }
  },

  markRead: async (id) => {
    const { notifications } = get()
    // Optimistic update
    set({
      notifications: notifications.map((n) =>
        n.id === id ? { ...n, is_read: true } : n
      ),
      unreadCount: Math.max(0, get().unreadCount - 1),
    })
    try {
      await notificationsApi.markRead(id)
    } catch {
      // Rollback
      set({
        notifications: notifications,
        unreadCount: notifications.filter((n) => !n.is_read).length,
      })
    }
  },

  markAllRead: async () => {
    const { notifications } = get()
    // Optimistic update
    set({
      notifications: notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    })
    try {
      await notificationsApi.markAllRead()
    } catch {
      // Rollback
      set({
        notifications,
        unreadCount: notifications.filter((n) => !n.is_read).length,
      })
    }
  },

  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }))
  },

  subscribeRealtime: (userId, organizationId) => {
    const supabase = getSupabaseBrowser()
    const { addNotification } = get()

    const channel = supabase
      .channel(`notifications:${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          addNotification(payload.new as Notification)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  },
}))
