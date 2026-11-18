# dsh-quick-phrases

A DSH Web-page decoration: one row of quick-phrase chips next to the composer,
plus a management page in Settings where each phrase's display name and sent
text are edited separately.

- Chip → sends the phrase right away when the composer is empty (`inputActions.setDraft` + `submit`); with content already there it inserts at the caret. The manager can switch it to fill-only (default: send).
- Position → below the composer (default), above it, or in the composer tool row; switchable in Settings.
- Settings → Quick phrases → add / edit / reorder / delete / restore defaults / choose position / choose click behaviour.
- Stored in `localStorage` (`dsh.quick-phrases.v1`, `dsh.quick-phrases.placement.v1`, `dsh.quick-phrases.click.v1`); no Host service.

Tests: `node test/smoke.mjs` (behaviour) and
`ELECTRON_RUN_AS_NODE=1 "/opt/DSH NEXT/dsh-desktop-next" test/preview.mjs` +
`--shot` (static dark/light screenshots of the real components).

Install (local directory bundle):

```
plugin_manager install_bundle target=/home/pt/Documents/deepseek-harness/default-workspace/dsh-quick-phrases
```

Files: `index.js` (Host row, empty), `client.js` (the UI), `cordis.patch.yml`,
`locale/{zh,en}.json` (Plugin Manager metadata), `docs/DETAIL*.md`, `icon.svg`,
`test/{smoke,preview}.mjs`.
