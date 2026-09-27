<script lang="ts">
  import { tooltip } from "$lib/tooltip";
  import { Check, ChevronDown, SquareArrowOutUpRight } from "@lucide/svelte";
  import ConnectionAvatar from "$lib/components/ConnectionAvatar.svelte";
  import EnvironmentBadge from "$lib/components/EnvironmentBadge.svelte";
  import DriverLogo from "$lib/components/DriverLogo.svelte";
  import { getDriver } from "$lib/connections";
  import { NEUTRAL_IDENTITY_COLOR } from "$lib/connectionColors";
  import { openConnectionWindow } from "$lib/connectionWindow";
  import { t } from "$lib/i18n";
  import { connectToProfile, pendingEdit } from "$lib/stores/connection";
  import type { ConnectionProfile } from "$lib/stores/connectionProfiles";

  let {
    profiles,
    activeProfileId,
    disabled = false,
  }: {
    profiles: ConnectionProfile[];
    activeProfileId: string | null;
    disabled?: boolean;
  } = $props();

  let open = $state(false);
  let activeOption = $state(0);
  // Error crudo al abrir otra ventana; el texto que lo rodea se traduce al pintarlo.
  let windowError = $state<string | null>(null);
  let root = $state<HTMLElement>();
  const activeProfile = $derived(profiles.find((profile) => profile.id === activeProfileId) ?? null);

  // Mismo orden que la pantalla de conexiones: primero las que no tienen
  // grupo, sin titulo; despues una seccion por grupo, en orden alfabetico.
  const sections = $derived.by(() => {
    const byGroup = new Map<string, ConnectionProfile[]>();
    for (const profile of profiles) {
      const key = profile.group ?? "";
      byGroup.set(key, [...(byGroup.get(key) ?? []), profile]);
    }
    const named = [...byGroup.keys()].filter((key) => key !== "").sort((a, b) => a.localeCompare(b));
    return [...(byGroup.has("") ? [""] : []), ...named].map((key) => ({
      title: key || null,
      profiles: byGroup.get(key) ?? [],
    }));
  });
  // Lista plana en orden visual, para moverse con las flechas.
  const ordered = $derived(sections.flatMap((section) => section.profiles));

  function openMenu() {
    if (disabled || profiles.length === 0) return;
    windowError = null;
    activeOption = Math.max(
      0,
      ordered.findIndex((profile) => profile.id === activeProfileId),
    );
    open = true;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (disabled) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) openMenu();
      else activeOption = Math.min(ordered.length - 1, activeOption + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) openMenu();
      else activeOption = Math.max(0, activeOption - 1);
    } else if ((event.key === "Enter" || event.key === " ") && open) {
      event.preventDefault();
      const profile = ordered[activeOption];
      if (!profile) return;
      // Shift+Enter: el mismo atajo que "abrir en ventana nueva" en los
      // navegadores.
      if (event.shiftKey) void openInNewWindow(profile);
      else void select(profile);
    } else if (event.key === "Escape") {
      event.preventDefault();
      open = false;
    }
  }

  // Comparte la misma logica de conexion que la landing page (ver
  // connection.ts). Si falla, le pasa el contexto a +page.svelte via
  // pendingEdit para que abra el modal de edicion, en vez de dejar al
  // usuario en una landing vacia sin explicacion.
  async function select(profile: ConnectionProfile) {
    open = false;
    if (profile.id === activeProfileId) return;

    const result = await connectToProfile(profile);
    if (!result.ok) {
      pendingEdit.set({
        profile,
        error: result.reason === "connect-failed" ? result.error : null,
      });
    }
  }

  // Un clic en la zona de arrastre de la barra (data-tauri-drag-region) con
  // el menu abierto solo lo cierra. Si llegara al manejador de Tauri, que
  // escucha mousedown en document, arrancaria a arrastrar la ventana (o la
  // maximizaria con doble clic) en el mismo gesto, y la ventana "salta".
  // Se corta en la fase de captura de window, antes de llegar a document.
  // Los clics en cualquier otro lugar siguen su curso normal.
  function handleWindowMousedown(event: MouseEvent) {
    if (!open || !(event.target instanceof Element)) return;
    if (root?.contains(event.target)) return;
    open = false;
    if (event.target.closest("[data-tauri-drag-region]")) {
      event.stopPropagation();
      event.preventDefault();
    }
  }

  async function openInNewWindow(profile: ConnectionProfile) {
    try {
      await openConnectionWindow(profile);
      open = false;
    } catch (error) {
      windowError = String(error);
    }
  }
</script>

<svelte:window onmousedowncapture={handleWindowMousedown} />

<div
  class="switcher"
  bind:this={root}
  onfocusout={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) open = false;
  }}
>
  <button
    class="switcher-trigger"
    class:tinted={!!activeProfile?.color}
    style:--identity={activeProfile?.color}
    type="button"
    aria-haspopup="listbox"
    aria-expanded={open}
    {disabled}
    onclick={() => (open ? (open = false) : openMenu())}
    onkeydown={handleKeydown}
  >
    {#if activeProfile}
      <DriverLogo driver={activeProfile.driver} size={16} />
      <span class="switcher-name">{activeProfile.name}</span>
      {#if activeProfile.environment}
        <EnvironmentBadge environment={activeProfile.environment} />
      {/if}
    {:else}
      <span class="switcher-name">{$t("connections.switcher.none")}</span>
    {/if}
    <ChevronDown size={14} class="switcher-chevron" aria-hidden="true" />
  </button>

  {#if open}
    <div class="switcher-menu" role="listbox" aria-label={$t("connections.switcher.saved")}>
      {#each sections as section (section.title ?? "")}
        {#if section.title}
          <div class="section-title" role="presentation">{section.title}</div>
        {/if}
        {#each section.profiles as profile (profile.id)}
          {@const index = ordered.indexOf(profile)}
          {@const driver = getDriver(profile.driver)}
          <div
            class="option"
            style:--identity={profile.color ?? NEUTRAL_IDENTITY_COLOR}
            class:active={index === activeOption}
            class:selected={profile.id === activeProfileId}
            role="option"
            aria-selected={profile.id === activeProfileId}
            tabindex="-1"
            onmouseenter={() => (activeOption = index)}
          >
            <button type="button" class="option-main" tabindex="-1" onclick={() => select(profile)}>
              <ConnectionAvatar name={profile.name} color={profile.color} size={24} />
              <span class="option-text">
                <span class="option-title">
                  <span class="option-name">{profile.name}</span>
                  {#if profile.environment}
                    <EnvironmentBadge environment={profile.environment} compact />
                  {/if}
                </span>
                <span class="option-detail">{driver.name} · {profile.database}@{profile.host}</span>
              </span>
              {#if profile.id === activeProfileId}
                <Check size={14} class="option-check" aria-label={$t("connections.switcher.current")} />
              {/if}
            </button>
            <button
              type="button"
              class="new-window"
              tabindex="-1"
              aria-label={$t("connections.switcher.openLabel", { name: profile.name })}
              use:tooltip={$t("connections.switcher.openTitle")}
              onclick={() => openInNewWindow(profile)}
            >
              <SquareArrowOutUpRight size={14} aria-hidden="true" />
            </button>
          </div>
        {/each}
      {/each}

      {#if windowError}
        <p class="menu-error" role="alert">{$t("connections.switcher.windowError", { error: windowError })}</p>
      {/if}
    </div>
  {/if}
</div>

<style>
  .switcher {
    position: relative;
    min-width: 0;
  }

  .switcher-trigger {
    display: flex;
    max-width: 18rem;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-2);
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-primary);
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color var(--duration-fast);
  }

  .switcher-trigger:hover:not(:disabled),
  .switcher-trigger[aria-expanded="true"] {
    background: var(--surface-hover);
  }

  /* Con color, el realce del boton es un acento de ese mismo color en vez
     del gris: sobre la barra ya teñida, el gris se lee como un hueco. Va
     apenas por encima del tinte de la barra en ese punto (~19%): tiene que
     leerse como un realce sutil, no como una pastilla de color. */
  .switcher-trigger.tinted:hover:not(:disabled),
  .switcher-trigger.tinted[aria-expanded="true"] {
    background: color-mix(in srgb, var(--identity) 10%, transparent);
  }

  .switcher-trigger:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 1px;
  }

  .switcher-trigger:disabled {
    color: var(--control-disabled);
    cursor: not-allowed;
  }

  .switcher-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .switcher-trigger :global(.switcher-chevron) {
    flex-shrink: 0;
    margin-left: auto;
    color: var(--text-secondary);
  }

  .switcher-menu {
    position: absolute;
    z-index: 20;
    top: calc(100% + 6px);
    left: 0;
    display: flex;
    width: 20rem;
    max-height: min(26rem, 70vh);
    flex-direction: column;
    overflow-y: auto;
    padding: 4px;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    /* Una capa por encima de la app: levemente translucida con desenfoque y
       un brillo de 1px arriba, en vez de un bloque opaco. */
    background: color-mix(in srgb, var(--surface-elevated) 90%, transparent);
    backdrop-filter: blur(18px) saturate(140%);
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, var(--text-primary) 6%, transparent),
      var(--shadow-elevated);
    animation: menu-in 140ms ease-out;
  }

  /* El brillo interior de 1px es un recurso de vidrio oscuro: sobre claro
     se ve como una linea gris arriba. */
  :global(:root[data-scheme="light"]) .switcher-menu {
    box-shadow: var(--shadow-elevated);
  }

  :global(:root[data-scheme="light"]) .option.active {
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--identity) 10%, transparent),
      color-mix(in srgb, var(--identity) 4%, transparent) 55%,
      color-mix(in srgb, var(--text-primary) 3%, transparent)
    );
  }

  :global(:root[data-scheme="light"]) .switcher-trigger.tinted:hover:not(:disabled),
  :global(:root[data-scheme="light"]) .switcher-trigger.tinted[aria-expanded="true"] {
    background: color-mix(in srgb, var(--identity) 7%, transparent);
  }

  @keyframes menu-in {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
  }

  .section-title {
    padding: var(--space-3) var(--space-2) var(--space-1);
    color: var(--text-secondary);
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .option {
    position: relative;
    display: flex;
    align-items: center;
    border-radius: var(--radius-sm);
    transition: background-color var(--duration-fast);
  }

  /* El realce de la fila es el degradado del color de esa conexion (el
     mismo lenguaje que la barra y la vista de lista), no un gris generico.
     Sin color, el gris neutro de identidad. */
  .option.active {
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--identity) 16%, transparent),
      color-mix(in srgb, var(--identity) 6%, transparent) 55%,
      color-mix(in srgb, var(--text-primary) 3%, transparent)
    );
  }

  .option-main {
    display: flex;
    min-width: 0;
    flex: 1;
    align-items: center;
    gap: var(--space-2);
    padding: 6px 2.25rem 6px var(--space-2);
    border: 0;
    background: transparent;
    color: var(--text-primary);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .option-text {
    display: flex;
    min-width: 0;
    flex: 1;
    flex-direction: column;
    gap: 1px;
  }

  .option-title {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: var(--space-2);
  }

  .option-name,
  .option-detail {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .option-name {
    font-size: 0.8125rem;
    font-weight: 500;
  }

  .option-detail {
    color: var(--text-secondary);
    font-size: 0.72rem;
  }

  .option-main :global(.option-check) {
    flex-shrink: 0;
    color: var(--accent);
  }

  /* Visible solo en la fila activa (hover o teclado), para no llenar el
     menu de iconos repetidos. */
  .new-window {
    position: absolute;
    right: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 5px;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    opacity: 0;
    transition:
      opacity var(--duration-fast),
      color var(--duration-fast),
      background-color var(--duration-fast);
  }

  .option.active .new-window {
    opacity: 1;
  }

  .new-window:hover {
    background: color-mix(in srgb, var(--text-primary) 10%, transparent);
    color: var(--text-primary);
  }

  .menu-error {
    margin: var(--space-2);
    color: var(--danger);
    font-size: 0.75rem;
  }

  @media (prefers-reduced-motion: reduce) {
    .switcher-menu {
      animation: none;
    }
  }
</style>
