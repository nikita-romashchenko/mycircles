import { writable } from "svelte/store"

export const unreadNotificationsCount = writable(0)

export async function fetchUnreadCount() {
  try {
    const response = await fetch("/api/notifications/unread-count")
    const data = await response.json()
    if (response.ok) {
      unreadNotificationsCount.set(data.count)
    }
  } catch (err) {
    console.error("Error fetching unread count:", err)
  }
}
