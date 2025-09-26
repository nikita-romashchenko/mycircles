<script lang="ts">
  import "../../app.css";
</script>

<slot />

<style>
  :global(html, body) {
    height: 100%;
    margin: 0;
    padding: 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
</style>