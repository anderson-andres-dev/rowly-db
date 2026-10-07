<script lang="ts">
  import { tick, untrack } from "svelte";
  import { ArrowLeft, Plus, X } from "@lucide/svelte";
  import { tabScroll } from "$lib/tabScroll";
  import { moveItem, reorderable } from "$lib/reorder";
  import { tabEnter, tabExit } from "$lib/motion";
  import { sessionMount } from "$lib/sessionMount";
  import { t } from "$lib/i18n";
  import { tooltip } from "$lib/tooltip";
  import { editorPalette } from "$lib/theming/theme";
  import TerminalSession from "$lib/components/TerminalSession.svelte";
  import TabOutline from "$lib/components/TabOutline.svelte";
  import MosaicArea from "$lib/components/MosaicArea.svelte";
  import TilePicker from "$lib/components/TilePicker.svelte";
  import { leaves, neighbor, place, WHOLE, type Mosaic, type Side } from "$lib/workspace/mosaic";
  import { choose, emptyGroups, groupTabs, mergeGroup, moveTab, normalizeGroups, type TabGroups } from "$lib/workspace/tabGroups";
  import type { TerminalInfo } from "$lib/terminal";
  import { registerCommands } from "$lib/workspace/commands";
  import { registerTabCommands } from "$lib/workspace/tabCommands";

  let { visible, profileId, onerror, onback, backKeys = "" }: {
    visible: boolean;
    profileId: string;
    onerror: (message: string) => void;
    onback: () => void;
    backKeys?: string;
  } = $props();

  type Session = { key: string; label: string; info: TerminalInfo | null; closing?: boolean };
  let sessions = $state<Session[]>([]);
  let layout = $state<TabGroups>(emptyGroups("t0"));
  let root: HTMLDivElement;
  let mosaic = $state<ReturnType<typeof MosaicArea>>();
  let bodies = $state<Record<string, HTMLDivElement | undefined>>({});
  let views = $state<Record<string, ReturnType<typeof TerminalSession> | undefined>>({});
  let renaming = $state<string | null>(null);
  let renameValue = $state("");
  let renameInput = $state<HTMLInputElement>();
  let pickerOpen = $state(false);
  let opened = 0;
  let nextKey = 1;
  let nextGroup = 1;
  const open = $derived(sessions.filter((session) => !session.closing));
  // El orden visual puede cambiar; el orden de montaje debe ser fijo para
  // que Svelte no reordene los nodos que ya trasladamos a sus grupos.
  const mounted = $derived([...sessions].sort((a, b) => Number(a.key) - Number(b.key)));
  const keys = $derived(open.map((session) => session.key));
  const active = $derived(layout.selected[layout.focus]);
  const grouped = $derived(leaves(layout.tree).length > 1);
  const pickerItems = $derived(open.filter(s => !Object.values(layout.selected).includes(s.key))
    .map(s => ({ id: s.key, title: s.label, icon: "console" as const })));

  // Los grupos que todavia estan cerrando su ultima pestaña siguen hasta
  // terminar la salida. Ninguna pestaña en salida puede recibir el foco.
  function arrange(next: TabGroups) {
    const normalized = normalizeGroups(next, sessions.map(s => s.key));
    for (const group of leaves(normalized.tree)) {
      const mine = groupTabs(normalized, group, keys);
      if (!mine.includes(normalized.selected[group])) {
        if (mine.length) normalized.selected[group] = mine.at(-1)!;
        else delete normalized.selected[group];
      }
    }
    layout = normalized;
    void tick().then(() => visible && focus());
  }

  export function focus() { if (active) views[active]?.focus(); }

  function select(key: string) {
    if (!keys.includes(key)) return;
    layout = choose(layout, key);
    void tick().then(() => visible && focus());
  }

  function focusGroup(group: string) {
    if (layout.focus !== group) layout = { ...layout, focus: group };
  }

  export function navigate(side: Side): HTMLElement | null {
    if (!visible || !grouped) return null;
    const next = neighbor(layout.tree, layout.focus, side);
    if (!next) return null;
    focusGroup(next);
    focus();
    return mosaic?.tileElement(next) ?? null;
  }

  function add(group = layout.focus): string {
    opened = open.length === 0 ? 1 : opened + 1;
    const label = opened === 1 ? $t("workspace.terminal.local") : `${$t("workspace.terminal.local")} (${opened})`;
    const key = String(nextKey++);
    sessions = [...sessions, { key, label, info: null }];
    arrange({ ...layout, focus: group, member: { ...layout.member, [key]: group }, selected: { ...layout.selected, [group]: key } });
    return key;
  }

  function reorderSessions(group: string, from: number, to: number) {
    const mine = open.filter(s => layout.member[s.key] === group);
    const moved = moveItem(mine, from, to);
    let index = 0;
    sessions = sessions.map(s => !s.closing && layout.member[s.key] === group ? moved[index++] : s);
  }

  function close(key: string) {
    const session = open.find(s => s.key === key);
    if (!session) return;
    const group = layout.member[key];
    const mine = groupTabs(layout, group, keys);
    const index = mine.indexOf(key);
    session.closing = true;
    if (renaming === key) renaming = null;
    if (layout.selected[group] === key) {
      const selected = { ...layout.selected };
      const replacement = mine[index + 1] ?? mine[index - 1];
      if (replacement) selected[group] = replacement;
      else delete selected[group];
      layout = { ...layout, selected };
    }
    void tick().then(() => visible && focus());
  }

  function remove(key: string) {
    if (!sessions.some(s => s.key === key && s.closing)) return;
    sessions = sessions.filter(s => s.key !== key);
    arrange(layout);
  }

  async function startRename(session: Session) {
    renaming = session.key;
    renameValue = session.label;
    await tick();
    renameInput?.focus();
    renameInput?.select();
  }

  function finishRename(save: boolean) {
    const session = sessions.find(s => s.key === renaming);
    renaming = null;
    if (save && session && renameValue.trim()) session.label = renameValue.trim();
  }

  let pendingDrag: { key: string; from: string } | null = null;
  function beginDrag(key: string, event: PointerEvent, source: HTMLElement, grab: { x: number; y: number }): boolean {
    if (!mosaic || !keys.includes(key)) return false;
    const from = layout.member[key];
    pendingDrag = { key, from };
    return mosaic.beginDrag(`t${nextGroup++}`, event, {
      source, grab, origin: from, merge: true,
      vacate: groupTabs(layout, from, keys).length === 1 ? from : undefined,
      landing: () => root.querySelector<HTMLElement>(`[data-session-key="${key}"]:not([data-tab-closing])`),
    });
  }

  function dropInNewGroup(tree: Mosaic, group: string) {
    const drag = pendingDrag;
    pendingDrag = null;
    if (drag && keys.includes(drag.key)) arrange(moveTab({ ...layout, tree }, drag.key, group, keys));
  }

  function dropInGroup(group: string) {
    const drag = pendingDrag;
    pendingDrag = null;
    if (drag && keys.includes(drag.key) && group !== drag.from) arrange(moveTab(layout, drag.key, group, keys));
  }

  function pickTile(key: string | null, side: "right" | "bottom", whole: boolean) {
    const group = `t${nextGroup++}`;
    const tree = place(layout.tree, whole ? WHOLE : layout.focus, group, side);
    if (mosaic && !mosaic.fits(tree)) { onerror($t("mosaic.noRoom")); return; }
    pickerOpen = false;
    const chosen = key ?? add();
    arrange(moveTab({ ...layout, tree }, chosen, group, sessions.filter(s => !s.closing).map(s => s.key)));
  }

  const focused = () => visible && !!root?.contains(document.activeElement);
  $effect(() => {
    const cleanupTabs = registerTabCommands("results", {
      keys: () => groupTabs(layout, layout.focus, keys),
      current: () => active ?? null,
      select,
      applies: focused,
    });
    const cleanup = registerCommands("results", {
      "rename-query-console": () => {
        const session = focused() && open.find(s => s.key === active);
        if (!session) return false;
        void startRename(session);
      },
      "tile-console": () => { if (!focused()) return false; pickerOpen = true; },
      "untile-console": () => {
        if (!focused()) return false;
        const merged = mergeGroup(layout, layout.focus);
        if (merged) arrange(merged);
        return true;
      },
    });
    const cleanupSessions = registerCommands("global", {
      "new-terminal-session": () => focused() && (add(), true),
      "close-terminal-session": () => focused() && !!active && (close(active), true),
    });
    return () => { cleanupTabs(); cleanup(); cleanupSessions(); };
  });

  $effect(() => {
    if (visible) untrack(() => open.length === 0 && add());
    else pickerOpen = false;
  });
</script>

<div class="terminal-dock" bind:this={root}>
  <MosaicArea
    bind:this={mosaic}
    tree={layout.tree}
    focused={layout.focus}
    minSize={{ row: 220, column: 130 }}
    label={(group) => sessions.find(s => s.key === layout.selected[group])?.label ?? $t("workspace.terminal.title")}
    onresize={(tree) => (layout = { ...layout, tree })}
    onarrange={dropInNewGroup}
    onmerge={dropInGroup}
    onfocus={focusGroup}
    stripHeight={38}
  >
    {#snippet tile(group: string)}
      <div class="terminal-group">
        <div class="result-tabs tab-strip terminal-strip" class:dimmed={grouped && group !== layout.focus}
          style:--terminal-bg={$editorPalette.background} style:--tab-active={$editorPalette.background}>
          <div class="result-tabs-scroll" role="tablist" aria-label={$t("workspace.terminal.title")}
            use:tabScroll={`${layout.selected[group]}|${sessions.length}`}
            use:reorderable={{ items: ".session:not([data-tab-closing])",
              onmove: (from, to) => reorderSessions(group, from, to),
              detach: (tab, event, grab) => !!tab.dataset.sessionKey && beginDrag(tab.dataset.sessionKey, event, tab, grab) }}>
            {#each open.filter(s => layout.member[s.key] === group) as session (session.key)}
              <div class="result-tab closable session" class:active={session.key === layout.selected[group]}
                data-session-key={session.key} in:tabEnter out:tabExit onoutroend={() => remove(session.key)}>
                <TabOutline />
                {#if renaming === session.key}
                  <input class="rename-input" aria-label={$t("workspace.terminal.renameAria")} bind:this={renameInput} bind:value={renameValue}
                    onkeydown={(event) => { event.stopPropagation(); if (event.key === "Enter") finishRename(true); if (event.key === "Escape") finishRename(false); }}
                    onblur={() => finishRename(true)} />
                {:else}
                  <button type="button" role="tab" class="tab-select" aria-selected={session.key === layout.selected[group]}
                    use:tooltip={session.info ? `${session.info.shell} · ${session.info.cwd}` : session.label}
                    onclick={() => select(session.key)} ondblclick={() => startRename(session)}
                    onkeydown={(event) => event.key === "F2" && startRename(session)}>
                    <span class="prompt" aria-hidden="true">&gt;_</span><span>{session.label}</span>
                  </button>
                {/if}
                <button type="button" class="tab-close" aria-label={$t("results.tab.close", { name: session.label })} onclick={() => close(session.key)}>
                  <X size={11} aria-hidden="true" />
                </button>
              </div>
            {/each}
          </div>
          <button type="button" class="strip-button" aria-label={$t("workspace.terminal.new")} use:tooltip={$t("workspace.terminal.new")} onclick={() => add(group)}>
            <Plus size={13} aria-hidden="true" />
          </button>
          <button type="button" class="strip-button back" aria-label={$t("workspace.terminal.back", { keys: backKeys })}
            use:tooltip={$t("workspace.terminal.back", { keys: backKeys })} onclick={onback}>
            <ArrowLeft size={14} aria-hidden="true" />
          </button>
        </div>
        <div class="sessions-body" style:background={$editorPalette.background} bind:this={bodies[group]}></div>
      </div>
    {/snippet}
    {#if pickerOpen}
      <TilePicker items={pickerItems} label={$t("mosaic.picker.label")} placeholder={$t("mosaic.picker.search")}
        newLabel={$t("workspace.terminal.new")} onpick={pickTile}
        onclose={(refocus) => { pickerOpen = false; if (refocus) focus(); }} />
    {/if}
  </MosaicArea>
  <!-- Lista estable de componentes, independiente del arbol de grupos.
       Solo se traslada su nodo: el PTY, xterm y su buffer siguen vivos. -->
  {#each mounted as session (session.key)}
    <div class="session-slot" use:sessionMount={bodies[layout.member[session.key]]}>
      <TerminalSession bind:this={views[session.key]}
        visible={visible && !session.closing && layout.selected[layout.member[session.key]] === session.key}
        focused={visible && active === session.key} {profileId}
        oninfo={(info) => (session.info = info)} onexit={() => close(session.key)} {onerror} />
    </div>
  {/each}
</div>

<style>
  /* La fila sobre el fondo de la terminal, apenas distinto: se nota que es
     otro espacio que el de los datos. */
  .terminal-strip {
    --tab-strip-bg: color-mix(in srgb, var(--text-primary) 4%, var(--terminal-bg));
  }

  .session .prompt {
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.6875rem;
    opacity: 0.8;
  }

  .terminal-strip:not(.dimmed) .session.active .prompt {
    color: var(--accent);
    opacity: 1;
  }

  /* Como el de las pestañas de las consolas. */
  .rename-input {
    width: 7rem;
    min-width: 0;
    padding: 2px var(--space-1);
    border: 1px solid var(--focus-ring);
    border-radius: calc(var(--radius-sm) - 2px);
    outline: none;
    background: var(--surface);
    color: var(--text-primary);
    font: inherit;
  }

  .strip-button {
    display: grid;
    width: 1.75rem;
    height: 1.75rem;
    flex-shrink: 0;
    align-self: center;
    margin-left: var(--space-1);
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
  }

  /* La flecha para volver, al final de la fila. */
  .strip-button.back {
    margin-left: auto;
  }

  .strip-button:not(.back) {
    border-radius: 50%;
    transition: background-color var(--duration-fast) ease, color var(--duration-fast) ease;
  }

  .strip-button:hover {
    background: color-mix(in srgb, var(--text-primary) 8%, transparent);
    color: var(--text-primary);
  }

  .strip-button:not(.back):hover {
    background: color-mix(in srgb, var(--text-primary) 4%, transparent);
  }

  .strip-button:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: -2px;
  }

  .terminal-dock, .terminal-group {
    display: flex;
    flex: 1;
    min-width: 0;
    min-height: 0;
    flex-direction: column;
  }

  .terminal-dock { position: relative; }
  .sessions-body { position: relative; flex: 1; min-height: 0; }
  .session-slot { position: absolute; inset: 0; pointer-events: none; }
</style>
