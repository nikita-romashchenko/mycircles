<script lang="ts">
  import { onMount } from "svelte"
  import { goto } from "$app/navigation"
  import { unreadNotificationsCount } from "$lib/stores/notifications.svelte"
  import { DEFAULT_NOTIFICATION_LIMIT } from "$lib/constants"

  interface Notification {
    _id: string
    recipientId: string
    senderId?: string
    type: string
    postId?: string
    message?: string
    read: boolean
    createdAt: string
  }

  let notifications = $state<Notification[]>([])
  let loading = $state(false)
  let initialLoading = $state(true)
  let allLoaded = $state(false)

  let skip = $derived(notifications.length)

  async function fetchNotifications() {
    try {
      const response = await fetch(
        `/api/notifications?skip=0&limit=${DEFAULT_NOTIFICATION_LIMIT}`,
      )
      const data = await response.json()

      if (response.ok) {
        notifications = data.notifications
        if (data.notifications.length < DEFAULT_NOTIFICATION_LIMIT) {
          allLoaded = true
        }
      } else {
        console.error("Failed to fetch notifications:", data.error)
      }
    } catch (err) {
      console.error("Error fetching notifications:", err)
    } finally {
      initialLoading = false
    }
  }

  async function loadMore() {
    if (loading) return
    loading = true

    console.log(
      "Loading more notifications, skip:",
      skip,
      "limit:",
      DEFAULT_NOTIFICATION_LIMIT,
    )

    try {
      const response = await fetch(
        `/api/notifications?skip=${skip}&limit=${DEFAULT_NOTIFICATION_LIMIT}`,
      )
      const data = await response.json()

      console.log("Loaded notifications:", data.notifications.length)

      if (!response.ok || !data.notifications.length) {
        allLoaded = true
        console.log("No more notifications to load")
      } else {
        // Deduplicate notifications by _id
        const existingIds = new Set(notifications.map((n) => n._id))
        const newNotifications = data.notifications.filter(
          (n) => !existingIds.has(n._id),
        )
        notifications = [...notifications, ...newNotifications]
        allLoaded = false
        console.log(
          "Loaded more notifications, total now:",
          notifications.length,
        )
      }
    } catch (err) {
      console.error("Error loading more notifications:", err)
    } finally {
      loading = false
    }
  }

  let sentinel = $state<HTMLDivElement>()

  onMount(() => {
    console.log("onMount - fetching notifications")
    fetchNotifications()
  })

  $effect(() => {
    console.log("$effect running, sentinel:", !!sentinel)
    if (!sentinel) return

    console.log("Setting up IntersectionObserver")
    const observer = new IntersectionObserver(
      ([entry]) => {
        console.log("Sentinel intersecting:", entry.isIntersecting)
        if (entry.isIntersecting) {
          console.log("Calling loadMore()")
          loadMore()
        }
      },
      { rootMargin: "200px" },
    )

    observer.observe(sentinel)

    return () => {
      console.log("Cleaning up observer")
      observer.disconnect()
    }
  })

  async function markAsRead(notificationId: string) {
    try {
      const response = await fetch("/api/notifications/read", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notificationId }),
      })

      if (response.ok) {
        // Update the notification in the list
        notifications = notifications.map((n) =>
          n._id === notificationId ? { ...n, read: true } : n,
        )
        // Update the store
        unreadNotificationsCount.update((count) => Math.max(0, count - 1))
      }
    } catch (err) {
      console.error("Error marking notification as read:", err)
    }
  }

  async function markAllAsRead() {
    try {
      const response = await fetch("/api/notifications/read-all", {
        method: "PUT",
      })

      if (response.ok) {
        // Update all notifications in the list
        notifications = notifications.map((n) => ({ ...n, read: true }))
        // Update the store
        unreadNotificationsCount.set(0)
      }
    } catch (err) {
      console.error("Error marking all notifications as read:", err)
    }
  }

  function handleNotificationClick(notification: Notification) {
    if (!notification.read) {
      markAsRead(notification._id)
    }

    if (notification.postId) {
      goto(`/post/${notification.postId}`)
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString()
  }

  function getNotificationMessage(notification: Notification) {
    if (notification.message) return notification.message

    // Fallback based on type
    switch (notification.type) {
      case "post_on_profile":
        return "Someone posted on your profile"
      case "vote":
        return "Someone voted on your post"
      default:
        return "New notification"
    }
  }
</script>

<main class="flex-1 max-w-4xl mx-auto p-4">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-3xl font-bold">Notifications</h1>
    {#if notifications.some((n) => !n.read)}
      <button
        on:click={markAllAsRead}
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
      >
        Mark all as read
      </button>
    {/if}
  </div>

  {#if initialLoading}
    <p class="text-gray-500">Loading notifications...</p>
  {:else if notifications.length === 0}
    <p class="text-gray-500">No notifications yet.</p>
  {:else}
    <div>
      {#each notifications as notification}
        <button
          on:click={() => handleNotificationClick(notification)}
          class="w-full text-left p-4 rounded-lg border transition cursor-pointer mb-4 {notification.read
            ? 'bg-gray-100 border-gray-200'
            : 'bg-white border-blue-200 hover:border-blue-300'}"
        >
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <p
                class="font-medium {notification.read
                  ? 'text-gray-600'
                  : 'text-gray-900'}"
              >
                {getNotificationMessage(notification)}
              </p>
              <p class="text-sm text-gray-500 mt-1">
                {formatDate(notification.createdAt)}
              </p>
            </div>
            {#if !notification.read}
              <div class="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
            {/if}
          </div>
        </button>
      {/each}
    </div>

    {#if loading}
      <p class="text-center mt-4 text-gray-500">Loading...</p>
    {/if}

    {#if allLoaded}
      <p class="text-center mt-4 text-gray-500">No more notifications</p>
    {/if}
  {/if}

  <div bind:this={sentinel} class="h-8"></div>
</main>
