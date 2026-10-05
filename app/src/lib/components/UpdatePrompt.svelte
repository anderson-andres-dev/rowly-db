<script lang="ts">
  import { tick, type Component } from "svelte";
  import { openUrl } from "@tauri-apps/plugin-opener";
  import {
    ArrowDownToLine,
    Check,
    CircleCheck,
    Database,
    Eye,
    FileCode2,
    History,
    Keyboard,
    Palette,
    Pencil,
    Rocket,
    RotateCcw,
    Search,
    ShieldCheck,
    Sparkles,
    Table2,
    Undo2,
    Wand2,
    X,
    Zap,
  } from "@lucide/svelte";
  import Checkbox from "$lib/components/Checkbox.svelte";
  import { locale, t, type MessageKey } from "$lib/i18n";
  import {
    dismissUpdatePrompt,
    installRelease,
    installState,
    localizedText,
    releaseHighlights,
    restartApp,
    updateContext,
    type ReleaseInfo,
  } from "$lib/stores/updates";

  // El aviso al abrir la app cuando hay una version nueva (updates.ts,
  // checkOnStartup): todo se hace desde aca, descargar, instalar y
  // reiniciar. "No volver a preguntar" omite solo esta version. Si la
  // release trae su novedad (release_highlight.rs), el aviso la cuenta, con
  // imagen o sin ella; si no, es el aviso clasico.
  let { release }: { release: ReleaseInfo } = $props();

  let dialog = $state<HTMLDialogElement>();
  let skip = $state(false);
  let showNotes = $state(false);

  const install = $derived($installState.phase !== "idle" && $installState.tag === release.tag ? $installState : null);
  const busy = $derived(install?.phase === "downloading" || install?.phase === "installing");
  const canInstall = $derived(($updateContext?.canInstall ?? false) && release.installable);
  const notes = $derived(release.notes.trim());
  const highlight = $derived($releaseHighlights[release.tag] ?? null);
  const version = $derived(`v${release.version}`);

  // Los iconos que puede pedir una novedad; uno desconocido usa el de
  // novedad. La lista esta en CONTRIBUTING (novedad de la version).
  const ICONS: Record<string, Component<{ size?: number; "aria-hidden"?: "true" }>> = {
    sparkles: Sparkles,
    database: Database,
    table: Table2,
    pencil: Pencil,
    eye: Eye,
    "shield-check": ShieldCheck,
    zap: Zap,
    keyboard: Keyboard,
    search: Search,
    history: History,
    "file-code": FileCode2,
    palette: Palette,
    undo: Undo2,
    check: Check,
    rocket: Rocket,
    wand: Wand2,
  };

  $effect(() => {
    void tick().then(() => {
      dialog?.showModal();
      const initial =
        dialog?.querySelector<HTMLButtonElement>(".actions .primary:not(:disabled)") ??
        dialog?.querySelector<HTMLButtonElement>(".actions button:not(:disabled)") ??
        dialog?.querySelector<HTMLButtonElement>(".notes-toggle");
      if (initial) initial.focus();
      else dialog?.focus();
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

{#snippet status()}
  {#if install?.phase === "downloading"}
    <div class="progress" role="status">
      <div class="bar" aria-hidden="true">
        <span style:transform={`scaleX(${install.total ? Math.min(1, install.downloaded / install.total) : 0})`}></span>
      </div>
      <span>{$t("updates.progress.downloading", { version, percent: percent(install.downloaded, install.total) })}</span>
    </div>
  {:else if install?.phase === "installing"}
    <p class="progress" role="status">{$t("updates.progress.installing", { version })}</p>
  {:else if install?.phase === "error"}
    <p class="error" role="alert">{$t(`updates.error.${install.code}` as MessageKey)}</p>
  {/if}
{/snippet}

{#snippet primaryLabel(rich: boolean)}
  {#if install?.phase === "error"}
    {$t("updates.retry")}
  {:else if canInstall}
    {rich ? $t("updates.highlight.updateTo", { version }) : $t("updates.action.update")}
  {:else}
    {$t("updates.action.download")}
  {/if}
{/snippet}

{#snippet notesBlock(label: string)}
  {#if notes && !install}
    <button class="notes-toggle" type="button" aria-expanded={showNotes} onclick={() => (showNotes = !showNotes)}>
      {label}
    </button>
    {#if showNotes}
      <div class="notes">{notes}</div>
    {/if}
  {/if}
{/snippet}

<dialog
  class="update-prompt"
  class:rich={!!highlight}
  class:with-visual={!!highlight?.image}
  tabindex="-1"
  aria-labelledby="update-prompt-title"
  bind:this={dialog}
  oncancel={(event) => {
    event.preventDefault();
    if (!busy) close();
  }}
  onclose={() => dismissUpdatePrompt(skip)}
>
  {#if highlight}
    <div class="rich-layout">
      <div class="story">
        <span class="badge">
          {highlight.badge ? localizedText(highlight.badge, $locale) : $t("updates.highlight.badge")}
        </span>
        <h2 id="update-prompt-title">{localizedText(highlight.title, $locale)}</h2>
        <p class="current">
          {#if install?.phase === "done"}
            {$t("updates.done", { version })}
          {:else}
            {$t("updates.highlight.version", { version, current: `v${$updateContext?.currentVersion ?? "…"}` })}
          {/if}
        </p>

        {#if highlight.items.length > 0 && !install}
          <ul class="points">
            {#each highlight.items as item, index (index)}
              {@const Icon = ICONS[item.icon ?? ""] ?? Sparkles}
              <li>
                <span class="point-icon"><Icon size={16} aria-hidden="true" /></span>
                <span class="point-text">
                  <strong>{localizedText(item.title, $locale)}</strong>
                  {#if item.text}<span>{localizedText(item.text, $locale)}</span>{/if}
                </span>
              </li>
            {/each}
          </ul>
        {/if}

        {@render status()}

        <div class="actions" data-dialog-actions>
          {#if install?.phase === "done"}
            <button class="action-button primary" type="button" onclick={() => void restartApp()}>
              <RotateCcw size={14} aria-hidden="true" />
              {$t("updates.restart")}
            </button>
            <button class="action-button secondary" type="button" onclick={close}>{$t("updates.prompt.later")}</button>
          {:else}
            <button class="action-button primary" type="button" disabled={busy} onclick={update}>
              {@render primaryLabel(true)}
            </button>
            <button class="action-button secondary" type="button" disabled={busy} onclick={close}>
              {$t("updates.prompt.later")}
            </button>
          {/if}
        </div>

        {#if !install}
          <div class="foot">
            <Checkbox bind:checked={skip} label={$t("updates.prompt.skip")} />
            {@render notesBlock($t("updates.highlight.allNotes"))}
          </div>
        {/if}
      </div>

      {#if highlight.image}
        <div class="visual">
          <img src={highlight.image} alt={highlight.imageAlt ? localizedText(highlight.imageAlt, $locale) : ""} />
        </div>
      {/if}
    </div>

    <button class="ui-icon-button close" type="button" aria-label={$t("common.close")} disabled={busy} onclick={close}>
      <X size={16} aria-hidden="true" />
    </button>
  {:else}
    <span class="hero" class:ready={install?.phase === "done"} aria-hidden="true">
      {#if install?.phase === "done"}
        <CircleCheck size={22} strokeWidth={2} />
      {:else}
        <ArrowDownToLine size={22} strokeWidth={2} />
      {/if}
    </span>

    <h2 id="update-prompt-title">{$t("updates.newerAvailable", { version })}</h2>
    <p class="current">
      {#if install?.phase === "done"}
        {$t("updates.done", { version })}
      {:else}
        {$t("updates.prompt.current", { version: `v${$updateContext?.currentVersion ?? "…"}` })}
      {/if}
    </p>

    {@render notesBlock($t("updates.prompt.whatsNew"))}
    {@render status()}

    <div class="actions" data-dialog-actions>
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
          {@render primaryLabel(false)}
        </button>
      {/if}
    </div>

    {#if !install}
      <div class="skip">
        <Checkbox bind:checked={skip} label={$t("updates.prompt.skip")} />
      </div>
    {/if}
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
    transform-origin: left;
    transition: transform var(--duration-fast);
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

  /* --- Con novedad --------------------------------------------------------- */

  /* Una columna con la historia; con imagen, la imagen a la derecha en su
     propio panel, como una ventana mas de la app. */
  .update-prompt.rich {
    width: min(27rem, calc(100vw - 2rem));
    max-height: calc(100vh - 2rem);
    padding: 0;
    overflow: auto;
    text-align: left;
  }

  /* Con imagen, la imagen manda: la columna de texto es angosta. */
  .update-prompt.rich.with-visual {
    width: min(56rem, calc(100vw - 2rem));
  }

  /* La rejilla va adentro: un <dialog> modal en grid se estira a toda la
     altura en WebKitGTK. */
  .update-prompt.rich[open] {
    display: block;
  }

  .rich-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  .with-visual .rich-layout {
    grid-template-columns: minmax(0, 21rem) minmax(0, 1fr);
  }

  .story {
    display: flex;
    min-width: 0;
    flex-direction: column;
    padding: var(--space-6) var(--space-6) var(--space-5);
  }

  .badge {
    align-self: flex-start;
    padding: 2px var(--space-2);
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent) 16%, transparent);
    color: var(--accent);
    font-size: 0.6875rem;
    font-weight: 600;
  }

  .rich h2 {
    margin-top: var(--space-3);
    font-size: 1.375rem;
    letter-spacing: -0.015em;
    line-height: 1.2;
    text-wrap: balance;
  }

  .rich .current {
    margin-top: var(--space-2);
    font-size: 0.75rem;
  }

  .points {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    margin: var(--space-5) 0 0;
    padding: 0;
    list-style: none;
  }

  .points li {
    display: flex;
    gap: var(--space-3);
  }

  .point-icon {
    display: inline-flex;
    flex-shrink: 0;
    padding-top: 1px;
    color: var(--accent);
  }

  .point-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 0.8125rem;
    line-height: 1.45;
  }

  .point-text strong {
    font-weight: 600;
  }

  .point-text span {
    color: var(--text-secondary);
  }

  /* La accion principal arriba y ancha; el resto al pie. */
  .rich .actions {
    grid-template-columns: 1fr;
    margin-top: var(--space-6);
  }

  .rich .progress,
  .rich .error {
    margin-top: var(--space-5);
  }

  .foot {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    margin-top: var(--space-3);
    color: var(--text-secondary);
    font-size: 0.75rem;
  }

  .foot .notes-toggle {
    margin-top: 0;
  }

  .foot .notes {
    max-height: 7rem;
  }

  .visual {
    display: flex;
    min-width: 0;
    min-height: 20rem;
    align-items: center;
    justify-content: center;
    padding: var(--space-5);
    border-left: 1px solid var(--border);
    background: color-mix(in srgb, var(--accent) 6%, var(--surface));
  }

  .visual img {
    display: block;
    max-width: 100%;
    max-height: 24rem;
    border-radius: var(--radius-sm);
    box-shadow: 0 12px 32px -12px rgb(0 0 0 / 0.45);
    object-fit: contain;
  }

  .close {
    position: absolute;
    top: var(--space-3);
    right: var(--space-3);
  }

  .with-visual .close {
    background: color-mix(in srgb, var(--surface-elevated) 80%, transparent);
  }

  @media (max-width: 40rem) {
    .with-visual .rich-layout {
      grid-template-columns: minmax(0, 1fr);
    }

    .visual {
      min-height: 0;
      order: -1;
      border-left: 0;
      border-bottom: 1px solid var(--border);
    }

    .visual img {
      max-height: 11rem;
    }
  }
</style>
