<div align="center">
<br>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/brand/rowly-logo-dark.svg">
  <img src="docs/assets/brand/rowly-logo.svg" alt="Rowly DB" width="300">
</picture>

<p>Cliente SQL libre y de código abierto</p>

<p>
  <a href="https://github.com/anderson-andres-dev/rowly-db/releases/latest"><img alt="Descargar" src="https://img.shields.io/github/v/release/anderson-andres-dev/rowly-db?style=for-the-badge&amp;label=descargar&amp;labelColor=00AFAF&amp;color=283640"></a>
  <img alt="Windows, macOS y Linux" src="https://img.shields.io/badge/Windows%20%C2%B7%20macOS%20%C2%B7%20Linux-283640?style=for-the-badge">
  <br>
  <sub><a href="README.md">English</a> &nbsp;·&nbsp; <b>Español</b></sub>
</p>

</div>

<br>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/rowly-db-dark.webp">
    <img src="docs/assets/rowly-db.webp" alt="Rowly DB con tema claro y oscuro" width="900">
  </picture>
</p>

<br>

<table>
  <tr>
    <td width="50%" valign="top">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="docs/assets/features/inline-edit-dark.webp">
        <img src="docs/assets/features/inline-edit-light.webp" alt="Grid de resultados con celdas editadas resaltadas">
      </picture>
      <p><strong>Edición en la celda</strong><br>Cambia cualquier valor. Nada se escribe hasta que aplicas.</p>
    </td>
    <td width="50%" valign="top">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="docs/assets/features/add-rows-dark.webp">
        <img src="docs/assets/features/add-rows-light.webp" alt="Cambios pendientes con sentencias DELETE, UPDATE e INSERT">
      </picture>
      <p><strong>Revisa antes de ejecutar</strong><br>Las filas que agregas, editas o borras se vuelven el SQL exacto que apruebas.</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="docs/assets/features/autocomplete-dark.webp">
        <img src="docs/assets/features/autocomplete-light.webp" alt="Autocompletado que sugiere un JOIN con su condición ON">
      </picture>
      <p><strong>Autocompletado que conoce tu esquema</strong><br>Tablas, columnas y JOIN completos a partir de las claves foráneas.</p>
    </td>
    <td width="50%" valign="top">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="docs/assets/features/diagnostics-dark.webp">
        <img src="docs/assets/features/diagnostics-light.webp" alt="Editor marcando una tabla y una columna mal escritas">
      </picture>
      <p><strong>Errores a la vista mientras escribes</strong><br>Tablas y columnas que no existen, con el nombre que querías.</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="docs/assets/features/export-dark.webp">
        <img src="docs/assets/features/export-light.webp" alt="Exportación con vista previa en JSON">
      </picture>
      <p><strong>Exportar</strong><br>TSV, CSV, JSON, Markdown o SQL INSERT.</p>
    </td>
    <td width="50%" valign="top">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="docs/assets/features/history-dark.webp">
        <img src="docs/assets/features/history-light.webp" alt="Historial de consultas">
      </picture>
      <p><strong>Historial</strong><br>Cada consulta que ejecutaste, a un <kbd>Ctrl</kbd>+<kbd>E</kbd>.</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="docs/assets/features/files-dark.webp">
        <img src="docs/assets/features/files-light.webp" alt="Panel de archivos SQL junto al editor">
      </picture>
      <p><strong>Tus archivos SQL</strong><br>Abre una carpeta y ten tus scripts junto a la conexión.</p>
    </td>
    <td width="50%" valign="top">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="docs/assets/features/themes-dark.webp">
        <img src="docs/assets/features/themes-light.webp" alt="Galería de temas en Ajustes">
      </picture>
      <p><strong>Temas</strong><br>Ocho temas, claros y oscuros.</p>
    </td>
  </tr>
</table>

<p align="center">
  <sub>Pensado para el teclado &nbsp;·&nbsp; En producción cada escritura pide confirmación &nbsp;·&nbsp; Las contraseñas quedan en el almacén seguro del sistema &nbsp;·&nbsp; Las actualizaciones se instalan cuando tú decides</sub>
</p>

## Bases de datos

MySQL, MariaDB y PostgreSQL. Cada versión de esta tabla pasa la matriz completa de calidad SQL contra un servidor real en el CI; las demás conectan con las reglas de su línea de versión y se muestran como no verificadas ([SQL_ENGINE.es.md](SQL_ENGINE.es.md#5-líneas-de-versión)).

<!-- generated: engines (tools/inventory/status.mjs) -->
| Motor | Versiones verificadas | Líneas de versión |
|---|---|---|
| MySQL | 8.0.46, 8.4.11, 9.7.2 | 5.7, 8.0, 8.4, 9 |
| MariaDB | 10.6.28, 11.8.9 | 10.3, 10.6, 11.7 |
| PostgreSQL | 13.23, 14.24, 15.19, 16.15, 17.11, 18.6 | 10, 11, 12, 14, 15, 16, 17, 18 |
<!-- /generated: engines -->

## Instalación

Descarga el paquete para tu sistema desde la [última versión](https://github.com/anderson-andres-dev/rowly-db/releases/latest).

| Sistema | Paquete | Instalar |
| :--- | :--- | :--- |
| Windows | `.msi` o `.exe` | Ejecuta el instalador |
| macOS | `.dmg` | Ábrelo y arrastra Rowly DB a Aplicaciones |
| Debian, Ubuntu | `.deb` | `sudo apt install ./Rowly*.deb` |
| Fedora | `.rpm` | `sudo dnf install ./Rowly*.rpm` |
| Arch | `.pkg.tar.zst` | `sudo pacman -U ./rowly-db_*.pkg.tar.zst` |
| Cualquier Linux | `.AppImage` | `chmod +x Rowly*.AppImage && ./Rowly*.AppImage` |

Los paquetes Linux son para x86_64. Las nuevas versiones aparecen en **Ajustes → Actualizaciones**.

<details>
<summary><strong>Linux: arranque lento (unos 30 s)</strong></summary>
<br>

En Linux, Rowly DB necesita un `xdg-desktop-portal` que funcione, o ninguno. Si el portal está instalado pero no puede responder (sin backend para tu escritorio, o una sesión iniciada sin `DISPLAY`/`WAYLAND_DISPLAY`), GTK y la biblioteca de ventanas lo esperan antes de mostrar la ventana: unos 25 s, más 5. Después la app abre con normalidad y escribe un aviso en stderr si el arranque pasó de 10 s.

Para comprobarlo:

```bash
gdbus call --session --dest org.freedesktop.portal.Desktop \
  --object-path /org/freedesktop/portal/desktop --method org.freedesktop.DBus.Peer.Ping
# sano: "()" en mucho menos de un segundo; roto: TimedOut tras unos 25 s
systemctl --user status xdg-desktop-portal   # el log del portal dice por qué
```

Para corregirlo, instala el backend del portal de tu escritorio (`xdg-desktop-portal-gnome`, `-kde`, `-wlr`, `-hyprland` o `-gtk`), o asegúrate de que la sesión pase `DISPLAY`/`WAYLAND_DISPLAY` a los servicios de usuario (`systemctl --user import-environment`).

</details>

<details>
<summary><strong>Compilar desde el código</strong></summary>
<br>

Necesitas Rust 1.85+, Node.js 20.19+ y las [dependencias de Tauri](https://tauri.app/start/prerequisites/).

```bash
git clone https://github.com/anderson-andres-dev/rowly-db.git
cd rowly-db/app
npm ci
npm run tauri build
```

Los paquetes quedan en `target/release/bundle/`.

</details>

## Contribuir

Los reportes de errores y los pull requests son bienvenidos; para algo grande, [abre un issue](https://github.com/anderson-andres-dev/rowly-db/issues) primero. Por dónde empezar:

| Para | Lee |
| :--- | :--- |
| Entender cómo está construido Rowly DB: capas, fronteras, cómo fluye el SQL, el grafo de arquitectura generado | [docs/ARCHITECTURE.es.md](docs/ARCHITECTURE.es.md) |
| Saber qué tiene que demostrar cada motor SQL, en qué versiones, y su estado actual | [SQL_ENGINE.es.md](SQL_ENGINE.es.md) |
| Añadir o cambiar un motor de base de datos, una línea de versión o una versión verificada | [ENGINE_GUIDE.es.md](ENGINE_GUIDE.es.md) |
| Preparar el entorno, crear la rama, correr las compuertas y abrir un pull request | [CONTRIBUTING.es.md](CONTRIBUTING.es.md) |
| Correr las pruebas contra servidores reales de MySQL, MariaDB y PostgreSQL | [tools/test-dbs/README.es.md](tools/test-dbs/README.es.md) |

## Licencia

Rowly DB tiene licencia dual: [MIT](LICENSE-MIT) o [Apache 2.0](LICENSE-APACHE), a tu elección.
