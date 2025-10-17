<script lang="ts">
  import { invalidate } from "$app/navigation"
  import * as Card from "$lib/components/ui/card/index"
  import * as Carousel from "$lib/components/ui/carousel/index"
  import { Button } from "$lib/components/ui/button"
  import { theme } from "svelte-lexical/dist/themes/default"
  import CaptionViewer from "$lib/components/blocks/svelte-lexical/caption-editor/caption-viewer.svelte"
  import ArrowUp from "@lucide/svelte/icons/arrow-up"
  import ArrowDown from "@lucide/svelte/icons/arrow-down"

  import type { Post } from "$lib/types"

  interface Props {
    post: Post
    showActions?: boolean
    onVote: (postId: string, type: "upVote" | "downVote") => Promise<void>
  }

  let { post, showActions = true, onVote }: Props = $props()

  let liked = $state(post.isLiked)
  let likesCount = $state(post.likesCount)
  const handleInteraction = async (type: "upVote" | "downVote") => {
    onVote(post._id, type)
  }

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
  <Card.Root class="p-0 overflow-hidden w-full">
    <Card.Content class="p-0">
      {#if post.type === "image"}
        {#if mainMedia}
          <a href="/{post.userId.safeAddress}/p/{post._id}">
            <img
              class="w-full cursor-pointer object-cover"
              src={mainMedia.url}
              alt={post.caption ?? "Post image"}
              loading="lazy"
            />
          </a>
        {/if}
      {:else if post.type === "album"}
        <Carousel.Root opts={{ loop: true }} class="mx-auto w-full relative ">
          <Carousel.Content class="">
            {#each post.mediaItems as m}
              <Carousel.Item class="">
                <a href="/{post.userId.safeAddress}/p/{post._id}">
                  <img
                    class="w-full object-cover cursor-pointer"
                    src={m.url}
                    alt={post.caption ?? "Album image"}
                    loading="lazy"
                  />
                </a>
              </Carousel.Item>
            {/each}
          </Carousel.Content>
          <Carousel.Previous
            class="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1 z-10"
          />
          <Carousel.Next
            class="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1 z-10"
          />
        </Carousel.Root>
      {/if}
    </Card.Content>
    <Card.Header class="flex flex-col gap-2">
      {#if post.postedTo}
        <span class="text-sm text-gray-500">posted by</span>
      {/if}
      <a
        href="/{post.userId.safeAddress}"
        class="flex flex-row items-center gap-2"
      >
        <img
          src={"https://picsum.photos/200"}
          alt={`${post.userId.username ?? post.userId.name}'s avatar`}
          class="w-12 h-12 rounded-full object-cover"
        />
        <div class="flex flex-col">
          <Card.Title>{post.userId.name}</Card.Title>
          <Card.Description>@{post.userId.username}</Card.Description>
        </div>
      </a>
      {#if post.caption}
        <CaptionViewer {theme} captionJSONstring={post.caption} />
      {/if}
    </Card.Header>
    <Card.Footer
      class="flex justify-between items-center px-3 py-2 text-gray-500 text-sm"
    >
      <div class="flex flex-row gap-1">
        <Button
          variant={"outline"}
          onclick={() => handleInteraction("downVote")}><ArrowDown /></Button
        >
        <Button variant={"outline"} onclick={() => handleInteraction("upVote")}
          ><ArrowUp /></Button
        >
      </div>
      <!-- {#if liked}
        <Button onclick={handleLike}>Liked</Button>
      {:else}
        <Button variant={"outline"} onclick={handleLike}>Like</Button>
      {/if} -->

      <!-- <span>{likesCount} {likesCount > 1 ? "likes" : "like"}</span> -->
      <span>{new Date(post.createdAt).toLocaleDateString()}</span>
    </Card.Footer>
  </Card.Root>
{/if}
