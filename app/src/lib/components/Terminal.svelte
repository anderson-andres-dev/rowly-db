<script lang="ts">
  import { tick, untrack } from "svelte";
  import { Plus, Terminal as TerminalIcon, X } from "@lucide/svelte";
  import { t } from "$lib/i18n";
  import { tooltip } from "$lib/tooltip";
  import { editorPalette } from "$lib/theming/theme";
  import TerminalSession from "$lib/components/TerminalSession.svelte";
  import type { TerminalInfo } from "$lib/terminal";

  // La terminal de la ventana, dentro del panel inferior (la pestaña
  // Terminal de ResultPane): una fila con las sesiones en el lugar de la
  // barra del resultado y, debajo, la sesion elegida. Cada sesion es un
  // shell con su xterm; las ocultas siguen vivas. Se monta la primera vez
  // que se abre la pestaña y queda montada: cerrarla desmonta solo sesiones.
  let {
    visible,
    profileId,
    onerror,
  }: {
    visible: boolean;
    profileId: string;
    onerror: (message: string) => void;
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

  // Como las pestañas de las consolas: se desplazan por debajo del + (fijo a
  // la derecha), con un desvanecido en el borde que tiene mas, la rueda
  // vertical las mueve en horizontal y la elegida se pone a la vista.
  let scroller: HTMLDivElement;
  let overflow = $state({ start: false, end: false });

  function updateOverflow() {
    const start = scroller.scrollLeft > 1;
    const end = scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 1;
    if (start !== overflow.start || end !== overflow.end) overflow = { start, end };
  }

  function onWheel(event: WheelEvent) {
    if (scroller.scrollWidth <= scroller.clientWidth || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    scroller.scrollLeft += event.deltaY;
  }

  $effect(() => {
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(scroller);
    scroller.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      observer.disconnect();
      scroller.removeEventListener("wheel", onWheel);
    };
  });

  // Tras la entrada (150 ms), para medir el ancho final.
  $effect(() => {
    const key = active;
    sessions.length;
    const timer = setTimeout(() => {
      scroller.querySelector(`[data-flip="${key}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      updateOverflow();
    }, 160);
    return () => clearTimeout(timer);
  });

  // Al mostrarse sin ninguna sesion (la primera vez, o tras cerrar la
  // ultima), abre una. Cerrar la ultima con la pestaña a la vista no la
  // reabre sola: queda el +.
  $effect(() => {
    if (visible) untrack(() => open.length === 0 && add());
  });
</script>

<!-- Pestañas de herramienta, con el fondo de la terminal: la elegida con el
     icono en acento y el texto pleno, sin relleno ni linea. -->
<div class="terminal-sessions" style:background={$editorPalette.background} bind:this={row}>
  <div
    class="sessions-scroll"
    class:fade-start={overflow.start}
    class:fade-end={overflow.end}
    role="tablist"
    aria-label={$t("workspace.terminal.title")}
    bind:this={scroller}
    onscroll={updateOverflow}
  >
  {#each sessions as session (session.key)}
    <!-- Las mismas transiciones que las pestañas de las consolas: entra
         como fly (x -8, 150 ms) y sale como fade (120 ms). -->
    <div
      class="session"
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
        <!-- Doble clic o F2: renombrar. -->
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
          <TerminalIcon size={12} aria-hidden="true" />
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
  <button type="button" class="session-add" data-flip="+" aria-label={$t("workspace.terminal.new")} use:tooltip={$t("workspace.terminal.new")} onclick={add}>
    <Plus size={13} aria-hidden="true" />
  </button>
</div>
<!-- Las sesiones, apiladas en el mismo lugar: cambiar de una a otra solo
     cambia cual se ve, sin desmontar ni redimensionar xterm. -->
<div class="sessions-body" style:background={$editorPalette.background}>
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
  /* Alta como la barra del resultado, en su lugar. */
  .terminal-sessions {
    display: flex;
    flex-shrink: 0;
    align-items: stretch;
    min-height: 2.5rem;
    padding: 0 var(--space-2);
    box-sizing: border-box;
  }

  .session {
    position: relative;
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    gap: var(--space-1);
    padding: 0 var(--space-1) 0 var(--space-3);
    color: var(--text-secondary);
    font-size: 0.75rem;
    animation: session-in 150ms cubic-bezier(0.33, 1, 0.68, 1);
  }

  .session:hover,
  .session.active {
    color: var(--text-primary);
  }

  .session :global(.tab-select svg) {
    color: var(--text-secondary);
    opacity: 0.8;
  }

  .session.active :global(.tab-select svg) {
    color: var(--accent);
    opacity: 1;
  }

  /* La elegida en negrita, con una linea fina en acento bajo el icono y el
     nombre. */
  .session.active :global(.tab-select) {
    position: relative;
    font-weight: 600;
  }

  .session.active :global(.tab-select)::after {
    position: absolute;
    right: 0;
    bottom: -6px;
    left: 0;
    height: 1px;
    background: var(--accent);
    content: "";
  }

  /* El scroll es nativo pero sin barra: el desvanecido indica que hay mas. */
  .sessions-scroll {
    --fade: 2rem;
    display: flex;
    min-width: 0;
    flex: 0 1 auto;
    align-items: stretch;
    overflow-x: auto;
    scrollbar-width: none;
    scroll-padding-inline: var(--fade);
  }

  .sessions-scroll::-webkit-scrollbar {
    display: none;
  }

  .sessions-scroll.fade-end {
    mask-image: linear-gradient(to right, #000 calc(100% - var(--fade)), transparent);
  }

  .sessions-scroll.fade-start {
    mask-image: linear-gradient(to right, transparent, #000 var(--fade));
  }

  .sessions-scroll.fade-start.fade-end {
    mask-image: linear-gradient(to right, transparent, #000 var(--fade), #000 calc(100% - var(--fade)), transparent);
  }

  /* La x: en la elegida y al pasar por encima. */
  .session :global(.tab-close) {
    visibility: hidden;
  }

  .session.active :global(.tab-close),
  .session:hover :global(.tab-close),
  .session :global(.tab-close:focus-visible) {
    visibility: visible;
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

  .session-add {
    display: grid;
    width: 1.5rem;
    height: 1.5rem;
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

  .session-add:hover {
    background: color-mix(in srgb, var(--text-primary) 8%, transparent);
    color: var(--text-primary);
  }

  .session-add:focus-visible {
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
