<script lang="ts">
  import type { Component } from "svelte";
  import { tooltip } from "$lib/tooltip";
  import { settleTransitions } from "$lib/settleTransitions";
  import { opticalIconSize, TOOLBAR_ICON_STROKE } from "$lib/iconOptics";

  // Boton de icono de las barras del resultado, con el tooltip de la app
  // (etiqueta + atajo, lib/tooltip.ts).
  let {
    icon: Icon,
    label,
    shortcut = "",
    disabled = false,
    tone = "default",
    badge = 0,
    size,
    onclick,
  }: {
    icon: Component<{
      size?: number;
      strokeWidth?: number;
      absoluteStrokeWidth?: boolean;
      "aria-hidden"?: boolean | "true";
    }>;
    label: string;
    shortcut?: string;
    disabled?: boolean;
    // "submit": el verde de "aplicar" cuando esta habilitado.
    // "active": algo encendido (p. ej. un filtro aplicado), en acento.
    // "danger": algo que fallo (p. ej. un filtro invalido), en rojo.
    tone?: "default" | "submit" | "active" | "danger";
    // Contador tipo notificacion en la esquina superior derecha (0 = oculto).
    badge?: number;
    // Sin valor usa la correccion optica de iconOptics.ts: cada glifo a su
    // tamaño medido para que todos se vean del mismo tamaño.
    size?: number;
    onclick: () => void;
  } = $props();
</script>

<button
  type="button"
  class="toolbar-button"
  class:submit={tone === "submit"}
  class:active={tone === "active"}
  class:danger={tone === "danger"}
  aria-label={label}
  {disabled}
  use:tooltip={{ label, shortcut }}
  use:settleTransitions
  {onclick}
>
  <Icon
    size={size ?? opticalIconSize(Icon as Component<never>)}
    strokeWidth={TOOLBAR_ICON_STROKE}
    absoluteStrokeWidth
    aria-hidden="true"
  />
  {#if badge > 0}
    <!-- {#key}: cada cambio del numero vuelve a montar la burbuja y repite
         su pequeño "pop", asi se nota que el contador cambio. -->
    {#key badge}
      <span class="badge" aria-hidden="true">{badge > 99 ? "99+" : badge}</span>
    {/key}
  {/if}
</button>

<style>
  .toolbar-button {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    padding: 0;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition:
      background-color var(--duration-fast) ease,
      color var(--duration-fast) ease,
      opacity var(--duration-fast) ease;
  }

  /* Sin transicion hasta el primer pintado (lib/settleTransitions.ts). */
  .toolbar-button:not([data-settled]) {
    transition: none;
  }

  .toolbar-button:hover:not(:disabled) {
    background: var(--surface-hover);
    color: var(--text-primary);
  }

  .toolbar-button.submit:not(:disabled) {
    color: var(--success);
  }

  .toolbar-button.active {
    background: color-mix(in srgb, var(--accent) 14%, transparent);
    color: var(--accent);
  }

  .toolbar-button.danger {
    background: color-mix(in srgb, var(--danger) 14%, transparent);
    color: var(--danger);
  }

  /* Burbuja de notificacion: el anillo del color de la barra la despega del
     icono; entra con un pequeño rebote al aparecer. */
  /* Centrado exacto: alto y line-height iguales (en px, sin redondeos de
     rem) en vez de flex, que con los digitos de algunas fuentes deja el
     numero medio pixel corrido hacia arriba. */
  .badge {
    position: absolute;
    /* Anclada a la esquina superior derecha del ICONO (16px centrado en
       el boton de 28px => 6px de margen), no a la del boton. */
    top: 6px;
    right: 6px;
    min-width: 13px;
    height: 13px;
    box-sizing: border-box;
    padding: 0 3px;
    border-radius: 999px;
    background: var(--accent);
    box-shadow: 0 0 0 1.5px var(--surface);
    color: var(--text-on-accent);
    font-size: 8.5px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    line-height: 13px;
    text-align: center;
    transform: translate(55%, -45%);
    pointer-events: none;
    animation: badge-in 220ms cubic-bezier(0.2, 0.9, 0.3, 1.4);
  }

  @keyframes badge-in {
    from {
      transform: translate(55%, -45%) scale(0.4);
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .badge {
      animation: none;
    }
  }

  .toolbar-button:disabled {
    cursor: default;
    opacity: 0.35;
  }

  .toolbar-button:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: -2px;
  }
</style>
