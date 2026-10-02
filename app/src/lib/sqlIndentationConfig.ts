export type IndentStyle = "spaces" | "tabs";
export type IndentSize = 2 | 4 | 8;
export const DEFAULT_INDENT_SIZE: IndentSize = 2;

export function indentationUnit(style: IndentStyle, size: IndentSize): string {
  return style === "tabs" ? "\t" : " ".repeat(size);
}
