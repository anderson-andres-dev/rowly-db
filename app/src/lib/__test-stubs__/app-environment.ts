// Stub minimo de $app/environment para tests con Vitest, que no corre bajo
// el plugin de SvelteKit (no hace falta para testear modulos puros como
// editor/context, editor/completionPolicy y editor/completionSource). "browser: false" hace que
// usageStats.ts tome sus ramas no-browser (sin localStorage), que es
// exactamente el comportamiento correcto en un entorno de test Node.
export const browser = false;
