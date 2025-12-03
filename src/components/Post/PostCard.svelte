<script lang="ts">
  import { invalidate, goto } from "$app/navigation"
  import * as Card from "$lib/components/ui/card/index"
  import * as Carousel from "$lib/components/ui/carousel/index"
  import { theme } from "svelte-lexical/dist/themes/default"
  import CaptionViewer from "$lib/components/blocks/svelte-lexical/caption-editor/caption-viewer.svelte"
  import ArrowRight from "@lucide/svelte/icons/arrow-right"
  import * as Avatar from "$lib/components/ui/avatar/index"
  import ImageIcon from "@lucide/svelte/icons/image"

  import type { CirclesRpcProfile, Post } from "$lib/types"
  import { onMount } from "svelte"

  interface Props {
    post: Post
    showActions?: boolean
  }

  let { post, showActions = true }: Props = $props()

  let liked = $state(post.isLiked)
  let likesCount = $state(post.likesCount)

  let loading = $state(true)
  let circlesProfiles: (CirclesRpcProfile | null)[] = $state([])

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

  async function fetchData() {
    try {
      const response = await fetch("/api/circles/batchProfiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          addresses: [post.creatorAddress, post.postedToAddress ?? null],
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to fetch profiles")
      }

      const data = await response.json()
      circlesProfiles = data.profiles
      console.log("Fetched profiles:", circlesProfiles)
    } catch (e: any) {
      console.error(e.message)
    } finally {
      loading = false
    }
  }

  onMount(() => {
    fetchData()
  })

  let mainMedia = $derived(post?.mediaItems?.[0])
</script>

{#if post}
  <Card.Root
    class="p-0 overflow-hidden w-full border-0 shadow-[0_2px_4px_rgba(0,0,0,0.08)] cursor-pointer"
    onclick={() => goto(`/post/${post._id}`)}
  >
    <Card.Content class="p-0">
      {#if post.type === "image"}
        {#if mainMedia}
          <a href="/post/{post._id}">
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
                <a href="/post/{post._id}">
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
      <div class="flex flex-col gap-1">
        <div class="flex flex-row gap-1 items-center">
          <a
            href="/{post.creatorAddress}"
            class="flex flex-row items-center gap-2"
          >
            <Avatar.Root class="w-10 h-10 rounded-full">
              <Avatar.Fallback>
                <ImageIcon class="w-5 h-5" />
              </Avatar.Fallback>
              <Avatar.Image
                src={circlesProfiles[0]?.previewImageUrl}
                alt={`${circlesProfiles[0]?.name}'s avatar`}
                class="rounded-full object-cover"
              />
            </Avatar.Root>
            <div class="flex flex-col">
              <Card.Title>@{circlesProfiles[0]?.name}</Card.Title>
            </div>
          </a>
          {#if post.postedToAddress}
            <ArrowRight class="w-4 h-4 text-gray-400" />
            <a
              href="/{post.postedToAddress}"
              class="flex flex-row items-center gap-2"
            >
              <Avatar.Root class="w-10 h-10 rounded-full">
                <Avatar.Fallback>
                  <ImageIcon class="w-5 h-5" />
                </Avatar.Fallback>
                <Avatar.Image
                  src={circlesProfiles[1]?.previewImageUrl}
                  alt={`${circlesProfiles[1]?.name}'s avatar`}
                  class="rounded-full object-cover"
                />
              </Avatar.Root>
              <div class="flex flex-col">
                <Card.Title>@{circlesProfiles[1]?.name}</Card.Title>
              </div>
            </a>
          {/if}
        </div>

        {#if post.postedTo}
          <!-- <span class="text-sm text-gray-500 ml-14">
            posted on <a
              href="/{post.postedTo.safeAddress}"
              class="font-semibold text-gray-700 hover:underline"
              >@{post.postedTo.username}</a
            > profile
          </span> -->
        {/if}
      </div>
      {#if post.caption}
        <CaptionViewer {theme} captionJSONstring={post.caption} />
      {/if}
    </Card.Header>
    <Card.Footer
      class="flex justify-between items-center px-3 py-2 text-gray-400 text-xs"
    >
      <span>{new Date(post.createdAt).toLocaleDateString()}</span>
    </Card.Footer>
  </Card.Root>
{/if}
