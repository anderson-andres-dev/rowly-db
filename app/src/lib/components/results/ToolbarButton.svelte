<script lang="ts">
  import type { Component } from "svelte";
  import { t } from "$lib/i18n";

  // Boton de icono de las barras del resultado, con tooltip propio (etiqueta
  // + atajo) debajo del boton — el mismo estilo que el de la paginacion.
  let {
    icon: Icon,
    label,
    shortcut = "",
    disabled = false,
    tone = "default",
    badge = 0,
    size = 16,
    onclick,
  }: {
    icon: Component<{ size?: number; "aria-hidden"?: boolean | "true" }>;
    label: string;
    shortcut?: string;
    disabled?: boolean;
    // "submit": el verde de "aplicar" cuando esta habilitado.
    tone?: "default" | "submit";
    // Contador tipo notificacion en la esquina superior derecha (0 = oculto).
    badge?: number;
    // Tamaño del icono. En una misma barra todos usan el mismo (16): mezclar
    // tamaños rompe la simetria aunque cada glifo llene distinto su caja.
    size?: number;
    onclick: () => void;
  } = $props();

  let tooltip = $state<{ x: number; y: number } | null>(null);
  let timer: ReturnType<typeof setTimeout> | null = null;

  function prettyShortcut(keys: string): string {
    return keys
      .replace("ArrowDown", $t("results.key.down"))
      .replace("ArrowUp", $t("results.key.up"))
      .replace("Insert", $t("results.key.insert"));
  }

  function show(event: Event) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => (tooltip = { x: rect.left + rect.width / 2, y: rect.bottom + 6 }), 350);
  }

  function hide() {
    if (timer) clearTimeout(timer);
    timer = null;
    tooltip = null;
  }

  $effect(() => () => {
    if (timer) clearTimeout(timer);
  });
</script>

<button
  type="button"
  class="toolbar-button"
  class:submit={tone === "submit"}
  aria-label={label}
  {disabled}
  onclick={() => {
    hide();
    onclick();
  }}
  onpointerenter={show}
  onpointerleave={hide}
  onfocus={show}
  onblur={hide}
>
  <Icon {size} aria-hidden="true" />
  {#if badge > 0}
    <!-- {#key}: cada cambio del numero vuelve a montar la burbuja y repite
         su pequeño "pop", asi se nota que el contador cambio. -->
    {#key badge}
      <span class="badge" aria-hidden="true">{badge > 99 ? "99+" : badge}</span>
    {/key}
  {/if}
</button>

{#if tooltip}
  <div class="toolbar-tooltip" role="tooltip" style={`left:${tooltip.x}px; top:${tooltip.y}px;`}>
    <span>{label}</span>
    {#if shortcut}<span class="shortcut">{prettyShortcut(shortcut)}</span>{/if}
  </div>
{/if}

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

  .toolbar-button:hover:not(:disabled) {
    background: var(--surface-hover);
    color: var(--text-primary);
  }

  .toolbar-button.submit:not(:disabled) {
    color: var(--success);
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

  .toolbar-tooltip {
    position: fixed;
    z-index: 1001;
    display: flex;
    gap: var(--space-3);
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface-elevated);
    box-shadow: var(--shadow-elevated);
    color: var(--text-primary);
    font-size: 0.75rem;
    white-space: nowrap;
    pointer-events: none;
    transform: translateX(-50%);
  }

  .shortcut {
    color: var(--text-secondary);
  }
</style>
