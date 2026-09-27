<script lang="ts">
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

<div class="updates">
  <section class="summary" aria-live="polite">
    <div class="summary-text">
      <span class="summary-label">{$t("updates.installed")}</span>
      <strong class="summary-version">v{$updateContext?.currentVersion ?? "…"}</strong>
      {#if $updateContext}
        <span class="summary-kind">{$t(`updates.kind.${$updateContext.installKind}` as MessageKey)}</span>
      {/if}
    </div>
    <div class="summary-actions">
      <button class="secondary" type="button" disabled={$checking || busy} onclick={() => void checkForUpdates()}>
        {#if $checking}
          <LoaderCircle size={14} class="spin" aria-hidden="true" />
          {$t("updates.checking")}
        {:else}
          <RefreshCw size={14} aria-hidden="true" />
          {$t("updates.check")}
        {/if}
      </button>
      {#if $lastChecked}
        <span class="muted">{$t("updates.lastChecked", { time: formatTime($lastChecked) })}</span>
      {/if}
    </div>
  </section>

  {#if $releases && !$releasesError}
    <p class="status" class:has-update={!!$newerRelease}>
      {#if $newerRelease}
        <ArrowDownToLine size={14} aria-hidden="true" />
        {$t("updates.newerAvailable", { version: `v${$newerRelease.version}` })}
      {:else if $releases.length > 0}
        <CircleCheck size={14} aria-hidden="true" />
        {$t("updates.upToDate")}
      {/if}
    </p>
  {/if}

  {#if $updateContext && !$updateContext.canInstall && $releases?.length}
    <p class="notice">{$t("updates.sourceNotice")}</p>
  {/if}

  {#if $releasesError}
    <div class="error-row" role="alert">
      <span>{$t(`updates.error.${$releasesError}` as MessageKey)}</span>
      <button class="secondary" type="button" onclick={() => void checkForUpdates()}>{$t("updates.retry")}</button>
    </div>
  {:else if $releases && $visibleReleases.length === 0}
    <p class="empty">{$t("updates.empty")}</p>
  {:else if $releases}
    <table class="versions">
      <thead>
        <tr>
          <th scope="col">{$t("updates.table.version")}</th>
          <th scope="col">{$t("updates.table.date")}</th>
          <th scope="col"><span class="visually-hidden">{$t("updates.table.action")}</span></th>
        </tr>
      </thead>
      <tbody>
        {#each $visibleReleases as release (release.tag)}
          {@const state = rowState(release)}
          <tr class:current={release.relation === "current"}>
            <td>
              <div class="version-cell">
                <button
                  class="version-toggle"
                  type="button"
                  aria-expanded={openNotes === release.tag}
                  title={$t("updates.action.notes")}
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
              </div>
            </td>
            <td class="muted">{formatDate(release.publishedAt)}</td>
            <td class="action-cell">
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
                <span class="muted">{$t("updates.badge.installed")}</span>
              {:else if canInstall && release.installable}
                {@const latest = release.tag === $newerRelease?.tag}
                <button
                  class:primary={latest}
                  class:secondary={!latest}
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
            </td>
          </tr>
          {#if state?.phase === "downloading" && state.total}
            <tr class="progress-row" aria-hidden="true">
              <td colspan="3">
                <div class="progress-bar">
                  <span style:width={`${Math.min(100, (state.downloaded / state.total) * 100)}%`}></span>
                </div>
              </td>
            </tr>
          {/if}
          {#if state?.phase === "done"}
            <tr class="message-row">
              <td colspan="3">
                <div class="done">
                  <span>{$t("updates.done", { version: `v${release.version}` })}</span>
                  <button class="primary" type="button" onclick={() => void restartApp()}>
                    <RotateCcw size={13} aria-hidden="true" />
                    {$t("updates.restart")}
                  </button>
                </div>
              </td>
            </tr>
          {:else if state?.phase === "error"}
            <tr class="message-row">
              <td colspan="3">
                <p class="row-error" role="alert">{$t(`updates.error.${state.code}` as MessageKey)}</p>
              </td>
            </tr>
          {/if}
          {#if openNotes === release.tag}
            <tr class="notes-row">
              <td colspan="3">
                <div class="notes">{release.notes.trim() || $t("updates.noNotes")}</div>
              </td>
            </tr>
          {/if}
        {/each}
      </tbody>
    </table>
  {/if}

  <div class="prefs">
    <div class="setting-row">
      <div class="setting-text">
        <span class="setting-label">{$t("updates.autoCheck")}</span>
      </div>
      <button
        class="switch"
        class:enabled={$updatePrefs.autoCheck}
        type="button"
        role="switch"
        aria-checked={$updatePrefs.autoCheck}
        aria-label={$t("updates.autoCheck")}
        onclick={() => updatePrefs.update((prefs) => ({ ...prefs, autoCheck: !prefs.autoCheck }))}
      >
        <span aria-hidden="true"></span>
      </button>
    </div>
    <div class="setting-row">
      <div class="setting-text">
        <span class="setting-label">{$t("updates.prereleases")}</span>
      </div>
      <button
        class="switch"
        class:enabled={$updatePrefs.includePrereleases}
        type="button"
        role="switch"
        aria-checked={$updatePrefs.includePrereleases}
        aria-label={$t("updates.prereleases")}
        onclick={() => updatePrefs.update((prefs) => ({ ...prefs, includePrereleases: !prefs.includePrereleases }))}
      >
        <span aria-hidden="true"></span>
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
    gap: var(--space-4);
  }

  .summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-4);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface-elevated);
  }

  .summary-text {
    display: grid;
    gap: 0.125rem;
  }

  .summary-label,
  .summary-kind,
  .muted {
    color: var(--text-secondary);
    font-size: 0.75rem;
  }

  .summary-version {
    font-size: 1.125rem;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .summary-actions {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--space-1);
  }

  .status,
  .notice,
  .empty {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.8125rem;
  }

  .status.has-update {
    color: var(--accent);
    font-weight: 600;
  }

  .notice {
    padding: var(--space-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--surface-elevated) 90%, var(--warning));
    color: var(--text-primary);
  }

  .error-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-3);
    border: 1px solid color-mix(in srgb, var(--danger) 45%, var(--border));
    border-radius: var(--radius-sm);
    color: var(--danger);
    font-size: 0.8125rem;
  }

  .versions {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    font-size: 0.8125rem;
  }

  .versions th {
    padding: var(--space-2) var(--space-3);
    border-bottom: 1px solid var(--border);
    background: var(--surface-elevated);
    color: var(--text-secondary);
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-align: left;
    text-transform: uppercase;
  }

  .versions td {
    padding: var(--space-2) var(--space-3);
    border-bottom: 1px solid var(--grid-line);
    vertical-align: middle;
  }

  .versions tbody tr:last-child td {
    border-bottom: 0;
  }

  .versions tr.current td {
    background: color-mix(in srgb, var(--surface) 92%, var(--accent));
  }

  .version-cell {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
  }

  .version-toggle {
    padding: 0;
    border: 0;
    background: none;
    color: var(--text-primary);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }

  .version-toggle:hover {
    color: var(--accent);
  }

  .version-toggle:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
    border-radius: 3px;
  }

  .badge {
    padding: 0.0625rem 0.4rem;
    border: 1px solid var(--border);
    border-radius: 999px;
    color: var(--text-secondary);
    font-size: 0.625rem;
    font-weight: 600;
  }

  .badge.installed {
    border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
    color: var(--accent);
  }

  .badge.newer {
    border-color: transparent;
    background: var(--accent);
    color: var(--text-on-accent);
  }

  .action-cell {
    text-align: right;
    white-space: nowrap;
  }

  button.primary,
  button.secondary {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: 0.3rem 0.65rem;
    border: 1px solid var(--control-border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--text-primary);
    font: inherit;
    font-size: 0.75rem;
    cursor: pointer;
  }

  button.primary {
    border-color: var(--accent);
    background: var(--accent);
    color: var(--text-on-accent);
  }

  button.primary:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  button.secondary:hover:not(:disabled) {
    background: var(--surface-hover);
  }

  button:disabled {
    cursor: default;
    opacity: 0.55;
  }

  button.link {
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

  button.link:hover {
    text-decoration: underline;
  }

  button:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
  }

  .progress-text {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--text-secondary);
    font-size: 0.75rem;
    white-space: normal;
  }

  .progress-row td {
    padding-top: 0;
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
    color: var(--text-primary);
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

  .prefs {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-5);
    padding: var(--space-4);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface-elevated);
  }

  .setting-text {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: var(--space-1);
  }

  .setting-label {
    font-size: 0.8125rem;
    font-weight: 600;
  }

  .switch {
    position: relative;
    width: 2.25rem;
    height: 1.25rem;
    flex: 0 0 auto;
    padding: 2px;
    border: 1px solid var(--control-border);
    border-radius: 999px;
    background: var(--surface);
    cursor: pointer;
    transition:
      border-color var(--duration-fast),
      background-color var(--duration-fast);
  }

  .switch span {
    display: block;
    width: 0.875rem;
    height: 0.875rem;
    border-radius: 50%;
    background: var(--text-secondary);
    transition:
      transform var(--duration-fast),
      background-color var(--duration-fast);
  }

  .switch.enabled {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 30%, var(--surface));
  }

  .switch.enabled span {
    transform: translateX(0.95rem);
    background: var(--accent);
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  :global(.updates .spin) {
    animation: updates-spin 0.9s linear infinite;
  }

  @keyframes updates-spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
