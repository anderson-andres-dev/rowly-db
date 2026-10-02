// Enter con modificadores, mantenido o durante composicion no debe activar
// el boton enfocado. Los modales lo frenan en captura, antes de la accion
// predeterminada del navegador.
export function blocksHeldEnter(event: KeyboardEvent): boolean {
  if (event.key !== "Enter") return false;
  return event.repeat || event.isComposing || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey;
}

// Enter simple fuera de un boton confirma; sobre un boton, lo activa el
// navegador.
export function confirmsOnEnter(event: KeyboardEvent): boolean {
  if (event.key !== "Enter" || blocksHeldEnter(event)) return false;
  return (event.target as HTMLElement | null)?.tagName !== "BUTTON";
}

// Dentro de un grupo de acciones, las flechas recorren solo sus botones.
// Los campos y controles del resto del dialogo conservan sus propias flechas.
export function moveDialogActionFocus(event: KeyboardEvent): boolean {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return false;
  if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return false;

  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return false;
  const actions = target.closest<HTMLElement>("[data-dialog-actions]");
  if (!actions) return false;

  const buttons = [...actions.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
  if (buttons.length < 2) return false;
  const index = buttons.indexOf(target);
  if (index < 0) return false;

  event.preventDefault();
  buttons[(index + (event.key === "ArrowRight" ? 1 : buttons.length - 1)) % buttons.length].focus();
  return true;
}
