<script lang="ts">
  import { Code, Globe, Laptop } from "@lucide/svelte";
  import { t } from "$lib/i18n";
  import type { ConnectionEnvironment } from "$lib/stores/connectionProfiles";

  // Etiqueta del entorno de una conexion (topbar, tarjetas, guard). Solo
  // Produccion llama la atencion; el resto queda en un tono apagado para que
  // la marca de produccion siga significando algo.
  // compact: solo un icono (con el nombre en el tooltip) para espacios
  // chicos como la tarjeta; sirve igual en cualquier idioma. Globo = un
  // servidor en vivo (produccion); </> = desarrollo; portatil = local.
  let { environment, compact = false }: { environment: ConnectionEnvironment; compact?: boolean } = $props();

  const icons = { local: Laptop, development: Code, production: Globe };
  const Icon = $derived(icons[environment]);
</script>

{#if compact}
  <span
    class="environment-icon {environment}"
    title={$t(`connections.environment.${environment}`)}
    aria-label={$t(`connections.environment.${environment}`)}
    role="img"
  >
    <Icon size={12} strokeWidth={2.25} aria-hidden="true" />
  </span>
{:else}
  <span class="environment-badge {environment}">{$t(`connections.environment.${environment}`)}</span>
{/if}

<style>
  .environment-badge {
    --tone: var(--text-secondary);
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    height: 1.125rem;
    padding: 0 0.4375rem;
    box-sizing: border-box;
    border: 1px solid color-mix(in srgb, var(--tone) 32%, transparent);
    border-radius: 999px;
    background: color-mix(in srgb, var(--tone) 10%, transparent);
    color: var(--tone);
    font-size: 0.625rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    line-height: 1;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .environment-badge.production {
    --tone: var(--danger);
    border-color: color-mix(in srgb, var(--tone) 55%, transparent);
    background: color-mix(in srgb, var(--tone) 16%, transparent);
  }

  .environment-icon {
    --tone: var(--text-secondary);
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 50%;
    background: color-mix(in srgb, var(--tone) 12%, transparent);
    color: var(--tone);
  }

  .environment-icon.production {
    --tone: var(--danger);
    background: color-mix(in srgb, var(--tone) 18%, transparent);
  }
</style>
