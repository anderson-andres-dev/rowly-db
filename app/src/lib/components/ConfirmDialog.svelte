<script lang="ts">
  import { tick } from "svelte";
  import { TriangleAlert } from "@lucide/svelte";
  import { t } from "$lib/i18n";

  // Modal de aviso de la app: icono, titulo, mensaje y botones a la derecha,
  // con el lenguaje de styles/alert-dialog.css. Todos los avisos pasan por
  // aca para que se vean y se comporten igual.
  //
  // tone "danger": la accion no tiene vuelta atras (boton rojo).
  // tone "warning": pide atencion pero se puede deshacer (boton normal).
  // alternateLabel: una segunda salida destructiva, apartada a la izquierda
  // (p. ej. "Descartar" junto a "Guardar" al cerrar una consola).
  let {
    title,
    message,
    confirmLabel,
    tone = "danger",
    alternateLabel,
    onconfirm,
    onalternate,
    oncancel,
  }: {
    title: string;
    message: string;
    confirmLabel: string;
    tone?: "danger" | "warning";
    alternateLabel?: string;
    onconfirm: () => void;
    onalternate?: () => void;
    oncancel: () => void;
  } = $props();

  let dialog = $state<HTMLDialogElement>();

  $effect(() => {
    void tick().then(() => {
      dialog?.showModal();
      // Foco en el dialogo, no en un boton: un Enter accidental no confirma.
      dialog?.focus();
    });
  });

  // La respuesta se entrega en el evento close, que llega cuando termino la
  // animacion de salida (dialogMotion.ts): el padre desmonta el componente
  // recien ahi, sin cortar la animacion.
  let answer: "confirm" | "alternate" | "cancel" = "cancel";

  function respond(next: typeof answer) {
    answer = next;
    dialog?.close();
  }

  function onClosed() {
    if (answer === "confirm") onconfirm();
    else if (answer === "alternate") onalternate?.();
    else oncancel();
  }
</script>

<dialog
  class="alert-dialog {tone}"
  tabindex="-1"
  aria-labelledby="confirm-dialog-title"
  bind:this={dialog}
  oncancel={(event) => {
    event.preventDefault();
    respond("cancel");
  }}
  onclose={onClosed}
>
  <div class="alert-body">
    <span class="alert-icon" aria-hidden="true">
      <TriangleAlert size={16} strokeWidth={2.25} />
    </span>
    <div class="alert-text">
      <h2 id="confirm-dialog-title">{title}</h2>
      <p>{message}</p>
    </div>
  </div>
  <div class="alert-actions">
    {#if alternateLabel}
      <button type="button" class="alert-button subtle-danger alert-aside" onclick={() => respond("alternate")}>
        {alternateLabel}
      </button>
    {/if}
    <button type="button" class="alert-button secondary" onclick={() => respond("cancel")}>{$t("common.cancel")}</button>
    <button
      type="button"
      class="alert-button {tone === 'danger' && !alternateLabel ? 'danger' : 'primary'}"
      onclick={() => respond("confirm")}
    >
      {confirmLabel}
    </button>
  </div>
</dialog>
