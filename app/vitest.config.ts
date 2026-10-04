import { defineConfig } from "vitest/config";

// Solo cubre modulos puros como editor/context, editor/completionPolicy y
// editor/completionSource (sin Tauri) - no hace falta el plugin de SvelteKit
// para esto.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    // Por defecto vitest reemplaza los .css por un modulo vacio, incluso con
    // ?raw; palettes.test.ts necesita leer tokens.css tal cual.
    css: true,
  },
  resolve: {
    alias: {
      $lib: new URL("./src/lib", import.meta.url).pathname,
      "$app/environment": new URL("./src/lib/__test-stubs__/app-environment.ts", import.meta.url).pathname,
    },
  },
});
