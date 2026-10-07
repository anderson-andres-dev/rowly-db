<script lang="ts">
  import { Check, CircleX, Copy } from "@lucide/svelte";
  import { t, type MessageKey } from "$lib/i18n";
  import { tooltip } from "$lib/tooltip";
  import { writeClipboard } from "$lib/clipboard";
  import type { QuickFix, SqlDiagnostic } from "$lib/editor/diagnostics";

  // Ventana de detalle de un diagnostico (Ctrl+. o el mouse encima del
  // subrayado): que paso en lenguaje humano, el codigo y el texto crudo del
  // servidor para copiar, y las correcciones rapidas. Abierta con el teclado,
  // el foco entra aca (flechas, Enter aplica, Esc vuelve al editor); abierta
  // con el mouse solo se muestra y el foco sigue en el editor.
  let {
    diagnostic,
    anchor,
    focused,
    onapply,
    onclose,
    onpointerenter,
    onpointerleave,
  }: {
    diagnostic: SqlDiagnostic;
    anchor: { left: number; top: number; bottom: number };
    focused: boolean;
    onapply: (fix: QuickFix) => void;
    onclose: (refocusEditor: boolean) => void;
    onpointerenter?: () => void;
    onpointerleave?: () => void;
  } = $props();

  const help = $derived(diagnostic.source === "server" ? (diagnostic.help ?? null) : null);
  const fixes = $derived(diagnostic.fixes ?? []);
  let active = $state(0);
  let copied = $state(false);
  let root = $state<HTMLElement>();
  let position = $state<{ left: number; top: number } | null>(null);

  // Debajo de la linea del error; si no cabe, arriba. Nunca fuera de la
  // ventana.
  $effect(() => {
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const margin = 8;
    const below = anchor.bottom + 4;
    const top = below + rect.height > window.innerHeight - margin ? Math.max(margin, anchor.top - rect.height - 4) : below;
    const left = Math.min(Math.max(margin, anchor.left - 12), window.innerWidth - rect.width - margin);
    position = { left, top };
  });

  function focusOnMount(node: HTMLElement) {
    if (focused) node.focus();
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onclose(true);
    } else if ((event.key === "ArrowDown" || event.key === "ArrowUp") && fixes.length > 0) {
      event.preventDefault();
      active = (active + (event.key === "ArrowDown" ? 1 : fixes.length - 1)) % fixes.length;
    } else if (event.key === "Enter" && fixes[active]) {
      event.preventDefault();
      onapply(fixes[active]);
    }
  }

  async function copyDetail() {
    if (!(await writeClipboard(diagnostic.message))) return;
    copied = true;
    setTimeout(() => (copied = false), 1500);
  }
</script>

<div
  class="diagnostic-popup ui-menu"
  role="dialog"
  aria-label={$t("editor.diagnostics.label")}
  tabindex="-1"
  bind:this={root}
  style:left={position ? `${position.left}px` : "-9999px"}
  style:top={position ? `${position.top}px` : "0"}
  onkeydown={onKeydown}
  onpointerenter={() => onpointerenter?.()}
  onpointerleave={() => onpointerleave?.()}
  use:focusOnMount
>
  <div class="head">
    <CircleX size={14} aria-hidden="true" />
    <span class="title selectable">{help ? $t(`editor.help.${help}.title` as MessageKey) : diagnostic.message}</span>
    {#if diagnostic.code}<span class="code">{diagnostic.code}</span>{/if}
  </div>

  {#if help}
    <p class="description selectable">{$t(`editor.help.${help}.description` as MessageKey)}</p>
    <div class="detail">
      <div class="detail-head">
        <span>{$t("editor.diagnostics.serverDetail")}</span>
        <button
          type="button"
          class="ui-icon-button"
          aria-label={$t("editor.diagnostics.copy")}
          use:tooltip={copied ? $t("editor.diagnostics.copied") : $t("editor.diagnostics.copy")}
          onmousedown={(event) => event.preventDefault()}
          onclick={() => void copyDetail()}
        >
          {#if copied}<Check size={13} aria-hidden="true" />{:else}<Copy size={13} aria-hidden="true" />{/if}
        </button>
      </div>
      <code>{diagnostic.message}</code>
    </div>
  {/if}

  {#if fixes.length > 0}
    <div class="fixes" role="listbox" aria-label={$t("editor.diagnostics.fixes")}>
      {#each fixes as fix, index (index)}
        <button
          type="button"
          role="option"
          aria-selected={index === active}
          class="ui-menu-item"
          class:active={index === active}
          tabindex="-1"
          onmousedown={(event) => event.preventDefault()}
          onclick={() => onapply(fix)}
        >
          {fix.label}
        </button>
      {/each}
    </div>
  {/if}

  {#if focused}
    <div class="hints">
      {#if fixes.length > 0}<span><span class="ui-keys"><kbd>Enter</kbd></span> {$t("editor.diagnostics.apply")}</span>{/if}
      <span><span class="ui-keys"><kbd>Esc</kbd></span> {$t("editor.diagnostics.close")}</span>
    </div>
  {/if}
</div>

<style>
  .diagnostic-popup {
    position: fixed;
    z-index: 50;
    width: max-content;
    max-width: min(34rem, calc(100vw - 16px));
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    outline: none;
  }

  .head {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
    color: var(--text-primary);
    font-weight: 500;
  }

  .head :global(svg) {
    flex-shrink: 0;
    margin-top: 2px;
    color: var(--danger);
  }

  .title {
    flex: 1;
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .code {
    flex-shrink: 0;
    color: var(--text-secondary);
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.75rem;
    font-weight: 400;
  }

  .description {
    margin: 0;
    color: var(--text-secondary);
    line-height: 1.45;
  }

  .detail {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .detail-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: var(--text-secondary);
    font-size: 0.75rem;
  }

  .detail code {
    padding: var(--space-2);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--text-primary);
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.75rem;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .fixes {
    display: flex;
    flex-direction: column;
    margin: 0 calc(-1 * var(--space-2));
  }

  .hints {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-4);
    color: var(--text-secondary);
    font-size: 0.6875rem;
  }
</style>
