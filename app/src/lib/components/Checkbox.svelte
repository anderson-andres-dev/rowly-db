<script lang="ts">
  import { Check } from "@lucide/svelte";

  // La unica casilla de la app (styles/controls.css .ui-checkbox): la del
  // navegador cambia de aspecto en cada motor.
  let { checked = $bindable(false), label }: { checked?: boolean; label: string } = $props();
</script>

<button type="button" class="ui-checkbox" role="checkbox" aria-checked={checked} onclick={() => (checked = !checked)}>
  <span class="ui-checkbox-box" aria-hidden="true">
    {#if checked}<Check size={10} strokeWidth={3} />{/if}
  </span>
  <span>{label}</span>
</button>
