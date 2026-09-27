<script lang="ts">
  import DriverLogo from "$lib/components/DriverLogo.svelte";
  import { browser } from "$app/environment";
  import { LayoutGrid, List, LoaderCircle, Pencil, Plus, Trash2 } from "@lucide/svelte";
  import Button from "$lib/components/Button.svelte";
  import { getDriver } from "$lib/connections";
  import ConnectionAvatar from "$lib/components/ConnectionAvatar.svelte";
  import RowlyMark from "$lib/components/RowlyMark.svelte";
  import { NEUTRAL_IDENTITY_COLOR } from "$lib/connectionColors";
  import { t } from "$lib/i18n";
  import type { ConnectionProfile } from "$lib/stores/connectionProfiles";
  import { loadLastProfileId } from "$lib/stores/connection";

  let {
    profiles,
    connectingId = null,
    onnewconnection,
    onconnect,
    onedit,
    ondelete,
    error = null,
  }: {
    profiles: ConnectionProfile[];
    connectingId?: string | null;
    onnewconnection: () => void;
    onconnect: (profile: ConnectionProfile) => void;
    onedit: (profile: ConnectionProfile) => void;
    ondelete: (profile: ConnectionProfile) => void;
    error?: string | null;
  } = $props();

  type View = "cards" | "list";
  const VIEW_KEY = "khipu:connections-view:v1";

  function loadView(): View {
    if (!browser) return "cards";
    try {
      return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "cards";
    } catch {
      return "cards";
    }
  }

  let view = $state<View>(loadView());

  function setView(next: View) {
    view = next;
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // Sin almacenamiento, la vista dura lo que dure la sesion.
    }
  }

  // Primero las conexiones sin grupo, sin titulo; despues una seccion por
  // grupo, en orden alfabetico.
  const sections = $derived.by(() => {
    const byGroup = new Map<string, ConnectionProfile[]>();
    for (const profile of profiles) {
      const key = profile.group ?? "";
      byGroup.set(key, [...(byGroup.get(key) ?? []), profile]);
    }
    const named = [...byGroup.keys()].filter((key) => key !== "").sort((a, b) => a.localeCompare(b));
    const ordered = [...(byGroup.has("") ? [""] : []), ...named];
    return ordered.map((key) => ({
      title: key || null,
      profiles: byGroup.get(key) ?? [],
    }));
  });

  const busy = $derived(connectingId !== null);

  // La ultima conexion usada queda resaltada y con el foco: al abrir la app
  // basta Enter para volver a ella.
  const lastProfileId = loadLastProfileId();

  function focusIfLast(node: HTMLButtonElement, profileId: string) {
    if (profileId === lastProfileId) node.focus();
  }

  function identityStyle(profile: ConnectionProfile): string {
    return `--identity: ${profile.color ?? NEUTRAL_IDENTITY_COLOR}`;
  }

  function endpoint(profile: ConnectionProfile): string {
    return `${profile.host}:${profile.port}`;
  }
</script>

{#snippet cornerActions(profile: ConnectionProfile)}
  <button
    class="corner-button"
    type="button"
    aria-label={$t("connections.landing.editLabel", { name: profile.name })}
    title={$t("connections.landing.editTitle")}
    disabled={busy}
    onclick={(event) => {
      event.stopPropagation();
      onedit(profile);
    }}
  >
    <Pencil size={13} aria-hidden="true" />
  </button>
  <button
    class="corner-button danger"
    type="button"
    aria-label={$t("connections.landing.deleteLabel", { name: profile.name })}
    title={$t("connections.landing.deleteTitle")}
    disabled={busy}
    onclick={(event) => {
      event.stopPropagation();
      ondelete(profile);
    }}
  >
    <Trash2 size={13} aria-hidden="true" />
  </button>
{/snippet}

<section class="landing" aria-labelledby="connection-state-title">
  {#if profiles.length === 0}
    <div class="empty">
      <span class="brand-mark"><RowlyMark /></span>
      <h1 id="connection-state-title">{$t("connections.landing.emptyTitle")}</h1>
      <p>{$t("connections.landing.emptyText")}</p>
      <Button type="button" variant="primary" onclick={onnewconnection}>{$t("connections.newConnection")}</Button>
    </div>
  {:else}
    <div class="saved">
      <header class="landing-header">
        <div class="landing-title">
          <RowlyMark />
          <div>
            <h1 id="connection-state-title">{$t("connections.landing.title")}</h1>
            <p>{$t("connections.landing.subtitle")}</p>
          </div>
        </div>
        <div class="toolbar">
          <div class="view-toggle" role="group" aria-label={$t("connections.landing.view")}>
            <button
              type="button"
              aria-pressed={view === "cards"}
              aria-label={$t("connections.landing.viewCards")}
              title={$t("connections.landing.cards")}
              onclick={() => setView("cards")}
            >
              <LayoutGrid size={15} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-pressed={view === "list"}
              aria-label={$t("connections.landing.viewList")}
              title={$t("connections.landing.list")}
              onclick={() => setView("list")}
            >
              <List size={15} aria-hidden="true" />
            </button>
          </div>
          <Button type="button" variant="primary" onclick={onnewconnection}>
            <span class="new-label"><Plus size={15} aria-hidden="true" /> {$t("connections.landing.new")}</span>
          </Button>
        </div>
      </header>
      {#if error}
        <p class="landing-error" role="alert">{error}</p>
      {/if}

      {#each sections as section (section.title ?? "")}
        <section class="group" aria-label={section.title ?? $t("connections.landing.ungrouped")}>
          {#if section.title}
            <h2 class="group-title">
              {section.title}
              <span class="group-count">{section.profiles.length}</span>
            </h2>
          {/if}

          {#if view === "cards"}
            <div class="card-grid">
              {#each section.profiles as profile (profile.id)}
                {@const driver = getDriver(profile.driver)}
                <div
                  class="card"
                  class:connecting={connectingId === profile.id}
                  class:recent={profile.id === lastProfileId}
                  style={identityStyle(profile)}>
                  <button
                    class="card-main"
                    type="button"
                    aria-label={$t("connections.landing.connectTo", { name: profile.name, driver: driver.name })}
                    aria-busy={connectingId === profile.id}
                    disabled={busy}
                    use:focusIfLast={profile.id}
                    onclick={() => onconnect(profile)}
                  >
                    <ConnectionAvatar name={profile.name} color={profile.color} size={40} />
                    <span class="card-text">
                      <strong>{profile.name}</strong>
                      <span class="meta">{driver.name}<span class="sep">·</span>{profile.database}</span>
                      <code class="endpoint">{endpoint(profile)}</code>
                    </span>
                  </button>
                  <div class="card-corner">
                    {#if connectingId === profile.id}
                      <LoaderCircle size={15} class="spin" aria-label={$t("connections.connecting")} />
                    {:else}
                      {@render cornerActions(profile)}
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <div class="list" role="list">
              {#each section.profiles as profile (profile.id)}
                {@const driver = getDriver(profile.driver)}
                <div
                  class="row"
                  class:connecting={connectingId === profile.id}
                  class:recent={profile.id === lastProfileId}
                  role="listitem"
                  style={identityStyle(profile)}
                >
                  <button
                    class="row-main"
                    type="button"
                    aria-label={$t("connections.landing.connectTo", { name: profile.name, driver: driver.name })}
                    aria-busy={connectingId === profile.id}
                    disabled={busy}
                    use:focusIfLast={profile.id}
                    onclick={() => onconnect(profile)}
                  >
                    <ConnectionAvatar name={profile.name} color={profile.color} size={24} />
                    <strong class="row-name">{profile.name}</strong>
                    <span class="row-driver">
                      <DriverLogo driver={profile.driver} size={13} />
                      {driver.name}
                    </span>
                    <span class="row-database">{profile.database}</span>
                    <code class="endpoint">{endpoint(profile)}</code>
                  </button>
                  <div class="row-corner">
                    {#if connectingId === profile.id}
                      <LoaderCircle size={15} class="spin" aria-label={$t("connections.connecting")} />
                    {:else}
                      {@render cornerActions(profile)}
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </section>
      {/each}
    </div>
  {/if}
</section>

<style>
  .landing {
    width: 100%;
    height: 100%;
    overflow: auto;
    padding: var(--space-6);
    box-sizing: border-box;
  }

  .empty {
    display: flex;
    min-height: calc(100dvh - 2.625rem - (var(--space-6) * 2));
    box-sizing: border-box;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    text-align: center;
  }

  .brand-mark {
    display: block;
    margin-bottom: var(--space-1);
  }

  .saved {
    width: min(100%, 56rem);
    margin: 0 auto;
    padding-top: clamp(var(--space-5), 6vh, 3.5rem);
  }

  .landing-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--space-4);
    margin-bottom: var(--space-6);
  }

  .landing-error {
    margin: calc(-1 * var(--space-3)) 0 var(--space-4);
    color: var(--danger);
    font-size: 0.8125rem;
  }

  .landing-title {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  h1 {
    margin: 0 0 var(--space-1);
    color: var(--text-primary);
    font-size: var(--font-size-heading);
    font-weight: var(--font-weight-heading);
    letter-spacing: var(--tracking-heading);
    line-height: var(--leading-heading);
  }

  p {
    margin: 0;
    color: var(--text-secondary);
    line-height: var(--leading-body);
  }

  .toolbar {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: var(--space-3);
  }

  .new-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .view-toggle {
    display: inline-flex;
    padding: 2px;
    border-radius: var(--radius-sm);
    background: var(--surface-elevated);
  }

  .view-toggle button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.875rem;
    height: 1.75rem;
    padding: 0;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition:
      color var(--duration-fast),
      background-color var(--duration-fast);
  }

  .view-toggle button:hover {
    color: var(--text-primary);
  }

  .view-toggle button[aria-pressed="true"] {
    background: var(--surface);
    color: var(--text-primary);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
  }

  /* En claro elevated es blanco: el riel toma el hover y el segmento activo
     va en blanco con una sombra suave, en vez de un riel blanco con un
     segmento gris que se lee hundido. */
  :global(:root[data-scheme="light"]) .view-toggle {
    background: var(--surface-hover);
  }

  :global(:root[data-scheme="light"]) .view-toggle button[aria-pressed="true"] {
    background: var(--surface-elevated);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  }

  .view-toggle button:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 1px;
  }

  .group + .group {
    margin-top: var(--space-6);
  }

  .group-title {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
    margin: 0 0 var(--space-3);
    color: var(--text-secondary);
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .group-count {
    font-weight: 400;
    letter-spacing: 0;
    opacity: 0.8;
  }

  /* --- Identidad compartida por tarjetas y filas ------------------------ */

  .endpoint {
    overflow: hidden;
    color: var(--text-secondary);
    font-family: ui-monospace, "SF Mono", "JetBrains Mono", monospace;
    font-size: 0.72rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .corner-button {
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

  .card:hover .corner-button,
  .card:focus-within .corner-button,
  .row:hover .corner-button,
  .row:focus-within .corner-button {
    opacity: 1;
  }

  .corner-button:hover:not(:disabled) {
    background: color-mix(in srgb, var(--text-primary) 10%, transparent);
    color: var(--text-primary);
  }

  .corner-button.danger:hover:not(:disabled) {
    background: color-mix(in srgb, var(--danger) 14%, transparent);
    color: var(--danger);
  }

  .corner-button:focus-visible {
    opacity: 1;
    outline: 2px solid var(--focus-ring);
    outline-offset: 1px;
  }

  .corner-button:disabled {
    cursor: not-allowed;
  }

  .card-corner :global(.spin),
  .row-corner :global(.spin) {
    color: var(--identity);
    animation: landing-spin 0.8s linear infinite;
  }

  @keyframes landing-spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* --- Tarjetas ---------------------------------------------------------- */

  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
    gap: var(--space-3);
  }

  .card {
    position: relative;
    min-width: 0;
  }

  /* El degradado vive en un pseudo-elemento para poder animar su opacidad:
     los gradientes en si no se interpolan con transition. */
  /* Horizontal y compacta: avatar a la izquierda, los tres datos a la
     derecha, sin espacio muerto. El padding derecho deja lugar al lapiz. */
  .card-main {
    position: relative;
    display: flex;
    width: 100%;
    align-items: center;
    gap: var(--space-3);
    overflow: hidden;
    padding: var(--space-3) 3.75rem var(--space-3) var(--space-3);
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

  .card-main::before {
    content: "";
    position: absolute;
    inset: 0;
    background:
      radial-gradient(90% 160% at 0% 50%, color-mix(in srgb, var(--identity) 26%, transparent), transparent 60%),
      linear-gradient(180deg, color-mix(in srgb, var(--identity) 8%, transparent), transparent 70%);
    opacity: 0;
    pointer-events: none;
    transition: opacity 240ms ease;
  }

  :global(:root[data-scheme="light"]) .card-main::before {
    background:
      radial-gradient(90% 160% at 0% 50%, color-mix(in srgb, var(--identity) 16%, transparent), transparent 60%),
      linear-gradient(180deg, color-mix(in srgb, var(--identity) 5%, transparent), transparent 70%);
  }

  .card-main > :global(*) {
    position: relative;
  }

  /* Solo el degradado lleva el color; el borde apenas se aclara, en
     neutro, a medio camino entre el borde normal y el de los controles. */
  .card-main:hover:not(:disabled),
  .card.connecting .card-main {
    border-color: color-mix(in srgb, var(--border) 65%, var(--control-border));
    transform: translateY(-1px);
  }

  .card-main:hover:not(:disabled)::before,
  .card.connecting .card-main::before,
  .card.recent .card-main::before {
    opacity: 1;
  }

  .card-main:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
  }

  .card-main:disabled {
    cursor: default;
  }

  .card-text {
    display: flex;
    min-width: 0;
    flex: 1;
    flex-direction: column;
    gap: 2px;
  }

  .card-text strong {
    overflow: hidden;
    font-size: 0.875rem;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .meta {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 5px;
    overflow: hidden;
    color: var(--text-secondary);
    font-size: 0.8rem;
    white-space: nowrap;
  }

  .sep {
    opacity: 0.6;
  }

  .card-corner {
    position: absolute;
    top: var(--space-2);
    right: var(--space-2);
    display: flex;
    gap: 2px;
  }

  /* --- Lista compacta ---------------------------------------------------- */

  .list {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
  }

  .row {
    position: relative;
  }

  .row + .row {
    border-top: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  }

  .row-main {
    position: relative;
    display: grid;
    width: 100%;
    grid-template-columns: 1.5rem minmax(8rem, 1.4fr) minmax(6rem, 0.8fr) minmax(6rem, 1fr) minmax(8rem, 1.2fr);
    align-items: center;
    gap: var(--space-3);
    padding: 9px 4rem 9px var(--space-3);
    border: 0;
    background: transparent;
    color: var(--text-primary);
    font: inherit;
    font-size: 0.8125rem;
    text-align: left;
    cursor: pointer;
  }

  .row-main::before {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, color-mix(in srgb, var(--identity) 18%, transparent), transparent 55%);
    opacity: 0;
    pointer-events: none;
    transition: opacity 200ms ease;
  }

  :global(:root[data-scheme="light"]) .row-main::before {
    background: linear-gradient(90deg, color-mix(in srgb, var(--identity) 11%, transparent), transparent 55%);
  }

  .row-main > :global(*) {
    position: relative;
  }

  .row-main:hover:not(:disabled)::before,
  .row.connecting .row-main::before,
  .row.recent .row-main::before {
    opacity: 1;
  }

  .row-main:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: -2px;
  }

  .row-main:disabled {
    cursor: default;
  }

  .row-name,
  .row-database {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .row-name {
    font-weight: 600;
  }

  .row-driver {
    display: flex;
    align-items: center;
    gap: 6px;
    overflow: hidden;
    color: var(--text-secondary);
    white-space: nowrap;
  }

  .row-database {
    color: var(--text-secondary);
  }

  .row-corner {
    position: absolute;
    top: 50%;
    right: var(--space-2);
    display: flex;
    gap: 2px;
    transform: translateY(-50%);
  }

  @media (max-width: 44rem) {
    .landing-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .row-main {
      grid-template-columns: 1.5rem minmax(0, 1fr) auto;
    }

    .row-database,
    .row-main .endpoint {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .card-main,
    .card-main::before,
    .row-main::before {
      transition: none;
    }

    .card-main:hover:not(:disabled) {
      transform: none;
    }

    .card-corner :global(.spin),
    .row-corner :global(.spin) {
      animation: none;
    }
  }
</style>
