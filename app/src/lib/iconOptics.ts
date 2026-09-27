import type { Component } from "svelte";
import {
  ArrowUpFromLine,
  Eye,
  FileOutput,
  Minus,
  Pin,
  PinOff,
  Plus,
  RotateCw,
  Search,
  Undo2,
} from "@lucide/svelte";

// Correccion optica de los iconos de las barras.
//
// A igual tamaño en px, un glifo que llena su caja (un circulo cerrado como
// recargar) se ve mas grande que uno de trazos abiertos (el "+"). Para que
// se vean parejos cada uno se dibuja a un tamaño propio; la caja del boton
// no cambia.
//
// Metodo (medido, no a ojo): cada glifo se renderizo y se midio la caja de
// su tinta en la cuadricula de 24 de lucide. Tamaño = 16 * (15.9 / t) ^ 0.5,
// donde t es la media geometrica del ancho y el alto de esa caja y 15.9 la
// del "+", que es la referencia. La raiz amortigua la correccion: igualar
// del todo dejaria los glifos llenos demasiado chicos. Se redondea a 0.25.
//
//   glifo                caja tinta    t      tamaño
//   plus                 15.9 x 15.9   15.9   16
//   minus                15.9 x  2.0   —      16   (va con el "+")
//   undo-2               17.9 x 17.9   17.9   15
//   arrow-up-from-line   15.9 x 20.0   17.8   15
//   eye                  21.9 x 15.9   18.7   14.75
//   pin                  15.9 x 21.9   18.7   14.75
//   rotate-cw            20.0 x 20.0   20.0   14.25
//   search               20.0 x 20.0   20.0   14.25
//   file-output          20.0 x 21.9   20.9   14
//   pin-off              21.9 x 21.9   21.9   13.75
//
// El trazo va fijo en px (absoluteStrokeWidth en ToolbarButton): si no,
// achicar un icono tambien afinaria sus lineas.
//
// Para un icono nuevo: medirlo igual y sumarlo aca; sin entrada usa 16.

export const TOOLBAR_ICON_SIZE = 16;

// Grosor del trazo en px: el que tiene un icono de 16 con el trazo 2 de
// lucide (2 * 16 / 24).
export const TOOLBAR_ICON_STROKE = 1.33;

const OPTICAL_SIZES = new Map<Component<never>, number>([
  [Plus, 16],
  [Minus, 16],
  [Undo2, 15],
  [ArrowUpFromLine, 15],
  [Eye, 14.75],
  [Pin, 14.75],
  [RotateCw, 14.25],
  [Search, 14.25],
  [FileOutput, 14],
  [PinOff, 13.75],
] as [Component<never>, number][]);

export function opticalIconSize(icon: Component<never>): number {
  return OPTICAL_SIZES.get(icon) ?? TOOLBAR_ICON_SIZE;
}
