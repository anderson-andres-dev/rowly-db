<script lang="ts">
  import { onMount } from "svelte";
  import { ArrowDownToLine, CircleAlert, RefreshCw, Undo2 } from "@lucide/svelte";
  import { tooltip } from "$lib/tooltip";
  import { t, type MessageKey } from "$lib/i18n";
  import { getDriver, type ConnectionDriver } from "$lib/connections";
  import {
    checkSupportUpdates,
    installSupportPackage,
    loadSupportLines,
    removeSupportPackage,
    setSupportLineEnabled,
    supportBusy,
    supportError,
    supportLines,
    type SupportLine,
  } from "$lib/stores/supportPackages";

  onMount(() => {
    void loadSupportLines();
  });

  // Por motor, en el orden en que llegan (el de las lineas).
  const engines = $derived(
    [...new Set($supportLines.map((line) => line.engine))].map((engine) => ({
      engine,
      lines: $supportLines.filter((line) => line.engine === engine),
    })),
  );
  const busy = $derived($supportBusy !== null);

  function revisionText(line: SupportLine): string {
    if (line.activeRevision === 0) return $t("engines.revision.notInstalled");
    if (line.origin === "downloaded") return $t("engines.revision.downloaded", { revision: line.activeRevision });
    if (line.downloadedRevision !== null) return $t("engines.revision.includedNewer", { revision: line.activeRevision });
    return $t("engines.revision.included", { revision: line.activeRevision });
  }

  const key = (engine: ConnectionDriver, line: string) => `${engine}/${line}`;
</script>

<div class="engines">
  <div class="set-group">
    <div class="set-row">
      <div class="set-text">
        <span class="set-desc">{$t("engines.intro")}</span>
      </div>
      <div class="summary-actions">
        {#if $supportError}
          <span class="check-error" role="img" aria-label={$supportError} title={$supportError}>
            <CircleAlert size={15} aria-hidden="true" />
          </span>
        {/if}
        <button class="action-button secondary small" type="button" disabled={busy} onclick={() => void checkSupportUpdates()}>
          <RefreshCw size={13} class={$supportBusy === "check" ? "spin" : undefined} aria-hidden="true" />
          {$supportBusy === "check" ? $t("engines.checking") : $t("engines.check")}
        </button>
      </div>
    </div>
  </div>

  {#each engines as group (group.engine)}
    <h3 class="set-caption">{getDriver(group.engine).name}</h3>
    <div class="set-group">
      {#each group.lines as line (line.line)}
        {@const id = key(line.engine, line.line)}
        <div class="set-row line" class:disabled={!line.enabled && line.activeRevision > 0}>
          <div class="set-text">
            <span class="set-label" id={`line-${id}`}>{$t("engines.line", { line: line.line })}</span>
            <span class="set-desc">{revisionText(line)}</span>
            {#if line.support}
              <span class="set-desc">{$t(`engines.support.${line.support}` as MessageKey)}</span>
            {/if}
            {#if line.verified.length > 0}
              <span class="set-desc">{$t("engines.verified", { versions: line.verified.join(", ") })}</span>
            {/if}
            {#if !line.enabled && line.activeRevision > 0}
              <span class="set-desc">{$t("engines.disabled")}</span>
            {/if}
            {#if line.available && !line.available.compatible}
              <span class="set-desc">{$t("engines.requiresApp", { version: line.available.requiresApp })}</span>
            {/if}
          </div>
          <div class="line-actions">
            {#if line.available?.compatible}
              <button
                class="action-button primary small"
                type="button"
                disabled={busy}
                onclick={() => void installSupportPackage(line.engine, line.line)}
              >
                <ArrowDownToLine size={13} aria-hidden="true" />
                {line.downloadedRevision === null
                  ? $t("engines.action.download", { revision: line.available.revision })
                  : $t("engines.action.update", { revision: line.available.revision })}
              </button>
            {/if}
            {#if line.downloadedRevision !== null}
              {@const label = line.includedRevision === null ? $t("engines.action.remove") : $t("engines.action.backToIncluded")}
              <button
                class="ui-icon-button"
                type="button"
                aria-label={label}
                use:tooltip={label}
                disabled={busy}
                onclick={() => void removeSupportPackage(line.engine, line.line)}
              >
                <Undo2 size={14} aria-hidden="true" />
              </button>
            {/if}
            {#if line.activeRevision > 0}
              <button
                class="ui-switch"
                type="button"
                role="switch"
                aria-checked={line.enabled}
                aria-label={$t("engines.action.enable", { line: line.line })}
                disabled={busy}
                onclick={() => void setSupportLineEnabled(line.engine, line.line, !line.enabled)}
              >
                <span></span>
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/each}
</div>

<style>
  .engines {
    display: flex;
    flex-direction: column;
  }

  .summary-actions,
  .line-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
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

  .line .set-text {
    gap: 2px;
  }

  .line.disabled .set-label {
    color: var(--text-secondary);
  }
</style>
