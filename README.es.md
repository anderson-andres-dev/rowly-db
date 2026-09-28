<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/brand/rowly-logo-dark.svg">
  <img src="docs/assets/brand/rowly-logo.svg" alt="Rowly DB" width="360">
</picture>

<h3>Cliente SQL libre y de código abierto</h3>

<p>
  <a href="https://github.com/anderson-andres-dev/rowly-db/releases/latest"><strong>Descargar</strong></a>
  &nbsp;·&nbsp;
  <a href="#instalación">Instalación</a>
  &nbsp;·&nbsp;
  <a href="README.md">English</a>
</p>

<p>
  <a href="https://github.com/anderson-andres-dev/rowly-db/releases/latest"><img alt="Última versión" src="https://img.shields.io/github/v/release/anderson-andres-dev/rowly-db?style=flat-square&amp;label=versión&amp;labelColor=283640&amp;color=00AFAF"></a>
  <img alt="Windows, macOS y Linux" src="https://img.shields.io/badge/Windows%20%C2%B7%20macOS%20%C2%B7%20Linux-283640?style=flat-square">
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

Los reportes de errores y los pull requests son bienvenidos. Empieza por la [guía de desarrollo](CONTRIBUTING.es.md) o [abre un issue](https://github.com/anderson-andres-dev/rowly-db/issues).

## Licencia

Rowly DB tiene licencia dual: [MIT](LICENSE-MIT) o [Apache 2.0](LICENSE-APACHE), a tu elección.
