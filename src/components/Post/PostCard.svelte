<script lang="ts">
  import { invalidate } from "$app/navigation"
  import * as Card from "$lib/components/ui/card/index"
  import * as Carousel from "$lib/components/ui/carousel/index"
  import type { Post } from "$lib/types"

  interface Props {
    post: Post
    showActions?: boolean
  }

  let { post, showActions = true }: Props = $props()

  let liked = $state(post.isLiked)
  let likesCount = $state(post.likesCount)

  async function handleLike() {
    if (!liked) {
      try {
        await fetch("/api/interactions/like", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId: post._id }),
        })
      } catch (err) {
        console.error("Error liking post", err)
      }
      likesCount += 1

      //invalidate("like")
    } else {
      try {
        await fetch("/api/interactions/like", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId: post._id }),
        })
      } catch (err) {
        console.error("Error unliking post", err)
      }

      likesCount -= 1
      //invalidate("like")
    }

    liked = !liked
  }

  let mainMedia = $derived(post?.mediaItems?.[0])
</script>

{#if post}
  <Card.Root class="p-0 overflow-hidden">
    <Card.Content class="p-0">
      {#if post.type === "image"}
        {#if mainMedia}
          <a href="/{post.userId?._id}/p/{post._id}">
            <img
              class="w-full cursor-pointer object-cover"
              src={mainMedia.url}
              alt={post.caption ?? "Post image"}
              loading="lazy"
            />
          </a>
        {/if}
      {:else if post.type === "album"}
        <Carousel.Root class="w-full max-w-xs">
          <Carousel.Content>
            {#each post.mediaItems as m}
              <Carousel.Item>
                <a href="/{post.userId?._id}/p/{post._id}">
                  <img
                    class="w-full h-32 object-cover cursor-pointer"
                    src={m.url}
                    alt={post.caption ?? "Album image"}
                    loading="lazy"
                  />
                </a>
              </Carousel.Item>
            {/each}
          </Carousel.Content>
          <Carousel.Previous />
          <Carousel.Next />
        </Carousel.Root>
      {/if}
    </Card.Content>
    <Card.Header class="flex flex-row">
      <img
        src={"https://picsum.photos/200"}
        alt={`${post.userId?.username ?? post.userId?.name}'s avatar`}
        class="w-12 h-12 rounded-full object-cover"
      />
      <div class="flex flex-col">
        <Card.Title>{post.userId?.name}</Card.Title>
        <Card.Description>@{post.userId?.username}</Card.Description>
      </div>
    </Card.Header>
    <Card.Footer
      class="flex justify-between items-center px-3 py-2 text-gray-500 text-sm"
    >
      {#if liked}
        <button
          onclick={handleLike}
          class="flex items-center gap-1 rounded-md bg-red-500 text-white hover:bg-red-400 px-3 py-1 cursor-pointer"
        >
          Liked
        </button>
      {:else}
        <button
          onclick={handleLike}
          class="flex items-center gap-1 rounded-md border-2 border-red-500 text-red-500 hover:border-red-400 hover:text-red-400 px-3 py-1 cursor-pointer"
        >
          Like
        </button>{/if}

      <span>{likesCount} {likesCount > 1 ? "likes" : "like"}</span>
      <span>{new Date(post.createdAt).toLocaleDateString()}</span>
    </Card.Footer>
  </Card.Root>
{/if}
