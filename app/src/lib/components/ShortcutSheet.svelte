<script lang="ts">
  import { Search } from "@lucide/svelte";
  import { t, type MessageKey } from "$lib/i18n";
  import type { CommandGroup } from "$lib/commands";
  import { shortcuts } from "$lib/stores/shortcuts";

  // Hoja de atajos (F1): los vigentes, con los que el usuario reasigno, en
  // una capa flotante como el historial. Esc la cierra y devuelve el foco a
  // donde estaba; "Personalizar" abre Ajustes > Atajos.
  let {
    onclose,
    oncustomize,
  }: {
    onclose: (restoreFocus: boolean) => void;
    oncustomize: () => void;
  } = $props();

  const GROUPS: CommandGroup[] = ["general", "editor", "results"];
  // La unica que necesita una segunda linea para entenderse.
  const HINTS: Record<string, MessageKey> = { "focus-zone-prefix": "settings.shortcuts.hint.focus" };

  let query = $state("");
  let root = $state<HTMLElement>();

  function label(id: string): string {
    return $t(`shortcuts.${id}.label` as MessageKey);
  }

  const groups = $derived.by(() => {
    const needle = query.trim().toLowerCase();
    return GROUPS.map((group) => ({
      group,
      items: $shortcuts.filter(
        (shortcut) =>
          shortcut.group === group &&
          shortcut.keys !== "" &&
          (needle === "" ||
            label(shortcut.id).toLowerCase().includes(needle) ||
            shortcut.keys.toLowerCase().includes(needle)),
      ),
    })).filter((entry) => entry.items.length > 0);
  });

  function focusOnMount(node: HTMLInputElement) {
    node.focus();
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    onclose(true);
  }

  // Si el foco se va a otra parte de la app, se cierra sin robarlo.
  function onFocusOut() {
    setTimeout(() => {
      if (document.hasFocus() && root && !root.contains(document.activeElement)) onclose(false);
    });
  }
</script>

<div
  class="shortcut-sheet ui-menu"
  role="dialog"
  tabindex="-1"
  aria-label={$t("shell.shortcutSheet.title")}
  bind:this={root}
  onkeydown={onKeydown}
  onfocusout={onFocusOut}
>
  <label class="ui-field compact">
    <Search size={13} aria-hidden="true" />
    <input type="search" bind:value={query} placeholder={$t("settings.shortcuts.search")} use:focusOnMount />
  </label>

  <div class="groups">
    {#if groups.length === 0}
      <p class="empty">{$t("settings.shortcuts.noResults", { query: query.trim() })}</p>
    {/if}
    {#each groups as entry (entry.group)}
      <div class="group">
        <div class="caption">{$t(`settings.shortcuts.group.${entry.group}`)}</div>
        {#each entry.items as shortcut (shortcut.id)}
          <div class="row">
            <span class="text">
              <span>{label(shortcut.id)}</span>
              {#if HINTS[shortcut.id]}<span class="hint">{$t(HINTS[shortcut.id])}</span>{/if}
            </span>
            <span class="ui-keys">
              {#each shortcut.keys.split("+") as key, index (index)}<kbd>{key}</kbd>{/each}
            </span>
          </div>
        {/each}
      </div>
    {/each}
  </div>

  <div class="footer">
    <button type="button" class="action-button secondary small" onmousedown={(event) => event.preventDefault()} onclick={oncustomize}>
      {$t("shell.shortcutSheet.customize")}
    </button>
  </div>
</div>

<style>
  /* Centrada arriba; sin transform, que lo usa la animacion de .ui-menu. */
  .shortcut-sheet {
    position: fixed;
    top: 12vh;
    right: 0;
    left: 0;
    z-index: 40;
    width: min(560px, calc(100% - 2 * var(--space-4)));
    max-height: 70vh;
    margin: 0 auto;
    gap: var(--space-2);
    padding: var(--space-2);
  }

  .groups {
    display: flex;
    min-height: 0;
    flex: 1;
    flex-direction: column;
    gap: var(--space-3);
    overflow-y: auto;
  }

  .caption {
    padding: var(--space-1) var(--space-2);
    color: var(--text-secondary);
    font-size: 0.6875rem;
  }

  .row {
    display: flex;
    min-height: 1.875rem;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    padding: 0 var(--space-2);
    color: var(--text-primary);
  }

  .text {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .hint {
    color: var(--text-secondary);
    font-size: 0.75rem;
  }

  .ui-keys {
    flex-shrink: 0;
  }

  .empty {
    margin: 0;
    padding: var(--space-4) var(--space-2);
    color: var(--text-secondary);
    text-align: center;
  }

  .footer {
    display: flex;
    justify-content: flex-end;
  }
</style>
