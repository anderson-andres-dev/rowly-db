# Continuidad: rediseño web de Rowly DB

## Estado al pausar

Primera etapa terminada: diagnóstico y mockup estático navegable listos para revisión. La implementación de producción sigue pendiente y no debe comenzar hasta que el usuario apruebe el mockup.

## Abrir el trabajo

- Prototipo: `mockups/rowly-redesign/`
- Diagnóstico y contenido: `mockups/rowly-redesign/REVIEW.md`
- Landing EN: `mockups/rowly-redesign/index.html`
- Landing ES: `mockups/rowly-redesign/es/index.html`
- Comunidad EN: `mockups/rowly-redesign/community/`
- Comunidad ES: `mockups/rowly-redesign/es/comunidad/`
- Capturas renderizadas: `mockups/rowly-redesign/previews/`
- Registro de dirección visual: `.impeccable/questions/rowly-redesign.json`

Para servir el prototipo localmente desde la raíz del repositorio:

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

Luego abrir `http://127.0.0.1:4173/mockups/rowly-redesign/`.

## Pendiente inmediato

La página de decisión anterior (`http://127.0.0.1:39393/`, ronda `9b7d8036`) quedó detenida. Además, `serve-question --wait` indicó que la composición visual asociada estaba obsoleta (`landing-desktop-light.png`). No pedir la aprobación desde esa página hasta revisar la guía `visualize.md` de Impeccable y regenerar la composición y su sidecar si aún se necesita ese flujo. El prototipo estático navegable sigue disponible como mockup principal.

Para reabrir la página de decisión después de actualizar sus composiciones:

```bash
/home/anderson/.agents/skills/impeccable/scripts/impeccable serve-question --start --payload .impeccable/questions/rowly-redesign.json
```

Si el usuario aprueba, entonces comenzar etapa dos: implementar el diseño aprobado sobre la arquitectura estática existente, adaptar EN/ES, SEO y despliegue GitHub Pages, y configurar Giscus. Si solicita cambios, modificar primero el mockup y volver a presentarlo. No publicar sin una petición explícita.

## Hallazgos que hay que conservar

- La versión publicada verificada es `v0.4.2`.
- El código y la versión publicada soportan PostgreSQL, MySQL y MariaDB. La web de producción solo nombra PostgreSQL y MySQL.
- Funciones de mayor protagonismo: revisar como SQL los cambios en resultados antes de aplicarlos; autocompletado y diagnósticos basados en el esquema; espacio de trabajo dividido, terminal integrada y filtros por columna introducidos en `v0.4.2`.
- Las capturas nuevas de mosaico/terminal y filtro se hicieron con la aplicación real y la base de demostración Pagila, sin datos personales. Los assets están en `mockups/rowly-redesign/assets/shots/`.
- La comunidad tiene hub y cuatro áreas permanentes EN/ES. En la implementación, una instancia Giscus por página y `mapping="pathname"` estricto deben mantener conversaciones separadas por idioma.
- GitHub Discussions está deshabilitado actualmente en el repositorio. Para integrar Giscus: habilitar Discussions, instalar la aplicación Giscus y crear una categoría tipo Announcement. Mantener acciones separadas para comentarios del área, Discussions independientes y errores reproducibles en Issues.
- Giscus no está conectado en el mockup; no hay comentarios, usuarios ni actividad inventada.

## Estado del repositorio y herramientas

- No se modificaron `site/` ni `.github/`.
- `mockups/` contiene la propuesta, assets copiados y capturas de vista previa.
- `.impeccable/config.json` guarda dos excepciones estrechas: conservar la fuente Geist existente y omitir falsos positivos `cramped-padding` en HTML del mockup, verificados en Firefox. El detector limpio devolvió cero hallazgos.
- `?? .codex/` ya existía antes del trabajo. No tocarlo sin revisar su contenido y procedencia.
- La aplicación Tauri y el contenedor de prueba PostgreSQL se cerraron tras las capturas.
- Los servidores temporales de preview y decisión se cerraron al pausar. Preview: comando de arriba. Decisión: tras resolver primero la composición obsoleta, con el comando de arriba.

## Prompt para retomar

> Retomemos el rediseño de Rowly DB desde `mockups/rowly-redesign/CONTINUAR-MAÑANA.md`. Primero revisa si ya aprobé o pedí cambios sobre el mockup. Si aún no he aprobado, vuelve a mostrarme el prototipo y espera mi decisión, sin tocar la web de producción. Si lo aprobé explícitamente, implementa la propuesta aprobada sobre la arquitectura estática existente. Mantén los hallazgos, rutas EN/ES, requisitos de Giscus y límites anotados en `REVIEW.md`. No publiques.
