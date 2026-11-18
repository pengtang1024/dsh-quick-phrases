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
assert.equal(spec.id, '@local/dsh-quick-phrases', 'factory id equals the package name')

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
    (n) => n.type === 'div' && String(n.props.className ?? '') === 'dqp-row',
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
assert.equal(chips.length, 5, 'four phrase chips + manage')
assert.deepEqual(
  chips.slice(0, 4).map((c) => textOf(c)),
  ['继续', '提交', '推送', '发版'],
)

chips[1].props.onClick()
assert.deepEqual(written, ['提交改动并推送到远端'], 'chip writes its sent text, not its label')
assert.equal(submitted.length, 1, 'an empty composer sends the phrase instead of only writing it')
assert.deepEqual(inserted, [], 'the send path does not fall through to insertion')

chips[4].props.onClick()
assert.equal(manageCalls, 1, 'manage chip calls the settings opener')
const dockTree2 = render('dock', dockReg.component, dockProps)
assert.ok(
  walk(dockTree2).some((n) => String(n.props?.className ?? '').includes('dqp-hint')),
  'a failed settings jump shows the fallback hint',
)

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
const draftChips = byClass(render('draft', dockReg.component, draftProps), 'dqp-chip')
draftChips[1].props.onClick()
assert.equal(submitted.length, 0, 'a non-empty draft is not sent over')
assert.deepEqual(inserted, ['提交改动并推送到远端'], 'the phrase is inserted at the caret instead')
assert.deepEqual(written, [], 'the typed draft is not replaced')

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
assert.ok(byClass(render('dock', dockReg.component, dockProps), 'dqp-chip').length === 5, 'default position is under the composer')
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
assert.equal(byClass(topTree, 'dqp-chip').length, 5, 'the new row renders above the composer')
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
assert.equal(byClass(toolTree, 'dqp-chip').length, 5)

// Back to the default so the CRUD assertions below read the dock row.
placementPicker = selectById(render('manager', sectionReg.component, { t }), 'dqp-placement')
placementPicker.props.onChange({ target: { value: 'composer-dock' } })
assert.equal(placementStored(), 'composer-dock', 'the position can be switched back')
assert.equal(byClass(render('dock', dockReg.component, dockProps), 'dqp-chip').length, 5)

/* ---------------- manager: add / edit / reorder / delete / reset ---------------- */

let managerTree = render('manager', sectionReg.component, { t })
assert.equal(rowsOf(managerTree).length, 4, 'four default rows')

function click(tree, className, index = 0) {
  const buttons = byClass(tree, className)
  assert.ok(buttons[index], 'button ' + className + '[' + index + '] exists')
  buttons[index].props.onClick()
}

const stored = () => JSON.parse(localStorage.getItem('dsh.quick-phrases.v1'))

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

click(rows[1], 'dqp-icon', 0) // ↑ on the second row
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

console.log('PASS — click-to-send, dock chips, manager CRUD, reorder, persistence, reset and settings jump behave')
