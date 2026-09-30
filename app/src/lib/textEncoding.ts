// El encoding de un .sql (app/src-tauri/src/text_encoding.rs): se detecta al
// abrir y se respeta al guardar. Los mismos nombres que en Rust.
export type TextEncoding = "utf-8" | "utf-8-bom" | "utf-16le" | "utf-16be" | "windows-1252";

export const TEXT_ENCODINGS: readonly { value: TextEncoding; label: string }[] = [
  { value: "utf-8", label: "UTF-8" },
  { value: "utf-8-bom", label: "UTF-8 BOM" },
  { value: "windows-1252", label: "Windows-1252" },
  { value: "utf-16le", label: "UTF-16 LE" },
  { value: "utf-16be", label: "UTF-16 BE" },
];

export const DEFAULT_TEXT_ENCODING: TextEncoding = "utf-8";

export function isTextEncoding(value: unknown): value is TextEncoding {
  return TEXT_ENCODINGS.some((encoding) => encoding.value === value);
}

export function encodingLabel(encoding: TextEncoding): string {
  return TEXT_ENCODINGS.find((item) => item.value === encoding)?.label ?? encoding;
}
