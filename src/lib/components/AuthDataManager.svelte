<script lang="ts">
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { storeAuthData, clearAuthData, getAuthData } from '$lib/utils/authStorage';

  // Watch for session changes
  $: session = $page.data.session;

  onMount(() => {
    if (!session?.user && browser) {
      // Clear stored data when session is gone
      clearAuthData();
    }
  });

  async function fetchPrivateKey() {
    try {
      const response = await fetch('/api/auth/private-key');
      if (!response.ok) {
        console.error('Failed to fetch private key:', response.statusText);
        return;
      }

      const data = await response.json();
      if (data.privateKey && data.safeAddress) {
        storeAuthData({
          sessionType: 'oauth2',
          privateKey: data.privateKey,
          safeAddress: data.safeAddress
        });
        console.log('Private key stored successfully');
      }
    } catch (error) {
      console.error('Error fetching private key:', error);
    }
  }

  // Reactive statement to handle session changes
  $: if (browser && session?.user) {
    const { safeAddress, sessionType } = session.user;
    console.log(sessionType)

    // If sessionType is oauth2, store or fetch data as needed
    if (sessionType === 'oauth2' && safeAddress) {
      const storedData = getAuthData();

      // If we don't have stored data, fetch the private key
      if (!storedData?.safeAddress && !storedData?.privateKey) {
        fetchPrivateKey();
      }
      // If we have partial data (e.g., only safeAddress but no privateKey), update it
      else if (storedData?.safeAddress !== safeAddress) {
        storeAuthData({
          sessionType: 'oauth2',
          safeAddress: safeAddress,
          privateKey: storedData?.privateKey
        });
      }
    }
  }

  $: if (browser && !session?.user) {
    clearAuthData();
  }
</script>

<!-- This component doesn't render anything, it just manages auth data storage -->