// Mediciones de tools/bench/frontend: fuera de `npm test` (los tiempos
// dependen de la maquina). Se ejecuta desde app/ para usar sus dependencias;
// por eso es un objeto plano: `vitest/config` no se resuelve desde tools/.
const app = new URL("../../../app/", import.meta.url).pathname;

export default {
  root: app,
  test: {
    include: ["../tools/bench/frontend/*.measure.ts"],
    environment: "node",
    testTimeout: 600_000,
    css: true,
  },
  resolve: {
    alias: {
      $lib: `${app}src/lib`,
      "$app/environment": `${app}src/lib/__test-stubs__/app-environment.ts`,
    },
  },
};
