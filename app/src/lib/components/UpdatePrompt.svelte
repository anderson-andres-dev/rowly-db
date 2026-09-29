<script lang="ts">
  import { tick } from "svelte";
  import { openUrl } from "@tauri-apps/plugin-opener";
  import { ArrowDownToLine, CircleCheck, RotateCcw } from "@lucide/svelte";
  import Checkbox from "$lib/components/Checkbox.svelte";
  import { locale, t, type MessageKey } from "$lib/i18n";
  import {
    dismissUpdatePrompt,
    installRelease,
    installState,
    restartApp,
    updateContext,
    type ReleaseInfo,
  } from "$lib/stores/updates";

  // El aviso al abrir la app cuando hay una version nueva (updates.ts,
  // checkOnStartup): todo se hace desde aca, descargar, instalar y
  // reiniciar. "No volver a preguntar" omite solo esta version.
  let { release }: { release: ReleaseInfo } = $props();

  let dialog = $state<HTMLDialogElement>();
  let skip = $state(false);
  let showNotes = $state(false);

  const install = $derived($installState.phase !== "idle" && $installState.tag === release.tag ? $installState : null);
  const busy = $derived(install?.phase === "downloading" || install?.phase === "installing");
  const canInstall = $derived(($updateContext?.canInstall ?? false) && release.installable);
  const notes = $derived(release.notes.trim());

  $effect(() => {
    void tick().then(() => {
      dialog?.showModal();
      dialog?.focus();
    });
  });

  function percent(downloaded: number, total: number | null): string {
    if (!total) return "";
    return new Intl.NumberFormat($locale, { style: "percent" }).format(Math.min(1, downloaded / total));
  }

  // El cierre llega por el evento close, al terminar la animacion de salida.
  function close() {
    dialog?.close();
  }

  function update() {
    if (canInstall) {
      void installRelease(release);
    } else {
      // Esta copia no se actualiza sola (compilacion local): su pagina.
      void openUrl(release.url);
      close();
    }
  }
</script>

<dialog
  class="update-prompt"
  tabindex="-1"
  aria-labelledby="update-prompt-title"
  bind:this={dialog}
  oncancel={(event) => {
    event.preventDefault();
    if (!busy) close();
  }}
  onclose={() => dismissUpdatePrompt(skip)}
>
  <span class="hero" class:ready={install?.phase === "done"} aria-hidden="true">
    {#if install?.phase === "done"}
      <CircleCheck size={22} strokeWidth={2} />
    {:else}
      <ArrowDownToLine size={22} strokeWidth={2} />
    {/if}
  </span>

  <h2 id="update-prompt-title">{$t("updates.newerAvailable", { version: `v${release.version}` })}</h2>
  <p class="current">
    {#if install?.phase === "done"}
      {$t("updates.done", { version: `v${release.version}` })}
    {:else}
      {$t("updates.prompt.current", { version: `v${$updateContext?.currentVersion ?? "…"}` })}
    {/if}
  </p>

  {#if notes && !install}
    <button class="notes-toggle" type="button" aria-expanded={showNotes} onclick={() => (showNotes = !showNotes)}>
      {$t("updates.prompt.whatsNew")}
    </button>
    {#if showNotes}
      <div class="notes">{notes}</div>
    {/if}
  {/if}

  {#if install?.phase === "downloading"}
    <div class="progress" role="status">
      <div class="bar" aria-hidden="true">
        <span style:width={install.total ? `${Math.min(100, (install.downloaded / install.total) * 100)}%` : "0%"}></span>
      </div>
      <span>{$t("updates.progress.downloading", { version: `v${release.version}`, percent: percent(install.downloaded, install.total) })}</span>
    </div>
  {:else if install?.phase === "installing"}
    <p class="progress" role="status">{$t("updates.progress.installing", { version: `v${release.version}` })}</p>
  {:else if install?.phase === "error"}
    <p class="error" role="alert">{$t(`updates.error.${install.code}` as MessageKey)}</p>
  {/if}

  <div class="actions">
    {#if install?.phase === "done"}
      <button class="action-button secondary" type="button" onclick={close}>{$t("updates.prompt.later")}</button>
      <button class="action-button primary" type="button" onclick={() => void restartApp()}>
        <RotateCcw size={14} aria-hidden="true" />
        {$t("updates.restart")}
      </button>
    {:else}
      <button class="action-button secondary" type="button" disabled={busy} onclick={close}>
        {$t("updates.prompt.later")}
      </button>
      <button class="action-button primary" type="button" disabled={busy} onclick={update}>
        {#if install?.phase === "error"}
          {$t("updates.retry")}
        {:else if canInstall}
          {$t("updates.action.update")}
        {:else}
          {$t("updates.action.download")}
        {/if}
      </button>
    {/if}
  </div>

  {#if !install}
    <div class="skip">
      <Checkbox bind:checked={skip} label={$t("updates.prompt.skip")} />
    </div>
  {/if}
</dialog>

<style>
  .update-prompt {
    width: min(22rem, calc(100vw - 2rem));
    padding: var(--space-6) var(--space-5) var(--space-4);
    box-sizing: border-box;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--surface-elevated);
    box-shadow: var(--shadow-elevated);
    color: var(--text-primary);
    text-align: center;
    outline: none;
  }

  .update-prompt[open] {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .hero {
    display: inline-flex;
    width: 3rem;
    height: 3rem;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--space-4);
    border-radius: 50%;
    background: color-mix(in srgb, var(--accent) 14%, transparent);
    box-shadow: 0 0 0 6px color-mix(in srgb, var(--accent) 6%, transparent);
    color: var(--accent);
  }

  .hero.ready {
    background: color-mix(in srgb, var(--success) 14%, transparent);
    box-shadow: 0 0 0 6px color-mix(in srgb, var(--success) 6%, transparent);
    color: var(--success);
  }

  h2 {
    margin: 0;
    font-size: 1.0625rem;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .current {
    margin: var(--space-1) 0 0;
    color: var(--text-secondary);
    font-size: 0.8125rem;
    line-height: 1.5;
  }

  .notes-toggle {
    margin-top: var(--space-3);
    padding: 2px var(--space-1);
    border: 0;
    border-radius: var(--radius-sm);
    background: none;
    color: var(--accent);
    font: inherit;
    font-size: 0.75rem;
    cursor: pointer;
  }

  .notes-toggle:hover {
    text-decoration: underline;
  }

  .notes-toggle:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 1px;
  }

  .notes {
    width: 100%;
    max-height: 9rem;
    margin-top: var(--space-2);
    padding: var(--space-2) var(--space-3);
    box-sizing: border-box;
    overflow: auto;
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--text-secondary);
    font-size: 0.75rem;
    line-height: 1.5;
    text-align: left;
    white-space: pre-wrap;
  }

  .progress {
    display: flex;
    width: 100%;
    flex-direction: column;
    gap: var(--space-2);
    margin: var(--space-4) 0 0;
    color: var(--text-secondary);
    font-size: 0.75rem;
  }

  .bar {
    height: 4px;
    overflow: hidden;
    border-radius: 999px;
    background: var(--grid-line);
  }

  .bar span {
    display: block;
    height: 100%;
    background: var(--accent);
    transition: width var(--duration-fast);
  }

  .error {
    margin: var(--space-4) 0 0;
    color: var(--danger);
    font-size: 0.75rem;
  }

  .actions {
    display: grid;
    width: 100%;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2);
    margin-top: var(--space-5);
  }

  .actions .action-button {
    justify-content: center;
  }

  .skip {
    margin-top: var(--space-3);
    color: var(--text-secondary);
    font-size: 0.75rem;
  }
</style>
