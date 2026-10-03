// Identidad visual de una conexion en la pantalla de conexiones: iniciales
// para el avatar (como los proyectos de JetBrains, "Core test" → "CT") y un
// color de texto que se lea sobre el color que eligio el usuario.

// Hasta dos iniciales: la primera letra de las dos primeras palabras, o las
// dos primeras letras si el nombre es una sola palabra ("Core" → "CO").
export function initials(name: string): string {
  const words = name
    .trim()
    .split(/[\s_\-.]+/)
    .filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return [...words[0]].slice(0, 2).join("").toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// Luminancia relativa WCAG de un "#rrggbb".
function luminance(hex: string): number {
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

// Blanco, salvo sobre colores claros (amarillo, blanco...), donde va casi
// negro. El umbral favorece al blanco a proposito: comparar contrastes WCAG
// "puros" elige texto oscuro sobre azules y verdes medios, que en avatares
// de dos letras en negrita se ve peor que el blanco habitual.
export function readableTextColor(background: string): string {
  return luminance(background) > 0.4 ? "#111827" : "#ffffff";
}
