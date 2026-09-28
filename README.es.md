<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/brand/rowly-logo-dark.svg">
  <img src="docs/assets/brand/rowly-logo.svg" alt="Rowly DB" width="400">
</picture>

<br>

<p>
  <a href="https://github.com/anderson-andres-dev/rowly-db/releases"><strong>Descargar Rowly DB</strong></a>
  &nbsp;·&nbsp;
  <a href="#instalación">Instalación</a>
  &nbsp;·&nbsp;
  <a href="README.md">English</a>
</p>

<p>
  <a href="https://github.com/anderson-andres-dev/rowly-db/stargazers"><img alt="Estrellas" src="https://img.shields.io/github/stars/anderson-andres-dev/rowly-db?style=for-the-badge&amp;label=STARS&amp;labelColor=283640&amp;color=00AFAF"></a>
  <a href="https://github.com/anderson-andres-dev/rowly-db/issues"><img alt="Incidencias abiertas" src="https://img.shields.io/github/issues/anderson-andres-dev/rowly-db?style=for-the-badge&amp;label=ISSUES&amp;labelColor=283640&amp;color=00AFAF"></a>
  <a href="https://github.com/anderson-andres-dev/rowly-db/pulls"><img alt="Solicitudes de cambio abiertas" src="https://img.shields.io/github/issues-pr/anderson-andres-dev/rowly-db?style=for-the-badge&amp;label=PULL%20REQUESTS&amp;labelColor=283640&amp;color=00AFAF"></a>
  <a href="docs/assets/rowly-db.webp"><img alt="Ver captura" src="https://img.shields.io/badge/SHOWCASE-SCREENSHOT-283640?style=for-the-badge&amp;labelColor=283640"></a>
</p>

</div>

<br>

<p align="center">
  <img src="docs/assets/rowly-db.webp" alt="Interfaz de Rowly DB con temas claro y oscuro" width="900">
</p>

## Funciones

<table>
  <tr>
    <td width="50%" valign="top">
      <img src="docs/assets/features/inline-edit.webp" alt="Grid de resultados con celdas editadas resaltadas">
      <br><strong>Edición en línea</strong>
      <br><sub>Doble clic en una celda para editarla. Los cambios quedan marcados hasta aplicarlos.</sub>
    </td>
    <td width="50%" valign="top">
      <img src="docs/assets/features/add-rows.webp" alt="Diálogo de cambios pendientes con DELETE, UPDATE e INSERT">
      <br><strong>Agregar y borrar registros</strong>
      <br><sub>Revisa el SQL exacto antes de ejecutarlo. En producción siempre pide confirmación.</sub>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img src="docs/assets/features/export.webp" alt="Diálogo de exportación con vista previa en JSON">
      <br><strong>Exportar datos</strong>
      <br><sub>TSV, CSV, JSON, Markdown o SQL INSERT, con vista previa en vivo.</sub>
    </td>
    <td width="50%" valign="top">
      <img src="docs/assets/features/autocomplete.webp" alt="Autocompletado que sugiere un JOIN con su condición ON">
      <br><strong>Autocompletado inteligente</strong>
      <br><sub>Sugiere tablas, columnas y JOIN completos a partir de las claves foráneas.</sub>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img src="docs/assets/features/diagnostics.webp" alt="Editor con errores en línea y sugerencias">
      <br><strong>Diagnósticos en el editor</strong>
      <br><sub>Marca tablas y columnas que no existen mientras escribes y sugiere la corrección.</sub>
    </td>
    <td width="50%" valign="top">
      <img src="docs/assets/features/themes.webp" alt="Ajustes con la galería de temas">
      <br><strong>Temas</strong>
      <br><sub>Rowly, DataGrip, VS Code, Gruvbox, Solarized, One Dark, Dracula y Nord.</sub>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img src="docs/assets/features/files.webp" alt="Panel de archivos SQL junto al editor">
      <br><strong>Explorador de archivos</strong>
      <br><sub>Abre una carpeta de archivos .sql y edítalos junto a tu conexión.</sub>
    </td>
    <td width="50%" valign="top">
      <img src="docs/assets/features/history.webp" alt="Historial de consultas">
      <br><strong>Historial de consultas</strong>
      <br><sub>Ctrl+E busca y vuelve a ejecutar cualquier consulta de esta conexión.</sub>
    </td>
  </tr>
</table>

Además: MySQL, MariaDB y PostgreSQL · Contraseñas en el almacén seguro del sistema · Actualizaciones firmadas que tú confirmas

## Instalación

Descarga tu paquete desde [Releases](https://github.com/anderson-andres-dev/rowly-db/releases).
Ejecuta el comando en la carpeta de descargas. Los paquetes Linux son para **x86_64**.

| Linux | Instalar |
| :--- | :--- |
| Basadas en Debian `.deb` | `sudo apt install ./Rowly*.deb` |
| Basadas en Fedora `.rpm` | `sudo dnf install ./Rowly*.rpm` |
| Basadas en Arch `.pkg.tar.zst` | `sudo pacman -U ./rowly-db_*.pkg.tar.zst` |
| AppImage | `chmod +x ./Rowly*.AppImage`<br>`./Rowly*.AppImage` |

En **Windows**, ejecuta el `.msi` o `.exe`. En **macOS**, abre el `.dmg` para tu
procesador y arrastra Rowly DB a Aplicaciones.

Las nuevas versiones aparecen en **Ajustes → Actualizaciones**.

## Compilar desde el código

Necesitas Rust 1.85+, Node.js 20.19+ y las [dependencias de Tauri](https://tauri.app/start/prerequisites/).

```bash
git clone https://github.com/anderson-andres-dev/rowly-db.git
cd rowly-db/app
npm ci
npm run tauri build
```

Los paquetes quedan en `target/release/bundle/`.

## Contribuir

[Guía de desarrollo](CONTRIBUTING.md) · [Reportar un problema](https://github.com/anderson-andres-dev/rowly-db/issues)

## Licencia

Licencia dual. Elige [MIT](LICENSE-MIT) o [Apache 2.0](LICENSE-APACHE).
