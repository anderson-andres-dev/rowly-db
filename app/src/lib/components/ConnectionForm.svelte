<script lang="ts">
  import { tooltip } from "$lib/tooltip";
  import DriverLogo from "$lib/components/DriverLogo.svelte";
  import { Check, ChevronDown, CircleAlert, CircleCheck, Copy, TriangleAlert, X } from "@lucide/svelte";
  import { slide } from "svelte/transition";
  import Field from "$lib/components/Field.svelte";
  import Button from "$lib/components/Button.svelte";
  import ColorPicker from "$lib/components/ColorPicker.svelte";
  import GroupPicker from "$lib/components/GroupPicker.svelte";
  import { getDriver, type ConnectionDriver } from "$lib/connections";
  import { summarizeError, summarizeReport, summaryText, type TestSummary } from "$lib/connectionTest";
  import { writeClipboard } from "$lib/clipboard";
  import { t, type MessageKey } from "$lib/i18n";
  import {
    connection,
    completeConnection,
    connect,
    testConnection,
    type ConnectionConfig,
  } from "$lib/stores/connection";
  import {
    CONNECTION_ENVIRONMENTS,
    connectionProfiles,
    createConnectionProfileId,
    saveConnectionProfile,
    type ConnectionEnvironment,
    type ConnectionProfile,
  } from "$lib/stores/connectionProfiles";
  import {
    loadConnectionPassword,
    saveConnectionPassword,
    type PasswordPolicy,
  } from "$lib/credentials";
  import type { TestConnectionReport, TlsMode } from "$lib/types";

  let {
    driver,
    profile = null,
    initialError = null,
    intent = "connect",
    onclose,
  }: {
    driver: ConnectionDriver;
    profile?: ConnectionProfile | null;
    initialError?: string | null;
    // "edit": se abrio con el lapiz para cambiar algo; el boton solo guarda.
    // "connect": conexion nueva o un intento de conectar que necesita datos;
    // el boton guarda y conecta.
    intent?: "connect" | "edit";
    onclose: () => void;
  } = $props();

  const driverDefinition = $derived(getDriver(driver));
  let dialogEl: HTMLDialogElement | undefined = $state();

  let profileId = $state("");
  let name = $state("");
  let group = $state<string | undefined>(undefined);
  let color = $state<string | undefined>(undefined);
  let environment = $state<ConnectionEnvironment | undefined>(undefined);
  let host = $state("localhost");
  let port = $state(0);
  let username = $state("");
  // Solo lo que el usuario escribe. La contraseña ya guardada vive aparte
  // (storedPassword) y nunca se muestra, igual que en DataGrip: el campo
  // vacio con "guardada" en el placeholder significa "usar la guardada".
  let password = $state("");
  let storedPassword = $state<string | null>(null);
  let passwordPolicy = $state<PasswordPolicy>("forever");
  let database = $state("");
  let tlsMode = $state<TlsMode>("auto");
  let caCertificatePath = $state("");
  let initialized = $state(false);
  let attempted = $state(false);
  let testing = $state(false);
  let credentialLoading = $state(false);
  let saving = $state(false);
  // Errores crudos (del backend o del llavero); el texto que los rodea se
  // traduce al pintarlos, igual que los mensajes de validacion, que se
  // guardan como clave para que sigan el idioma activo.
  let credentialError = $state<string | null>(null);
  let persistenceError = $state<string | null>(null);
  // Resultado de la ultima prueba: el resumen se arma con `$t` para que
  // cambie de idioma sin volver a probar.
  let testResult = $state<
    | { kind: "report"; report: TestConnectionReport }
    | { kind: "error"; message: string; endpoint: string }
    | null
  >(null);
  const testSummary = $derived<TestSummary | null>(
    testResult === null
      ? null
      : testResult.kind === "report"
        ? summarizeReport(testResult.report, $t)
        : summarizeError(testResult.message, testResult.endpoint, $t),
  );
  let testPopoverOpen = $state(false);
  let testArea = $state<HTMLElement>();
  let copied = $state<"test" | "url" | null>(null);
  let errors = $state<{
    name?: MessageKey;
    host?: MessageKey;
    port?: MessageKey;
    username?: MessageKey;
    database?: MessageKey;
  }>({});

  const busy = $derived($connection.connecting || testing || credentialLoading || saving);
  const verifiesCertificate = $derived(tlsMode === "verifyCa" || tlsMode === "verifyIdentity");
  const hasStoredPassword = $derived(storedPassword !== null && storedPassword !== "");
  const effectivePassword = $derived(password !== "" ? password : (storedPassword ?? ""));
  const existingGroups = $derived(
    [...new Set($connectionProfiles.map((candidate) => candidate.group).filter((value): value is string => !!value))].sort(
      (a, b) => a.localeCompare(b),
    ),
  );
  const connectionUrl = $derived.by(() => {
    const scheme = driverDefinition.backendKind === "mysql" ? "mysql" : "postgresql";
    const encodedUser = username.trim() ? `${encodeURIComponent(username.trim())}@` : "";
    const encodedDatabase = database.trim() ? `/${encodeURIComponent(database.trim())}` : "";
    // Mismo nombre de parametro y valores que usan los clientes oficiales de
    // cada motor (ssl-mode en MySQL, sslmode en libpq).
    const sslParam = tlsMode === "auto" ? "" : `?${sslUrlParameter(tlsMode)}`;
    return `${scheme}://${encodedUser}${host.trim() || "localhost"}:${Number(port) || driverDefinition.defaultPort}${encodedDatabase}${sslParam}`;
  });
  const passwordPolicyOptions = $derived([
    { value: "never", label: $t("connections.form.policy.never") },
    { value: "restart", label: $t("connections.form.policy.restart") },
    { value: "forever", label: $t("connections.form.policy.forever") },
  ]);
  // SSL es un interruptor: encendido queda en Automatico (lo recomendado) y
  // solo quien despliega las opciones elige un modo mas estricto.
  const SSL_MODES = ["auto", "required", "verifyCa", "verifyIdentity"] as const satisfies TlsMode[];
  const sslEnabled = $derived(tlsMode !== "disabled");
  let sslExpanded = $state(false);

  function toggleSsl() {
    if (sslEnabled) {
      tlsMode = "disabled";
      sslExpanded = false;
    } else {
      tlsMode = "auto";
    }
  }

  function sslUrlParameter(mode: TlsMode): string {
    if (driverDefinition.backendKind === "mysql") {
      const values: Record<TlsMode, string> = {
        auto: "PREFERRED",
        required: "REQUIRED",
        verifyCa: "VERIFY_CA",
        verifyIdentity: "VERIFY_IDENTITY",
        disabled: "DISABLED",
      };
      return `ssl-mode=${values[mode]}`;
    }
    const values: Record<TlsMode, string> = {
      auto: "prefer",
      required: "require",
      verifyCa: "verify-ca",
      verifyIdentity: "verify-full",
      disabled: "disable",
    };
    return `sslmode=${values[mode]}`;
  }

  $effect(() => {
    if (!initialized) {
      profileId = profile?.id ?? createConnectionProfileId();
      name = profile?.name ?? "";
      group = profile?.group;
      color = profile?.color;
      environment = profile?.environment;
      host = profile?.host ?? "localhost";
      port = profile?.port ?? driverDefinition.defaultPort;
      username = profile?.username ?? "";
      database = profile?.database ?? "";
      passwordPolicy = profile?.passwordPolicy ?? "forever";
      tlsMode = profile?.tlsMode ?? "auto";
      caCertificatePath = profile?.caCertificatePath ?? "";
      initialized = true;
      if (initialError) attempted = true;

      if (profile) void hydratePassword(profile.id, profile.passwordPolicy);
    }
  });

  $effect(() => {
    if (dialogEl && !dialogEl.open) dialogEl.showModal();
  });

  async function hydratePassword(id: string, policy: PasswordPolicy) {
    credentialLoading = true;
    credentialError = null;

    try {
      storedPassword = await loadConnectionPassword(id, policy);
    } catch (error) {
      credentialError = String(error);
    } finally {
      credentialLoading = false;
    }
  }

  function validatedConfig(): ConnectionConfig | null {
    const nextErrors: typeof errors = {};

    if (!name.trim()) nextErrors.name = "connections.form.error.name";
    if (!host.trim()) nextErrors.host = "connections.form.error.host";
    if (!database.trim()) nextErrors.database = "connections.form.error.database";
    if (!username.trim()) nextErrors.username = "connections.form.error.username";

    const portValue = Number(port);
    if (!Number.isInteger(portValue) || portValue < 1 || portValue > 65535) {
      nextErrors.port = "connections.form.error.port";
    }

    errors = nextErrors;
    if (Object.keys(nextErrors).length > 0) return null;

    return {
      host: host.trim(),
      port: portValue,
      database: database.trim(),
      username: username.trim(),
      password: effectivePassword,
      tlsMode,
      // Solo se envia si el modo la usa: una ruta vieja no debe romper una
      // conexion en Automatico.
      caCertificatePath: verifiesCertificate && caCertificatePath.trim() ? caCertificatePath.trim() : undefined,
    };
  }

  async function handleTest() {
    const config = validatedConfig();
    if (!config) return;

    attempted = false;
    persistenceError = null;
    testing = true;
    testPopoverOpen = false;

    try {
      testResult = { kind: "report", report: await testConnection(driverDefinition.backendKind, config) };
    } catch (error) {
      testResult = { kind: "error", message: String(error), endpoint: `${config.host}:${config.port}` };
    } finally {
      testing = false;
      testPopoverOpen = true;
    }
  }

  async function handleSubmit() {
    const config = validatedConfig();
    if (!config) return;
    if (intent === "edit") {
      await saveOnly(config);
      return;
    }

    attempted = true;
    persistenceError = null;
    testPopoverOpen = false;
    const tableCount = await connect(driverDefinition.backendKind, config, environment === "production");
    if (tableCount === null) return;

    saving = true;
    try {
      await saveConnectionPassword(profileId, config.password, passwordPolicy);
      saveConnectionProfile({
        id: profileId,
        name: name.trim(),
        group,
        color,
        environment,
        driver,
        host: config.host,
        port: config.port,
        database: config.database,
        username: config.username,
        passwordPolicy,
        tlsMode,
        caCertificatePath: config.caCertificatePath,
      });
      completeConnection(tableCount, profileId);
    } catch (error) {
      persistenceError = String(error);
    } finally {
      saving = false;
    }
  }

  // Editar no conecta: guarda perfil y contraseña y vuelve a la pantalla
  // de conexiones, donde un clic en la tarjeta conecta cuando haga falta.
  async function saveOnly(config: ConnectionConfig) {
    attempted = true;
    persistenceError = null;
    testPopoverOpen = false;
    saving = true;
    try {
      await saveConnectionPassword(profileId, config.password, passwordPolicy);
      saveConnectionProfile({
        id: profileId,
        name: name.trim(),
        group,
        color,
        environment,
        driver,
        host: config.host,
        port: config.port,
        database: config.database,
        username: config.username,
        passwordPolicy,
        tlsMode,
        caCertificatePath: config.caCertificatePath,
      });
      dialogEl?.close();
    } catch (error) {
      persistenceError = String(error);
    } finally {
      saving = false;
    }
  }

  async function copy(text: string, what: "test" | "url") {
    if (!(await writeClipboard(text))) return;
    copied = what;
    setTimeout(() => {
      if (copied === what) copied = null;
    }, 1500);
  }

  function requestClose() {
    if (!busy) dialogEl?.close();
  }

  function handleCancel(event: Event) {
    // Escape cierra primero el popover de la prueba, no el modal entero.
    if (testPopoverOpen) {
      event.preventDefault();
      testPopoverOpen = false;
      return;
    }
    if (busy) event.preventDefault();
  }

  function handleDialogClick(event: MouseEvent) {
    if (event.target === dialogEl) {
      requestClose();
      return;
    }
    if (testPopoverOpen && testArea && !testArea.contains(event.target as Node)) {
      testPopoverOpen = false;
    }
  }
</script>

<dialog
  bind:this={dialogEl}
  aria-labelledby="connection-dialog-title"
  onclose={onclose}
  oncancel={handleCancel}
  onclick={handleDialogClick}
>
  <header class="dialog-header">
    <DriverLogo {driver} size={28} />
    <div class="dialog-title">
      <h1 id="connection-dialog-title">
        {profile ? profile.name : $t("connections.newConnection")}
      </h1>
      <p>{driverDefinition.name}{group ? ` · ${group}` : ""}</p>
    </div>
    <button class="close" type="button" aria-label={$t("common.close")} onclick={requestClose} disabled={busy}>
      <X size={16} aria-hidden="true" />
    </button>
  </header>

  <form
    onsubmit={(event) => {
      event.preventDefault();
      handleSubmit();
    }}
  >
    <div class="form-body">
      <div class="identity">
        <div class="name-row">
          <Field
            label={$t("connections.form.name")}
            id="connection-name"
            name="connection-name"
            bind:value={name}
            error={errors.name && $t(errors.name)}
            autocomplete="off"
            orientation="horizontal"
            required
            disabled={busy}
          >
            {#snippet trailing()}
              <ColorPicker bind:value={color} disabled={busy} />
            {/snippet}
          </Field>
          <GroupPicker bind:value={group} groups={existingGroups} disabled={busy} />
        </div>

        <!-- Un clic elige el entorno; otro clic sobre el elegido lo quita. -->
        <div class="environment-row">
          <span class="row-label" id="environment-label">{$t("connections.environment.label")}</span>
          <div class="environment-options" role="radiogroup" aria-labelledby="environment-label">
            {#each CONNECTION_ENVIRONMENTS as option (option)}
              <button
                class="environment-option {option}"
                class:selected={environment === option}
                type="button"
                role="radio"
                aria-checked={environment === option}
                disabled={busy}
                onclick={() => (environment = environment === option ? undefined : option)}
              >
                {$t(`connections.environment.${option}`)}
              </button>
            {/each}
          </div>
          {#if environment === "production"}
            <p class="environment-hint">{$t("connections.environment.productionHint")}</p>
          {/if}
        </div>
      </div>

      <section class="section">
        <div class="endpoint">
          <Field
            label={$t("connections.form.host")}
            id="host"
            name="host"
            bind:value={host}
            error={errors.host && $t(errors.host)}
            autocomplete="url"
            orientation="horizontal"
            required
            disabled={busy}
          />

          <Field
            label={$t("connections.form.port")}
            id="port"
            name="port"
            type="number"
            bind:value={port}
            error={errors.port && $t(errors.port)}
            min={1}
            max={65535}
            orientation="compact"
            required
            disabled={busy}
          />
        </div>

        <Field
          label={$t("connections.form.database")}
          id="database"
          name="database"
          bind:value={database}
          error={errors.database && $t(errors.database)}
          autocomplete="off"
          orientation="horizontal"
          required
          disabled={busy}
        />
      </section>

      <section class="section">
        <Field
          label={$t("connections.form.username")}
          id="username"
          name="username"
          bind:value={username}
          error={errors.username && $t(errors.username)}
          autocomplete="username"
          orientation="horizontal"
          required
          disabled={busy}
        />

        <div class="password-row">
          <Field
            label={$t("connections.form.password")}
            id="password"
            name="password"
            type="password"
            bind:value={password}
            placeholder={credentialLoading
              ? $t("common.loading")
              : hasStoredPassword
                ? $t("connections.form.passwordStored")
                : ""}
            autocomplete={hasStoredPassword ? "new-password" : "current-password"}
            orientation="horizontal"
            disabled={busy}
          />
          <Field
            label={$t("connections.form.passwordPolicy")}
            id="password-policy"
            name="password-policy"
            type="select"
            bind:value={passwordPolicy}
            options={passwordPolicyOptions}
            orientation="compact"
            disabled={busy}
          />
        </div>
      </section>

      <section class="section">
        <div class="ssl-row">
          <span class="row-label" id="ssl-label">{$t("connections.form.ssl")}</span>
          <div class="ssl-controls">
            <button
              class="ui-switch"
              type="button"
              role="switch"
              aria-checked={sslEnabled}
              aria-labelledby="ssl-label"
              disabled={busy}
              onclick={toggleSsl}
            >
              <span></span>
            </button>
            {#if sslEnabled}
              <button
                class="ssl-summary"
                type="button"
                aria-expanded={sslExpanded}
                aria-controls="ssl-modes"
                aria-label={$t("connections.form.ssl.options")}
                use:tooltip={$t("connections.form.ssl.options")}
                disabled={busy}
                onclick={() => (sslExpanded = !sslExpanded)}
              >
                <!-- Automatico es lo normal y no hace falta decirlo: solo se
                     nombra un modo mas estricto. -->
                {#if tlsMode !== "auto"}{$t(`connections.form.tls.${tlsMode}`)}{/if}
                <ChevronDown size={13} class="ssl-chevron" aria-hidden="true" />
              </button>
            {:else}
              <span class="ssl-off">{$t("connections.form.tls.disabled")}</span>
            {/if}
          </div>

          {#if sslEnabled && sslExpanded}
            <div id="ssl-modes" class="ssl-modes" role="radiogroup" aria-labelledby="ssl-label" transition:slide={{ duration: 140 }}>
              {#each SSL_MODES as mode (mode)}
                <button
                  class="ssl-mode"
                  class:selected={tlsMode === mode}
                  type="button"
                  role="radio"
                  aria-checked={tlsMode === mode}
                  disabled={busy}
                  onclick={() => (tlsMode = mode)}
                >
                  <span class="radio" aria-hidden="true"></span>
                  <span class="ssl-mode-text">
                    <strong>{$t(`connections.form.tls.${mode}`)}</strong>
                    <span>{$t(`connections.form.tls.${mode}.description`)}</span>
                  </span>
                </button>
              {/each}
            </div>
          {/if}
        </div>

        {#if verifiesCertificate}
          <Field
            label={$t("connections.form.caCertificate")}
            id="ca-certificate"
            name="ca-certificate"
            bind:value={caCertificatePath}
            placeholder={$t("connections.form.caCertificatePlaceholder")}
            autocomplete="off"
            orientation="horizontal"
            disabled={busy}
          />
        {/if}
      </section>

      <div class="url-row">
        <span class="row-label">{$t("connections.form.url")}</span>
        <div class="url-box">
          <code use:tooltip={connectionUrl}>{connectionUrl}</code>
          <button
            type="button"
            class="icon-action"
            aria-label={$t("connections.form.copyUrl")}
            use:tooltip={copied === "url" ? $t("connections.form.urlCopied") : $t("connections.form.copyUrl")}
            onclick={() => copy(connectionUrl, "url")}
          >
            {#if copied === "url"}
              <Check size={14} aria-hidden="true" />
            {:else}
              <Copy size={14} aria-hidden="true" />
            {/if}
          </button>
        </div>
      </div>

      {#if credentialError}
        <div role="alert" class="feedback error"><span>{$t("connections.form.error.readPassword", { error: credentialError })}</span></div>
      {/if}

      {#if persistenceError}
        <div role="alert" class="feedback error"><span>{$t("connections.form.error.savePassword", { error: persistenceError })}</span></div>
      {/if}

      {#if attempted && $connection.error}
        <div role="alert" class="feedback error">
          <strong>
            {$t("connections.form.error.connect", {
              host: host.trim() || $t("connections.form.error.theServer"),
              port,
            })}
          </strong>
          <span>{$connection.error}</span>
        </div>
      {/if}
    </div>

    <footer>
      <div class="test-area" bind:this={testArea}>
        <button class="test-action" type="button" onclick={handleTest} disabled={busy}>
          {testing ? $t("connections.form.testing") : $t("connections.form.test")}
        </button>

        {#if testSummary && !testing}
          <button
            type="button"
            class={`test-badge ${testSummary.outcome}`}
            aria-expanded={testPopoverOpen}
            aria-controls="test-report"
            use:tooltip={$t("connections.form.testDetail")}
            onclick={() => (testPopoverOpen = !testPopoverOpen)}
          >
            {#if testSummary.outcome === "success"}
              <CircleCheck size={14} aria-hidden="true" />
            {:else if testSummary.outcome === "warning"}
              <TriangleAlert size={14} aria-hidden="true" />
            {:else}
              <CircleAlert size={14} aria-hidden="true" />
            {/if}
            <span>{testSummary.badge}</span>
          </button>
        {/if}

        {#if testSummary && testPopoverOpen}
          <div
            id="test-report"
            class={`test-popover ${testSummary.outcome}`}
            role={testSummary.outcome === "error" ? "alert" : "status"}
          >
            <div class="test-popover-header">
              <strong>{testSummary.title}</strong>
              <button
                type="button"
                class="copy-report"
                onclick={() => testSummary && copy(summaryText(testSummary), "test")}
              >
                {#if copied === "test"}
                  <Check size={13} aria-hidden="true" /> {$t("connections.form.copied")}
                {:else}
                  <Copy size={13} aria-hidden="true" /> {$t("connections.form.copy")}
                {/if}
              </button>
            </div>
            <dl>
              {#each testSummary.lines as line (line.label)}
                <dt>{line.label}</dt>
                <dd>{line.value}</dd>
              {/each}
            </dl>
          </div>
        {/if}
      </div>

      <div class="primary-actions">
        <Button type="button" variant="secondary" onclick={requestClose} disabled={busy}>
          {$t("common.cancel")}
        </Button>
        <Button type="submit" variant="primary" loading={$connection.connecting || saving} disabled={busy}>
          {$connection.connecting
            ? $t("connections.form.connecting")
            : saving
              ? $t("connections.form.saving")
              : intent === "edit"
                ? $t("connections.form.save")
                : $t("connections.form.saveAndConnect")}
        </Button>
      </div>
    </footer>
  </form>
</dialog>

<style>
  dialog {
    width: min(44rem, calc(100vw - 2rem));
    max-width: none;
    max-height: calc(100vh - 2rem);
    padding: 0;
    overflow: visible;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--surface);
    color: var(--text-primary);
    box-shadow: var(--shadow-elevated);
  }

  .dialog-header {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-4) var(--space-4) var(--space-3) var(--space-5);
    border-radius: var(--radius-md) var(--radius-md) 0 0;
  }

  .dialog-title {
    min-width: 0;
  }

  h1 {
    overflow: hidden;
    margin: 0 0 2px;
    font-size: 0.9375rem;
    font-weight: var(--font-weight-heading);
    letter-spacing: var(--tracking-heading);
    line-height: var(--leading-heading);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dialog-title p {
    margin: 0;
    overflow: hidden;
    color: var(--text-secondary);
    font-size: 0.75rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition:
      color var(--duration-fast),
      background-color var(--duration-fast);
  }

  .close:hover:not(:disabled) {
    background: var(--surface-hover);
    color: var(--text-primary);
  }

  .close:focus-visible,
  .test-action:focus-visible,
  .test-badge:focus-visible,
  .copy-report:focus-visible,
  .icon-action:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
  }

  .close:disabled {
    color: var(--control-disabled);
    cursor: not-allowed;
  }

  form {
    display: flex;
    max-height: calc(100vh - 7rem);
    flex-direction: column;
  }

  .form-body {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    overflow-y: auto;
    padding: var(--space-3) var(--space-5) var(--space-5);
  }

  /* Bloques (servidor, autenticacion, seguridad) separados solo por aire,
     sin lineas ni titulos: la jerarquia la da el espacio, como en los
     dialogos de DataGrip. */
  .section {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .name-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
    gap: var(--space-3);
  }

  /* La pastilla (1.875rem) queda centrada respecto del input (2.125rem)
     sin depender de align-items, que se correria si Nombre muestra error. */
  .name-row :global(.group-picker) {
    margin-top: 2px;
  }

  .identity {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .environment-row {
    display: grid;
    grid-template-columns: 7.5rem minmax(0, 1fr);
    align-items: center;
    column-gap: var(--space-4);
    row-gap: var(--space-2);
  }

  .environment-options {
    display: inline-flex;
    justify-self: start;
    gap: 2px;
    padding: 2px;
    border-radius: var(--radius-sm);
    background: var(--surface-elevated);
  }

  .environment-option {
    height: 1.75rem;
    padding: 0 var(--space-3);
    border: 0;
    border-radius: calc(var(--radius-sm) - 2px);
    background: transparent;
    color: var(--text-secondary);
    font: inherit;
    font-size: 0.8125rem;
    cursor: pointer;
    transition:
      background 120ms ease,
      color 120ms ease;
  }

  .environment-option:hover:not(:disabled, .selected) {
    color: var(--text-primary);
  }

  .environment-option.selected {
    background: var(--surface);
    color: var(--text-primary);
    box-shadow: inset 0 0 0 1px var(--border);
  }

  .environment-option.production.selected {
    background: color-mix(in srgb, var(--danger) 16%, var(--surface));
    color: var(--danger);
  }

  .environment-option:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: -2px;
  }

  .environment-option:disabled {
    cursor: default;
  }

  .environment-hint {
    grid-column: 2;
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.75rem;
  }

  .ssl-row {
    display: grid;
    grid-template-columns: 7.5rem minmax(0, 1fr);
    align-items: center;
    column-gap: var(--space-4);
    row-gap: var(--space-2);
  }

  .ssl-controls {
    display: flex;
    min-height: 2.125rem;
    align-items: center;
    gap: var(--space-3);
  }





  .ssl-summary:focus-visible,
  .ssl-mode:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
  }

  .ssl-summary:disabled,
  .ssl-mode:disabled {
    cursor: default;
  }

  .ssl-summary {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 0;
    border: 0;
    background: transparent;
    color: var(--text-secondary);
    font: inherit;
    font-size: 0.8125rem;
    cursor: pointer;
    transition: color var(--duration-fast);
  }

  .ssl-summary:hover:not(:disabled) {
    color: var(--text-primary);
  }

  .ssl-summary :global(.ssl-chevron) {
    transition: transform var(--duration-fast);
  }

  .ssl-summary[aria-expanded="true"] :global(.ssl-chevron) {
    transform: rotate(180deg);
  }

  .ssl-off {
    color: var(--text-secondary);
    font-size: 0.8125rem;
  }

  .ssl-modes {
    display: flex;
    grid-column: 2;
    flex-direction: column;
    gap: 2px;
    padding: 4px;
    border-radius: var(--radius-sm);
    background: var(--surface-elevated);
  }

  .ssl-mode {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-3);
    border: 0;
    border-radius: calc(var(--radius-sm) - 2px);
    background: transparent;
    color: var(--text-primary);
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: background-color var(--duration-fast);
  }

  .ssl-mode:hover:not(:disabled, .selected) {
    background: color-mix(in srgb, var(--surface) 50%, transparent);
  }

  .ssl-mode.selected {
    background: var(--surface);
  }

  .radio {
    flex-shrink: 0;
    width: 0.875rem;
    height: 0.875rem;
    margin-top: 2px;
    box-sizing: border-box;
    border: 1px solid var(--control-border);
    border-radius: 50%;
    transition:
      border-color var(--duration-fast),
      border-width var(--duration-fast);
  }

  .ssl-mode.selected .radio {
    border: 4px solid var(--accent);
  }

  .ssl-mode-text {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 2px;
  }

  .ssl-mode-text strong {
    font-size: 0.8125rem;
    font-weight: 500;
  }

  .ssl-mode-text span {
    color: var(--text-secondary);
    font-size: 0.75rem;
  }

  .row-label {
    color: var(--text-primary);
    font-size: 0.875rem;
  }

  .endpoint,
  .password-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 13rem;
    gap: var(--space-5);
  }

  .url-row {
    display: grid;
    grid-template-columns: 7.5rem minmax(0, 1fr);
    align-items: center;
    column-gap: var(--space-4);
  }

  .url-box {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: var(--space-2);
    min-height: 2.125rem;
    box-sizing: border-box;
    padding: 0 var(--space-1) 0 var(--space-3);
    border-radius: var(--radius-sm);
    background: var(--surface-elevated);
  }

  .url-box code {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    color: var(--text-secondary);
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.8rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .icon-action {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    padding: 6px;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
  }

  .icon-action:hover {
    background: var(--surface);
    color: var(--text-primary);
  }

  .feedback {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    margin-left: calc(7.5rem + var(--space-4));
    padding: var(--space-3);
    border-left: 2px solid var(--accent);
    background: color-mix(in srgb, var(--accent) 9%, transparent);
    font-size: 0.8125rem;
    line-height: 1.4;
  }

  .feedback.error {
    border-left-color: var(--danger);
    background: color-mix(in srgb, var(--danger) 9%, transparent);
  }

  .feedback strong {
    font-weight: 600;
  }

  .feedback span {
    color: var(--text-secondary);
    overflow-wrap: anywhere;
  }

  footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4) var(--space-3) var(--space-5);
    border-top: 1px solid var(--border);
    border-radius: 0 0 var(--radius-md) var(--radius-md);
    background: var(--surface-elevated);
  }

  .test-area {
    position: relative;
    display: flex;
    min-width: 0;
    align-items: center;
    gap: var(--space-3);
  }

  .test-action {
    flex-shrink: 0;
    padding: var(--space-2) 0;
    border: 0;
    background: transparent;
    color: var(--accent);
    font: inherit;
    font-size: 0.8125rem;
    cursor: pointer;
  }

  .test-action:hover:not(:disabled) {
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .test-action:disabled {
    color: var(--control-disabled);
    cursor: not-allowed;
  }

  /* Verde de exito del tema (--success): el accent de la app es azul y el
     resultado tiene que leerse como exito de un vistazo. */
  .test-badge {
    --outcome: var(--success);
    display: inline-flex;
    min-width: 0;
    align-items: center;
    gap: 5px;
    padding: 2px 6px;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    font: inherit;
    font-size: 0.8125rem;
    cursor: pointer;
  }

  .test-badge span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .test-badge :global(svg) {
    flex-shrink: 0;
    color: var(--outcome);
  }

  .test-badge:hover {
    background: var(--surface);
    color: var(--text-primary);
  }

  .test-badge.warning,
  .test-popover.warning {
    --outcome: var(--warning);
  }

  .test-badge.error,
  .test-popover.error {
    --outcome: var(--danger);
  }

  .test-popover {
    --outcome: var(--success);
    position: absolute;
    z-index: 10;
    bottom: calc(100% + var(--space-3));
    left: calc(var(--space-2) * -1);
    width: min(30rem, calc(100vw - 4rem));
    box-sizing: border-box;
    padding: var(--space-3) var(--space-4) var(--space-4);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface-elevated);
    box-shadow: var(--shadow-elevated);
    font-size: 0.8125rem;
    animation: popover-in var(--duration-fast) ease-out;
  }

  @keyframes popover-in {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
  }

  .test-popover-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    margin-bottom: var(--space-3);
  }

  .test-popover-header strong {
    color: var(--outcome);
    font-weight: 600;
  }

  .copy-report {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--accent);
    font: inherit;
    font-size: 0.75rem;
    cursor: pointer;
  }

  .copy-report:hover {
    background: var(--surface);
  }

  dl {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 4px var(--space-4);
    margin: 0;
  }

  dt {
    color: var(--text-secondary);
  }

  dd {
    margin: 0;
    color: var(--text-primary);
    overflow-wrap: anywhere;
  }

  .primary-actions {
    display: flex;
    flex-shrink: 0;
    gap: var(--space-2);
  }

  @media (max-width: 40rem) {
    .feedback {
      margin-left: 0;
    }

    .endpoint,
    .password-row,
    .name-row,
    .url-row {
      grid-template-columns: 1fr;
      gap: var(--space-3);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .test-popover {
      animation: none;
    }

  }
</style>
