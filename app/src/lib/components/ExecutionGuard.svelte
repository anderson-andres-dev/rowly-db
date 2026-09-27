<script lang="ts">
  import { TriangleAlert } from "@lucide/svelte";
  import { t } from "$lib/i18n";
  import type { DestructiveStatement } from "$lib/types";
  import EnvironmentBadge from "$lib/components/EnvironmentBadge.svelte";

  let { statement, script = null, production = false, oncancel, onconfirm }: {
    statement: DestructiveStatement;
    // Script: todas las que piden confirmacion, para avisar de una vez.
    script?: (DestructiveStatement | null)[] | null;
    // Conexion de produccion: se marca y el boton lo dice.
    production?: boolean;
    oncancel: () => void;
    onconfirm: () => void;
  } = $props();

  const pending = $derived(script ? script.filter((item) => item !== null) : [statement]);
  const kinds = $derived([...new Set(pending)]);
</script>

<div class="execution-guard" role="alert">
  <TriangleAlert size={14} aria-hidden="true" />
  {#if production}
    <EnvironmentBadge environment="production" />
  {/if}
  {#if script}
    <span class="message">
      <span>
        {$t(pending.length === 1 ? "workspace.guard.scriptOne" : "workspace.guard.scriptOther", {
          count: pending.length,
          total: script.length,
        })}
      </span>
      {#each kinds as kind (kind)}<span class="kind">{$t(`workspace.guard.${kind}`)}</span>{/each}
    </span>
  {:else}
    <span class="message">{$t(`workspace.guard.${pending[0] ?? statement}`)}</span>
  {/if}
  <div class="actions">
    <button type="button" class="secondary-action" onclick={oncancel}>{$t("common.cancel")}</button>
    <button type="button" class="danger-action" onclick={onconfirm}>
      {production ? $t("workspace.guard.runInProduction") : $t("workspace.guard.runAnyway")}
    </button>
  </div>
</div>

<style>
  .execution-guard {
    display: flex;
    flex-wrap: wrap;
    flex-shrink: 0;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-3);
    box-sizing: border-box;
    border-bottom: 1px solid var(--border);
    background: color-mix(in srgb, var(--danger) 12%, var(--surface));
    color: var(--text-primary);
    font-size: 0.8125rem;
  }

  .execution-guard :global(svg) {
    flex-shrink: 0;
    color: var(--danger);
  }

  .message {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 12rem;
  }

  .kind {
    color: var(--text-secondary);
  }

  .actions {
    display: flex;
    flex-shrink: 0;
    gap: var(--space-2);
  }

  .actions button {
    min-height: 1.5rem;
    padding: 0 var(--space-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    font: inherit;
    font-size: 0.75rem;
    cursor: pointer;
  }

  .secondary-action {
    background: var(--surface-elevated);
    color: var(--text-primary);
  }

  .danger-action {
    border-color: var(--danger) !important;
    background: var(--danger);
    color: var(--text-on-accent);
  }

  .actions button:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: -2px;
  }
</style>
