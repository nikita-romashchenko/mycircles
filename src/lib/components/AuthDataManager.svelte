<script lang="ts">
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { storeAuthData, clearAuthData } from '$lib/utils/authStorage';

  // Watch for session changes
  $: session = $page.data.session;

  onMount(() => {
    // Store auth data when session becomes available
    if (session?.user && browser) {
      const { safeAddress, privateKey, sessionType } = session.user;

      if (safeAddress && sessionType) {
        storeAuthData({
          sessionType: sessionType as 'oauth2' | 'metamask' | 'privatekey',
          privateKey: privateKey || undefined,
          safeAddress
        });
        console.log('Auth data stored in localStorage:', {
          sessionType,
          hasSafeAddress: !!safeAddress,
          hasPrivateKey: !!privateKey
        });
      }
    } else if (!session?.user && browser) {
      // Clear stored data when session is gone
      clearAuthData();
    }
  });

  // Reactive statement to handle session changes
  $: if (browser && session?.user) {
    const { safeAddress, privateKey, sessionType } = session.user;

    if (safeAddress && sessionType) {
      storeAuthData({
        sessionType: sessionType as 'oauth2' | 'metamask' | 'privatekey',
        privateKey: privateKey || undefined,
        safeAddress
      });
      console.log('Auth data updated in localStorage:', {
        sessionType,
        hasSafeAddress: !!safeAddress,
        hasPrivateKey: !!privateKey
      });
    }
  } else if (browser && !session?.user) {
    clearAuthData();
  }
</script>

<!-- This component doesn't render anything, it just manages auth data storage -->