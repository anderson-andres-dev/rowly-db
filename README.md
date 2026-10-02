<div align="center">
<br>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/brand/rowly-logo-dark.svg">
  <img src="docs/assets/brand/rowly-logo.svg" alt="Rowly DB" width="300">
</picture>

<p>Free &amp; Open Source SQL Client</p>

<p>
  <a href="https://github.com/anderson-andres-dev/rowly-db/releases/latest"><img alt="Download" src="https://img.shields.io/github/v/release/anderson-andres-dev/rowly-db?style=for-the-badge&amp;label=download&amp;labelColor=00AFAF&amp;color=283640"></a>
  <img alt="Windows, macOS and Linux" src="https://img.shields.io/badge/Windows%20%C2%B7%20macOS%20%C2%B7%20Linux-283640?style=for-the-badge">
  <br>
  <sub><b>English</b> &nbsp;·&nbsp; <a href="README.es.md">Español</a></sub>
</p>

</div>

<br>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/rowly-db-dark.webp">
    <img src="docs/assets/rowly-db.webp" alt="Rowly DB in light and dark themes" width="900">
  </picture>
</p>

<br>

<table>
  <tr>
    <td width="50%" valign="top">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="docs/assets/features/inline-edit-dark.webp">
        <img src="docs/assets/features/inline-edit-light.webp" alt="Result grid with edited cells highlighted">
      </picture>
      <p><strong>Edit in place</strong><br>Change any cell. Nothing is written until you apply.</p>
    </td>
    <td width="50%" valign="top">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="docs/assets/features/add-rows-dark.webp">
        <img src="docs/assets/features/add-rows-light.webp" alt="Pending changes with DELETE, UPDATE and INSERT statements">
      </picture>
      <p><strong>Review before it runs</strong><br>Added, edited and deleted rows become the exact SQL you approve.</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="docs/assets/features/autocomplete-dark.webp">
        <img src="docs/assets/features/autocomplete-light.webp" alt="Autocomplete suggesting a JOIN with its ON condition">
      </picture>
      <p><strong>Autocomplete that knows your schema</strong><br>Tables, columns and whole JOINs, built from foreign keys.</p>
    </td>
    <td width="50%" valign="top">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="docs/assets/features/diagnostics-dark.webp">
        <img src="docs/assets/features/diagnostics-light.webp" alt="Editor flagging a misspelled table and column">
      </picture>
      <p><strong>Mistakes caught as you type</strong><br>Unknown tables and columns, with the name you meant.</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="docs/assets/features/export-dark.webp">
        <img src="docs/assets/features/export-light.webp" alt="Export dialog with a JSON preview">
      </picture>
      <p><strong>Export</strong><br>TSV, CSV, JSON, Markdown or SQL INSERT.</p>
    </td>
    <td width="50%" valign="top">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="docs/assets/features/history-dark.webp">
        <img src="docs/assets/features/history-light.webp" alt="Query history">
      </picture>
      <p><strong>History</strong><br>Every query you ran, one <kbd>Ctrl</kbd>+<kbd>E</kbd> away.</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="docs/assets/features/files-dark.webp">
        <img src="docs/assets/features/files-light.webp" alt="SQL files panel next to the editor">
      </picture>
      <p><strong>Your SQL files</strong><br>Open a folder and keep your scripts next to the connection.</p>
    </td>
    <td width="50%" valign="top">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="docs/assets/features/themes-dark.webp">
        <img src="docs/assets/features/themes-light.webp" alt="Theme gallery in Settings">
      </picture>
      <p><strong>Themes</strong><br>Eight themes, light and dark.</p>
    </td>
  </tr>
</table>

<p align="center">
  <sub>Keyboard first &nbsp;·&nbsp; Production connections confirm every write &nbsp;·&nbsp; Passwords stay in the system keyring &nbsp;·&nbsp; Updates install when you choose</sub>
</p>

## Install

Download the package for your system from the [latest release](https://github.com/anderson-andres-dev/rowly-db/releases/latest).

| System | Package | Install |
| :--- | :--- | :--- |
| Windows | `.msi` or `.exe` | Run the installer |
| macOS | `.dmg` | Open it and drag Rowly DB to Applications |
| Debian, Ubuntu | `.deb` | `sudo apt install ./Rowly*.deb` |
| Fedora | `.rpm` | `sudo dnf install ./Rowly*.rpm` |
| Arch | `.pkg.tar.zst` | `sudo pacman -U ./rowly-db_*.pkg.tar.zst` |
| Any Linux | `.AppImage` | `chmod +x Rowly*.AppImage && ./Rowly*.AppImage` |

Linux packages are x86_64. New versions show up in **Settings → Updates**.

<details>
<summary><strong>Build from source</strong></summary>
<br>

Requires Rust 1.85+, Node.js 20.19+ and the [Tauri prerequisites](https://tauri.app/start/prerequisites/).

```bash
git clone https://github.com/anderson-andres-dev/rowly-db.git
cd rowly-db/app
npm ci
npm run tauri build
```

Packages are written to `target/release/bundle/`.

</details>

## Contributing

Bug reports and pull requests are welcome. Start with the [development guide](CONTRIBUTING.md) or [open an issue](https://github.com/anderson-andres-dev/rowly-db/issues).

For SQL engine work, read the [permanent quality contract](SQL_ENGINE.md) before changing code or claiming support for a server release.

## License

Rowly DB is dual licensed under [MIT](LICENSE-MIT) or [Apache 2.0](LICENSE-APACHE), at your choice.
