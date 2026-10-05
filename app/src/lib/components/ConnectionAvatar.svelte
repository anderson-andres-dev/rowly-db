<script lang="ts">
  import { NEUTRAL_IDENTITY_COLOR } from "$lib/connectionColors";
  import { initials, readableTextColor } from "$lib/connections/connectionIdentity";

  // Avatar de identidad de una conexion: sus iniciales sobre el color que
  // eligio el usuario (como los proyectos de JetBrains, "CT"). Sin color,
  // queda en un gris neutro. Lo usan las tarjetas de la pantalla de
  // conexiones y el selector de conexion del topbar.
  let {
    name,
    color,
    size = 24,
  }: {
    name: string;
    color?: string;
    size?: number;
  } = $props();
</script>

<span
  class="avatar"
  class:neutral={!color}
  style:--avatar-size={`${size}px`}
  style:--avatar-color={color ?? NEUTRAL_IDENTITY_COLOR}
  style:--avatar-text={color ? readableTextColor(color) : undefined}
  aria-hidden="true"
>
  {initials(name)}
</span>

<style>
  .avatar {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: var(--avatar-size);
    height: var(--avatar-size);
    border-radius: calc(var(--avatar-size) * 0.24);
    background: var(--avatar-color);
    color: var(--avatar-text);
    font-size: calc(var(--avatar-size) * 0.36);
    font-weight: 700;
    letter-spacing: 0.02em;
    line-height: 1;
  }

  .avatar.neutral {
    background: color-mix(in srgb, var(--avatar-color) 24%, var(--surface));
    color: var(--text-primary);
  }
</style>
