<script lang="ts">
  export let data: any;
</script>

<h1>Protected Page</h1>

{#if data.authenticated}
  <div class="protected-content">
    <p>🎉 Welcome! You are successfully authenticated via <strong>{data.user.sessionType}</strong>.</p>

    <div class="user-info">
      <h2>User Information</h2>
      <ul>
        {#if data.user?.name}
          <li><strong>Name:</strong> {data.user.name}</li>
        {/if}
        {#if data.user?.email}
          <li><strong>Email:</strong> {data.user.email}</li>
        {/if}
        {#if data.user?.username}
          <li><strong>Username:</strong> {data.user.username}</li>
        {/if}
        {#if data.user?.safeAddress}
          <li><strong>Safe Address:</strong> {data.user.safeAddress}</li>
        {/if}
        {#if data.user?.controllingEOA}
          <li><strong>Controlling EOA:</strong> {data.user.controllingEOA}</li>
        {/if}
        {#if data.user?.profileId}
          <li><strong>Profile ID:</strong> {data.user.profileId}</li>
        {/if}
      </ul>
    </div>

    <div class="session-debug">
      <h3>Session Data (Debug)</h3>
      <pre>{JSON.stringify(data.session, null, 2)}</pre>
    </div>
  </div>
{:else}
  <div class="access-denied">
    <h2>Access Denied</h2>
    <p>You are not authenticated. Please sign in first.</p>
  </div>
{/if}

<style>
  .protected-content {
    max-width: 800px;
    margin: 2rem auto;
    padding: 2rem;
    background: #f8fafc;
    border-radius: 0.5rem;
    border: 1px solid #e2e8f0;
  }

  .user-info {
    margin: 2rem 0;
    padding: 1rem;
    background: white;
    border-radius: 0.375rem;
    border: 1px solid #d1d5db;
  }

  .user-info ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .user-info li {
    padding: 0.5rem 0;
    border-bottom: 1px solid #f3f4f6;
  }

  .user-info li:last-child {
    border-bottom: none;
  }

  .session-debug {
    margin-top: 2rem;
    padding: 1rem;
    background: #1f2937;
    color: #f9fafb;
    border-radius: 0.375rem;
    font-size: 0.875rem;
  }

  .session-debug pre {
    margin: 0;
    overflow-x: auto;
  }

  .access-denied {
    text-align: center;
    color: #dc2626;
    padding: 2rem;
  }

  h1, h2, h3 {
    color: #1f2937;
  }
</style>
