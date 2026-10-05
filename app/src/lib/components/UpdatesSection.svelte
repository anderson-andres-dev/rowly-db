<script lang="ts">
  import { tooltip } from "$lib/tooltip";
  import { onMount } from "svelte";
  import { openUrl } from "@tauri-apps/plugin-opener";
  import { ArrowDownToLine, ChevronRight, CircleAlert, CircleCheck, ExternalLink, LoaderCircle, RefreshCw, RotateCcw, Undo2 } from "@lucide/svelte";
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
  import { locale, t, type MessageKey } from "$lib/i18n";
  import {
    checkForUpdates,
    checking,
    installRelease,
    installState,
    newerRelease,
    releases,
    releasesError,
    retryAt,
    restartApp,
    updateContext,
    updatePrefs,
    visibleReleases,
    type ReleaseInfo,
  } from "$lib/stores/updates";

  let pendingRollback = $state<ReleaseInfo | null>(null);
  let openNotes = $state<string | null>(null);
  // Las versiones anteriores a la instalada, plegadas: son las que casi
  // nunca se buscan y alargaban la seccion sin fin.
  let showOlder = $state(false);

  onMount(() => {
    void checkForUpdates({ automatic: true });
  });

  const busy = $derived($installState.phase === "downloading" || $installState.phase === "installing");
  const canInstall = $derived($updateContext?.canInstall ?? false);
  // Una version ya instalada que espera el reinicio: la app en marcha sigue
  // siendo la vieja, asi que la lista todavia la muestra como "nueva".
  // Mientras tanto no se ofrece instalar nada: primero reiniciar.
  const pendingRestart = $derived($installState.phase === "done" ? $installState : null);
  const mainReleases = $derived($visibleReleases.filter((release) => release.relation !== "older"));
  const olderReleases = $derived($visibleReleases.filter((release) => release.relation === "older"));
  const checkErrorText = $derived.by(() => {
    if (!$releasesError) return "";
    const message = $t(`updates.error.${$releasesError}` as MessageKey);
    if ($releasesError !== "rateLimited" || $retryAt === null) return message;
    const time = new Intl.DateTimeFormat($locale, { hour: "numeric", minute: "2-digit" }).format(new Date($retryAt));
    return `${message} ${$t("updates.error.retryAt", { time })}`;
  });

  // El desvanecido de la lista de anteriores, solo del lado donde queda algo
  // por ver.
  let olderList = $state<HTMLElement>();
  let fadeTop = $state(false);
  let fadeBottom = $state(false);

  function updateFades() {
    if (!olderList) return;
    const { scrollTop, scrollHeight, clientHeight } = olderList;
    fadeTop = scrollTop > 1;
    fadeBottom = scrollTop + clientHeight < scrollHeight - 1;
  }

  $effect(() => {
    olderReleases;
    showOlder;
    if (olderList) requestAnimationFrame(updateFades);
  });

  function formatDate(iso: string | null): string {
    if (!iso) return "—";
    return new Intl.DateTimeFormat($locale, { year: "numeric", month: "short", day: "numeric" }).format(new Date(iso));
  }


  function progressPercent(downloaded: number, total: number | null): string {
    if (!total) return "";
    return new Intl.NumberFormat($locale, { style: "percent" }).format(Math.min(1, downloaded / total));
  }

  function choose(release: ReleaseInfo) {
    if (release.relation === "older") pendingRollback = release;
    else void installRelease(release);
  }

  function open(url: string) {
    void openUrl(url);
  }

  function rowState(release: ReleaseInfo) {
    return $installState.phase !== "idle" && $installState.tag === release.tag ? $installState : null;
  }
</script>

{#snippet releaseRow(release: ReleaseInfo)}
  {@const state = rowState(release)}
  <div class="set-row release" class:current={release.relation === "current"}>
    <div class="release-main">
      <button
        class="version-toggle"
        type="button"
        aria-expanded={openNotes === release.tag}
        use:tooltip={$t("updates.action.notes")}
        onclick={() => (openNotes = openNotes === release.tag ? null : release.tag)}
      >
        v{release.version}
      </button>
      {#if state?.phase === "done"}
        <span class="badge ready">{$t("updates.badge.ready")}</span>
      {:else if release.relation === "current"}
        <span class="badge installed">{$t("updates.badge.installed")}</span>
      {:else if release.relation === "newer"}
        <span class="badge newer">{$t("updates.badge.newer")}</span>
      {/if}
      {#if release.prerelease}
        <span class="badge">{$t("updates.badge.prerelease")}</span>
      {/if}
      <span class="date">{formatDate(release.publishedAt)}</span>
    </div>
    <div class="release-action">
      {#if state?.phase === "downloading"}
        <span class="progress-text">
          <LoaderCircle size={13} class="spin" aria-hidden="true" />
          {$t("updates.progress.downloading", {
            version: `v${release.version}`,
            percent: progressPercent(state.downloaded, state.total),
          })}
        </span>
      {:else if state?.phase === "installing"}
        <span class="progress-text">
          <LoaderCircle size={13} class="spin" aria-hidden="true" />
          {$t("updates.progress.installing", { version: `v${release.version}` })}
        </span>
      {:else if state?.phase === "done" || release.relation === "current"}
        <!-- Instalada (o lista para usar tras reiniciar): la etiqueta lo dice. -->
      {:else if canInstall && release.installable}
        {@const latest = release.tag === $newerRelease?.tag && !pendingRestart}
        <!-- Con otra version esperando el reinicio, primero reiniciar. -->
        <span use:tooltip={pendingRestart ? $t("updates.restartFirst", { version: `v${pendingRestart.version}` }) : null}>
          <button
            class="action-button small {latest ? 'primary' : 'secondary'}"
            type="button"
            disabled={busy || !!pendingRestart}
            onclick={() => choose(release)}
          >
            {#if release.relation === "newer"}
              <ArrowDownToLine size={13} aria-hidden="true" />
              {release.tag === $newerRelease?.tag ? $t("updates.action.update") : $t("updates.action.install")}
            {:else}
              <Undo2 size={13} aria-hidden="true" />
              {$t("updates.action.rollback")}
            {/if}
          </button>
        </span>
      {:else}
        <button class="link" type="button" onclick={() => open(release.url)}>
          {$t("updates.action.download")}
          <ExternalLink size={12} aria-hidden="true" />
        </button>
      {/if}
    </div>
    {#if state?.phase === "downloading" && state.total}
      <div class="progress-bar" aria-hidden="true">
        <span style:width={`${Math.min(100, (state.downloaded / state.total) * 100)}%`}></span>
      </div>
    {/if}
    {#if state?.phase === "error"}
      <p class="row-extra row-error" role="alert">{$t(`updates.error.${state.code}` as MessageKey)}</p>
    {/if}
    {#if openNotes === release.tag}
      <div class="row-extra notes">{release.notes.trim() || $t("updates.noNotes")}</div>
    {/if}
  </div>
{/snippet}

<!-- Mismo lenguaje que el resto de Ajustes (styles/controls.css): la version
     instalada arriba, las publicadas en una lista de filas y las
     preferencias al final. -->
<div class="updates">
  <!-- Arriba, lo justo: la version instalada, si hay otra y la accion que
       toca (reiniciar, actualizar o buscar). -->
  <div class="set-group">
    <div class="set-row summary" aria-live="polite">
      <div class="set-text">
        <span class="summary-version">v{$updateContext?.currentVersion ?? "…"}</span>
        {#if pendingRestart}
          <span class="set-desc status ready">
            <CircleCheck size={13} aria-hidden="true" />
            {$t("updates.done", { version: `v${pendingRestart.version}` })}
          </span>
        {:else if $releases && !$releasesError && $newerRelease}
          <span class="available">
            <ArrowDownToLine size={13} aria-hidden="true" />
            {$t("updates.newerAvailable", { version: `v${$newerRelease.version}` })}
          </span>
        {:else if $releases && !$releasesError && $releases.length > 0}
          <span class="set-desc status">
            <CircleCheck size={13} aria-hidden="true" />
            {$t("updates.upToDate")}
          </span>
        {/if}
      </div>
      <div class="summary-actions">
        {#if $releasesError}
          <span class="check-error" role="img" aria-label={checkErrorText} title={checkErrorText}>
            <CircleAlert size={15} aria-hidden="true" />
          </span>
        {/if}
        {#if pendingRestart}
          <button class="action-button primary small" type="button" onclick={() => void restartApp()}>
            <RotateCcw size={13} aria-hidden="true" />
            {$t("updates.restart")}
          </button>
        {:else}
          {@const newest = $newerRelease && canInstall && $newerRelease.installable ? $newerRelease : null}
          {#if newest}
            <!-- Con una version nueva, buscar otra vez queda como icono. -->
            <button
              class="ui-icon-button"
              type="button"
              aria-label={$t("updates.check")}
              use:tooltip={$t("updates.check")}
              disabled={$checking || busy || $retryAt !== null}
              onclick={() => void checkForUpdates()}
            >
              <RefreshCw size={14} class={$checking ? "spin" : undefined} aria-hidden="true" />
            </button>
            <button class="action-button primary small" type="button" disabled={busy} onclick={() => choose(newest)}>
              <ArrowDownToLine size={13} aria-hidden="true" />
              {$t("updates.action.update")}
            </button>
          {:else}
            <button
              class="action-button secondary small"
              type="button"
              disabled={$checking || busy || $retryAt !== null}
              onclick={() => void checkForUpdates()}
            >
              <RefreshCw size={13} class={$checking ? "spin" : undefined} aria-hidden="true" />
              {$checking ? $t("updates.checking") : $t("updates.check")}
            </button>
          {/if}
        {/if}
      </div>
    </div>
  </div>

  {#if $releases && $visibleReleases.length === 0 && !$releasesError}
    <p class="notice">{$t("updates.empty")}</p>
  {:else if $releases && $visibleReleases.length > 0}
    <h3 class="set-caption">{$t("updates.table.version")}</h3>
    <div class="set-group">
      {#each mainReleases as release (release.tag)}
        {@render releaseRow(release)}
      {/each}
    </div>
    {#if olderReleases.length > 0}
      <button
        class="older-toggle"
        type="button"
        aria-expanded={showOlder}
        aria-controls="older-releases"
        onclick={() => (showOlder = !showOlder)}
      >
        <ChevronRight size={13} aria-hidden="true" class="chevron" />
        {$t("updates.older", { count: olderReleases.length })}
      </button>
      {#if showOlder}
        <div
          id="older-releases"
          class="set-group older-list"
          class:fade-top={fadeTop}
          class:fade-bottom={fadeBottom}
          bind:this={olderList}
          onscroll={updateFades}
        >
          {#each olderReleases as release (release.tag)}
            {@render releaseRow(release)}
          {/each}
        </div>
      {/if}
    {/if}
  {/if}

  <div class="set-group prefs">
    <div class="set-row">
      <span class="set-label" id="auto-check-label">{$t("updates.autoCheck")}</span>
      <button
        class="ui-switch"
        type="button"
        role="switch"
        aria-checked={$updatePrefs.autoCheck}
        aria-labelledby="auto-check-label"
        onclick={() => updatePrefs.update((prefs) => ({ ...prefs, autoCheck: !prefs.autoCheck }))}
      >
        <span></span>
      </button>
    </div>
    <div class="set-row">
      <span class="set-label" id="prereleases-label">{$t("updates.prereleases")}</span>
      <button
        class="ui-switch"
        type="button"
        role="switch"
        aria-checked={$updatePrefs.includePrereleases}
        aria-labelledby="prereleases-label"
        onclick={() => updatePrefs.update((prefs) => ({ ...prefs, includePrereleases: !prefs.includePrereleases }))}
      >
        <span></span>
      </button>
    </div>
  </div>
</div>

{#if pendingRollback}
  {@const target = pendingRollback}
  <ConfirmDialog
    tone="warning"
    title={$t("updates.rollback.title", { version: `v${target.version}` })}
    message={$t("updates.rollback.message")}
    confirmLabel={$t("updates.rollback.confirm", { version: `v${target.version}` })}
    onconfirm={() => {
      pendingRollback = null;
      void installRelease(target);
    }}
    oncancel={() => (pendingRollback = null)}
  />
{/if}

<style>
  .updates {
    display: flex;
    flex-direction: column;
  }

  .set-caption {
    margin-top: var(--space-6);
  }

  .prefs {
    margin-top: var(--space-6);
  }

  .summary-version {
    display: inline-flex;
    align-items: baseline;
    gap: var(--space-2);
    font-size: 1.0625rem;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .summary-actions {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: var(--space-2);
  }

  /* La version nueva se ve de un vistazo: una pastilla del color de acento. */
  .available {
    display: inline-flex;
    align-self: flex-start;
    align-items: center;
    gap: var(--space-1);
    padding: 2px var(--space-2);
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent) 16%, transparent);
    color: var(--accent);
    font-size: 0.75rem;
    font-weight: 600;
  }

  .status {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
  }

  .status.ready {
    color: var(--success);
    font-weight: 500;
  }

  .notice {
    margin: var(--space-3) 0 0 var(--space-1);
    color: var(--text-secondary);
    font-size: 0.75rem;
  }

  .check-error {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 50%;
    background: color-mix(in srgb, var(--danger) 10%, transparent);
    color: var(--danger);
    cursor: help;
  }

  /* Una version por fila; lo que se despliega (notas, progreso, aviso)
     ocupa el ancho completo debajo. */
  .release {
    flex-wrap: wrap;
    min-height: 2.75rem;
    row-gap: var(--space-2);
  }

  .release.current {
    background: color-mix(in srgb, var(--surface-elevated) 92%, var(--accent));
  }

  :global(:root[data-scheme="dark"]) .release.current {
    padding-inline: var(--space-3);
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--accent) 9%, transparent);
  }

  .release-main {
    display: flex;
    min-width: 0;
    flex: 1;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
  }

  .release-action {
    display: flex;
    flex-shrink: 0;
    align-items: center;
  }

  .version-toggle {
    padding: 0;
    border: 0;
    background: none;
    color: var(--text-primary);
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
  }

  .version-toggle:hover {
    color: var(--accent);
  }

  .version-toggle:focus-visible,
  .link:focus-visible {
    border-radius: 3px;
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
  }

  .date {
    color: var(--text-secondary);
    font-size: 0.75rem;
  }

  .badge {
    padding: 0.0625rem 0.4rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--text-primary) 8%, transparent);
    color: var(--text-secondary);
    font-size: 0.625rem;
    font-weight: 600;
  }

  .badge.installed {
    background: color-mix(in srgb, var(--accent) 16%, transparent);
    color: var(--accent);
  }

  .badge.ready {
    background: color-mix(in srgb, var(--success) 18%, transparent);
    color: var(--success);
  }

  .badge.newer {
    background: var(--accent);
    color: var(--text-on-accent);
  }

  .link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: 0;
    border: 0;
    background: none;
    color: var(--accent);
    font: inherit;
    font-size: 0.75rem;
    cursor: pointer;
  }

  .link:hover {
    text-decoration: underline;
  }

  .progress-text {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--text-secondary);
    font-size: 0.75rem;
  }

  .row-extra,
  .progress-bar {
    flex-basis: 100%;
  }

  .progress-bar {
    height: 3px;
    overflow: hidden;
    border-radius: 999px;
    background: var(--grid-line);
  }

  .progress-bar span {
    display: block;
    height: 100%;
    background: var(--accent);
    transition: width var(--duration-fast);
  }

  /* Las versiones anteriores, plegadas bajo la lista. */
  .older-toggle {
    display: inline-flex;
    align-self: flex-start;
    align-items: center;
    gap: var(--space-1);
    margin-top: var(--space-3);
    padding: 2px var(--space-1);
    border: 0;
    border-radius: var(--radius-sm);
    background: none;
    color: var(--text-secondary);
    font: inherit;
    font-size: 0.75rem;
    cursor: pointer;
  }

  .older-toggle:hover {
    color: var(--text-primary);
  }

  .older-toggle:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 1px;
  }

  .older-toggle :global(.chevron) {
    transition: transform var(--duration-fast) ease;
  }

  .older-toggle[aria-expanded="true"] :global(.chevron) {
    transform: rotate(90deg);
  }

  /* Con scroll propio y el borde que sigue desvanecido: se ve que hay mas
     sin que la seccion entera se alargue. */
  .older-list {
    max-height: 16rem;
    margin-top: var(--space-2);
    overflow-y: auto;
    overscroll-behavior: contain;
    --fade: 1.75rem;
  }

  .older-list.fade-bottom {
    mask-image: linear-gradient(to bottom, #000 calc(100% - var(--fade)), transparent);
  }

  .older-list.fade-top {
    mask-image: linear-gradient(to bottom, transparent, #000 var(--fade));
  }

  .older-list.fade-top.fade-bottom {
    mask-image: linear-gradient(to bottom, transparent, #000 var(--fade), #000 calc(100% - var(--fade)), transparent);
  }

  .row-error {
    margin: 0;
    color: var(--danger);
    font-size: 0.75rem;
  }

  .notes {
    max-height: 12rem;
    overflow: auto;
    color: var(--text-secondary);
    font-size: 0.75rem;
    line-height: 1.5;
    white-space: pre-wrap;
  }
</style>
