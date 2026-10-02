<script lang="ts">
  import { tick } from "svelte";
  import { TriangleAlert } from "@lucide/svelte";
  import { t } from "$lib/i18n";
  import { blocksHeldEnter, confirmsOnEnter } from "$lib/dialogKeys";

  // Una confirmacion por ejecucion. El resumen cuenta todas las instrucciones
  // del script, incluso las que no necesitan confirmacion por si solas.
  let { count, production = false, oncancel, onconfirm }: {
    count: number;
    production?: boolean;
    oncancel: () => void;
    onconfirm: () => void;
  } = $props();

  let dialog = $state<HTMLDialogElement>();
  let confirmButton = $state<HTMLButtonElement>();

  $effect(() => {
    void tick().then(() => {
      dialog?.showModal();
      confirmButton?.focus();
    });
  });

  // El evento close llega al terminar la animacion de salida (dialogMotion.ts).
  let answer: "confirm" | "cancel" = "cancel";
  let answered = false;

  function respond(next: typeof answer) {
    if (answered) return;
    answered = true;
    answer = next;
    dialog?.close();
  }

  function onKeydown(event: KeyboardEvent) {
    if (!confirmsOnEnter(event)) return;
    event.preventDefault();
    respond("confirm");
  }

  function onKeydownCapture(event: KeyboardEvent) {
    if (blocksHeldEnter(event)) event.preventDefault();
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog
  class="review-dialog execution-guard"
  tabindex="-1"
  aria-labelledby="execution-guard-title"
  aria-describedby="execution-guard-summary"
  bind:this={dialog}
  onkeydown={onKeydown}
  onkeydowncapture={onKeydownCapture}
  oncancel={(event) => {
    event.preventDefault();
    respond("cancel");
  }}
  onclose={() => (answer === "confirm" ? onconfirm() : oncancel())}
>
  <header class="review-heading">
    <span class="review-heading-icon" aria-hidden="true"><TriangleAlert size={16} strokeWidth={2.25} /></span>
    <div class="review-heading-content">
      <h2 id="execution-guard-title">{$t("workspace.guard.title")}</h2>
      <p class="review-heading-summary" id="execution-guard-summary">
        {$t(count === 1 ? "workspace.guard.countOne" : "workspace.guard.countOther", { count })}
      </p>
    </div>
  </header>
  <footer data-dialog-actions>
    <button type="button" class="action-button secondary" onclick={() => respond("cancel")}>{$t("common.cancel")}</button>
    <button type="button" class="action-button danger" bind:this={confirmButton} onclick={() => respond("confirm")}>
      {production ? $t("workspace.guard.runInProduction") : $t("workspace.guard.run")}
    </button>
  </footer>
</dialog>

<style>
  .execution-guard {
    --review-tone: var(--danger);
    width: min(26rem, calc(100vw - 2rem));
  }
</style>
