<script lang="ts">
  import { tick } from "svelte";
  import { TriangleAlert } from "@lucide/svelte";
  import { t } from "$lib/i18n";
  import { confirmsOnEnter } from "$lib/dialogKeys";
  import type { DestructiveStatement } from "$lib/types";
  import EnvironmentBadge from "$lib/components/EnvironmentBadge.svelte";

  // Confirmar una ejecucion que lo pide (destructiva, o que escribe en
  // produccion). Un modal como el de los cambios de la grilla
  // (ChangesPreview): el foco llega al modal, Enter ejecuta y Escape cancela,
  // asi Ctrl+Enter y Enter bastan. Un solo modal por ejecucion: un script
  // avisa de todas sus sentencias a la vez.
  let { sql, statement, script = null, production = false, oncancel, onconfirm }: {
    // Lo que se va a ejecutar: se muestra para que se vea de que bloque se
    // trata.
    sql: string;
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
  const preview = $derived(sql.replace(/\s+/g, " ").trim());

  let dialog = $state<HTMLDialogElement>();

  $effect(() => {
    void tick().then(() => {
      dialog?.showModal();
      dialog?.focus();
    });
  });

  // La respuesta sale en el evento close, al terminar la animacion de salida
  // (dialogMotion.ts), como en ConfirmDialog.
  let answer: "confirm" | "cancel" = "cancel";

  function respond(next: typeof answer) {
    answer = next;
    dialog?.close();
  }

  function onKeydown(event: KeyboardEvent) {
    if (!confirmsOnEnter(event)) return;
    event.preventDefault();
    respond("confirm");
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog
  class="alert-dialog danger execution-guard"
  tabindex="-1"
  aria-labelledby="execution-guard-title"
  bind:this={dialog}
  onkeydown={onKeydown}
  oncancel={(event) => {
    event.preventDefault();
    respond("cancel");
  }}
  onclose={() => (answer === "confirm" ? onconfirm() : oncancel())}
>
  <div class="alert-body">
    <span class="alert-icon" aria-hidden="true">
      <TriangleAlert size={16} strokeWidth={2.25} />
    </span>
    <div class="alert-text">
      {#if production}
        <EnvironmentBadge environment="production" />
      {/if}
      <h2 id="execution-guard-title">
        {#if script}
          {$t(pending.length === 1 ? "workspace.guard.scriptOne" : "workspace.guard.scriptOther", {
            count: pending.length,
            total: script.length,
          })}
        {:else}
          {$t(`workspace.guard.${pending[0] ?? statement}`)}
        {/if}
      </h2>
      {#if script}
        <p>{kinds.map((kind) => $t(`workspace.guard.${kind}`)).join(" · ")}</p>
      {/if}
      <code class="sql" title={sql}>{preview}</code>
    </div>
  </div>
  <div class="alert-actions">
    <button type="button" class="action-button secondary" onclick={() => respond("cancel")}>{$t("common.cancel")}</button>
    <button type="button" class="action-button danger" onclick={() => respond("confirm")}>
      {production ? $t("workspace.guard.runInProduction") : $t("workspace.guard.runAnyway")}
    </button>
  </div>
</dialog>

<style>
  /* Mas ancho que un aviso comun: la sentencia cabe en una linea. */
  .execution-guard {
    width: min(32rem, calc(100vw - 2rem));
  }

  .alert-text :global(.environment-badge) {
    display: inline-block;
    margin-bottom: var(--space-2);
  }

  .sql {
    display: block;
    margin-top: var(--space-3);
    padding: var(--space-2);
    overflow: hidden;
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--text-secondary);
    font-family: ui-monospace, SFMono-Regular, "SF Mono", "JetBrains Mono", Consolas, monospace;
    font-size: 0.75rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
