<script lang="ts">
  import { Minus, Plus } from "@lucide/svelte";

  // Campo numerico propio: − valor + , sin las flechas del navegador. Se
  // escribe el numero o se ajusta con los botones, las flechas ↑ ↓ o
  // Re Pág / Av Pág (de a 10). El valor queda siempre dentro de min..max.
  let {
    value,
    min,
    max,
    step = 1,
    suffix = "",
    id,
    label,
    onchange,
  }: {
    value: number;
    min: number;
    max: number;
    step?: number;
    suffix?: string;
    id?: string;
    label: string;
    onchange: (value: number) => void;
  } = $props();

  // svelte-ignore state_referenced_locally
  let draft = $state(String(value));

  $effect(() => {
    draft = String(value);
  });

  function commit(next: number) {
    const clamped = Math.min(max, Math.max(min, Math.round(next)));
    draft = String(clamped);
    if (clamped !== value) onchange(clamped);
  }

  function commitDraft() {
    const parsed = Number.parseInt(draft, 10);
    commit(Number.isFinite(parsed) ? parsed : value);
  }

  function handleKeydown(event: KeyboardEvent) {
    const deltas: Record<string, number> = { ArrowUp: step, ArrowDown: -step, PageUp: step * 10, PageDown: -step * 10 };
    if (event.key in deltas) {
      event.preventDefault();
      commit(value + deltas[event.key]);
    } else if (event.key === "Enter") {
      event.preventDefault();
      commitDraft();
    }
  }
</script>

<div class="stepper">
  <button type="button" tabindex="-1" aria-hidden="true" disabled={value <= min} onclick={() => commit(value - step)}>
    <Minus size={13} />
  </button>
  <label class="value">
    <input
      {id}
      type="text"
      inputmode="numeric"
      role="spinbutton"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      bind:value={draft}
      onkeydown={handleKeydown}
      onblur={commitDraft}
      oninput={() => (draft = draft.replace(/\D/g, ""))}
    />
    {#if suffix}<span>{suffix}</span>{/if}
  </label>
  <button type="button" tabindex="-1" aria-hidden="true" disabled={value >= max} onclick={() => commit(value + step)}>
    <Plus size={13} />
  </button>
</div>

<style>
  .stepper {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    height: 2rem;
    padding: 0 2px;
    box-sizing: border-box;
    border: 1px solid var(--control-border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    transition: border-color var(--duration-fast);
  }

  .stepper:focus-within {
    border-color: var(--focus-ring);
  }

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.625rem;
    height: 1.625rem;
    padding: 0;
    border: 0;
    border-radius: calc(var(--radius-sm) - 2px);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition:
      background-color var(--duration-fast),
      color var(--duration-fast);
  }

  button:hover:not(:disabled) {
    background: color-mix(in srgb, var(--text-primary) 8%, transparent);
    color: var(--text-primary);
  }

  button:disabled {
    cursor: default;
    opacity: 0.35;
  }

  .value {
    display: inline-flex;
    align-items: baseline;
    gap: 4px;
    padding: 0 var(--space-1);
    cursor: text;
  }

  input {
    width: 3ch;
    padding: 0;
    border: 0;
    outline: none;
    background: transparent;
    color: var(--text-primary);
    font: inherit;
    font-size: 0.8125rem;
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  span {
    color: var(--text-secondary);
    font-size: 0.75rem;
  }
</style>
