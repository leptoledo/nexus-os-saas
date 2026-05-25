'use client'

import { useEffect, useRef } from 'react'
import { useNotificationsStore } from '@/stores/notifications'
import { useAuthStore } from '@/stores/auth'

export function useRealtimeNotifications() {
  const { user, organization } = useAuthStore()
  const { fetchNotifications, unreadCount, notifications, markRead, markAllRead } =
    useNotificationsStore()
  const unsubscribeRef = useRef<(() => void) | null>(null)

  // Initial fetch
  useEffect(() => {
    if (user && organization) {
      fetchNotifications(true)
    }
  }, [user?.id, organization?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime subscription
  useEffect(() => {
    if (!user || !organization) return

    const { subscribeRealtime } = useNotificationsStore.getState()
    unsubscribeRef.current = subscribeRealtime(user.id, organization.id)

    return () => {
      unsubscribeRef.current?.()
      unsubscribeRef.current = null
    }
  }, [user?.id, organization?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Browser notification permission + native push when tab is hidden
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('Notification' in window)) return

    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Show browser notification when new item arrives
  const latestNotification = notifications[0]
  const prevCountRef = useRef(unreadCount)

  useEffect(() => {
    if (unreadCount > prevCountRef.current && latestNotification && !latestNotification.is_read) {
      if (Notification.permission === 'granted' && document.hidden) {
        const n = new Notification(latestNotification.title, {
          body: latestNotification.body,
          icon: '/icons/icon-192x192.png',
          tag: latestNotification.id,
        })
        n.onclick = () => {
          window.focus()
          if (latestNotification.link) {
            window.location.href = latestNotification.link
          }
          n.close()
        }
      }
    }
    prevCountRef.current = unreadCount
  }, [unreadCount, latestNotification])

  return { unreadCount, notifications, markRead, markAllRead, fetchNotifications }
}
