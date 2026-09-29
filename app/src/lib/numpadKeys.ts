// Con NumLock activo, WebKitGTK entrega a veces las teclas del teclado
// numerico como su funcion de navegacion (Numpad1 llega como "End",
// Numpad8 como "ArrowUp"): el "1" terminaba bajando al final del grid. Se
// decide por la tecla fisica (event.code): el teclado numerico siempre
// escribe digitos.

const NUMPAD_TEXT: Record<string, string> = {
  Numpad0: "0",
  Numpad1: "1",
  Numpad2: "2",
  Numpad3: "3",
  Numpad4: "4",
  Numpad5: "5",
  Numpad6: "6",
  Numpad7: "7",
  Numpad8: "8",
  Numpad9: "9",
  NumpadDecimal: ".",
};

// El texto que deberia escribir la tecla, si es del teclado numerico y llego
// como otra cosa. null: la tecla es la que dice ser.
export function numpadText(event: Pick<KeyboardEvent, "code" | "key" | "ctrlKey" | "metaKey" | "altKey">): string | null {
  const text = NUMPAD_TEXT[event.code];
  if (!text || event.key === text || event.ctrlKey || event.metaKey || event.altKey) return null;
  // Algunas distribuciones ponen coma en el decimal: esa ya llega bien.
  if (event.key.length === 1) return null;
  return text;
}

function isTextTarget(target: EventTarget | null): target is HTMLElement {
  if (target instanceof HTMLTextAreaElement) return true;
  if (target instanceof HTMLInputElement) return !["checkbox", "radio", "button", "range", "color"].includes(target.type);
  return target instanceof HTMLElement && target.isContentEditable;
}

// En inputs y en el editor SQL (contenteditable) escribe el digito; en lo
// demas (el grid) cada componente usa numpadText.
export function installNumpadFix(): () => void {
  function onKeydown(event: KeyboardEvent) {
    const text = numpadText(event);
    if (!text || !isTextTarget(event.target)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    document.execCommand("insertText", false, text);
  }
  window.addEventListener("keydown", onKeydown, true);
  return () => window.removeEventListener("keydown", onKeydown, true);
}
