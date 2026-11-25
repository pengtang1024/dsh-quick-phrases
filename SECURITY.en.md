# Security Policy

## Supported versions

| Version | Receives security fixes |
| --- | --- |
| `0.7.x` (the upcoming latest line, starting from `0.7.0`) | Yes |
| `0.6.x` | Yes |
| `0.5.x` | Yes |
| `0.4.x` and earlier | No — please upgrade to the latest supported version first |

Only the three most recent minor lines (`0.7.x`, `0.6.x`, `0.5.x`) are maintained. Issues in older versions that still exist in the new version are fixed there; no separate patches are released for old versions.

## Private reporting

**Do not open a public issue, PR or discussion for a security vulnerability**, and do not post exploitable details in public channels. Use either of these private routes:

1. GitHub Security Advisories (preferred): <https://github.com/pengtang1024/dsh-quick-phrases/security/advisories/new>
2. Email: <pengtang1024@qq.com>, preferably with `[SECURITY]` in the subject line.

Please include as much of the following as you can in your report:

- The affected version (a specific `0.7.x` / `0.6.x` / `0.5.x` release).
- Reproduction steps or a minimal PoC.
- The actual impact (e.g. what data can be read, whether phrases or the UI can be tampered with).
- If convenient, a suggested fix.

## Response timeline

- **Within 3 business days**: acknowledge the report and give an initial assessment.
- Once confirmed as a valid issue, we will outline a fix plan; after the fix is released, the GitHub Security Advisory will record the affected and fixed versions.
- If the report is judged out of scope, we will explain why and point you to the appropriate upstream channel.

## Scope

This repository is responsible for security issues in **the plugin itself**:

- Code injected by `client.js` via `window.__ModuleLoader__.load`, and components in the five slots (`conversation.composer.dock`, `conversation.input.dock`, `conversation.input.right`, `settings.section`, `settings.section.icon`);
- `localStorage` reads/writes and deserialization: `dsh.quick-phrases.v1`, `dsh.quick-phrases.placement.v1`, `dsh.quick-phrases.click.v1`;
- The navigation (`openSection`) from a phrase row's "Manage" button to the settings page;
- The bundled Host stub `index.js` and the bundle descriptor file.

**Out of scope for this repository**: DSH itself, the plugin loader, the renderer sandbox, web services, host built-in components, etc. Please route such issues through the official DeepSeek Harness channels:

- <https://github.com/deepseek-ai/deepseek-harness/security>
- Or any other security reporting entry published by that repository / official site.

The plugin has no npm runtime dependencies; the test and preview scripts use only Node built-in modules and are not part of the runtime attack surface.

## Security design notes

- **No network access**: `client.js` issues no `fetch`, `XMLHttpRequest`, `WebSocket` or other external requests, and loads no remote scripts, fonts or images.
- **No `eval`**: no use of `eval`, `new Function`, `innerHTML` or `dangerouslySetInnerHTML`; the UI is built entirely with `React.createElement`, and phrase text is rendered only as text nodes.
- **No file access**: the plugin runs in the browser / renderer and has no filesystem access; the Host-side `index.js` has only an empty `apply()` and registers no services. Scripts such as `test/preview.mjs` read repository files only during development and do not run with the plugin.
- **Data lives only in `localStorage`**: phrase content, display placement and click behaviour are stored in the three keys above; they do not pass through the Host and are not uploaded. Under DSH's web origin storage isolation, clearing site data deletes them.
- **Minimal dependencies**: the client only `require('react')` (injected by the host), requires no private host packages, and has no third-party runtime dependencies.

## Known boundaries

- `localStorage` is plaintext local storage. Any code able to run scripts on the same origin can read these phrases; **do not put passwords, tokens or other secrets into phrases**.
- The plugin is installed as a local-directory bundle, and installation loads `client.js`. Install only from this repository or a source you trust; do not install modified packages of unknown origin.
- The plugin's capabilities are bounded by DSH's slots: it can read and write the current session's draft, trigger sending, and navigate to its own settings section, but it does not bypass the host's permissions and approval mechanisms.
