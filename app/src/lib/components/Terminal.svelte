<script lang="ts">
  import { tick, untrack } from "svelte";
  import { Plus, X } from "@lucide/svelte";
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

<!-- Las mismas pestañas que las del resultado (styles/tabs.css): la elegida
     con el fondo de la terminal, unida a ella. -->
<div class="terminal-sessions tab-strip" style:--tab-active={$editorPalette.background} bind:this={row}>
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
  /* El scroll es nativo pero sin barra: el desvanecido indica que hay mas. */
  .sessions-scroll {
    --fade: 2rem;
    display: flex;
    min-width: 0;
    flex: 0 1 auto;
    align-self: stretch;
    align-items: flex-end;
    gap: 2px;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    scroll-padding-inline: var(--fade);
  }

  /* La franja baja sobre la linea base (su scroll recorta lo que sale):
     asi la pestaña elegida la tapa. */
  .sessions-scroll {
    margin-bottom: -1px;
  }

  /* Lugar al final para el contorno que sigue por la linea base desde la
     ultima pestaña: sin el, contaba como desborde y la franja se desplazaba.
     El margen negativo deja el + junto a las pestañas. */
  .sessions-scroll {
    margin-right: calc(-1 * var(--tab-reach));
    margin-left: calc(-1 * var(--radius-sm));
    padding-right: var(--tab-reach);
    padding-left: var(--radius-sm);
  }

  .sessions-scroll :global(.result-tab) {
    margin-bottom: 0;
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

  .session-add {
    display: grid;
    width: 1.5rem;
    height: 1.5rem;
    flex-shrink: 0;
    /* Abajo, centrado con el texto de las pestañas (2rem de alto). */
    align-self: flex-end;
    margin: 0 0 0.25rem var(--space-1);
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
