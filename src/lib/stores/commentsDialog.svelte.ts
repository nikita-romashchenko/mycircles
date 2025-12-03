import { writable } from 'svelte/store'

interface CommentsDialogState {
  open: boolean
  postId: string | null
}

function createCommentsDialogStore() {
  const { subscribe, set, update } = writable<CommentsDialogState>({
    open: false,
    postId: null
  })

  return {
    subscribe,
    open: (postId: string) => {
      set({ open: true, postId })
    },
    close: () => {
      set({ open: false, postId: null })
    }
  }
}

export const commentsDialog = createCommentsDialogStore()
