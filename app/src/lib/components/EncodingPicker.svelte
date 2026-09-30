<script lang="ts">
  import { Check } from "@lucide/svelte";
  import { t } from "$lib/i18n";
  import { TEXT_ENCODINGS, encodingLabel, type TextEncoding } from "$lib/textEncoding";

  // El encoding del archivo, discreto en la esquina de la barra de abajo:
  // el nombre y, al hacer clic, la lista (hacia arriba). Elegir otro deja la
  // pestaña con cambios y se aplica al guardar (text_encoding.rs).
  let { value, onchange }: { value: TextEncoding; onchange: (encoding: TextEncoding) => void } = $props();

  let open = $state(false);
  let trigger = $state<HTMLButtonElement>();
  let menu = $state<HTMLDivElement>();
  let position = $state({ right: 0, bottom: 0 });

  function toggle() {
    if (!open && trigger) {
      const rect = trigger.getBoundingClientRect();
      position = { right: window.innerWidth - rect.right, bottom: window.innerHeight - rect.top + 4 };
    }
    open = !open;
  }

  function choose(encoding: TextEncoding) {
    open = false;
    if (encoding !== value) onchange(encoding);
    trigger?.focus();
  }

  $effect(() => {
    if (!open) return;
    menu?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menu?.contains(target) && !trigger?.contains(target)) open = false;
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      open = false;
      trigger?.focus();
    };
    window.addEventListener("pointerdown", onPointer, true);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("pointerdown", onPointer, true);
      window.removeEventListener("keydown", onKey, true);
    };
  });
</script>

<button
  class="encoding"
  type="button"
  aria-haspopup="menu"
  aria-expanded={open}
  aria-label={`${$t("workspace.file.encoding")}: ${encodingLabel(value)}`}
  bind:this={trigger}
  onclick={toggle}
>
  {encodingLabel(value)}
</button>

{#if open}
  <div
    class="ui-menu encoding-menu"
    role="menu"
    aria-label={$t("workspace.file.encoding")}
    bind:this={menu}
    style={`right:${position.right}px; bottom:${position.bottom}px;`}
  >
    {#each TEXT_ENCODINGS as item (item.value)}
      <button
        type="button"
        role="menuitemradio"
        aria-checked={item.value === value}
        class="ui-menu-item"
        onclick={() => choose(item.value)}
      >
        <span class="ui-menu-check">{#if item.value === value}<Check size={13} aria-hidden="true" />{/if}</span>
        <span>{item.label}</span>
      </button>
    {/each}
  </div>
{/if}

<style>
  .encoding {
    padding: 1px var(--space-1);
    border: 0;
    border-radius: var(--radius-sm);
    background: none;
    color: var(--text-secondary);
    font: inherit;
    font-size: 0.75rem;
    white-space: nowrap;
    cursor: pointer;
  }

  .encoding:hover,
  .encoding[aria-expanded="true"] {
    background: var(--surface-hover);
    color: var(--text-primary);
  }

  .encoding:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 1px;
  }

  .encoding-menu {
    position: fixed;
    z-index: 60;
    min-width: 10rem;
  }
</style>
