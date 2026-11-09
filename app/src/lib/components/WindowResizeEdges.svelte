<script lang="ts">
  import { onMount } from "svelte";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import { WINDOW_EDGES, edgesVisible, type ResizeDirection } from "$lib/windowEdges";

  const appWindow = getCurrentWindow();
  let visible = $state(true);

  async function refresh() {
    const [maximized, fullscreen] = await Promise.all([appWindow.isMaximized(), appWindow.isFullscreen()]);
    visible = edgesVisible({ maximized, fullscreen });
  }

  onMount(() => {
    void refresh();
    const unlisten = appWindow.onResized(() => void refresh());
    return () => void unlisten.then((off) => off());
  });

  function begin(event: PointerEvent, direction: ResizeDirection) {
    if (event.button !== 0) return;
    event.preventDefault();
    void appWindow.startResizeDragging(direction);
  }
</script>

{#if visible}
  {#each WINDOW_EDGES as edge (edge.direction)}
    <div
      class="window-edge"
      data-edge={edge.direction}
      style="{edge.style};cursor:{edge.cursor}"
      aria-hidden="true"
      onpointerdown={(event) => begin(event, edge.direction)}
    ></div>
  {/each}
{/if}

<style>
  /* Encima de todo, salvo de lo que abre una capa propia: el divisor de la
     barra lateral queda a 4px o mas del borde, fuera de estas franjas. */
  .window-edge {
    position: fixed;
    z-index: 2147483000;
    touch-action: none;
  }
</style>
