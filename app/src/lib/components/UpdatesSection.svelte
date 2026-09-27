<script lang="ts">
  import { tooltip } from "$lib/tooltip";
  import { onMount } from "svelte";
  import { openUrl } from "@tauri-apps/plugin-opener";
  import { ArrowDownToLine, CircleCheck, ExternalLink, LoaderCircle, RefreshCw, RotateCcw, Undo2 } from "@lucide/svelte";
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
  import { locale, t, type MessageKey } from "$lib/i18n";
  import {
    checkForUpdates,
    checking,
    installRelease,
    installState,
    lastChecked,
    loadUpdateContext,
    newerRelease,
    releases,
    releasesError,
    restartApp,
    updateContext,
    updatePrefs,
    visibleReleases,
    type ReleaseInfo,
  } from "$lib/stores/updates";

  let pendingRollback = $state<ReleaseInfo | null>(null);
  let openNotes = $state<string | null>(null);

  onMount(() => {
    void loadUpdateContext();
    // Al abrir la sección se busca si no hay datos o si la última búsqueda
    // tiene más de 10 minutos.
    const stale = !$lastChecked || Date.now() - $lastChecked.getTime() > 10 * 60 * 1000;
    if (!$releases || stale) void checkForUpdates();
  });

  const busy = $derived($installState.phase === "downloading" || $installState.phase === "installing");
  const canInstall = $derived($updateContext?.canInstall ?? false);

  function formatDate(iso: string | null): string {
    if (!iso) return "—";
    return new Intl.DateTimeFormat($locale, { year: "numeric", month: "short", day: "numeric" }).format(new Date(iso));
  }

  function formatTime(date: Date): string {
    return new Intl.DateTimeFormat($locale, { hour: "2-digit", minute: "2-digit" }).format(date);
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

<!-- Mismo lenguaje que el resto de Ajustes (styles/controls.css): la version
     instalada arriba, las publicadas en una lista de filas y las
     preferencias al final. -->
<div class="updates">
  <div class="set-group">
    <div class="set-row summary" aria-live="polite">
      <div class="set-text">
        <span class="summary-version">
          v{$updateContext?.currentVersion ?? "…"}
          {#if $updateContext}<span class="summary-kind">{$t(`updates.kind.${$updateContext.installKind}` as MessageKey)}</span>{/if}
        </span>
        <span class="set-desc status" class:has-update={!!$newerRelease}>
          {#if $releases && !$releasesError && $newerRelease}
            <ArrowDownToLine size={13} aria-hidden="true" />
            {$t("updates.newerAvailable", { version: `v${$newerRelease.version}` })}
          {:else if $releases && !$releasesError && $releases.length > 0}
            <CircleCheck size={13} aria-hidden="true" />
            {$t("updates.upToDate")}
          {/if}
          {#if $lastChecked}
            <span class="muted">
              {#if $releases && !$releasesError && ($newerRelease || $releases.length > 0)}·{/if}
              {$t("updates.lastChecked", { time: formatTime($lastChecked) })}
            </span>
          {/if}
        </span>
      </div>
      <button class="action-button secondary small" type="button" disabled={$checking || busy} onclick={() => void checkForUpdates()}>
        {#if $checking}
          <LoaderCircle size={13} class="spin" aria-hidden="true" />
          {$t("updates.checking")}
        {:else}
          <RefreshCw size={13} aria-hidden="true" />
          {$t("updates.check")}
        {/if}
      </button>
    </div>
  </div>

  {#if $updateContext && !$updateContext.canInstall && $releases?.length}
    <p class="notice">{$t("updates.sourceNotice")}</p>
  {/if}

  {#if $releasesError}
    <div class="set-group">
      <div class="set-row error-row" role="alert">
        <span>{$t(`updates.error.${$releasesError}` as MessageKey)}</span>
        <button class="action-button secondary small" type="button" onclick={() => void checkForUpdates()}>{$t("updates.retry")}</button>
      </div>
    </div>
  {:else if $releases && $visibleReleases.length === 0}
    <p class="notice">{$t("updates.empty")}</p>
  {:else if $releases}
    <h3 class="set-caption">{$t("updates.table.version")}</h3>
    <div class="set-group">
      {#each $visibleReleases as release (release.tag)}
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
            {#if release.relation === "current"}
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
            {:else if release.relation === "current"}
              <!-- Ya instalada: la etiqueta lo dice. -->
            {:else if canInstall && release.installable}
              {@const latest = release.tag === $newerRelease?.tag}
              <button
                class="action-button small {latest ? 'primary' : 'secondary'}"
                type="button"
                disabled={busy}
                onclick={() => choose(release)}
              >
                {#if release.relation === "newer"}
                  <ArrowDownToLine size={13} aria-hidden="true" />
                  {latest ? $t("updates.action.update") : $t("updates.action.install")}
                {:else}
                  <Undo2 size={13} aria-hidden="true" />
                  {$t("updates.action.rollback")}
                {/if}
              </button>
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
          {#if state?.phase === "done"}
            <div class="row-extra done">
              <span>{$t("updates.done", { version: `v${release.version}` })}</span>
              <button class="action-button primary small" type="button" onclick={() => void restartApp()}>
                <RotateCcw size={13} aria-hidden="true" />
                {$t("updates.restart")}
              </button>
            </div>
          {:else if state?.phase === "error"}
            <p class="row-extra row-error" role="alert">{$t(`updates.error.${state.code}` as MessageKey)}</p>
          {/if}
          {#if openNotes === release.tag}
            <div class="row-extra notes">{release.notes.trim() || $t("updates.noNotes")}</div>
          {/if}
        </div>
      {/each}
    </div>
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

  .summary-kind,
  .muted {
    color: var(--text-secondary);
    font-size: 0.75rem;
    font-weight: 400;
    letter-spacing: 0;
  }

  .status {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
  }

  .status.has-update {
    color: var(--accent);
    font-weight: 500;
  }

  .notice {
    margin: var(--space-3) 0 0 var(--space-1);
    color: var(--text-secondary);
    font-size: 0.75rem;
  }

  .error-row {
    color: var(--danger);
    font-size: 0.8125rem;
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

  .done {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    font-size: 0.8125rem;
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
