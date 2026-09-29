<script lang="ts">
  import { tooltip } from "$lib/tooltip";
  import { Code2, Keyboard, Monitor, Moon, Palette, RefreshCw, RotateCcw, Search, Sun, X } from "@lucide/svelte";
  import UpdatesSection from "$lib/components/UpdatesSection.svelte";
  import Select from "$lib/components/Select.svelte";
  import NumberStepper from "$lib/components/NumberStepper.svelte";
  import { newerRelease } from "$lib/stores/updates";
  import { LOCALE_NAMES, LOCALES, localePreference, t, type LocalePreference, type MessageKey } from "$lib/i18n";
  import { THEME_FAMILIES, palettes, themeVariant, type ThemeFamily } from "$lib/theming/palettes";
  import { requestedScheme, themeChoice, type SchemePreference } from "$lib/theming/theme";
  import { commandsCollide, type CommandGroup } from "$lib/commands";
  import { formatShortcutEvent, resetAllShortcuts, resetShortcutKeys, setShortcutKeys, shortcuts } from "$lib/stores/shortcuts";
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
  import {
    DEFAULT_FORMATTER_LINE_WIDTH,
    MAX_FORMATTER_LINE_WIDTH,
    MIN_FORMATTER_LINE_WIDTH,
    editorSettings,
    setAutoUppercaseKeywords,
    setFormatterAlignColumns,
    setFormatterLineWidth,
    setTabNavigatesCompletion,
    setTableAliases,
    type TableAliasMode,
  } from "$lib/stores/editorSettings";

  // Ajustes: una lista a la izquierda y, a la derecha, filas agrupadas
  // (styles/controls.css). Cada fila es un texto corto y su control; nada de
  // subtitulos ni tarjetas sueltas.
  type Section = "appearance" | "editor" | "shortcuts" | "updates";

  let { onclose, initialSection = "appearance" }: { onclose: () => void; initialSection?: Section } = $props();

  // svelte-ignore state_referenced_locally
  let activeSection = $state<Section>(initialSection);

  const sections = [
    { id: "appearance", icon: Palette },
    { id: "editor", icon: Code2 },
    { id: "shortcuts", icon: Keyboard },
    { id: "updates", icon: RefreshCw },
  ] as const satisfies { id: Section; icon: typeof Palette }[];

  let dialogEl: HTMLDialogElement | undefined = $state();
  let navEl: HTMLElement | undefined = $state();

  // Al abrir, el foco va al modal (no a un boton con su anillo); las
  // flechas ya recorren las secciones desde ahi.
  $effect(() => {
    if (dialogEl && !dialogEl.open) {
      dialogEl.showModal();
      dialogEl.focus();
    }
  });

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === dialogEl) dialogEl?.close();
  }

  // Flechas arriba/abajo recorren la lista de secciones (con el foco en el
  // modal o en la lista).
  function handleNavKeydown(event: KeyboardEvent) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const target = event.target as HTMLElement;
    if (target !== dialogEl && !target.classList.contains("nav-item")) return;
    event.preventDefault();
    const index = sections.findIndex((section) => section.id === activeSection);
    const next = sections[(index + (event.key === "ArrowDown" ? 1 : -1) + sections.length) % sections.length];
    activeSection = next.id;
    navEl?.querySelector<HTMLButtonElement>(`[data-section="${next.id}"]`)?.focus();
  }

  // --- Apariencia -------------------------------------------------------
  const schemeOptions = [
    { value: "system", icon: Monitor },
    { value: "light", icon: Sun },
    { value: "dark", icon: Moon },
  ] as const satisfies { value: SchemePreference; icon: typeof Monitor }[];

  // Con un tema solo oscuro y el modo en Claro, se avisa por que la app no
  // se aclara.
  const darkOnlyNotice = $derived(
    $requestedScheme === "light" && !palettes[$themeChoice.family].light
      ? (THEME_FAMILIES.find((family) => family.id === $themeChoice.family)?.label ?? "")
      : null,
  );

  function setScheme(scheme: SchemePreference) {
    themeChoice.update((choice) => ({ ...choice, scheme }));
  }

  function setFamily(family: ThemeFamily) {
    themeChoice.update((choice) => ({ ...choice, family }));
  }

  let themeQuery = $state("");
  const visibleThemes = $derived(
    THEME_FAMILIES.filter((family) => family.label.toLowerCase().includes(themeQuery.trim().toLowerCase())),
  );

  const languageOptions = LOCALES.map((option) => ({ value: option, label: LOCALE_NAMES[option], lang: option }));
  const tableAliasOptions = $derived(
    (["always", "multiple", "never"] as const).map((mode) => ({
      value: mode,
      label: $t(`settings.editor.tableAliases.${mode}`),
    })),
  );

  // --- Atajos -------------------------------------------------------------
  // Agrupados como en el registro de comandos (lib/commands.ts). Dos
  // atajos iguales chocan si actuan en la misma zona o uno es global:
  // Ejecutar (editor) y Aplicar cambios (resultado) comparten Ctrl+Enter a
  // proposito.
  const SHORTCUT_GROUPS: CommandGroup[] = ["general", "editor", "results"];

  // El nombre basta; solo lleva una segunda linea el atajo que la necesita
  // para no confundirse.
  const SHORTCUT_HINTS: Record<string, MessageKey> = {
    "focus-zone-prefix": "settings.shortcuts.hint.focus",
    "execute-query": "settings.shortcuts.hint.execute",
    "submit-result-changes": "settings.shortcuts.hint.submit",
  };

  let shortcutQuery = $state("");
  let recordingId = $state<string | null>(null);
  let confirmingReset = $state(false);
  const anyCustomShortcut = $derived($shortcuts.some((shortcut) => shortcut.isCustom));

  function shortcutText(id: string, field: "label"): string {
    return $t(`shortcuts.${id}.${field}` as MessageKey);
  }

  const shortcutGroups = $derived.by(() => {
    const query = shortcutQuery.trim().toLowerCase();
    return SHORTCUT_GROUPS.map((group) => {
      const items = $shortcuts.filter((shortcut) => shortcut.group === group);
      return {
        id: group,
        items: items
          .filter(
            (shortcut) =>
              query === "" ||
              shortcutText(shortcut.id, "label").toLowerCase().includes(query) ||
              shortcut.keys.toLowerCase().includes(query),
          )
          .map((shortcut) => ({
            ...shortcut,
            conflict: $shortcuts.find(
              (other) =>
                other.id !== shortcut.id &&
                other.keys !== "" &&
                other.keys === shortcut.keys &&
                commandsCollide(other.zone, shortcut.zone),
            ),
          })),
      };
    }).filter((group) => group.items.length > 0);
  });

  function focusOnMount(node: HTMLElement) {
    node.focus();
  }

  function handleRecordKeydown(event: KeyboardEvent, id: string) {
    event.preventDefault();
    event.stopPropagation();
    if (event.key === "Escape") {
      recordingId = null;
      return;
    }
    const keys = formatShortcutEvent(event);
    if (!keys) return; // solo se solto un modificador, seguir esperando
    setShortcutKeys(id, keys);
    recordingId = null;
  }
</script>

{#snippet keys(value: string)}
  <span class="ui-keys">
    {#each value.split("+") as key, index (index)}<kbd>{key}</kbd>{/each}
  </span>
{/snippet}

<dialog
  bind:this={dialogEl}
  tabindex="-1"
  aria-labelledby="settings-title"
  onclose={onclose}
  onclick={handleBackdropClick}
  onkeydown={handleNavKeydown}
>
  <section class="settings">
    <aside class="settings-nav">
      <h2 class="nav-title">{$t("settings.title")}</h2>
      <nav bind:this={navEl} aria-label={$t("settings.sections")}>
        {#each sections as section (section.id)}
          {@const Icon = section.icon}
          <button
            class="nav-item"
            class:active={activeSection === section.id}
            type="button"
            data-section={section.id}
            aria-current={activeSection === section.id ? "page" : undefined}
            tabindex={activeSection === section.id ? 0 : -1}
            onclick={() => (activeSection = section.id)}
          >
            <Icon size={15} aria-hidden="true" />
            {$t(`settings.nav.${section.id}`)}
            {#if section.id === "updates" && $newerRelease}
              <span class="nav-dot" use:tooltip={$t("settings.nav.updatesAvailable")}>
                <span class="visually-hidden">{$t("settings.nav.updatesAvailable")}</span>
              </span>
            {/if}
          </button>
        {/each}
      </nav>
    </aside>

    <div class="settings-main">
      <button class="ui-icon-button close" type="button" aria-label={$t("common.close")} onclick={() => dialogEl?.close()}>
        <X size={16} aria-hidden="true" />
      </button>

      <div class="settings-content">
        <h1 id="settings-title">{$t(`settings.nav.${activeSection}`)}</h1>

        {#if activeSection === "appearance"}
          <div class="set-group">
            <div class="set-row">
              <span class="set-label">{$t("settings.appearance.scheme")}</span>
              <div class="ui-segmented" role="radiogroup" aria-label={$t("settings.appearance.scheme")}>
                {#each schemeOptions as option (option.value)}
                  {@const Icon = option.icon}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={$themeChoice.scheme === option.value}
                    onclick={() => setScheme(option.value)}
                  >
                    <Icon size={14} aria-hidden="true" />
                    {$t(`settings.scheme.${option.value}`)}
                  </button>
                {/each}
              </div>
            </div>
            <div class="set-row">
              <span class="set-label">{$t("settings.appearance.language")}</span>
              <Select
                value={$localePreference}
                options={languageOptions}
                label={$t("settings.appearance.language")}
                onchange={(value) => localePreference.set(value as LocalePreference)}
              />
            </div>
          </div>
          {#if darkOnlyNotice}
            <p class="notice">
              <Moon size={13} aria-hidden="true" />
              {$t("settings.appearance.darkOnlyNotice", { theme: darkOnlyNotice })}
            </p>
          {/if}

          <div class="block-head">
            <h3 class="set-caption">{$t("settings.appearance.palette")}</h3>
            <label class="ui-field theme-search">
              <Search size={13} aria-hidden="true" />
              <input type="search" bind:value={themeQuery} placeholder={$t("settings.appearance.themeSearch")} />
            </label>
          </div>
          {#if visibleThemes.length === 0}
            <p class="empty">{$t("settings.appearance.noThemes", { query: themeQuery.trim() })}</p>
          {:else}
            <div class="palette-grid" role="radiogroup" aria-label={$t("settings.appearance.palette")}>
              {#each visibleThemes as family (family.id)}
                <!-- Cada tarjeta se pinta en el modo que se pide, asi se ve como
                     quedaria el tema antes de elegirlo. -->
                {@const preview = themeVariant(family.id, $requestedScheme)}
                {@const editor = preview.editor}
                <button
                  class:selected={$themeChoice.family === family.id}
                  class="palette-option"
                  type="button"
                  role="radio"
                  aria-checked={$themeChoice.family === family.id}
                  onclick={() => setFamily(family.id)}
                >
                  <span
                    class="theme-preview"
                    style:background={preview.shell.surface}
                    style:border-color={preview.shell.border}
                    aria-hidden="true"
                  >
                    <span class="preview-tabs" style:border-color={preview.shell.border}>
                      <span class="preview-tab active" style:background={editor.background} style:box-shadow={`inset 0 1.5px 0 ${preview.shell.accent}`}>
                        <i style:background={preview.shell.textPrimary}></i>
                      </span>
                      <span class="preview-tab">
                        <i style:background={preview.shell.textSecondary}></i>
                      </span>
                    </span>
                    <span class="preview-sidebar" style:background={preview.shell.surfaceElevated} style:border-color={preview.shell.border}>
                      <i style:background={preview.shell.accent}></i>
                      <i style:background={preview.shell.textSecondary}></i>
                      <i style:background={preview.shell.textSecondary}></i>
                      <i style:background={preview.shell.textSecondary}></i>
                    </span>
                    <span class="preview-editor" style:background={editor.background}>
                      <span class="preview-gutter" style:color={editor.lineNumber}>
                        <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                      </span>
                      <span class="preview-code" style:color={editor.foreground}>
                        <span style:color={editor.comment}>-- top 50</span>
                        <span><b style:color={editor.keyword}>SELECT</b> id, <b style:color={editor.builtin ?? editor.foreground}>count</b>(*)</span>
                        <span><b style:color={editor.keyword}>FROM</b> orders</span>
                        <span><b style:color={editor.keyword}>WHERE</b> paid <b style:color={editor.operator ?? editor.foreground}>=</b> <b style:color={editor.constant}>true</b></span>
                        <span><b style:color={editor.keyword}>LIMIT</b> <b style:color={editor.number}>50</b>;</span>
                      </span>
                    </span>
                  </span>
                  <span class="palette-text">
                    <span class="palette-name">{family.label}</span>
                    <span class="palette-modes">
                      {#if palettes[family.id].light}
                        {$t("settings.appearance.bothModes")}
                      {:else}
                        <Moon size={10} aria-hidden="true" />
                        {$t("settings.appearance.darkOnly")}
                      {/if}
                    </span>
                  </span>
                  <span class="selection" aria-hidden="true"></span>
                </button>
              {/each}
            </div>
          {/if}
        {:else if activeSection === "editor"}
          <h3 class="set-caption">{$t("settings.editor.format")}</h3>
          <div class="set-group">
            <div class="set-row">
              <div class="set-text">
                <span class="set-label">{$t("settings.editor.lineWidth")}</span>
                <span class="set-desc">{$t("settings.editor.lineWidth.description")}</span>
              </div>
              <div class="row-control">
                {#if $editorSettings.formatterLineWidth !== DEFAULT_FORMATTER_LINE_WIDTH}
                  <button
                    class="ui-icon-button"
                    type="button"
                    use:tooltip={$t("settings.editor.lineWidth.resetTitle", { width: DEFAULT_FORMATTER_LINE_WIDTH })}
                    onclick={() => setFormatterLineWidth(DEFAULT_FORMATTER_LINE_WIDTH)}
                  >
                    <RotateCcw size={14} aria-hidden="true" />
                  </button>
                {/if}
                <NumberStepper
                  id="formatter-line-width"
                  label={$t("settings.editor.lineWidth")}
                  value={$editorSettings.formatterLineWidth}
                  min={MIN_FORMATTER_LINE_WIDTH}
                  max={MAX_FORMATTER_LINE_WIDTH}
                  suffix={$t("settings.editor.characters")}
                  onchange={setFormatterLineWidth}
                />
              </div>
            </div>
            <div class="set-row">
              <div class="set-text">
                <span class="set-label" id="uppercase-label">{$t("settings.editor.uppercase")}</span>
              </div>
              <button
                class="ui-switch"
                type="button"
                role="switch"
                aria-checked={$editorSettings.autoUppercaseKeywords}
                aria-labelledby="uppercase-label"
                onclick={() => setAutoUppercaseKeywords(!$editorSettings.autoUppercaseKeywords)}
              >
                <span></span>
              </button>
            </div>
            <div class="set-row">
              <div class="set-text">
                <span class="set-label" id="align-columns-label">{$t("settings.editor.alignColumns")}</span>
                <span class="set-desc">{$t("settings.editor.alignColumns.description")}</span>
              </div>
              <button
                class="ui-switch"
                type="button"
                role="switch"
                aria-checked={$editorSettings.formatterAlignColumns}
                aria-labelledby="align-columns-label"
                onclick={() => setFormatterAlignColumns(!$editorSettings.formatterAlignColumns)}
              >
                <span></span>
              </button>
            </div>
          </div>

          <h3 class="set-caption">{$t("settings.editor.completion")}</h3>
          <div class="set-group">
            <div class="set-row">
              <div class="set-text">
                <span class="set-label" id="tab-navigation-label">{$t("settings.editor.tabNavigation")}</span>
              </div>
              <button
                class="ui-switch"
                type="button"
                role="switch"
                aria-checked={$editorSettings.tabNavigatesCompletion}
                aria-labelledby="tab-navigation-label"
                onclick={() => setTabNavigatesCompletion(!$editorSettings.tabNavigatesCompletion)}
              >
                <span></span>
              </button>
            </div>
            <div class="set-row">
              <div class="set-text">
                <span class="set-label">{$t("settings.editor.tableAliases")}</span>
                <span class="set-desc">{$t("settings.editor.tableAliases.description")}</span>
              </div>
              <Select
                value={$editorSettings.tableAliases}
                options={tableAliasOptions}
                label={$t("settings.editor.tableAliases")}
                onchange={(value) => setTableAliases(value as TableAliasMode)}
              />
            </div>
          </div>
        {:else if activeSection === "shortcuts"}
          <label class="ui-field shortcut-search">
            <Search size={13} aria-hidden="true" />
            <input type="search" bind:value={shortcutQuery} placeholder={$t("settings.shortcuts.search")} />
          </label>

          {#if shortcutGroups.length === 0}
            <p class="empty">{$t("settings.shortcuts.noResults", { query: shortcutQuery.trim() })}</p>
          {/if}
          {#each shortcutGroups as group (group.id)}
            <h3 class="set-caption">{$t(`settings.shortcuts.group.${group.id}`)}</h3>
            <div class="set-group">
              {#each group.items as shortcut (shortcut.id)}
                <div class="set-row shortcut-row">
                  <div class="set-text">
                    <span class="set-label">{shortcutText(shortcut.id, "label")}</span>
                    {#if shortcut.conflict}
                      <span class="set-desc conflict">
                        {$t("settings.shortcuts.conflict", { name: shortcutText(shortcut.conflict.id, "label") })}
                      </span>
                    {:else if SHORTCUT_HINTS[shortcut.id]}
                      <span class="set-desc">{$t(SHORTCUT_HINTS[shortcut.id])}</span>
                    {/if}
                  </div>
                  <div class="row-control">
                    {#if shortcut.isCustom && recordingId !== shortcut.id}
                      <button
                        class="ui-icon-button"
                        type="button"
                        aria-label={$t("settings.shortcuts.resetLabel", { name: shortcutText(shortcut.id, "label") })}
                        use:tooltip={$t("settings.shortcuts.resetTitle")}
                        onclick={() => resetShortcutKeys(shortcut.id)}
                      >
                        <RotateCcw size={14} aria-hidden="true" />
                      </button>
                    {/if}
                    {#if recordingId === shortcut.id}
                      <button
                        class="key-button recording"
                        type="button"
                        use:focusOnMount
                        onkeydown={(event) => handleRecordKeydown(event, shortcut.id)}
                        onblur={() => (recordingId = null)}
                      >
                        {$t("settings.shortcuts.recording")}
                      </button>
                    {:else}
                      <button
                        class="key-button"
                        class:conflict={!!shortcut.conflict}
                        type="button"
                        aria-label={$t("settings.shortcuts.changeLabel", { name: shortcutText(shortcut.id, "label") })}
                        use:tooltip={$t("settings.shortcuts.changeTitle")}
                        onclick={() => (recordingId = shortcut.id)}
                      >
                        {@render keys(shortcut.keys)}
                      </button>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/each}
          {#if shortcutQuery.trim() === ""}
            <div class="set-group reset-all">
              <div class="set-row">
                <span class="set-label">{$t("settings.shortcuts.resetAll")}</span>
                <button
                  class="action-button secondary small"
                  type="button"
                  disabled={!anyCustomShortcut}
                  onclick={() => (confirmingReset = true)}
                >
                  <RotateCcw size={13} aria-hidden="true" />
                  {$t("settings.shortcuts.resetAllAction")}
                </button>
              </div>
            </div>
          {/if}
        {:else}
          <UpdatesSection />
        {/if}
      </div>
    </div>
  </section>
</dialog>

{#if confirmingReset}
  <ConfirmDialog
    tone="warning"
    title={$t("settings.shortcuts.resetAllTitle")}
    message={$t("settings.shortcuts.resetAllMessage")}
    confirmLabel={$t("settings.shortcuts.resetAllAction")}
    onconfirm={() => {
      confirmingReset = false;
      resetAllShortcuts();
    }}
    oncancel={() => (confirmingReset = false)}
  />
{/if}

<style>
  dialog {
    outline: none;
    width: min(58rem, calc(100vw - 4rem));
    height: min(40rem, calc(100vh - 4rem));
    max-width: none;
    max-height: none;
    padding: 0;
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--surface);
    color: var(--text-primary);
    box-shadow: var(--shadow-elevated);
  }

  .settings {
    display: grid;
    grid-template-columns: 12rem minmax(0, 1fr);
    height: 100%;
    min-height: 0;
  }

  /* --- Lista de secciones ------------------------------------------------ */

  .settings-nav {
    min-width: 0;
    padding: var(--space-5) var(--space-3);
    background: var(--surface-elevated);
  }

  .nav-title {
    margin: 0 0 var(--space-4) var(--space-2);
    color: var(--text-secondary);
    font-size: 0.75rem;
    font-weight: 500;
  }

  nav {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  /* Mismo resaltado que las pestañas: relleno tenue en la activa. */
  .nav-item {
    display: flex;
    width: 100%;
    align-items: center;
    gap: var(--space-2);
    height: 2rem;
    padding: 0 var(--space-2);
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    font: inherit;
    font-size: 0.8125rem;
    text-align: left;
    cursor: pointer;
    transition:
      background-color var(--duration-fast),
      color var(--duration-fast);
  }

  .nav-item:hover {
    background: color-mix(in srgb, var(--text-primary) 5%, transparent);
    color: var(--text-primary);
  }

  .nav-item.active {
    background: color-mix(in srgb, var(--text-primary) 9%, transparent);
    color: var(--text-primary);
  }

  .nav-item.active :global(svg) {
    color: var(--accent);
  }

  .nav-item:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: -2px;
  }

  .nav-dot {
    width: 0.4rem;
    height: 0.4rem;
    margin-left: auto;
    border-radius: 50%;
    background: var(--accent);
  }

  /* --- Contenido --------------------------------------------------------- */

  .settings-main {
    position: relative;
    min-width: 0;
    overflow: auto;
    padding: var(--space-6) var(--space-6) var(--space-6);
  }

  .close {
    position: absolute;
    top: var(--space-3);
    right: var(--space-3);
  }

  .settings-content {
    width: min(100%, 44rem);
    margin: 0 auto;
  }

  h1 {
    margin: 0 0 var(--space-5);
    font-size: var(--font-size-heading);
    font-weight: var(--font-weight-heading);
    letter-spacing: var(--tracking-heading);
    line-height: var(--leading-heading);
  }

  /* Titulo chico de un grupo: aire arriba, nada de lineas. */
  .set-caption {
    margin-top: var(--space-6);
  }

  h1 + .set-caption,
  .shortcut-search + .set-caption,
  .shortcut-search + .empty + .set-caption {
    margin-top: 0;
  }

  .shortcut-search + .set-caption {
    margin-top: var(--space-5);
  }

  .row-control {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: var(--space-1);
  }



  .notice,
  .empty {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin: var(--space-3) 0 0 var(--space-1);
    color: var(--text-secondary);
    font-size: 0.75rem;
  }

  /* "Tema" y su buscador juntos a la izquierda: a la derecha quedarian
     apilados bajo el selector de idioma, dos cajas iguales una sobre otra. */
  .block-head {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    margin: var(--space-6) 0 var(--space-3);
  }

  .block-head .set-caption {
    margin: 0 0 0 var(--space-1);
  }

  .theme-search {
    width: 15rem;
  }

  .reset-all {
    margin-top: var(--space-6);
  }

  .shortcut-search {
    width: 100%;
  }

  /* --- Atajos -------------------------------------------------------------- */

  .shortcut-row .set-desc {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .set-desc.conflict {
    color: var(--warning);
  }

  /* Las teclas son el boton para cambiarlas. */
  .key-button {
    display: inline-flex;
    align-items: center;
    padding: 2px;
    border: 1px solid transparent;
    border-radius: 7px;
    background: transparent;
    font: inherit;
    cursor: pointer;
    transition: border-color var(--duration-fast);
  }

  .key-button:hover {
    border-color: var(--control-border);
  }

  .key-button.conflict {
    border-color: color-mix(in srgb, var(--warning) 60%, transparent);
  }

  .key-button.recording {
    height: 1.75rem;
    padding: 0 var(--space-3);
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 14%, transparent);
    color: var(--text-primary);
    font-size: 0.75rem;
  }

  .key-button:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 1px;
  }

  /* --- Temas --------------------------------------------------------------- */

  .palette-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-3);
  }

  .palette-option {
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface-elevated);
    color: var(--text-primary);
    font: inherit;
    cursor: pointer;
  }

  .palette-option:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
  }

  .palette-option {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-3) var(--space-2);
    padding: var(--space-2) var(--space-3) var(--space-3) var(--space-2);
    text-align: left;
    transition:
      border-color var(--duration-fast),
      background-color var(--duration-fast),
      box-shadow var(--duration-fast),
      transform var(--duration-fast);
  }

  .palette-option:hover {
    border-color: var(--control-border);
  }

  .palette-option.selected {
    border-color: var(--accent);
    box-shadow: 0 0 0 1px var(--accent);
  }

  /* Una ventana en miniatura, apaisada: pestañas arriba, árbol a la
     izquierda y el editor ocupando el resto. */
  .theme-preview {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: 12% 1fr;
    grid-template-rows: 0.95rem 1fr;
    aspect-ratio: 16 / 7;
    overflow: hidden;
    border: 1px solid;
    border-radius: calc(var(--radius-sm) - 2px);
  }

  .preview-tabs {
    display: flex;
    grid-column: 1 / -1;
    align-items: stretch;
    gap: 1px;
    padding-left: 17%;
    border-bottom: 1px solid;
  }

  .preview-tab {
    display: flex;
    align-items: center;
    width: 26%;
    padding: 0 0.3rem;
  }

  .preview-tab i {
    display: block;
    width: 70%;
    height: 0.2rem;
    border-radius: 999px;
    opacity: 0.45;
  }

  .preview-tab.active i {
    opacity: 0.8;
  }

  .preview-sidebar {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    padding: 0.45rem 0.3rem;
    border-right: 1px solid;
  }

  .preview-sidebar i {
    display: block;
    height: 0.2rem;
    border-radius: 999px;
    opacity: 0.5;
  }

  .preview-sidebar i:first-child {
    width: 75%;
    opacity: 1;
  }

  .preview-sidebar i:nth-child(2) {
    width: 90%;
    margin-left: 12%;
  }

  .preview-sidebar i:nth-child(3) {
    width: 60%;
    margin-left: 12%;
  }

  .preview-sidebar i:nth-child(4) {
    width: 75%;
    margin-left: 12%;
  }

  .preview-editor {
    display: flex;
    align-items: center;
    min-width: 0;
    overflow: hidden;
  }

  .preview-gutter,
  .preview-code {
    display: flex;
    flex-direction: column;
    font-family: ui-monospace, "JetBrains Mono", "SF Mono", Menlo, monospace;
    font-size: 0.5625rem;
    line-height: 1.4;
    white-space: nowrap;
  }

  .preview-gutter {
    flex-shrink: 0;
    width: 1.1rem;
    padding-right: 0.3rem;
    text-align: right;
  }

  .preview-code {
    min-width: 0;
  }

  .preview-code b {
    font-weight: 500;
  }

  .preview-code > span:first-child {
    font-style: italic;
  }

  .palette-text {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
    padding-left: var(--space-1);
  }

  .palette-name {
    overflow: hidden;
    font-size: 0.8125rem;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .palette-modes {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--text-secondary);
    font-size: 0.6875rem;
    white-space: nowrap;
  }


  .selection {
    width: 0.75rem;
    height: 0.75rem;
    border: 1px solid var(--control-border);
    border-radius: 50%;
  }


  .palette-option.selected .selection {
    border-color: var(--accent);
    background: var(--accent);
    box-shadow: inset 0 0 0 2px var(--surface-elevated);
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  @media (max-width: 46rem) {
    .settings {
      grid-template-columns: 9rem minmax(0, 1fr);
    }

    .settings-main {
      padding: var(--space-5) var(--space-4);
    }

    .palette-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .set-row {
      align-items: flex-start;
      flex-direction: column;
    }
  }
</style>
