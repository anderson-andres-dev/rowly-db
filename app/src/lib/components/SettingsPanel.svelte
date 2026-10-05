<script lang="ts">
  import { tooltip } from "$lib/tooltip";
  import { Check, Code2, Keyboard, Monitor, Moon, Palette, RefreshCw, RotateCcw, Search, SlidersHorizontal, Sun, X } from "@lucide/svelte";
  import UpdatesSection from "$lib/components/UpdatesSection.svelte";
  import Select from "$lib/components/Select.svelte";
  import NumberStepper from "$lib/components/NumberStepper.svelte";
  import { newerRelease } from "$lib/stores/updates";
  import { LOCALE_NAMES, LOCALES, localePreference, t, type LocalePreference, type MessageKey } from "$lib/i18n";
  import { THEME_FAMILIES, palettes, themeVariant, type ThemeFamily } from "$lib/theming/palettes";
  import { requestedScheme, themeChoice, type SchemePreference } from "$lib/theming/theme";
  import { commandsCollide, type CommandGroup } from "$lib/workspace/commands";
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
    setIndentSize,
    setIndentStyle,
    setTabNavigatesCompletion,
    setTableAliases,
    type TableAliasMode,
  } from "$lib/stores/editorSettings";
  import type { IndentSize, IndentStyle } from "$lib/sqlIndentationConfig";
  import { GRID_ROW_STYLES, gridSettings, setGridRowStyle } from "$lib/stores/gridSettings";

  // Ajustes: la lista de secciones a la izquierda y, a la derecha,
  // una cabecera fija (titulo y cerrar) sobre filas que se desplazan
  // (styles/controls.css). Cada fila es un texto corto y su control; nada de
  // subtitulos ni tarjetas sueltas.
  type Section = "general" | "appearance" | "editor" | "shortcuts" | "updates";

  let { onclose, initialSection = "general" }: { onclose: () => void; initialSection?: Section } = $props();

  // svelte-ignore state_referenced_locally
  let activeSection = $state<Section>(initialSection);

  const sections = [
    { id: "general", icon: SlidersHorizontal },
    { id: "appearance", icon: Palette },
    { id: "editor", icon: Code2 },
    { id: "shortcuts", icon: Keyboard },
    { id: "updates", icon: RefreshCw },
  ] as const satisfies { id: Section; icon: typeof Palette }[];

  // La linea bajo la cabecera aparece solo cuando hay contenido debajo.
  let scrolled = $state(false);
  let scrollEl: HTMLElement | undefined = $state();

  // Otra seccion empieza desde arriba.
  $effect(() => {
    void activeSection;
    if (scrollEl) scrollEl.scrollTop = 0;
    scrolled = false;
  });

  let dialogEl: HTMLDialogElement | undefined = $state();
  let navEl: HTMLElement | undefined = $state();

  // Al abrir, el foco visible queda en la seccion actual.
  $effect(() => {
    if (dialogEl && !dialogEl.open) {
      dialogEl.showModal();
      navEl?.querySelector<HTMLButtonElement>(`[data-section="${activeSection}"]`)?.focus();
    }
  });

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === dialogEl) dialogEl?.close();
  }

  // Las flechas recorren la lista de secciones.
  function handleNavKeydown(event: KeyboardEvent) {
    if (!["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"].includes(event.key)) return;
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || event.isComposing) return;
    const target = event.target as HTMLElement;
    if (target !== dialogEl && !target.classList.contains("nav-item")) return;
    event.preventDefault();
    const index = sections.findIndex((section) => section.id === activeSection);
    const forward = event.key === "ArrowDown" || event.key === "ArrowRight";
    const next = sections[(index + (forward ? 1 : -1) + sections.length) % sections.length];
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
  const indentStyleOptions = $derived([
    { value: "spaces", label: $t("settings.editor.indent.spaces") },
    { value: "tabs", label: $t("settings.editor.indent.tabs") },
  ]);
  const indentSizeOptions = [2, 4, 8].map((size) => ({ value: String(size), label: String(size) }));

  // --- Atajos -------------------------------------------------------------
  // Agrupados como en el registro de comandos (lib/workspace/commands.ts). Dos
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
      <header class="settings-head" class:scrolled>
        <h1 id="settings-title">{$t(`settings.nav.${activeSection}`)}</h1>
        <button class="ui-icon-button close" type="button" aria-label={$t("common.close")} onclick={() => dialogEl?.close()}>
          <X size={16} aria-hidden="true" />
        </button>
      </header>

      <div class="settings-scroll" bind:this={scrollEl} onscroll={(event) => (scrolled = event.currentTarget.scrollTop > 0)}>
        <div class="settings-content">
          {#if activeSection === "general"}
            <div class="set-group">
              <div class="set-row">
                <span class="set-label">{$t("settings.appearance.language")}</span>
                <Select
                  value={$localePreference}
                  options={languageOptions}
                  label={$t("settings.appearance.language")}
                  onchange={(value) => localePreference.set(value as LocalePreference)}
                />
              </div>
              <div class="set-row">
                <span class="set-label">{$t("settings.appearance.rows")}</span>
                <div class="ui-segmented" role="radiogroup" aria-label={$t("settings.appearance.rows")}>
                  {#each GRID_ROW_STYLES as style (style)}
                    <button
                      type="button"
                      role="radio"
                      aria-checked={$gridSettings.rowStyle === style}
                      onclick={() => setGridRowStyle(style)}
                    >
                      {$t(`settings.appearance.rows.${style}`)}
                    </button>
                  {/each}
                </div>
              </div>
            </div>
          {:else if activeSection === "appearance"}
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
              <!-- Una fila por tema, con una muestra de sus colores en el modo que
                   se pide: el elegido ya se ve aplicado en toda la app. -->
              <div class="set-group theme-list" role="radiogroup" aria-label={$t("settings.appearance.palette")}>
                {#each visibleThemes as family (family.id)}
                  {@const preview = themeVariant(family.id, $requestedScheme)}
                  {@const editor = preview.editor}
                  {@const selected = $themeChoice.family === family.id}
                  <button
                    class="set-row theme-row"
                    class:selected
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onclick={() => setFamily(family.id)}
                  >
                    <span class="swatch" style:background={editor.background} style:border-color={preview.shell.border} aria-hidden="true">
                      <span><i style:background={editor.keyword}></i><i class="short" style:background={editor.foreground}></i></span>
                      <span><i class="short" style:background={editor.string}></i><i class="tiny" style:background={editor.number}></i></span>
                    </span>
                    <span class="theme-name">{family.label}</span>
                    {#if !palettes[family.id].light}
                      <span class="theme-mode">
                        <Moon size={12} aria-hidden="true" />
                        {$t("settings.appearance.darkOnly")}
                      </span>
                    {/if}
                    <span class="theme-check" aria-hidden="true">
                      {#if selected}<Check size={15} />{/if}
                    </span>
                  </button>
                {/each}
              </div>
            {/if}
          {:else if activeSection === "editor"}
            <h3 class="set-caption">{$t("settings.editor.format")}</h3>
            <div class="set-group">
              <div class="set-row">
                <div class="set-text"><span class="set-label">{$t("settings.editor.indent.type")}</span></div>
                <Select
                  value={$editorSettings.indentStyle}
                  options={indentStyleOptions}
                  label={$t("settings.editor.indent.type")}
                  onchange={(value) => setIndentStyle(value as IndentStyle)}
                />
              </div>
              <div class="set-row">
                <div class="set-text"><span class="set-label">{$t("settings.editor.indent.size")}</span></div>
                <Select
                  value={String($editorSettings.indentSize)}
                  options={indentSizeOptions}
                  label={$t("settings.editor.indent.size")}
                  onchange={(value) => setIndentSize(Number(value) as IndentSize)}
                />
              </div>
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
    overflow-y: auto;
    padding: var(--space-5) var(--space-3);
    background: var(--surface-elevated);
  }

  /* En oscuro, la barra del mismo tono que las cajas, no mas clara. */
  :global(:root[data-scheme="dark"]) .settings-nav {
    background: var(--set-row-background);
  }

  .nav-title {
    margin: 0 0 var(--space-5) var(--space-2);
    color: var(--text-primary);
    font-size: 0.875rem;
    font-weight: 600;
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
    display: flex;
    min-width: 0;
    min-height: 0;
    flex-direction: column;
  }

  /* El titulo y cerrar quedan fijos; solo se desplaza lo de abajo. */
  .settings-head {
    position: relative;
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    padding: var(--space-5) var(--space-6) var(--space-4);
    border-bottom: 1px solid transparent;
    transition: border-color var(--duration-fast);
  }

  .settings-head.scrolled {
    border-bottom-color: var(--border);
  }

  .close {
    position: absolute;
    top: 50%;
    right: var(--space-3);
    translate: 0 -50%;
  }

  .settings-scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: var(--space-1) var(--space-6) var(--space-6);
    scrollbar-gutter: stable;
  }

  .settings-content {
    width: min(100%, 44rem);
    margin: 0 auto;
  }

  h1 {
    width: min(100%, 44rem);
    margin: 0;
    font-size: var(--font-size-heading);
    font-weight: var(--font-weight-heading);
    letter-spacing: var(--tracking-heading);
    line-height: var(--leading-heading);
  }

  /* Titulo chico de un grupo: aire arriba, nada de lineas. */
  .set-caption {
    margin-top: var(--space-6);
  }

  .settings-content > .set-caption:first-child,
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

  /* Filas como las demas: la muestra, el nombre y la marca del elegido. */
  .theme-row {
    width: 100%;
    justify-content: flex-start;
    gap: var(--space-3);
    border: 0;
    color: var(--text-primary);
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: background-color var(--duration-fast);
  }

  .theme-row:hover {
    background: color-mix(in srgb, var(--text-primary) 4%, var(--set-row-background, var(--surface-elevated)));
  }

  .theme-row:focus-visible {
    position: relative;
    z-index: 1;
    outline: 2px solid var(--focus-ring);
    outline-offset: -2px;
  }

  /* Dos lineas de codigo en miniatura, con el fondo y los colores del tema. */
  .swatch {
    display: flex;
    flex-shrink: 0;
    flex-direction: column;
    justify-content: center;
    gap: 3px;
    width: 2.75rem;
    height: 1.5rem;
    padding: 0 0.3rem;
    box-sizing: border-box;
    border: 1px solid;
    border-radius: var(--radius-sm);
  }

  .swatch > span {
    display: flex;
    gap: 3px;
  }

  .swatch i {
    display: block;
    width: 0.95rem;
    height: 3px;
    border-radius: 999px;
  }

  .swatch i.short {
    width: 0.6rem;
  }

  .swatch i.tiny {
    width: 0.35rem;
  }

  .theme-name {
    min-width: 0;
    overflow: hidden;
    font-size: 0.8125rem;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .theme-mode {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    margin-left: auto;
    color: var(--text-secondary);
    font-size: 0.75rem;
    white-space: nowrap;
  }

  .theme-check {
    display: inline-flex;
    flex-shrink: 0;
    justify-content: flex-end;
    width: 1rem;
    color: var(--accent);
  }

  .theme-name + .theme-check {
    margin-left: auto;
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

    .settings-head {
      padding-inline: var(--space-4);
    }

    .settings-scroll {
      padding-inline: var(--space-4);
    }

    .set-row:not(.theme-row) {
      align-items: flex-start;
      flex-direction: column;
    }
  }
</style>
