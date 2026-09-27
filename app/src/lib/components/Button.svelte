<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    variant = "primary",
    disabled = false,
    loading = false,
    children,
    ...rest
  }: {
    variant?: "primary" | "secondary";
    disabled?: boolean;
    loading?: boolean;
    children?: Snippet;
  } & Record<string, unknown> = $props();

  const isDisabled = $derived(disabled || loading);
</script>

<button
  {...rest}
  class="action-button {variant}"
  disabled={isDisabled}
  aria-busy={loading ? "true" : undefined}
>
  {@render children?.()}
</button>
