<script lang="ts">
  import Map from "$lib/components/Map.svelte"
  import { onMount } from "svelte"
  import type { CirclesRpcProfile } from "$lib/types"

  // Hardcoded test users with coordinates
  const testLocations = [
    {
      address: "0x46fabde21a679dad20ca572fe2de62fccd02e96c",
      lat: 52.4932679,
      lng: 13.4282732,
    },
    {
      address: "0xf3f59984a5bab94938a44229f3ee6f6d2d8e2cbe",
      lat: 52.495101,
      lng: 13.4322144,
    },
  ]

  let users = $state<Array<{
    address: string
    lat: number
    lng: number
    profile: CirclesRpcProfile | null
  }>>([])
  let loading = $state(true)

  onMount(async () => {
    try {
      // Fetch profiles for the hardcoded addresses
      const addresses = testLocations.map(loc => loc.address)
      const res = await fetch('/api/circles/batchProfiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresses })
      })

      const data = await res.json()

      // Combine location data with profile data
      users = testLocations.map((loc, index) => ({
        ...loc,
        profile: data.profiles[index]
      }))

      console.log('Loaded users for map:', users)
    } catch (error) {
      console.error('Error loading user profiles for map:', error)
    } finally {
      loading = false
    }
  })
</script>

<div class="w-full h-screen flex flex-col">
  {#if loading}
    <div class="flex items-center justify-center h-full">
      <p class="text-gray-500">Loading map...</p>
    </div>
  {:else}
    <Map {users} height="100%" />
  {/if}
</div>
