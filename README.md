<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/brand/rowly-logo-dark.svg">
  <img src="docs/assets/brand/rowly-logo.svg" alt="Rowly DB" width="360">
</picture>

<h3>A fast, focused SQL client for MySQL, MariaDB and PostgreSQL.</h3>

<p>Free and open source. No account, no Pro edition.</p>

<p>
  <a href="https://github.com/anderson-andres-dev/rowly-db/releases/latest"><strong>Download</strong></a>
  &nbsp;·&nbsp;
  <a href="#install">Install</a>
  &nbsp;·&nbsp;
  <a href="README.es.md">Español</a>
</p>

<p>
  <a href="https://github.com/anderson-andres-dev/rowly-db/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/anderson-andres-dev/rowly-db?style=flat-square&amp;label=release&amp;labelColor=283640&amp;color=00AFAF"></a>
  <img alt="Windows, macOS and Linux" src="https://img.shields.io/badge/Windows%20%C2%B7%20macOS%20%C2%B7%20Linux-283640?style=flat-square">
  <a href="#license"><img alt="MIT or Apache 2.0" src="https://img.shields.io/badge/license-MIT%20%2F%20Apache%202.0-283640?style=flat-square&amp;labelColor=283640&amp;color=00AFAF"></a>
</p>

</div>

<br>

<p align="center">
  <img src="docs/assets/rowly-db.webp" alt="Rowly DB in light and dark themes" width="900">
</p>

<br>

<table>
  <tr>
    <td width="50%" valign="top">
      <img src="docs/assets/features/inline-edit.webp" alt="Result grid with edited cells highlighted">
      <p><strong>Edit in place</strong><br>Change any cell. Nothing is written until you apply.</p>
    </td>
    <td width="50%" valign="top">
      <img src="docs/assets/features/add-rows.webp" alt="Pending changes with DELETE, UPDATE and INSERT statements">
      <p><strong>Review before it runs</strong><br>Added, edited and deleted rows become the exact SQL you approve.</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img src="docs/assets/features/autocomplete.webp" alt="Autocomplete suggesting a JOIN with its ON condition">
      <p><strong>Autocomplete that knows your schema</strong><br>Tables, columns and whole JOINs, built from foreign keys.</p>
    </td>
    <td width="50%" valign="top">
      <img src="docs/assets/features/diagnostics.webp" alt="Editor flagging a misspelled table and column">
      <p><strong>Mistakes caught as you type</strong><br>Unknown tables and columns, with the name you meant.</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img src="docs/assets/features/export.webp" alt="Export dialog with a JSON preview">
      <p><strong>Export</strong><br>TSV, CSV, JSON, Markdown or SQL INSERT.</p>
    </td>
    <td width="50%" valign="top">
      <img src="docs/assets/features/history.webp" alt="Query history">
      <p><strong>History</strong><br>Every query you ran, one <kbd>Ctrl</kbd>+<kbd>E</kbd> away.</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img src="docs/assets/features/files.webp" alt="SQL files panel next to the editor">
      <p><strong>Your SQL files</strong><br>Open a folder and keep your scripts next to the connection.</p>
    </td>
    <td width="50%" valign="top">
      <img src="docs/assets/features/themes.webp" alt="Theme gallery in Settings">
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

## License

Rowly DB is dual licensed under [MIT](LICENSE-MIT) or [Apache 2.0](LICENSE-APACHE), at your choice.
