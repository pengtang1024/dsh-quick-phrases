/**
 * Host half of dsh-quick-phrases.
 *
 * The feature is entirely client-side (phrase chips under the composer plus a
 * Settings section that edits them), so the Host row only has to exist for the
 * bundle to activate. See client.js for the UI.
 *
 * NOTE: `Config` is declarative metadata shown by the plugin manager. The
 * client bundle has no bridge that reads the Host row's config, so changing a
 * value here does not drive the client behavior. Adjust the behavior in the
 * "Settings -> Quick phrases" section, which persists to localStorage.
 */
import z from '@deepseek-ai/schemastery'

export const Config = z.object({
  // Where the phrase row lives; mirrors client.js PLACEMENTS.
  placement: z
    .union([z.const('composer-dock'), z.const('input-dock'), z.const('tool-right')])
    .default('composer-dock')
    .description('Where the phrase row appears'),
  // What a chip click does; mirrors client.js CLICK_MODES.
  click: z
    .union([z.const('send'), z.const('fill')])
    .default('send')
    .description('What a chip click does'),
  // Phrase row display; mirrors the client.js row-mode dropdown.
  rowMode: z
    .union([z.const('full'), z.const('pill'), z.const('hidden')])
    .default('full')
    .description('Phrase row display mode'),
  // Manager entry at the end of the row; mirrors client.js MANAGE_MODES.
  manage: z
    .union([z.const('text'), z.const('icon'), z.const('hidden')])
    .default('text')
    .description('Manager entry style'),
  // Row behavior when the composer already has content; mirrors client.js AUTO_HIDE_MODES.
  autoHide: z
    .union([z.const('fold'), z.const('keep')])
    .default('fold')
    .description('Behavior when the input has content'),
})

export function apply(ctx, config) {}
