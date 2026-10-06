<script lang="ts">
  import { untrack } from "svelte";
  import { Plus, X } from "@lucide/svelte";
  import { t } from "$lib/i18n";
  import { tooltip } from "$lib/tooltip";
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

  type Session = { key: number; label: string; info: TerminalInfo | null };

  let sessions = $state<Session[]>([]);
  let active = $state(0);
  // "Local", "Local (2)"...; vuelve a empezar cuando no queda ninguna.
  let opened = 0;
  let nextKey = 1;

  function add() {
    opened = sessions.length === 0 ? 1 : opened + 1;
    const label = opened === 1 ? $t("workspace.terminal.local") : `${$t("workspace.terminal.local")} (${opened})`;
    const key = nextKey++;
    sessions = [...sessions, { key, label, info: null }];
    active = key;
  }

  function close(key: number) {
    const index = sessions.findIndex((session) => session.key === key);
    if (index < 0) return;
    sessions = sessions.filter((session) => session.key !== key);
    if (active === key) active = (sessions[index] ?? sessions[index - 1])?.key ?? 0;
  }

  // Al mostrarse sin ninguna sesion (la primera vez, o tras cerrar la
  // ultima), abre una. Cerrar la ultima con la pestaña a la vista no la
  // reabre sola: queda el +.
  $effect(() => {
    if (visible) untrack(() => sessions.length === 0 && add());
  });
</script>

<div class="terminal-sessions" role="tablist" aria-label={$t("workspace.terminal.title")}>
  {#each sessions as session (session.key)}
    <div class="result-tab closable" class:active={session.key === active}>
      <button
        type="button"
        role="tab"
        class="tab-select"
        aria-selected={session.key === active}
        use:tooltip={session.info ? `${session.info.shell} · ${session.info.cwd}` : session.label}
        onclick={() => (active = session.key)}
      >
        <span>{session.label}</span>
      </button>
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
  <!-- La misma pieza que las pestañas: ToolbarButton, compartido con la
       pagina, sacaba un chunk aparte del JS inicial (+1,2 KB). -->
  <button type="button" class="result-tab" aria-label={$t("workspace.terminal.new")} use:tooltip={$t("workspace.terminal.new")} onclick={add}>
    <Plus size={14} aria-hidden="true" />
  </button>
</div>
{#each sessions as session (session.key)}
  <TerminalSession
    visible={visible && session.key === active}
    {profileId}
    oninfo={(info) => (session.info = info)}
    onexit={() => close(session.key)}
    {onerror}
  />
{/each}

<style>
  /* La misma fila que la barra del resultado, en su lugar. */
  .terminal-sessions {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 2px;
    min-height: 2.5rem;
    padding: 0 var(--space-2);
    box-sizing: border-box;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
  }
</style>
