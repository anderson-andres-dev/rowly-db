<script lang="ts">
  import { t } from "$lib/i18n";
  import type { ConnectionEnvironment } from "$lib/stores/connectionProfiles";

  // Etiqueta del entorno de una conexion (topbar, tarjetas, guard). Solo
  // Produccion llama la atencion; el resto queda en un tono apagado para que
  // la marca de produccion siga significando algo.
  // short: la abreviatura (DEV, PROD) para espacios chicos como la tarjeta.
  let { environment, short = false }: { environment: ConnectionEnvironment; short?: boolean } = $props();
</script>

<span class="environment-badge {environment}"
  >{short ? $t(`connections.environment.${environment}.short`) : $t(`connections.environment.${environment}`)}</span
>

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

  .production {
    --tone: var(--danger);
    border-color: color-mix(in srgb, var(--tone) 55%, transparent);
    background: color-mix(in srgb, var(--tone) 16%, transparent);
  }
</style>
