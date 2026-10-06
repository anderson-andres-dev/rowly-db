# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Developers, backend engineers and database administrators who query and modify data in PostgreSQL and MySQL from a desktop client. They compare tools by reading, and they judge trust by what can be verified: source, license, releases, what the installer does.

## Product Purpose
Rowly DB is a free, open-source desktop SQL client for Windows, macOS and Linux. Users write SQL, browse the schema, edit query results in place and review every pending change as SQL before it runs. Success on the website: a visitor understands what it is, which databases and systems it supports, and downloads it or opens the repository.

## Positioning
Editing results does not write to the database. Added, edited and deleted rows become the exact INSERT, UPDATE and DELETE statements, shown for approval, and nothing runs until the user applies them. Free and open source, dual licensed MIT or Apache-2.0, with no account and no paid edition.

## Operating Context
- The website is a static site in `site/`, rendered by `.github/scripts/render-site.py` (fills `{{site}}`, `{{version}}`, `{{date}}`) and published to GitHub Pages by `.github/workflows/pages.yml`.
- Production URL: `https://rowlydb.com/`, set through the `SITE_URL` repository variable. The site is bilingual: English at `/`, Spanish at `/es/`, with hreflang and x-default.
- Downloads and documentation live on GitHub (releases, README, CONTRIBUTING). There is no separate docs site.

## Capabilities and Constraints
Verified in the repository:
- Databases: PostgreSQL and MySQL (drivers in `crates/drivers/postgres` and `crates/drivers/mysql`, TLS). MariaDB is not verified; do not name it. No other engine is supported.
- Systems: Windows (`.msi`, `.exe`, x64), macOS (`.dmg`, Apple Silicon and Intel), Linux x86_64 (`.deb`, `.rpm`, `.pkg.tar.zst`, `.AppImage`).
- Features: SQL editor with autocomplete built from foreign keys (tables, columns, whole JOINs); diagnostics for unknown tables and columns with a suggested name; in-place editing of result cells, added rows and deleted rows; pending changes shown as DELETE, UPDATE and INSERT before applying; export to TSV, CSV, JSON, Markdown and SQL INSERT; query history (Ctrl+H); SQL files panel; eight themes, light and dark; keyboard first; production connections confirm every write; passwords stored in the system keyring; updates installed from Settings → Updates when the user chooses, with signed update packages (minisign public key in `app/src-tauri/tauri.conf.json`).
- Distribution: installers are not code-signed on Windows and not notarized on macOS; the current site says so and tells users how to proceed.
- License: MIT or Apache-2.0, at the user's choice (`LICENSE`, `LICENSE-MIT`, `LICENSE-APACHE`).
- Undecided, not to be claimed: telemetry or privacy statements, roadmap items, comparison with other products.

## Brand Commitments
Name: Rowly DB (public). Khipu is the internal repository name and is not used on the site. Existing logo (`site/assets/img/logo-light.svg`, `logo-dark.svg`), Geist typeface and product screenshots are binding. Teal is the brand accent. Voice: plain, direct, technical, no marketing filler ("Free, for real.").

## Evidence on Hand
- Screenshots of the real application in light and dark: `site/assets/img/shots/` (hero, autocomplete, diagnostics, edit, review) and `docs/assets/features/`.
- Public source, releases and issues on GitHub: `github.com/anderson-andres-dev/rowly-db`.
- No testimonials, customers, download counts, star counts, ratings, benchmarks or press exist. Future work must not invent them.

## Product Principles
1. Nothing is written until the user has seen the SQL and applied it.
2. Say only what the repository can verify: engines, systems, features, license.
3. Free and open source are facts to show (license, source, releases), not slogans.
4. Be honest about friction, such as unsigned installers, where the user meets it.
5. The two languages carry the same content and structure.

## Accessibility & Inclusion
Content must work without JavaScript, respect `prefers-reduced-motion`, keep WCAG AA contrast in light and dark, and be fully keyboard-operable. Meaning is never conveyed by color alone.
