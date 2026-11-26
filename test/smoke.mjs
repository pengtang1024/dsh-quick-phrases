// Smoke test for dsh-quick-phrases/client.js — runs the real file in a sandbox
// with a minimal React + module-loader stand-in, drives the components' own
// event handlers, and asserts on the state that would be persisted.
import fs from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'

const SOURCE = fs.readFileSync(new URL('../client.js', import.meta.url), 'utf8')

const storage = new Map()
const localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
}

/* Minimal hook emulation: one cell array per component name, cursor per render. */
const stores = new Map()
let cells = []
let cursor = 0
function beginRender(name) {
  cells = stores.get(name) ?? []
  stores.set(name, cells)
  cursor = 0
}
function render(name, component, props) {
  beginRender(name)
  return component(props)
}

const React = {
  createElement(type, props, ...children) {
    return { type, props: props ?? {}, children }
  },
  useState(init) {
    const index = cursor++
    if (!(index in cells)) cells[index] = typeof init === 'function' ? init() : init
    const set = (next) => {
      cells[index] = typeof next === 'function' ? next(cells[index]) : next
    }
    return [cells[index], set]
  },
  useEffect() {},
  useRef(value) {
    return { current: value ?? null }
  },
}

const loaded = []
const sandbox = {
  console,
  window: {
    localStorage,
    setTimeout: () => 1,
    clearTimeout: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
  },
  require: (name) => {
    if (name === 'react') return React
    throw new Error('unexpected require: ' + name)
  },
}
sandbox.window.__ModuleLoader__ = { load: (spec) => loaded.push(spec) }
vm.createContext(sandbox)
vm.runInContext(SOURCE, sandbox, { filename: 'client.js' })

assert.equal(loaded.length, 1, 'exactly one module factory is registered')
const spec = loaded[0]
assert.equal(spec.id, 'dsh-quick-phrases', 'factory id equals the package name')

const plugin = spec.factory(sandbox.require)
assert.deepEqual([...plugin.inject], ['slots', 'locale'], 'plugin injects slots + locale')

/* ---------------- apply(): registration surface ---------------- */

const registrations = []
const injectedKeys = []
const dictsSeen = []
const t = (key) => {
  const dict = dictsSeen[0]?.zh ?? {}
  return dict[key] ?? key
}

function makeCtx(entriesFn) {
  return {
    effect(fn) {
      const cleanup = fn()
      assert.equal(typeof cleanup, 'function', 'locale registration returns a disposer')
    },
    locale: {
      register(ns, dicts) {
        dictsSeen.push({ ns, ...dicts })
        return () => {}
      },
      bind() {
        return t
      },
    },
    slots: {
      entries: entriesFn ?? (() => []),
      inject(key, install) {
        injectedKeys.push(key)
        return install()
      },
      register(options, component) {
        registrations.push({ options, component })
        return () => {}
      },
    },
  }
}

plugin.apply(makeCtx())

assert.equal(dictsSeen[0].ns, 'dsh-quick-phrases')
assert.equal(dictsSeen[0].zh['section.title'], '快捷短语', 'zh dictionary registered')
assert.equal(typeof dictsSeen[0].en['section.title'], 'string', 'en dictionary registered')
assert.deepEqual(
  Object.keys(dictsSeen[0].en).sort(),
  Object.keys(dictsSeen[0].zh).sort(),
  'zh and en dictionaries carry exactly the same keys',
)
assert.deepEqual(injectedKeys, [
  'conversation.composer.dock',
  'conversation.input.dock',
  'conversation.input.right',
  'settings.section',
  'settings.section.icon',
])

const dockReg = registrations.find((r) => r.options.name === 'conversation.composer.dock')
const topReg = registrations.find((r) => r.options.name === 'conversation.input.dock')
const toolReg = registrations.find((r) => r.options.name === 'conversation.input.right')
const sectionReg = registrations.find((r) => r.options.name === 'settings.section')
const iconReg = registrations.find((r) => r.options.name === 'settings.section.icon')
assert.ok(dockReg && topReg && toolReg && sectionReg && iconReg, 'all five slots registered')
assert.equal(dockReg.options.id, 'quick-phrases-dock')
assert.equal(dockReg.options.order, 5)
assert.equal(dockReg.options.locale, 'dsh-quick-phrases')
assert.equal(toolReg.options.order, -5, 'the tool-row row sits before the submit action')
assert.equal(sectionReg.options.order, 26)
assert.equal(sectionReg.options.label(), '快捷短语')

/* ---------------- helpers ---------------- */

function walk(node, out = []) {
  if (node === null || node === undefined || node === false) return out
  if (Array.isArray(node)) {
    node.forEach((child) => walk(child, out))
    return out
  }
  if (typeof node !== 'object') {
    out.push(node)
    return out
  }
  out.push(node)
  node.children.forEach((child) => walk(child, out))
  return out
}

const textOf = (node) =>
  walk(node).filter((n) => typeof n === 'string' || typeof n === 'number').join('')

function byClass(tree, className) {
  return walk(tree).filter(
    (n) => n.type === 'button' && String(n.props.className ?? '').includes(className),
  )
}

const selectById = (tree, id) =>
  walk(tree).filter((n) => n.type === 'select' && n.props.id === id)[0]

const buttonByText = (tree, text) => {
  const hit = walk(tree).find(
    (n) => n.type === 'button' && textOf(n).trim() === text,
  )
  assert.ok(hit, 'button labelled ' + text + ' exists')
  return hit
}

const rowsOf = (tree) =>
  walk(tree).filter(
    (n) => n.type === 'div' && String(n.props.className ?? '').split(' ').includes('dqp-row'),
  )

/* ---------------- dock: chips write the draft ---------------- */

const written = []
const submitted = []
const inserted = []
let manageCalls = 0
const dockProps = {
  t,
  useInput: (sel) => sel({ draft: '', attachmentIds: [] }),
  inputActions: {
    setDraft: (text) => written.push(text),
    submit: () => submitted.push(true),
    captureInsertion: () => ({ draftRev: 0 }),
    insertText: (text) => {
      inserted.push(text)
      return true
    },
  },
  openManager: () => {
    manageCalls += 1
    return false
  },
}
const chips = byClass(render('dock', dockReg.component, dockProps), 'dqp-chip')
assert.equal(chips.length, 6, 'four phrase chips + hide + manage')
assert.deepEqual(
  chips.slice(0, 4).map((c) => textOf(c)),
  ['继续', '提交', '推送', '发版'],
)
assert.ok(chips[4].props.className.includes('dqp-chip-collapse'), 'the row ends with a hide chip')
assert.ok(chips[5].props.className.includes('dqp-chip-manage'), 'manage is the last chip')
// The trailing chips are icon-only pills: the visible label is an SVG glyph,
// the localised text lives only in title/aria-label for assistive tech.
for (const [chip, label] of [[chips[4], t('dock.collapseHint')], [chips[5], t('dock.manage')]]) {
  assert.equal(textOf(chip).trim(), '', 'the trailing chip has no visible text')
  assert.equal(chip.props.title, label, 'the chip title stays localised')
  assert.equal(chip.props['aria-label'], label, 'the chip keeps its accessible name')
  assert.ok(walk(chip).some((n) => n.type === 'svg'), 'the chip renders an inline icon')
  assert.ok(String(chip.props.className).includes('dqp-chip-icon'), 'the chip uses the icon-pill geometry')
}

chips[1].props.onClick()
assert.deepEqual(written, ['提交改动并推送到远端'], 'chip writes its sent text, not its label')
assert.equal(submitted.length, 1, 'an empty composer sends the phrase instead of only writing it')
assert.deepEqual(inserted, [], 'the send path does not fall through to insertion')

chips[5].props.onClick()
assert.equal(manageCalls, 1, 'manage chip calls the settings opener')
const dockTree2 = render('dock', dockReg.component, dockProps)
assert.ok(
  walk(dockTree2).some((n) => String(n.props?.className ?? '').includes('dqp-hint')),
  'a failed settings jump shows the fallback hint',
)

/* ---------------- hiding: the whole row folds into one pill ---------------- */

const collapseStored = () => localStorage.getItem('dsh.quick-phrases.collapsed.v1')
assert.equal(collapseStored(), null, 'nothing stored before the first hide')

byClass(render('dock', dockReg.component, dockProps), 'dqp-chip-collapse')[0].props.onClick()
assert.equal(collapseStored(), '1', 'hiding the row persists the folded state')
const foldedTree = render('dock', dockReg.component, dockProps)
const foldedChips = byClass(foldedTree, 'dqp-chip')
assert.equal(foldedChips.length, 1, 'a folded row renders a single pill')
assert.ok(foldedChips[0].props.className.includes('dqp-pill'), 'the pill is its own chip')
assert.ok(foldedChips[0].props.className.includes('dqp-chip-icon'), 'the pill is an icon pill')
assert.equal(textOf(foldedChips[0]).trim(), '', 'the expand pill shows no visible text')
assert.equal(foldedChips[0].props.title, t('dock.expandHint'), 'the pill title stays localised')
assert.equal(foldedChips[0].props['aria-label'], t('dock.expandHint'), 'the pill keeps its accessible name')
assert.ok(walk(foldedChips[0]).some((n) => n.type === 'svg'), 'the pill renders a chevron icon')
assert.equal(foldedChips[0].props['aria-expanded'], false)

foldedChips[0].props.onClick()
assert.equal(collapseStored(), '0', 'opening the pill clears the folded state')
assert.equal(byClass(render('dock', dockReg.component, dockProps), 'dqp-chip').length, 6, 'the row comes back')

/* ---------------- click behaviour: send right away vs fill only ---------------- */

const clickStored = () => localStorage.getItem('dsh.quick-phrases.click.v1')
assert.equal(clickStored(), null, 'no click mode stored before the first switch')

let clickTree = render('manager', sectionReg.component, { t })
let clickPicker = selectById(clickTree, 'dqp-click')
assert.ok(clickPicker, 'the click behaviour is a dropdown')
assert.equal(clickPicker.props.value, 'send', 'sending right away is the default')
assert.deepEqual(
  walk(clickPicker).filter((n) => n.type === 'option').map((n) => textOf(n)),
  [t('manager.clickSend'), t('manager.clickInsert')],
  'two click behaviours are offered',
)

// A non-empty draft must never be thrown away: the phrase goes to the caret.
const draftProps = {
  ...dockProps,
  useInput: (sel) => sel({ draft: '已经写了一半', attachmentIds: [] }),
}
submitted.length = 0
inserted.length = 0
written.length = 0
const autoHideStored = () => localStorage.getItem('dsh.quick-phrases.autohide.v1')
assert.equal(autoHideStored(), null, 'nothing stored before the first policy switch')
const draftFolded = byClass(render('draft', dockReg.component, draftProps), 'dqp-chip')
assert.equal(draftFolded.length, 1, 'a draft folds the row by default')
assert.equal(textOf(draftFolded[0]).trim(), '', 'the folded row keeps an icon-only expand pill')
assert.equal(draftFolded[0].props['aria-label'], t('dock.expandHint'), 'the expand pill keeps its accessible name')
assert.ok(walk(draftFolded[0]).some((n) => n.type === 'svg'), 'the folded row renders an expand svg')

// Opening the pill is a peek: the row comes back for this draft, the setting stays.
draftFolded[0].props.onClick()
assert.equal(collapseStored(), '0', 'peeking does not persist a collapsed row')
assert.equal(autoHideStored(), null, 'peeking does not change the auto-hide policy')
const draftChips = byClass(render('draft', dockReg.component, draftProps), 'dqp-chip')
assert.equal(draftChips.length, 6, 'the peeked row shows every chip again')
draftChips[1].props.onClick()
assert.equal(submitted.length, 0, 'a non-empty draft is not sent over')
assert.deepEqual(inserted, ['提交改动并推送到远端'], 'the phrase is inserted at the caret instead')
assert.deepEqual(written, [], 'the typed draft is not replaced')

// Keeping the row visible is the opt-out for anyone who wants it always there.
const policyPicker = selectById(render('manager', sectionReg.component, { t }), 'dqp-autohide')
assert.ok(policyPicker, 'the auto-hide policy is a dropdown')
assert.equal(policyPicker.props.value, 'fold', 'folding is the default policy')
assert.deepEqual(
  walk(policyPicker).filter((n) => n.type === 'option').map((n) => textOf(n)),
  [t('manager.autoHideFold'), t('manager.autoHideKeep')],
  'two auto-hide policies are offered',
)
policyPicker.props.onChange({ target: { value: 'keep' } })
assert.equal(autoHideStored(), 'keep', 'choosing keep persists it')
assert.equal(
  byClass(render('draft-keep', dockReg.component, draftProps), 'dqp-chip').length,
  6,
  'keeping the row visible leaves it open while a draft exists',
)
policyPicker.props.onChange({ target: { value: 'fold' } })
assert.equal(autoHideStored(), 'fold', 'the policy can be switched back')

// Attachments count as content too.
const attachProps = {
  ...dockProps,
  useInput: (sel) => sel({ draft: '', attachmentIds: ['a1'] }),
}
assert.equal(byClass(render('attach', dockReg.component, attachProps), 'dqp-chip').length, 1, 'an attached file folds the row too')

// Fill-only mode: still no submit even with an empty composer.
clickPicker.props.onChange({ target: { value: 'fill' } })
assert.equal(clickStored(), 'fill', 'choosing fill-only persists it')
submitted.length = 0
inserted.length = 0
written.length = 0
const fillChips = byClass(render('fill', dockReg.component, dockProps), 'dqp-chip')
fillChips[0].props.onClick()
assert.equal(submitted.length, 0, 'fill-only never submits')
assert.deepEqual(inserted, [t('default.continue.text')], 'fill-only inserts the sent text')

// Back to the default for the sections below.
clickPicker = selectById(render('manager', sectionReg.component, { t }), 'dqp-click')
clickPicker.props.onChange({ target: { value: 'send' } })
assert.equal(clickStored(), 'send', 'the click behaviour can be switched back')

/* ---------------- placement: one row, moved between composer slots ---------------- */

const placementStored = () => localStorage.getItem('dsh.quick-phrases.placement.v1')

assert.equal(placementStored(), null, 'nothing stored before the first switch')
assert.ok(byClass(render('dock', dockReg.component, dockProps), 'dqp-chip').length === 6, 'default position is under the composer')
assert.ok(
  walk(render('dock-default', dockReg.component, dockProps)).some(
    (n) => String(n.props?.className ?? '') === 'dqp-dock dqp-dock-inset',
  ),
  'the below-composer row copies the host dock geometry so it lines up with the card',
)
assert.equal(render('top', topReg.component, dockProps), null, 'the above-composer row stays hidden by default')
assert.equal(render('tool', toolReg.component, dockProps), null, 'the tool-row row stays hidden by default')

let placementTree = render('manager', sectionReg.component, { t })
let placementPicker = selectById(placementTree, 'dqp-placement')
assert.ok(placementPicker, 'the position is a dropdown')
assert.equal(placementPicker.props.value, 'composer-dock', 'the first position is selected by default')
assert.deepEqual(
  walk(placementPicker).filter((n) => n.type === 'option').map((n) => textOf(n)),
  [t('manager.placementDock'), t('manager.placementTop'), t('manager.placementTool')],
  'three positions are offered',
)

placementPicker.props.onChange({ target: { value: 'input-dock' } })
assert.equal(placementStored(), 'input-dock', 'switching position persists it')
assert.equal(render('dock', dockReg.component, dockProps), null, 'the old row disappears')
const topTree = render('top', topReg.component, dockProps)
assert.equal(byClass(topTree, 'dqp-chip').length, 6, 'the new row renders above the composer')
assert.ok(
  walk(topTree).some((n) => String(n.props?.className ?? '') === 'dqp-dock dqp-dock-inset'),
  'the above-composer row copies the host dock geometry so it lines up with the card',
)

placementTree = render('manager', sectionReg.component, { t })
placementPicker = selectById(placementTree, 'dqp-placement')
assert.equal(placementPicker.props.value, 'input-dock', 'the manager reflects the stored position')
placementPicker.props.onChange({ target: { value: 'tool-right' } })
assert.equal(placementStored(), 'tool-right', 'the tool-row position persists')
const toolTree = render('tool', toolReg.component, dockProps)
assert.ok(
  walk(toolTree).some((n) => String(n.props?.className ?? '') === 'dqp-dock dqp-dock-tool'),
  'the tool row uses the compact variant',
)
assert.equal(byClass(toolTree, 'dqp-chip').length, 6)

// Back to the default so the CRUD assertions below read the dock row.
placementPicker = selectById(render('manager', sectionReg.component, { t }), 'dqp-placement')
placementPicker.props.onChange({ target: { value: 'composer-dock' } })
assert.equal(placementStored(), 'composer-dock', 'the position can be switched back')
assert.equal(byClass(render('dock', dockReg.component, dockProps), 'dqp-chip').length, 6)

/* ---------------- manager: the three-state row mode and per-phrase hiding ---------------- */

const stored = () => JSON.parse(localStorage.getItem('dsh.quick-phrases.v1'))

let managerTree = render('manager', sectionReg.component, { t })
assert.equal(rowsOf(managerTree).length, 4, 'four default rows')

const hiddenStored = () => localStorage.getItem('dsh.quick-phrases.hidden.v1')
assert.equal(hiddenStored(), null, 'the row is not hidden by default')

const rowModeSelect = () =>
  selectById(render('manager', sectionReg.component, { t }), 'dqp-rowmode')
assert.ok(rowModeSelect(), 'the manager offers a three-state row-mode dropdown')
assert.equal(rowModeSelect().props.value, 'full', 'the row starts as the full row')
assert.deepEqual(
  walk(rowModeSelect()).filter((n) => n.type === 'option').map((n) => n.props.value),
  ['full', 'pill', 'hidden'],
  'three row modes are offered',
)
assert.equal(
  byClass(render('dock-default-row', dockReg.component, dockProps), 'dqp-chip').length,
  6,
  'the default row mode renders all six chips',
)

// The 收起 chip keeps its old meaning: one pill, the row is still there.
byClass(render('dock', dockReg.component, dockProps), 'dqp-chip-collapse')[0].props.onClick()
assert.equal(collapseStored(), '1', 'the 收起 chip still folds the row into a pill')
assert.equal(hiddenStored(), null, 'folding does not write the hidden state')
assert.equal(byClass(render('dock-pill-again', dockReg.component, dockProps), 'dqp-chip').length, 1)
assert.equal(rowModeSelect().props.value, 'pill', 'the dropdown derives pill from the folded state')

// The dropdown writes both underlying keys; full clears any leftover state.
rowModeSelect().props.onChange({ target: { value: 'full' } })
assert.equal(hiddenStored(), null, 'choosing full from a merely folded row leaves no hidden value')
assert.equal(collapseStored(), '0', 'choosing full clears the folded key')
assert.equal(rowModeSelect().props.value, 'full', 'the dropdown reflects the stored state')
assert.equal(
  byClass(render('dock-full-again', dockReg.component, dockProps), 'dqp-chip').length,
  6,
  'choosing full brings the whole row back',
)

// Pill is the 收起 state, persisted in the existing collapsed key.
rowModeSelect().props.onChange({ target: { value: 'pill' } })
assert.equal(collapseStored(), '1', 'choosing pill folds the row')
assert.notEqual(hiddenStored(), '1', 'choosing pill never hides the row')
const pillModeDock = byClass(render('dock-pill-mode', dockReg.component, dockProps), 'dqp-chip')
assert.equal(pillModeDock.length, 1, 'pill mode renders a single chip')
assert.ok(pillModeDock[0].props.className.includes('dqp-pill'), 'that chip is the pill')

// Hidden means gone: no chips, no pill, no placeholder at all.
rowModeSelect().props.onChange({ target: { value: 'hidden' } })
assert.equal(hiddenStored(), '1', 'choosing hidden persists the complete hide')
assert.equal(collapseStored(), '1', 'choosing hidden leaves the folded key exactly as it was')
assert.equal(
  render('dock-hidden-row', dockReg.component, dockProps),
  null,
  'a hidden row renders absolutely nothing — not even the pill',
)
assert.equal(rowModeSelect().props.value, 'hidden', 'the dropdown reflects the hidden row')

const hiddenManager = render('manager', sectionReg.component, { t })
assert.ok(
  walk(hiddenManager).some((n) => typeof n === 'string' && n === t('manager.rowHiddenBadge')),
  'the manager marks the whole row as hidden',
)
assert.ok(
  walk(hiddenManager).some((n) => typeof n === 'string' && n === t('manager.rowModeHintOff')),
  'the manager explains where the row can be restored',
)

// Choosing pill while hidden clears the hidden flag instead of leaving it stuck.
rowModeSelect().props.onChange({ target: { value: 'pill' } })
assert.equal(hiddenStored(), '0', 'pill clears the hidden key')
assert.equal(collapseStored(), '1', 'pill folds the row even when it was hidden')
assert.equal(
  byClass(render('dock-pill-from-hidden', dockReg.component, dockProps), 'dqp-chip').length,
  1,
  'the hidden row can come back as a pill',
)

// Settings is the only way back; full also clears the leftover fold.
rowModeSelect().props.onChange({ target: { value: 'full' } })
assert.equal(hiddenStored(), '0', 'the dropdown brings the row back')
assert.equal(collapseStored(), '0', 'bringing the row back clears a folded state')
assert.equal(
  byClass(render('dock-switch', dockReg.component, dockProps), 'dqp-chip').length,
  6,
  'the whole row is back',
)

/* ---------------- manager: the manage entry can be text, icon or hidden ---------------- */

const manageStored = () => localStorage.getItem('dsh.quick-phrases.manage.v1')
assert.equal(manageStored(), null, 'the manage entry defaults to text without writing a key')

const manageSelect = () =>
  selectById(render('manager', sectionReg.component, { t }), 'dqp-manage')
assert.ok(manageSelect(), 'the manager offers a manage-entry dropdown')
assert.equal(manageSelect().props.value, 'text', 'the text button is the default entry')
assert.deepEqual(
  walk(manageSelect()).filter((n) => n.type === 'option').map((n) => n.props.value),
  ['text', 'icon', 'hidden'],
  'three manage entries are offered',
)
const textManage = byClass(render('dock-manage-text', dockReg.component, dockProps), 'dqp-chip-manage')
assert.equal(textManage.length, 1, 'the default (text) mode still renders the manage chip')
// The setting key stays `text` for backward compatibility, but the user wants
// an icon pill: no visible label, gear svg, localised name only in the a11y props.
assert.equal(textOf(textManage[0]).trim(), '', 'even the default mode shows no text label')
assert.ok(textManage[0].props.className.includes('dqp-chip-manage-icon'), 'legacy mode keeps its marker class')
assert.ok(walk(textManage[0]).some((n) => n.type === 'svg'), 'the default mode renders a gear svg')
assert.equal(textManage[0].props.title, t('dock.manage'), 'the default mode keeps the localised title')
assert.equal(textManage[0].props['aria-label'], t('dock.manage'), 'the default mode keeps the manage accessible name')

manageSelect().props.onChange({ target: { value: 'icon' } })
assert.equal(manageStored(), 'icon', 'the icon mode persists to manage.v1')
const iconManage = byClass(render('dock-manage-icon', dockReg.component, dockProps), 'dqp-chip-manage')
assert.equal(iconManage.length, 1, 'icon mode still renders one manage chip')
assert.ok(walk(iconManage[0]).some((n) => n.type === 'svg'), 'icon mode renders an svg')
assert.equal(textOf(iconManage[0]).trim(), '', 'icon mode renders no text label')
assert.equal(iconManage[0].props['aria-label'], t('dock.manage'), 'icon mode keeps the manage accessible name')
assert.equal(
  byClass(render('dock-manage-icon-row', dockReg.component, dockProps), 'dqp-chip').length,
  6,
  'the phrase chips and the fold chip stay next to the icon',
)

manageSelect().props.onChange({ target: { value: 'hidden' } })
assert.equal(manageStored(), 'hidden', 'the hidden entry persists to manage.v1')
const hiddenManageDock = render('dock-manage-hidden', dockReg.component, dockProps)
assert.equal(byClass(hiddenManageDock, 'dqp-chip-manage').length, 0, 'hidden mode renders no manage chip')
assert.equal(
  byClass(hiddenManageDock, 'dqp-chip').length,
  5,
  'the phrase chips and the fold chip still render without the manage chip',
)

manageSelect().props.onChange({ target: { value: 'text' } })
assert.equal(manageStored(), 'text', 'the manage entry can be switched back to the default')
const textManageAgain = byClass(render('dock-manage-text-again', dockReg.component, dockProps), 'dqp-chip-manage')
assert.equal(textManageAgain.length, 1, 'the manage chip comes back')
assert.equal(textOf(textManageAgain[0]).trim(), '', 'the restored manage chip is still icon-only')

// One phrase can be hidden without leaving the list: the row stays, the chip goes.
managerTree = render('manager', sectionReg.component, { t })
click(managerTree, 'dqp-eye', 0)
assert.equal(stored()[0].hidden, true, 'the eye toggle persists the hidden flag')
assert.equal(byClass(render('dock-hidden', dockReg.component, dockProps), 'dqp-chip').length, 5, 'a hidden phrase loses its chip')
assert.equal(rowsOf(render('manager', sectionReg.component, { t })).length, 4, 'the hidden row stays in the manager')
assert.ok(
  walk(render('manager', sectionReg.component, { t })).some(
    (n) => n.type === 'div' && String(n.props.className ?? '').includes('dqp-row-muted'),
  ),
  'the hidden row is dimmed',
)
managerTree = render('manager', sectionReg.component, { t })
click(managerTree, 'dqp-eye', 0)
assert.equal(stored()[0].hidden, false, 'the eye toggle shows the phrase again')
assert.equal(byClass(render('dock-shown', dockReg.component, dockProps), 'dqp-chip').length, 6)

/* ---------------- manager: add / edit / reorder / delete / reset ---------------- */

assert.equal(rowsOf(managerTree).length, 4, 'four default rows')

function click(tree, className, index = 0) {
  const buttons = byClass(tree, className)
  assert.ok(buttons[index], 'button ' + className + '[' + index + '] exists')
  buttons[index].props.onClick()
}

click(managerTree, 'dqp-btn-primary') // add
assert.equal(stored().length, 5, 'add appends a row')
assert.equal(stored()[4].label, '')

managerTree = render('manager', sectionReg.component, { t })
const rows = rowsOf(managerTree)
assert.equal(rows.length, 5)
const labelsInput = walk(rows[0]).filter((n) => n.type === 'input')[0]
labelsInput.props.onChange({ target: { value: '继续吧' } })
assert.equal(stored()[0].label, '继续吧', 'label edits persist')

const textarea = walk(rows[0]).filter((n) => n.type === 'textarea')[0]
textarea.props.onChange({ target: { value: '继续，按原计划推进' } })
assert.equal(stored()[0].text, '继续，按原计划推进', 'text edits persist separately from the label')

// The eye toggle shares .dqp-icon, so the move arrows start at index 1.
click(rows[1], 'dqp-icon', 1) // ↑ on the second row
assert.deepEqual(
  stored().slice(0, 2).map((p) => p.label),
  ['提交', '继续吧'],
  'move up swaps order',
)

// The edited row shows a live chip preview and a character count.
managerTree = render('manager', sectionReg.component, { t })
const firstRow = rowsOf(managerTree)[0]
const preview = walk(firstRow).find((n) => String(n.props?.className ?? '').includes('dqp-preview'))
assert.ok(preview, 'each row previews its chip caption')
assert.equal(textOf(preview), '提交', 'the preview uses the stored label')
assert.ok(
  textOf(firstRow).includes(t('manager.chars').replace('{n}', String(stored()[0].text.length))),
  'the row reports the sent-text length',
)

// Drag-and-drop reorder: grab the last row's grip and drop it on the first row.
managerTree = render('manager', sectionReg.component, { t })
let dragRows = rowsOf(managerTree)
const grip = walk(dragRows[3]).find((n) => String(n.props?.className ?? '') === 'dqp-grip')
assert.ok(grip && grip.props.draggable === true, 'each row has a drag handle')
grip.props.onDragStart({ dataTransfer: { setData() {}, effectAllowed: '' } })
dragRows[0].props.onDrop({ preventDefault() {} })
assert.equal(stored().at(0).label, '发版', 'dropping a row on the first position moves it there')

// Delete is a two-step action, so a stray click cannot drop a phrase.
managerTree = render('manager', sectionReg.component, { t })
const lastRow = rowsOf(managerTree).at(-1)
lastRow.props.onDrop // keep the row shape stable across renders
const beforeDelete = stored().length
click(lastRow, 'dqp-icon-danger')
assert.equal(stored().length, beforeDelete, 'the first click only arms the delete')
const armed = render('manager', sectionReg.component, { t })
assert.ok(
  walk(armed).some((n) => n.type === 'button' && textOf(n).trim() === t('manager.deleteShort')),
  'the armed row asks for confirmation',
)
click(rowsOf(armed).at(-1), 'dqp-icon-danger')
assert.equal(stored().length, beforeDelete - 1, 'the second click removes the row')

/* ---------------- dock reflects the edited list ---------------- */

const dockTree3 = render('dock', dockReg.component, dockProps)
const labels = byClass(dockTree3, 'dqp-chip').slice(0, 4).map((c) => textOf(c))
assert.deepEqual(labels, ['发版', '提交', '继续吧', '推送'], 'dock order follows the list')

/* ---------------- restore defaults ---------------- */

managerTree = render('manager', sectionReg.component, { t })
assert.equal(stored().length, 4, 'list is four rows before reset')
buttonByText(managerTree, t('manager.reset')).props.onClick() // first click arms the confirm
managerTree = render('manager', sectionReg.component, { t })
assert.ok(
  walk(managerTree).some((n) => typeof n === 'string' && n === t('manager.resetConfirm')),
  'confirm label appears after the first click',
)
buttonByText(managerTree, t('manager.resetConfirm')).props.onClick() // second click resets
assert.equal(stored().length, 4, 'reset restores the four defaults')
assert.equal(stored()[0].label, '继续', 'reset restores default labels')

/* ---------------- openManager: settings jump ---------------- */

let openedSection = null
registrations.length = 0
injectedKeys.length = 0
plugin.apply(
  makeCtx(() => [
    { store: { create: () => ({ actions: { openSection: (id) => { openedSection = id } } }) } },
  ]),
)
const dockReg2 = registrations.find((r) => r.options.name === 'conversation.composer.dock')
const openManager = dockReg2.options.inject().openManager
assert.equal(openManager(), true)
assert.equal(openedSection, 'quick-phrases', 'manage chip opens the settings section')

/* ---------------- missing `t` seat must not throw ---------------- */

const dockWithoutT = dockReg.component({
  inputActions: { setDraft: () => {} },
  openManager: () => false,
})
assert.ok(byClass(dockWithoutT, 'dqp-chip').length >= 5, 'dock renders without a t prop')
const managerWithoutT = sectionReg.component({})
assert.ok(rowsOf(managerWithoutT).length >= 1, 'manager renders without a t prop')

console.log('PASS — click-to-send, dock chips, folding, three-state row mode, complete hiding, manage entry modes, per-phrase hiding, manager CRUD, reorder, persistence, reset and settings jump behave')
