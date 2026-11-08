# Rowly DB website redesign: review package

This directory is a standalone, static prototype. It does not replace or modify the production site in `site/`.

## Product findings

The repository and the published `v0.4.2` release confirm support for PostgreSQL, MySQL, and MariaDB. The current website only lists PostgreSQL and MySQL, so that statement is out of date.

The product workflows that deserve the most space are:

1. Edit keyed query results, inspect the generated `INSERT`, `UPDATE`, and `DELETE` statements, then apply them explicitly. Production connections add a confirmation step.
2. Write SQL with schema completion and diagnostics based on tables, columns, and foreign keys.
3. Arrange consoles, result tabs, and terminal sessions in a split workspace. This is a published `v0.4.2` capability.
4. Filter result columns against the database while keeping filters, counts, and pagination with the tab.

Common capabilities are grouped instead of receiving full sections: SQL files, query history, exports to TSV, CSV, JSON, Markdown, and SQL INSERT, keyboard access, and light or dark themes.

The screenshots under `assets/shots/` are authentic application captures. The split workspace and column filter captures were made from the current source with the repository's Pagila test database in an isolated profile. No personal credentials or data were used.

## Current website diagnosis

What already works:

- Static output with no runtime framework dependency.
- English and Spanish roots, canonical and `hreflang` metadata, Open Graph metadata, structured data, sitemap, and robots file.
- A local Geist font, responsive layouts, keyboard focus, reduced-motion handling, platform-aware download labels, and system light or dark themes.
- GitHub Pages deployment renders version, site URL, base path, and date placeholders from `.github/scripts/render-site.py`.

What weakens the product explanation:

- Engine support is stale and omits MariaDB.
- The current page gives similar weight to routine tools and the more distinctive change-review workflow.
- Several FAQ entries and the final call to action repeat information already stated above.
- The download area carries package commands and troubleshooting detail that can remain in documentation or release notes.
- Existing screenshots do not show the split workspace, persistent terminal, or column filters published in `v0.4.2`.
- The page has no community information architecture.

## Proposed structure

1. Exact English title: **Free & Open Source SQL Client**. Spanish: **Cliente SQL gratuito y de código abierto**.
2. One factual paragraph, download action, source action, and a real application capture.
3. A compact support strip for engines, operating systems, and license.
4. The edit, inspect, apply workflow with the real SQL review dialog.
5. Schema completion and diagnostics as one paired section.
6. The `v0.4.2` workspace with a working prototype switch between split panes and column filters.
7. Common tools in one compact row.
8. Verified engine and package support.
9. Download, followed by a smaller community entry.

The visual system uses the product's existing navy, teal, Geist typeface, and real screenshots. A thin review rail and status-like labels borrow from a code change set without imitating the application UI. The composition is compact and asymmetric, but the application remains the main proof.

Direction dials:

- Energy 2: this is a work tool, so contrast and scale carry the page without decorative effects.
- Rhythm 2: dense information stays grouped, with deliberate breaks between the few major flows.
- Motion 1: only direct control feedback and theme or screenshot changes move.

## Community and Giscus plan

The prototype includes a hub and four permanent area routes in each language:

- English: `/community/ideas/`, `/community/feedback/`, `/community/bugs/`, `/community/questions/`
- Spanish: `/es/comunidad/ideas/`, `/es/comunidad/feedback/`, `/es/comunidad/errores/`, `/es/comunidad/preguntas/`

Each area page has one clearly labeled Giscus position. The prototype does not connect it and does not invent users, comments, or activity.

For implementation, use `mapping="pathname"` with strict matching. The different English and Spanish paths create independent conversations. Put the embedded threads in a dedicated GitHub Discussions category whose format is **Announcement**, as recommended by Giscus for automatic page discussions. Keep separate actions for:

- commenting in the area's embedded conversation;
- opening an independent topic in GitHub Discussions;
- filing a reproducible bug in GitHub Issues.

The repository currently has GitHub Discussions disabled, so implementation will first require enabling Discussions, installing the Giscus app for the repository, and creating the chosen category. The exact repository and category IDs can only be added after those steps.

Official references: [Giscus](https://giscus.app/), [configuration and mapping](https://github.com/giscus/giscus/blob/main/README.md), [advanced usage and theme updates](https://github.com/giscus/giscus/blob/main/ADVANCED-USAGE.md).

## Prototype verification

- PASS: all 12 local routes return HTTP 200.
- PASS: desktop landing rendered at 1440 px in light and dark themes.
- PASS: mobile landing rendered at 390 px in light and dark themes with no horizontal page overflow.
- PASS: community hub and conversation page rendered in both visual systems.
- PASS: theme toggle, mobile menu, and workspace example tabs were clicked in Firefox and changed state correctly.
- PASS: foreground and secondary text token pairs exceed WCAG AA. Measured body contrast ranges from 6.14:1 to 16.91:1.
- PASS: JavaScript syntax check completed with `node --check`.
- PASS: every screenshot has alternative text and reduced-motion behavior is present.
- PASS: production files under `site/` and deployment files remain unchanged.

One intentionally muted control is the disabled “Available after setup” Discussions action. It is unavailable because Discussions is not enabled in the repository; the adjacent copy explains the recovery condition.
