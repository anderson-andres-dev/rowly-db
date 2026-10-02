// Enter confirma un modal de confirmacion (los cambios de la grilla, una
// ejecucion que lo pide): Enter solo y recien presionado. El Ctrl+Enter que
// abrio el modal, mantenido, no confirma por autorrepeticion, y con el foco en
// un boton el navegador activa ese boton.
export function confirmsOnEnter(event: KeyboardEvent): boolean {
  if (event.key !== "Enter" || event.repeat || event.isComposing) return false;
  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return false;
  return (event.target as HTMLElement | null)?.tagName !== "BUTTON";
}
