<script lang="ts">
  import { onMount } from 'svelte';
  import maplibregl from 'maplibre-gl';
  import 'maplibre-gl/dist/maplibre-gl.css';
  import type { CirclesRpcProfile } from '$lib/types';
  import X from '@lucide/svelte/icons/x';

  // Props for customization
  let {
    initialLat = 52.52,
    initialLng = 13.405,
    initialZoom = 15,
    style = 'https://tiles.openfreemap.org/styles/liberty',
    height = '600px',
    users = [],
  }: {
    initialLat?: number;
    initialLng?: number;
    initialZoom?: number;
    style?: string;
    height?: string;
    users?: Array<{
      address: string;
      lat: number;
      lng: number;
      profile: CirclesRpcProfile | null;
    }>;
  } = $props();

  let mapContainer: HTMLDivElement;
  let map: maplibregl.Map | null = null;
  let selectedUser = $state<typeof users[0] | null>(null);
  let trustScore = $state<string | null>(null);
  let loadingTrust = $state(false);

  onMount(() => {
    // Try to get user's geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Successfully got location - initialize map at user's location
          const userLng = position.coords.longitude;
          const userLat = position.coords.latitude;

          console.log('User location detected:', { lat: userLat, lng: userLng });

          initializeMap(userLng, userLat);
        },
        (error) => {
          // Failed to get location - fall back to default (Berlin)
          console.log('Geolocation denied or failed, using default location (Berlin):', error.message);
          initializeMap(initialLng, initialLat);
        },
        {
          enableHighAccuracy: false, // Use approximate location for speed
          timeout: 5000,
          maximumAge: 300000, // Cache for 5 minutes
        }
      );
    } else {
      // Geolocation not supported - use default
      console.log('Geolocation not supported, using default location (Berlin)');
      initializeMap(initialLng, initialLat);
    }
  });

  function initializeMap(lng: number, lat: number) {
    // Initialize the map
    map = new maplibregl.Map({
      container: mapContainer,
      style: style,
      center: [lng, lat],
      zoom: initialZoom,
    });

    // Add navigation controls (zoom, rotate)
    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Add geolocate control
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        trackUserLocation: true,
      }),
      'top-right'
    );

    // Add scale control
    map.addControl(new maplibregl.ScaleControl(), 'bottom-left');

    // Wait for map to load before adding markers/layers
    map.on('load', () => {
      console.log('Map loaded successfully');
      addUserMarkers();
    });
  }

  async function openUserModal(user: typeof users[0]) {
    selectedUser = user;
    trustScore = null;
    loadingTrust = true;

    // Fetch trust score
    try {
      const res = await fetch(`/api/circles/can-receive?from=${user.address}`);
      if (res.ok) {
        const data = await res.json();
        trustScore = data.maxFlow;
      } else {
        // If RPC error, return zero
        trustScore = '0';
      }
    } catch (err) {
      console.error('Error fetching trust score:', err);
      // If error, return zero
      trustScore = '0';
    } finally {
      loadingTrust = false;
    }
  }

  function closeModal() {
    selectedUser = null;
    trustScore = null;
    loadingTrust = false;
  }

  function addUserMarkers() {
    if (!map || !users || users.length === 0) return;

    console.log('Adding markers for users:', users);

    users.forEach(user => {
      // Create custom marker element
      const markerEl = document.createElement('div');
      markerEl.className = 'custom-map-marker';

      // Create avatar image or placeholder
      const avatarContainer = document.createElement('div');
      avatarContainer.className = 'marker-avatar';

      if (user.profile?.previewImageUrl) {
        const img = document.createElement('img');
        img.src = user.profile.previewImageUrl;
        img.alt = user.profile.name || 'User';
        img.className = 'marker-avatar-img';
        avatarContainer.appendChild(img);
      } else {
        // Placeholder
        avatarContainer.innerHTML = '<div class="marker-avatar-placeholder"></div>';
      }

      markerEl.appendChild(avatarContainer);

      // Add click handler to open modal
      markerEl.addEventListener('click', () => {
        openUserModal(user);
      });

      // Add marker to map with custom element (no popup)
      new maplibregl.Marker({
        element: markerEl,
        anchor: 'center',
      })
        .setLngLat([user.lng, user.lat])
        .addTo(map!);
    });
  }

  // Watch for users prop changes and update markers
  $effect(() => {
    if (map && users && users.length > 0) {
      addUserMarkers();
    }
  });

  // Cleanup function
  onMount(() => {
    return () => {
      map?.remove();
    };
  });
</script>

<div
  bind:this={mapContainer}
  class="map-container"
  style="height: {height}; width: 100%;"
></div>

<!-- Fixed position modal -->
{#if selectedUser}
  <div class="modal-overlay" onclick={closeModal}>
    <div class="modal-content" onclick={(e) => e.stopPropagation()}>
      <button class="modal-close" onclick={closeModal} aria-label="Close">
        <X class="w-5 h-5" />
      </button>

      <div class="map-modal">
        <div class="map-modal-header">
          <div class="map-modal-avatar-large">
            {#if selectedUser.profile?.previewImageUrl}
              <img src={selectedUser.profile.previewImageUrl} alt={selectedUser.profile.name || 'User'} />
            {:else}
              <div class="map-modal-placeholder"></div>
            {/if}
          </div>
        </div>

        <div class="map-modal-body">
          <h2 class="map-modal-name">{selectedUser.profile?.name || 'Anonymous'}</h2>

          <div class="map-modal-trust">
            {#if loadingTrust}
              <p class="text-gray-500 text-sm">Loading trust score...</p>
            {:else if trustScore !== null}
              {@const amountInCrc = (parseFloat(trustScore) / 1e18).toFixed(1)}
              {@const amount = parseFloat(amountInCrc)}
              {@const score = Math.min(amount, 5) /* @dev use 5 for the demo purpose */}
              {@const shadowSpread = Math.round((score / 5) * 10)}
              <div class="trust-score-display">
                <div class="trust-nimbus" style="box-shadow: 0 0 0 {shadowSpread}px rgba(255, 73, 27, 0.3); border: 2px solid #ff491b; border-radius: 50%; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; margin: 0 auto;">
                  <span style="font-size: 24px; font-weight: bold; color: #ff491b;">{amountInCrc}</span>
                </div>
                <p class="text-xs text-gray-500 mt-2">Trust flow: {score.toFixed(0)}</p>
              </div>
            {:else}
              <p class="text-gray-400 text-sm">Trust score unavailable</p>
            {/if}
          </div>

          <p class="map-modal-description">
            {selectedUser.profile?.description || 'No description available'}
          </p>
        </div>

        <div class="map-modal-footer">
          <a href="/{selectedUser.address}" class="map-modal-btn">
            View Full Profile
          </a>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .map-container {
    position: relative;
  }

  /* Customize map controls */
  :global(.maplibregl-ctrl-top-right) {
    top: 10px;
    right: 10px;
  }

  :global(.maplibregl-ctrl-bottom-left) {
    bottom: 10px;
    left: 10px;
  }

  /* Style the attribution */
  :global(.maplibregl-ctrl-attrib) {
    background-color: rgba(255, 255, 255, 0.8);
    font-size: 11px;
  }

  /* Dark mode support for controls */
  @media (prefers-color-scheme: dark) {
    :global(.maplibregl-ctrl-attrib) {
      background-color: rgba(0, 0, 0, 0.8);
      color: white;
    }
  }

  /* Custom marker styles */
  :global(.custom-map-marker) {
    cursor: pointer;
    width: 40px;
    height: 40px;
    position: relative;
    will-change: transform;
    transition: transform 0.2s ease-out;
    transform-origin: center center;
  }

  :global(.custom-map-marker:hover) {
    transform: scale(1.15);
    z-index: 10;
  }

  /* Remove transitions during map movement */
  :global(.maplibregl-marker) {
    transition: none !important;
  }

  :global(.marker-avatar) {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    overflow: hidden;
    border: 3px solid white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
  }

  :global(.marker-avatar-img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  :global(.marker-avatar-placeholder) {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Fixed position modal overlay */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .modal-content {
    position: relative;
    max-width: 480px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    background: white;
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    animation: slideUp 0.3s ease-out;
  }

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .modal-close {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 36px;
    height: 36px;
    border: none;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 50%;
    cursor: pointer;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    color: #6b7280;
    transition: all 0.2s;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .modal-close:hover {
    background: white;
    color: #191568;
    transform: scale(1.1);
  }

  .modal-close :global(svg) {
    flex-shrink: 0;
  }

  .map-modal {
    display: flex;
    flex-direction: column;
    background: white;
  }

  .map-modal-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 24px;
    display: flex;
    justify-content: center;
  }

  .map-modal-avatar-large {
    width: 96px;
    height: 96px;
    border-radius: 50%;
    overflow: hidden;
    border: 4px solid white;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    background: white;
  }

  .map-modal-avatar-large img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .map-modal-placeholder {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #a8b5ff 0%, #9d7bbd 100%);
  }

  .map-modal-body {
    padding: 20px 24px;
    text-align: center;
  }

  .map-modal-name {
    font-size: 20px;
    font-weight: 700;
    color: #191568;
    margin: 0 0 16px 0;
  }

  .map-modal-trust {
    margin: 16px 0;
    padding: 16px;
    background: #f9fafb;
    border-radius: 12px;
  }

  .trust-score-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .trust-nimbus {
    transition: box-shadow 0.3s ease;
  }

  .map-modal-description {
    font-size: 14px;
    color: #6b7280;
    line-height: 1.6;
    margin: 0;
    max-height: 200px;
    overflow-y: auto;
    text-align: left;
  }

  .map-modal-footer {
    padding: 0 24px 24px 24px;
  }

  .map-modal-btn {
    display: block;
    width: 100%;
    padding: 12px 24px;
    background: #191568;
    color: white;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    text-align: center;
    transition: background-color 0.2s;
  }

  .map-modal-btn:hover {
    background: #2a2080;
  }
</style>
