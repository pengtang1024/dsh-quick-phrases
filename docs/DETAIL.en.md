# Quick phrases

## What it does

Adds a row of phrase buttons (`继续`, `提交`, `推送`, `发版` …) next to the composer. Clicking one sends that phrase's **text** right away; the button shows only its **label**. The two are edited separately, so a button can stay short while the message it sends is a full sentence.

**The click behaviour is configurable** (default: send right away):

- **Send right away (default)**: one click sends the phrase while the composer is empty and holds no attachments.
- **Fill the composer**: only writes the text into the draft; sending stays your call.

In both modes, if the composer already holds text you were writing or attachments, a click never replaces it — the phrase is inserted at the caret instead.

## Where the row lives

The row can be moved at any time from the settings page; the switch applies immediately:

| Position | Slot | Notes |
| --- | --- | --- |
| Below the composer (default) | `conversation.composer.dock` | A full row under the input card; the roomiest, best for many phrases. |
| Above the composer | `conversation.input.dock` | A full row above the input card. Its width and centering follow the host dock-card geometry (`--dsh-composer-card-max-width` / `--dsh-composer-side-clearance` / `--dsh-composer-dock-inset`), so it lines up with the card's inner edges; it is also ordered above the queue strip and todo panel so it never splits them from the card. |
| Right of the tool row | `conversation.input.right` | Inside the composer's tool row (`+`, access, model picker), for when the chips should sit next to the caret; space is tight, so the row scrolls horizontally. |

All three rows stay registered, but only the selected one renders — switching is a re-render, not a page reload.

## Managing phrases

Open **Settings → Quick phrases**. The page has two layers: behaviour options on top, the phrase list below.

**Behaviour options** (two dropdowns, applied on selection):

- **Position**: switch between the three positions above.
- **On click**: pick "Send right away" or "Fill the composer"; the default is sending right away.

**Phrase list** (one card per phrase):

- **Drag to reorder**: grab the handle on the left and drop the card where it belongs; the **↑ / ↓** buttons move it one step at a time. The list order is the left-to-right order in the row.
- **Label**: the top line of the card is the button caption — edit it in place.
- **Text**: the large field below, multi-line.
- **Chip preview**: each card shows the resulting chip and its character count, so a too-wide label is obvious before you send anything.
- **✕**: the first click only arms the delete ("Confirm"), a second click within four seconds removes the phrase.
- **Add phrase** appends an empty card and focuses its caption; **Restore defaults** arms on the first click and restores the four built-in phrases on the second.

Changes save and apply immediately, no restart. The list lives in local browser storage (`localStorage` key `dsh.quick-phrases.v1`; the position is `dsh.quick-phrases.placement.v1`, the click behaviour `dsh.quick-phrases.click.v1`), scoped to the DSH Web origin — a different machine or cleared site data loses it.

## Opening it from the composer

The **Manage** chip at the end of the row jumps to the same settings page. If the settings entry is not mounted in this UI yet, it says "请在『设置 — 快捷短语』中管理" instead.

## Styling

Chips, fields and cards use the host's semantic tokens (`--dsw-alias-*`, `--dsw-radius-*`, `--dsw-focus-*`), so they follow DSH's dark and light themes. The primary button's foreground uses `--dsw-alias-label-primary-foreground`, matching the host Button's primary variant, so contrast holds in both themes.

## Boundaries

- Phrases are plain text: no variables, no commands.
- The row only appears around the session composer; background and scheduled tasks are untouched.
- Text follows the DSH UI language (Chinese / English), including the four defaults.
