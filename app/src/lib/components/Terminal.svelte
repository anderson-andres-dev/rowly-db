<script lang="ts">
  import { tick, untrack } from "svelte";
  import { ArrowLeft, Plus, X } from "@lucide/svelte";
  import { tabScroll } from "$lib/tabScroll";
  import { t } from "$lib/i18n";
  import { tooltip } from "$lib/tooltip";
  import { editorPalette } from "$lib/theming/theme";
  import TerminalSession from "$lib/components/TerminalSession.svelte";
  import type { TerminalInfo } from "$lib/terminal";
  import { registerCommands } from "$lib/workspace/commands";
  import { registerTabCommands } from "$lib/workspace/tabCommands";

  // La terminal de la ventana: un espacio propio en el lugar del resultado,
  // que alterna con los datos (Ctrl+T, ResultPane la pone encima de todo).
  // Arriba, su fila de carpetas, como la del resultado: las sesiones son las
  // pestañas (sin una pestaña "Terminal" que no mostraria nada) y a la
  // derecha la flecha para volver a los datos. Debajo, la sesion elegida.
  // Cada sesion es un shell con su xterm; las ocultas siguen vivas. Se monta
  // la primera vez que se abre y queda montada: cerrarla desmonta solo
  // sesiones.
  let {
    visible,
    profileId,
    onerror,
    onback,
    backKeys = "",
  }: {
    visible: boolean;
    profileId: string;
    onerror: (message: string) => void;
    // Volver a los datos (lo mismo que Ctrl+T con el foco aca).
    onback: () => void;
    backKeys?: string;
  } = $props();

  // closing: la pestaña se esta yendo (fade) y su shell sigue hasta quitarla.
  type Session = { key: number; label: string; info: TerminalInfo | null; closing?: boolean };

  let sessions = $state<Session[]>([]);
  let row: HTMLDivElement;
  // La sesion que se esta renombrando (0: ninguna), como las consolas.
  let renaming = $state(0);
  let renameValue = $state("");
  let renameInput = $state<HTMLInputElement>();
  const open = $derived(sessions.filter((session) => !session.closing));
  let active = $state(0);
  // "Local", "Local (2)"...; vuelve a empezar cuando no queda ninguna.
  let opened = 0;
  let nextKey = 1;

  function add() {
    opened = open.length === 0 ? 1 : opened + 1;
    const label = opened === 1 ? $t("workspace.terminal.local") : `${$t("workspace.terminal.local")} (${opened})`;
    const key = nextKey++;
    sessions = [...sessions, { key, label, info: null }];
    active = key;
  }

  // Cerrar: la elegida pasa a la vecina ya; la pestaña se desvanece y se
  // quita al terminar (animationend), con su shell.
  function close(key: number) {
    const index = open.findIndex((session) => session.key === key);
    if (index < 0) return;
    open[index].closing = true;
    if (active === key) active = (open[index] ?? open[index - 1])?.key ?? 0;
  }

  // Las pestañas que quedan se deslizan a su lugar, como el flip de las
  // consolas (svelte/animate y svelte/transition, compartidos con la pagina,
  // sacaban un chunk aparte del JS inicial).
  async function remove(key: number) {
    const tabs = () => [...row.querySelectorAll<HTMLElement>("[data-flip]")];
    const before = new Map(tabs().map((tab) => [tab.dataset.flip, tab.getBoundingClientRect().left]));
    sessions = sessions.filter((session) => session.key !== key);
    await tick();
    for (const tab of tabs()) {
      const dx = (before.get(tab.dataset.flip) ?? 0) - tab.getBoundingClientRect().left;
      if (dx) tab.animate([{ transform: `translateX(${dx}px)` }, { transform: "none" }], { duration: 150, easing: "cubic-bezier(0.33, 1, 0.68, 1)" });
    }
  }

  async function startRename(session: Session) {
    renaming = session.key;
    renameValue = session.label;
    await tick();
    renameInput?.focus();
    renameInput?.select();
  }

  function finishRename(save: boolean) {
    const session = sessions.find((item) => item.key === renaming);
    renaming = 0;
    const name = renameValue.trim();
    if (save && session && name) session.label = name;
  }

  // Atajos de las sesiones (lib/workspace/commands.ts), solo con el foco en
  // la terminal: Ctrl+Tab y Ctrl+1..9 entre sesiones, Ctrl+Shift+T nueva,
  // Ctrl+Shift+W cerrar y Ctrl+Shift+R renombrar. Fuera de ella, la tecla
  // sigue con las consolas o el panel inferior.
  let body: HTMLDivElement;
  const focused = () => {
    const element = document.activeElement;
    return visible && !!element && (row.contains(element) || body.contains(element));
  };

  $effect(() => {
    const cleanupTabs = registerTabCommands("results", {
      keys: () => open.map((session) => String(session.key)),
      current: () => String(active),
      select: (key) => (active = Number(key)),
      applies: focused,
    });
    const cleanupRename = registerCommands("results", {
      "rename-query-console": () => {
        const session = focused() && open.find((item) => item.key === active);
        if (!session) return false;
        void startRename(session);
      },
    });
    const cleanupSessions = registerCommands("global", {
      "new-terminal-session": () => focused() && (add(), true),
      "close-terminal-session": () => focused() && active !== 0 && (close(active), true),
    });
    return () => {
      cleanupTabs();
      cleanupRename();
      cleanupSessions();
    };
  });

  // Al mostrarse sin ninguna sesion (la primera vez, o tras cerrar la
  // ultima), abre una. Cerrar la ultima con la pestaña a la vista no la
  // reabre sola: queda el +.
  $effect(() => {
    if (visible) untrack(() => open.length === 0 && add());
  });
</script>

<!-- La fila de la terminal: carpetas como las del resultado (tabs.css), sobre
     el fondo de la terminal, y la elegida se une con su sesion. -->
<div
  class="result-tabs tab-strip terminal-strip"
  style:--terminal-bg={$editorPalette.background}
  style:--tab-active={$editorPalette.background}
  bind:this={row}
>
  <div class="result-tabs-scroll" role="tablist" aria-label={$t("workspace.terminal.title")} use:tabScroll={`${active}|${sessions.length}`}>
  {#each sessions as session (session.key)}
    <!-- Entra como fly (x -8, 150 ms) y sale como fade (120 ms), como las
         pestañas de las consolas. -->
    <div
      class="result-tab closable session"
      class:active={session.key === active}
      class:closing={session.closing}
      data-flip={session.key}
      onanimationend={() => session.closing && remove(session.key)}
    >
      {#if renaming === session.key}
        <input
          class="rename-input"
          aria-label={$t("workspace.terminal.renameAria")}
          bind:this={renameInput}
          bind:value={renameValue}
          onkeydown={(event) => {
            event.stopPropagation();
            if (event.key === "Enter") finishRename(true);
            if (event.key === "Escape") finishRename(false);
          }}
          onblur={() => finishRename(true)}
        />
      {:else}
        <!-- Doble clic, F2 o Ctrl+Shift+R: renombrar. -->
        <button
          type="button"
          role="tab"
          class="tab-select"
          aria-selected={session.key === active}
          use:tooltip={session.info ? `${session.info.shell} · ${session.info.cwd}` : session.label}
          onclick={() => (active = session.key)}
          ondblclick={() => startRename(session)}
          onkeydown={(event) => event.key === "F2" && startRename(session)}
        >
          <span class="prompt" aria-hidden="true">&gt;_</span>
          <span>{session.label}</span>
        </button>
      {/if}
      <button
        type="button"
        class="tab-close"
        aria-label={$t("results.tab.close", { name: session.label })}
        onclick={() => close(session.key)}
      >
        <X size={11} aria-hidden="true" />
      </button>
    </div>
  {/each}
  </div>
  <button type="button" class="strip-button" data-flip="+" aria-label={$t("workspace.terminal.new")} use:tooltip={$t("workspace.terminal.new")} onclick={add}>
    <Plus size={13} aria-hidden="true" />
  </button>
  <button
    type="button"
    class="strip-button back"
    aria-label={$t("workspace.terminal.back", { keys: backKeys })}
    use:tooltip={$t("workspace.terminal.back", { keys: backKeys })}
    onclick={onback}
  >
    <ArrowLeft size={14} aria-hidden="true" />
  </button>
</div>
<!-- Las sesiones, apiladas en el mismo lugar: cambiar de una a otra solo
     cambia cual se ve, sin desmontar ni redimensionar xterm. -->
<div class="sessions-body" style:background={$editorPalette.background} bind:this={body}>
  {#each sessions as session (session.key)}
    <TerminalSession
      visible={visible && session.key === active}
      {profileId}
      oninfo={(info) => (session.info = info)}
      onexit={() => close(session.key)}
      {onerror}
    />
  {/each}
</div>

<style>
  /* La fila sobre el fondo de la terminal, apenas distinto: se nota que es
     otro espacio que el de los datos. */
  .terminal-strip {
    background: color-mix(in srgb, var(--text-primary) 4%, var(--terminal-bg));
  }

  .session .prompt {
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.6875rem;
    opacity: 0.8;
  }

  .session.active .prompt {
    color: var(--accent);
    opacity: 1;
  }

  .session {
    animation: session-in 150ms cubic-bezier(0.33, 1, 0.68, 1);
  }

  .session.closing {
    animation: session-out 120ms linear forwards;
    pointer-events: none;
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

  .strip-button:hover {
    background: color-mix(in srgb, var(--text-primary) 8%, transparent);
    color: var(--text-primary);
  }

  .strip-button:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: -2px;
  }

  .sessions-body {
    position: relative;
    min-height: 0;
    flex: 1;
  }

  @keyframes session-in {
    from {
      opacity: 0;
      transform: translateX(-8px);
    }
  }

  @keyframes session-out {
    to {
      opacity: 0;
    }
  }
</style>
