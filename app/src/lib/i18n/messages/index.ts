import backend from "./backend";
import common from "./common";
import connections from "./connections";
import editor from "./editor";
import explorer from "./explorer";
import grid from "./grid";
import history from "./history";
import mosaic from "./mosaic";
import results from "./results";
import settings from "./settings";
import shell from "./shell";
import shortcuts from "./shortcuts";
import updates from "./updates";
import workspace from "./workspace";

// Un archivo por área de la interfaz; la clave completa es "área.clave".
export const messages = {
  backend,
  common,
  connections,
  editor,
  explorer,
  grid,
  history,
  mosaic,
  results,
  settings,
  shell,
  shortcuts,
  updates,
  workspace,
};

type Namespaces = typeof messages;
export type MessageKey = {
  [N in keyof Namespaces]: `${N}.${keyof Namespaces[N]["es"] & string}`;
}[keyof Namespaces];
