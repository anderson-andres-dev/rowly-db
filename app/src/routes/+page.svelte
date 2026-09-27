<script lang="ts">
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import { connection, connectToProfile, deleteConnectionProfile, pendingEdit } from "$lib/stores/connection";
  import {
    connectionProfiles,
    type ConnectionProfile,
  } from "$lib/stores/connectionProfiles";
  import type { ConnectionDriver } from "$lib/connections";
  import ConnectionLanding from "$lib/components/ConnectionLanding.svelte";
  import DriverPicker from "$lib/components/DriverPicker.svelte";
  import ConnectionForm from "$lib/components/ConnectionForm.svelte";
  import Workspace from "$lib/components/Workspace.svelte";
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
  import { t } from "$lib/i18n";

  // "Nueva conexion" abre primero el modal de motores (DriverPicker) y al
  // elegir uno, el formulario; la pantalla de conexiones queda detras.
  let choosingDriver = $state(false);
  let selectedDriver = $state<ConnectionDriver | null>(null);
  let activeProfile = $state<ConnectionProfile | null>(null);
  let fallbackError = $state<string | null>(null);
  let formIntent = $state<"connect" | "edit">("connect");
  let connectingId = $state<string | null>(null);
  let deletingProfile = $state<ConnectionProfile | null>(null);
  let deleteError = $state<string | null>(null);

  function startConnection() {
    selectedDriver = null;
    activeProfile = null;
    choosingDriver = true;
  }

  function selectDriver(driver: ConnectionDriver) {
    choosingDriver = false;
    selectedDriver = driver;
    activeProfile = null;
    fallbackError = null;
    formIntent = "connect";
  }

  function openProfile(
    profile: ConnectionProfile,
    error: string | null = null,
    intent: "connect" | "edit" = "connect",
  ) {
    choosingDriver = false;
    activeProfile = profile;
    selectedDriver = profile.driver;
    fallbackError = error;
    formIntent = intent;
  }

  async function handleConnect(profile: ConnectionProfile) {
    connectingId = profile.id;
    const result = await connectToProfile(profile);
    connectingId = null;
    if (!result.ok) {
      openProfile(profile, result.reason === "connect-failed" ? result.error : null);
    }
  }

  async function confirmDelete(profile: ConnectionProfile) {
    deletingProfile = null;
    try {
      await deleteConnectionProfile(profile.id);
      deleteError = null;
    } catch (error) {
      deleteError = $t("connections.delete.failed", { error: String(error) });
    }
  }

  function closeForm() {
    selectedDriver = null;
    activeProfile = null;
    fallbackError = null;
  }

  // Al quedar conectado, los modales de esta pagina (motor y formulario)
  // cumplieron su funcion: se cierran y se limpia su estado. Si no, siguen
  // "vivos" ocultos detras del Workspace y reaparecen con datos viejos al
  // volver a la pantalla de conexiones.
  $effect(() => {
    if (!$connection.connected) return;
    choosingDriver = false;
    closeForm();
  });

  // Una ventana abierta desde "Abrir en una ventana nueva" del selector del
  // topbar (connectionWindow.ts) llega con ?connect=<id>: se conecta sola a
  // ese perfil, con el mismo flujo (y el mismo manejo de errores) que un
  // clic en su tarjeta.
  onMount(() => {
    const id = new URLSearchParams(window.location.search).get("connect");
    const profile = id ? get(connectionProfiles).find((candidate) => candidate.id === id) : undefined;
    if (profile) void handleConnect(profile);
  });

  // Puente para cuando el selector de conexiones del topbar (+layout.svelte)
  // falla al cambiar de conexion: abre el modal de edicion con el perfil y
  // el error correspondientes, igual que si hubiera fallado desde esta pagina.
  $effect(() => {
    const pending = $pendingEdit;
    if (pending) {
      openProfile(pending.profile, pending.error);
      pendingEdit.set(null);
    }
  });
</script>

<div class="stage">
  {#if $connection.connected}
    <Workspace />
  {:else}
    <ConnectionLanding
      profiles={$connectionProfiles}
      {connectingId}
      onnewconnection={startConnection}
      onconnect={handleConnect}
      onedit={(profile) => openProfile(profile, null, "edit")}
      ondelete={(profile) => (deletingProfile = profile)}
      error={deleteError}
    />
  {/if}

  {#if deletingProfile}
    {@const profile = deletingProfile}
    <ConfirmDialog
      title={$t("connections.delete.title")}
      message={$t("connections.delete.message", { name: profile.name })}
      confirmLabel={$t("connections.delete.confirm")}
      onconfirm={() => void confirmDelete(profile)}
      oncancel={() => (deletingProfile = null)}
    />
  {/if}

  {#if !$connection.connected && choosingDriver}
    <DriverPicker onselect={selectDriver} oncancel={() => (choosingDriver = false)} />
  {/if}

  {#if !$connection.connected && selectedDriver}
    <ConnectionForm
      driver={selectedDriver}
      profile={activeProfile}
      initialError={fallbackError}
      intent={formIntent}
      onclose={closeForm}
    />
  {/if}
</div>

<style>
  .stage {
    height: 100%;
    min-height: 0;
  }
</style>
