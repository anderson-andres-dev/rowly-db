<script lang="ts">
  import DriverLogo from "$lib/components/DriverLogo.svelte";
  import { X } from "@lucide/svelte";
  import { connectionDrivers, type ConnectionDriver } from "$lib/connections";
  import { t } from "$lib/i18n";

  // Primer paso de "Nueva conexion": un modal pequeño para elegir el motor.
  // Al elegir uno se cierra y la pagina abre el formulario de conexion.
  let {
    onselect,
    oncancel,
  }: {
    onselect: (driver: ConnectionDriver) => void;
    oncancel: () => void;
  } = $props();

  let dialogEl = $state<HTMLDialogElement>();
  // El motor elegido, para avisar recien cuando el dialogo termino de
  // cerrarse (onclose) y no dejar dos modales abiertos a la vez.
  let chosen: ConnectionDriver | null = null;

  $effect(() => {
    if (dialogEl && !dialogEl.open) {
      dialogEl.showModal();
      dialogEl.querySelector<HTMLButtonElement>(".driver")?.focus();
    }
  });

  function choose(driver: ConnectionDriver) {
    chosen = driver;
    dialogEl?.close();
  }

  function handleClose() {
    if (chosen) onselect(chosen);
    else oncancel();
  }
</script>

<dialog
  bind:this={dialogEl}
  aria-labelledby="driver-picker-title"
  onclose={handleClose}
  onclick={(event) => {
    if (event.target === dialogEl) dialogEl?.close();
  }}
>
  <header>
    <div>
      <h1 id="driver-picker-title">{$t("connections.newConnection")}</h1>
      <p>{$t("connections.driver.subtitle")}</p>
    </div>
    <button class="close" type="button" aria-label={$t("common.close")} onclick={() => dialogEl?.close()}>
      <X size={16} aria-hidden="true" />
    </button>
  </header>

  <div class="driver-list" data-dialog-actions>
    {#each connectionDrivers as driver (driver.id)}
      <button class="driver" type="button" onclick={() => choose(driver.id)}>
        <DriverLogo driver={driver.id} size={32} />
        <strong>{driver.name}</strong>
      </button>
    {/each}
  </div>
</dialog>

<style>
  dialog {
    width: min(34rem, calc(100vw - 2rem));
    max-width: none;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--surface);
    color: var(--text-primary);
    box-shadow: var(--shadow-elevated);
  }

  dialog[open] {
    animation: dialog-in 180ms ease-out;
  }

  @keyframes dialog-in {
    from {
      opacity: 0;
      transform: translateY(6px) scale(0.98);
    }
  }

  header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-5) var(--space-4) var(--space-4) var(--space-5);
  }

  h1 {
    margin: 0 0 4px;
    font-size: 0.9375rem;
    font-weight: var(--font-weight-heading);
    letter-spacing: var(--tracking-heading);
    line-height: var(--leading-heading);
  }

  header p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.8125rem;
  }

  .close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition:
      color var(--duration-fast),
      background-color var(--duration-fast);
  }

  .close:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
  }

  .close:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
  }

  .driver-list {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-3);
    padding: 0 var(--space-5) var(--space-5);
  }

  /* Mismo lenguaje que las tarjetas de conexion, sin degradado: superficie
     elevada y borde neutro que apenas se aclara; el logo queda siempre en
     el gris uniforme de DriverLogo. */
  .driver {
    display: flex;
    min-width: 0;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-4);
    padding: var(--space-4);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--surface-elevated);
    color: var(--text-primary);
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition:
      border-color 200ms ease,
      transform 200ms ease;
  }

  .driver:hover,
  .driver:focus-visible {
    border-color: color-mix(in srgb, var(--border) 65%, var(--control-border));
    transform: translateY(-1px);
  }

  .driver:focus {
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
  }

  .driver strong {
    font-size: 0.875rem;
    font-weight: 600;
  }

  @media (max-width: 30rem) {
    .driver-list {
      grid-template-columns: 1fr;
    }

    .driver {
      flex-direction: row;
      align-items: center;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    dialog[open] {
      animation: none;
    }

    .driver {
      transition: none;
    }

    .driver:hover,
    .driver:focus-visible {
      transform: none;
    }
  }
</style>
