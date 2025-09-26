<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores"

  let files: { key: string; url: string }[] = $state([]);

  onMount(async () => {
    const res = await fetch("/api/files");
    files = await res.json();
  });

  async function handleUpload(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    console.log("File uploaded at:", data.url);
  }
</script>

{#if $page.data.session}
  <h1>Protected media page</h1>
  <p>
    This is a protected content. You can access this content because you are
    signed in.
  </p>
  <p>Session expiry: {$page.data.session?.expires}</p>
  <input type="file" onchange={handleUpload} />
  <h2>Uploaded Files</h2>
  <div class="grid">
    {#each files as file}
      <div class="card">
        <img src={file.url} alt={file.key} />
        <p>{file.key}</p>
      </div>
    {/each}
  </div>
{:else}
  <h1>Access Denied</h1>
{/if}

