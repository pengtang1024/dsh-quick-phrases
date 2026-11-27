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

## Folding and hiding

The row should never get in the way of typing, so it can fold on demand and its resting shape is a setting:

- **Fold by hand**: click `收起 ▾` at the end of the row and it collapses into a small `▸ 快捷短语` pill; click the pill to expand it temporarily, and 「收起」 to fold it again.
- **Fold automatically** (default): with "When the composer has text" set to "Fold automatically", the row collapses into the pill as soon as the composer holds text or attachments, and expands again once the draft is cleared. Pick "Keep it visible" to keep the full row instead.

Clicking a phrase after expanding the pill behaves exactly as before: when the composer already has content the text is inserted at the caret instead of replacing it.

The **Phrase row** dropdown in Settings turns the resting shape into a three-way choice:

- **Show the full row**: the whole row stays, and the fold chip still folds it temporarily;
- **Fold into a pill**: only the small pill remains next to the composer; click it to expand;
- **Hide completely**: the row leaves the UI entirely — **not even the pill stays**, nothing at all is rendered. The only way back is Settings → Quick phrases, where the dropdown is marked "Row hidden"; choosing "Show the full row" there also clears any leftover folded state and restores the full row.

The `收起 ▾` chip is equivalent to picking "Fold into a pill". This dropdown stores no state of its own: its value is derived from `dsh.quick-phrases.hidden.v1` (which wins) and `dsh.quick-phrases.collapsed.v1`, and switching composes writes to those two existing keys.

### Automatic shedding on narrow screens

When the window or container gets narrow, the row sheds its controls **one by one by actual available width** — no setting to touch, and no fixed pixel breakpoint (the fit is computed from the real width, so short and long captions both degrade correctly):

1. The **Fold** chip at the end goes first (least important);
2. then the **Manage** entry;
3. then phrase chips are dropped **from the end backwards** — earlier phrases stay longest.

At extreme narrowness **only the first usable phrase remains**; the row never empties, and with no phrases at all the fold and manage entries stay reachable. Widen the window and the controls come back under the same rules.

Even when the Fold chip is shed on a narrow screen, the row can still be folded: a draft folds it into a pill under the default "Fold automatically", or you can pick "Fold into a pill" from the "Phrase row" dropdown in Settings. When the Manage entry is shed, Settings → Quick phrases still opens the manager. The three-way dropdown, automatic folding and single-phrase hiding are all unchanged.

A single phrase can be hidden with the **eye** toggle on its card in the manager: the chip disappears from the row while the card stays in the manager marked "Hidden"; click again to bring it back.

## Managing phrases

Open **Settings → Quick phrases**. The page has two layers: five behaviour options on top, the phrase list below.

> **Small-screen design polish**: on narrow screens (≤560px) the manager only refines layout — labels sit beside their dropdowns, explanations stay complete, touch targets grow, section buttons share a row, margins tighten and long text wraps anywhere; **no element is removed and no behaviour changes** (a different mechanism from the row's width-based shedding above).

**Behaviour options** (applied on selection, no restart needed). Each option's values, default and effect:

| Option | Values | Default | Effect |
| --- | --- | --- | --- |
| Position | Below the composer / Above the composer / Composer tool row | Below the composer | Chooses which composer slot holds the row; the row moves immediately. See "Where the row lives" above for each slot. |
| On click | Send right away / Fill the composer | Send right away | "Send right away" fires the phrase with one click while the composer is empty and has no attachments; "Fill the composer" only writes it into the draft. In both modes, existing text or attachments are preserved and the phrase is inserted at the caret. |
| Phrase row | Show the full row / Fold into a pill / Hide completely | Show the full row | Controls the resting shape: "Fold into a pill" leaves one expandable pill; "Hide completely" renders nothing, not even the pill, and only this page can bring it back. Picking "Show the full row" also clears the folded state. See "Folding and hiding" above. |
| Manage button | Text button / Gear icon / Hidden | Text button | The look of the "Manage" chip at the end of the row. The gear icon keeps the accessible name "Manage" and the same click behaviour; "Hidden" renders no manage button while the phrase row keeps working and this page stays reachable. |
| When the composer has text | Fold automatically / Keep it visible | Fold automatically | Whether the row folds into the pill while a draft or attachments exist. Automatic folding expands again once the draft is cleared; "Keep it visible" keeps the full row. |

**Phrase list** (one card per phrase):

- **Drag to reorder**: grab the handle on the left and drop the card where it belongs; the **↑ / ↓** buttons move it one step at a time. The list order is the left-to-right order in the row.
- **Label**: the top line of the card is the button caption — edit it in place.
- **Text**: the large field below, multi-line.
- **Chip preview**: each card shows the resulting chip and its character count, so a too-wide label is obvious before you send anything.
- **Eye**: hide or restore that phrase. A hidden phrase leaves the row while its card stays in the manager with a "Hidden" badge.
- **✕**: the first click only arms the delete ("Confirm"), a second click within four seconds removes the phrase.
- **Add phrase** appends an empty card and focuses its caption; **Restore defaults** arms on the first click and restores the four built-in phrases on the second.

Changes save and apply immediately, no restart. The list lives in local browser storage (`localStorage` key `dsh.quick-phrases.v1`; the position is `dsh.quick-phrases.placement.v1`, the click behaviour `dsh.quick-phrases.click.v1`, the folded state `dsh.quick-phrases.collapsed.v1`, the auto-fold option `dsh.quick-phrases.autohide.v1`, the complete-hide state `dsh.quick-phrases.hidden.v1`, the manage-entry style `dsh.quick-phrases.manage.v1`), scoped to the DSH Web origin — a different machine or cleared site data loses it. The "Phrase row" dropdown adds no key of its own: it reads and writes `hidden.v1` and `collapsed.v1`.

## Opening it from the composer

The **Manage** chip at the end of the row jumps to the same settings page (expand the pill first when the row is folded). It can be switched to a gear icon or hidden in Settings; once hidden the row shows no manage button and Settings → Quick phrases is the way in. If the settings entry is not mounted in this UI yet, it says "请在『设置 — 快捷短语』中管理" instead.

## Styling

Chips, fields and cards use the host's semantic tokens (`--dsw-alias-*`, `--dsw-radius-*`, `--dsw-focus-*`), so they follow DSH's dark and light themes. The primary button's foreground uses `--dsw-alias-label-primary-foreground`, matching the host Button's primary variant, so contrast holds in both themes.

## Boundaries

- Phrases are plain text: no variables, no commands.
- The row only appears around the session composer; background and scheduled tasks are untouched.
- Text follows the DSH UI language (Chinese / English), including the four defaults.

## More

- Implementation notes (slots, stores, styling, tests): [docs/ARCHITECTURE.md](ARCHITECTURE.md)
- Contributing: [CONTRIBUTING.md](../CONTRIBUTING.md)
- Security reports: [SECURITY.md](../SECURITY.md)
