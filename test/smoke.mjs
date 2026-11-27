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

/* ------------------------------------------------------------------ *
 * Fidelity harness. The earlier sandbox ran effects synchronously and
 * handed out a fresh useRef object on every render, which silently
 * bypassed the real measurement useEffect (and its deferred rAF chain).
 * Here hook cells persist per component instance, effects run after the
 * element tree is committed (with cleanups), and the rAF / setTimeout /
 * ResizeObserver seams plus a measurable fake DOM are controllable.
 * ------------------------------------------------------------------ */

const storageListeners = new Set()
const frames = []
let frameSeq = 0
let rafScheduled = 0
let timeoutScheduled = 0
let useRaf = true
const observers = []
class FakeResizeObserver {
  constructor(cb) {
    this.cb = cb
    this.targets = []
    observers.push(this)
  }
  observe(target) { this.targets.push(target) }
  disconnect() { this.targets = []; this.disconnected = true }
  fire() { this.cb() }
}
let ResizeObserverCtor = FakeResizeObserver

function scheduleFrame(cb, kind) {
  const id = ++frameSeq
  frames.push({ id, cb, kind })
  if (kind === 'raf') rafScheduled += 1
  else timeoutScheduled += 1
  return id
}
function cancelFrame(id) {
  const at = frames.findIndex((job) => job.id === id)
  if (at >= 0) frames.splice(at, 1)
}
function flushFrames(limit = 1000) {
  let ran = 0
  while (frames.length > 0 && ran < limit) {
    const job = frames.shift()
    ran += 1
    job.cb()
  }
  return ran
}
function resetFrames() {
  frames.length = 0
  rafScheduled = 0
  timeoutScheduled = 0
}

const dom = { rowWidth: 0, childWidths: {} }
function childWidth(el) {
  const props = el.props ?? {}
  const id = props['data-dqp-phrase-id']
  if (id !== undefined && id !== null) return dom.childWidths[id] ?? 0
  const cn = String(props.className ?? '')
  if (cn.includes('dqp-chip-collapse')) return dom.childWidths.collapse ?? 0
  if (cn.includes('dqp-chip-manage')) return dom.childWidths.manage ?? 0
  if (cn.includes('dqp-pill')) return dom.childWidths.pill ?? 0
  return dom.childWidths.other ?? 0
}
function makeDomNode(el) {
  const props = el.props ?? {}
  const attrs = {}
  for (const [key, value] of Object.entries(props)) {
    if (['children', 'ref', 'key', 'style'].includes(key)) continue
    if (value == null || typeof value === 'function' || typeof value === 'object') continue
    attrs[key] = value
  }
  return {
    __el: el,
    tag: el.type,
    className: String(props.className ?? ''),
    attrs,
    children: [],
    get clientWidth() { return dom.rowWidth },
    get offsetWidth() { return childWidth(this.__el) },
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null
    },
    getBoundingClientRect() { return { width: childWidth(this.__el) } },
  }
}

/* One cell array per component name (render name), cursor reset per render. */
const stores = new Map()
const lastCleanups = new Map()
const refsByRender = new Map()
const domRefs = new Set()
let cells = []
let cursor = 0
let pendingEffects = []
let newRefs = []

function beginRender(name) {
  cells = stores.get(name) ?? []
  stores.set(name, cells)
  cursor = 0
  pendingEffects = []
  newRefs = []
  // A DOM ref is nulled when its element disappears from the tree (e.g. the
  // row becomes a folded pill with no measured node); it is re-attached below
  // when createElement sees the ref again. Plain value refs are left alone.
  for (const ref of refsByRender.get(name) ?? []) {
    if (domRefs.has(ref)) ref.current = null
  }
}

/* The measurement cache lives in a useRef whose .current holds `phrases`;
   exposing the harness's own ref cell lets the tests assert the cache directly. */
function metricsRefOf(name) {
  return (refsByRender.get(name) ?? []).find(
    (ref) => ref.current && typeof ref.current === 'object' && 'phrases' in ref.current,
  )
}

function render(name, component, props) {
  beginRender(name)
  const tree = component(props)
  const previous = lastCleanups.get(name) ?? []
  previous.forEach((cleanup) => cleanup())
  const cleanups = []
  for (const effect of pendingEffects) {
    const cleanup = effect()
    if (typeof cleanup === 'function') cleanups.push(cleanup)
  }
  lastCleanups.set(name, cleanups)
  refsByRender.set(name, newRefs)
  return tree
}

const React = {
  createElement(type, props, ...children) {
    const el = { type, props: props ?? {}, children }
    const ref = el.props.ref
    if (ref && typeof ref === 'object' && 'current' in ref) {
      domRefs.add(ref)
      const node = makeDomNode(el)
      node.children = children
        .filter((child) => child && typeof child === 'object' && !Array.isArray(child))
        .map((child) => makeDomNode(child))
      ref.current = node
    }
    return el
  },
  useState(init) {
    const index = cursor++
    if (!(index in cells)) cells[index] = typeof init === 'function' ? init() : init
    const set = (next) => {
      cells[index] = typeof next === 'function' ? next(cells[index]) : next
    }
    return [cells[index], set]
  },
  useEffect(fn) { pendingEffects.push(fn) },
  useRef(value) {
    const index = cursor++
    if (!(index in cells)) cells[index] = { current: value ?? null }
    if (!newRefs.includes(cells[index])) newRefs.push(cells[index])
    return cells[index]
  },
}

const loaded = []
const sandbox = {
  console,
  window: {
    localStorage,
    setTimeout: (cb) => scheduleFrame(cb, 'timeout'),
    clearTimeout: (id) => cancelFrame(id),
    addEventListener: (name, fn) => { if (name === 'storage') storageListeners.add(fn) },
    removeEventListener: (name, fn) => { if (name === 'storage') storageListeners.delete(fn) },
    get requestAnimationFrame() { return useRaf ? (cb) => scheduleFrame(cb, 'raf') : undefined },
    cancelAnimationFrame: (id) => cancelFrame(id),
    get ResizeObserver() { return ResizeObserverCtor },
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
const LANGUAGES = ['zh', 'en', 'es', 'fr', 'de', 'ru', 'pt']
const BASE_KEYS = Object.keys(dictsSeen[0].zh).sort()
for (const lang of LANGUAGES) {
  assert.deepEqual(
    Object.keys(dictsSeen[0][lang]).sort(),
    BASE_KEYS,
    `${lang} dictionary carries exactly the same keys as zh`,
  )
}
assert.equal(dictsSeen[0].zh['default.release.label'], '发版', 'release label stays localized')
assert.equal(
  dictsSeen[0].zh['default.release.text'],
  '提交，推送，发布新版本，更新到本地',
  'zh release text is the four-step workflow',
)
assert.equal(
  dictsSeen[0].en['default.release.text'],
  'Commit, push, publish the new version, then update locally',
  'en release text is the four-step workflow',
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
assert.equal(chips.length, 4, 'two phrase chips + hide + manage')
assert.deepEqual(
  chips.slice(0, 2).map((c) => textOf(c)),
  ['继续', '发版'],
)
assert.ok(chips[2].props.className.includes('dqp-chip-collapse'), 'the row ends with a hide chip')
assert.ok(chips[3].props.className.includes('dqp-chip-manage'), 'manage is the last chip')
// The trailing chips are icon-only pills: the visible label is an SVG glyph,
// the localised text lives only in title/aria-label for assistive tech.
for (const [chip, label] of [[chips[2], t('dock.collapseHint')], [chips[3], t('dock.manage')]]) {
  assert.equal(textOf(chip).trim(), '', 'the trailing chip has no visible text')
  assert.equal(chip.props.title, label, 'the chip title stays localised')
  assert.equal(chip.props['aria-label'], label, 'the chip keeps its accessible name')
  assert.ok(walk(chip).some((n) => n.type === 'svg'), 'the chip renders an inline icon')
  assert.ok(String(chip.props.className).includes('dqp-chip-icon'), 'the chip uses the icon-pill geometry')
}

chips[1].props.onClick()
assert.deepEqual(written, ['提交，推送，发布新版本，更新到本地'], 'release chip writes the four-step text, not its label')
assert.equal(submitted.length, 1, 'an empty composer sends the phrase instead of only writing it')
assert.deepEqual(inserted, [], 'the send path does not fall through to insertion')

chips[3].props.onClick()
assert.equal(manageCalls, 1, 'manage chip calls the settings opener')
const dockTree2 = render('dock', dockReg.component, dockProps)
assert.ok(
  walk(dockTree2).some((n) => String(n.props?.className ?? '').includes('dqp-hint')),
  'a failed settings jump shows the fallback hint',
)

/* ---------------- width fitting: shed collapse -> manage -> phrases from the end ---------------- */

const widthFit = sandbox.window.__DQP_WIDTH_FIT__
assert.equal(typeof widthFit.fit, 'function', 'the width fitter is exposed on the sandbox window')
assert.equal(typeof widthFit.setAvailableWidth, 'function', 'the available-width probe is exposed')
assert.equal(typeof widthFit.setChipWidths, 'function', 'the chip-width probe is exposed')
assert.equal(typeof widthFit.setTrailingWidths, 'function', 'the trailing-width probe is exposed')
assert.equal(typeof widthFit.reset, 'function', 'the width probe can be reset')
assert.equal(typeof widthFit.enable, 'function', 'the probe has an explicit enable switch')
assert.equal(typeof widthFit.disable, 'function', 'the probe has an explicit disable switch')
// fit() returns an object created inside the VM realm; spreading it into a
// host-realm object keeps assert.deepEqual's prototype check happy.
const fit = (available, options) => ({ ...widthFit.fit(available, options) })

// Four 40px phrases + 20px collapse + 20px manage + 5 gaps of 6px = 230px.
const fitBase = {
  phraseWidths: [40, 40, 40, 40],
  collapseWidth: 20,
  manageWidth: 20,
  manage: true,
  gap: 6,
}
assert.deepEqual(fit(230, fitBase), { phraseCount: 4, collapse: true, manage: true }, 'a wide row keeps every chip')
assert.deepEqual(fit(210, fitBase), { phraseCount: 4, collapse: false, manage: true }, 'the collapse chip is shed first')
assert.deepEqual(fit(190, fitBase), { phraseCount: 4, collapse: false, manage: false }, 'the manage chip is shed next')
assert.deepEqual(fit(150, fitBase), { phraseCount: 3, collapse: false, manage: false }, 'then phrases go from the end')
assert.deepEqual(fit(100, fitBase), { phraseCount: 2, collapse: false, manage: false }, 'phrase shedding continues one by one')
assert.deepEqual(fit(10, fitBase), { phraseCount: 1, collapse: false, manage: false }, 'an extremely narrow row keeps one phrase and nothing else')
// The hidden manage entry feeds `manage: false` in; that is already false in the
// plan before any width pressure, so shedding it must not be attributed to width.
assert.deepEqual(
  fit(300, { ...fitBase, manage: false }),
  { phraseCount: 4, collapse: true, manage: false },
  'manage:false stays false even at a wide width',
)
assert.deepEqual(
  fit(10, { ...fitBase, manage: false }),
  { phraseCount: 1, collapse: false, manage: false },
  'manage:false and a narrow width still keep the first phrase',
)
assert.deepEqual(
  fit(0, { ...fitBase, phraseWidths: [] }),
  { phraseCount: 0, collapse: true, manage: true },
  'with no phrase at all both trailing controls stay reachable',
)

// Drive the real Chips render through the probe. Two 60px phrases + 20px
// collapse + 20px manage + 3 gaps of 6px = 178px.
widthFit.setChipWidths([60, 60])
widthFit.setTrailingWidths(20, 20)
const chipKinds = (tree) =>
  byClass(tree, 'dqp-chip').map((chip) => {
    const cn = String(chip.props.className ?? '')
    if (cn.includes('dqp-chip-collapse')) return 'collapse'
    if (cn.includes('dqp-chip-manage')) return 'manage'
    return textOf(chip).trim()
  })
const widthTiers = [
  { name: 'wf-wide', px: 178, expect: ['继续', '发版', 'collapse', 'manage'] },
  { name: 'wf-mid', px: 175, expect: ['继续', '发版', 'manage'] },
  { name: 'wf-no-manage', px: 150, expect: ['继续', '发版'] },
  { name: 'wf-narrow', px: 100, expect: ['继续'] },
  { name: 'wf-extreme', px: 20, expect: ['继续'] },
]
for (const tier of widthTiers) {
  widthFit.setAvailableWidth(tier.px)
  assert.deepEqual(chipKinds(render(tier.name, dockReg.component, dockProps)), tier.expect, tier.name + ' renders the fitted chip order')
}
widthFit.reset()
assert.deepEqual(
  chipKinds(render('wf-reset', dockReg.component, dockProps)),
  ['继续', '发版', 'collapse', 'manage'],
  'reset restores real DOM measurement and renders the full row without a DOM',
)

/* ---------------- probe gating: production must not read a stale probe ---------------- */
// Real bug: a width probe left enabled by one render must never narrow a later
// production render. reset() disables AND clears pins; each setter opts in.
widthFit.setAvailableWidth(20)
widthFit.setChipWidths([40, 40])
widthFit.setTrailingWidths(20, 20)
assert.deepEqual(
  chipKinds(render('probe-on', dockReg.component, dockProps)),
  ['继续'],
  'setters enable the probe without a separate enable() call',
)
widthFit.disable()
assert.deepEqual(
  chipKinds(render('probe-disabled', dockReg.component, dockProps)),
  ['继续', '发版', 'collapse', 'manage'],
  'disable() restores real DOM measurement while pins remain stored',
)
widthFit.enable()
assert.deepEqual(
  chipKinds(render('probe-re-enabled', dockReg.component, dockProps)),
  ['继续'],
  'enable() re-reads the pinned widths',
)
widthFit.reset()
assert.deepEqual(
  chipKinds(render('probe-reset', dockReg.component, dockProps)),
  ['继续', '发版', 'collapse', 'manage'],
  'reset() disables the probe and clears every pin',
)
// A stale probe must not change a fresh DOM measured render either.
widthFit.setAvailableWidth(178)
widthFit.setChipWidths([60, 60])
widthFit.setTrailingWidths(20, 20)
dom.rowWidth = 1000
dom.childWidths = { continue: 40, release: 40, collapse: 20, manage: 20 }
resetFrames()
const gateTree = render('probe-gate-dom', dockReg.component, dockProps)
assert.deepEqual(chipKinds(gateTree), ['继续', '发版', 'collapse', 'manage'], 'the probe wins while enabled')
widthFit.reset()
assert.deepEqual(
  chipKinds(render('probe-gate-production', dockReg.component, dockProps)),
  ['继续', '发版', 'collapse', 'manage'],
  'production render ignores the probe once reset',
)

/* ---------------- real measurement timing: zero-width first paint + bounded fallback ---------------- */
// The first paint reports clientWidth === 0 (layout not settled). The component
// keeps the complete row, then re-measures on rAF (or setTimeout) without ever
// looping forever. Simulate the callbacks through the harness's frame queue.
const measureName = 'measure-zero'
dom.rowWidth = 0
dom.childWidths = {}
resetFrames()
const rafBefore = rafScheduled
const firstTree = render(measureName, dockReg.component, dockProps)
assert.deepEqual(
  chipKinds(firstTree), ['继续', '发版', 'collapse', 'manage'],
  'a zero-width first paint keeps the full row instead of dropping every chip',
)
assert.ok(rafScheduled > rafBefore, 'a rAF re-measure is scheduled when clientWidth is 0')
// The fake DOM still reports 0: the fallback chain must stop after 3 deferred
// measures and never schedule an unbounded number of frames.
const framesBefore = flushFrames()
assert.equal(framesBefore, 3, 'exactly three deferred re-measures run, then the bounded chain stops')
assert.equal(rafScheduled - rafBefore, 3, 'the bound holds for the rAF path')
assert.equal(frames.length, 0, 'no pending frames remain after the bounded chain')
assert.equal(timeoutScheduled, 0, 'rAF is preferred when available')
assert.deepEqual(
  chipKinds(render(measureName, dockReg.component, dockProps)),
  ['继续', '发版', 'collapse', 'manage'],
  'the full row survives even after deferred measures at width 0',
)
// Now simulate layout settling between the zero-width paint and the deferred
// callback: the stale full row descends to the measured width on the fallback.
dom.rowWidth = 0
dom.childWidths = { continue: 60, release: 60, collapse: 20, manage: 20 }
resetFrames()
const settleTree = render('measure-settle', dockReg.component, dockProps)
assert.deepEqual(
  chipKinds(settleTree), ['继续', '发版', 'collapse', 'manage'],
  'the zero-width paint starts from the full row',
)
dom.rowWidth = 150
flushFrames()
assert.deepEqual(
  chipKinds(render('measure-settle', dockReg.component, dockProps)),
  ['继续', '发版', 'manage'],
  'deferred re-measure picks up a settled width and sheds the collapse chip',
)
// setTimeout fallback when rAF is missing (older WebView / reduced motion).
useRaf = false
dom.rowWidth = 0
dom.childWidths = {}
resetFrames()
const rafNoRaf = rafScheduled
render('measure-no-raf', dockReg.component, dockProps)
assert.equal(timeoutScheduled, 1, 'the setTimeout(0) fallback is used when rAF is missing')
const timeoutRuns = flushFrames()
assert.equal(timeoutRuns, 3, 'the setTimeout fallback is bounded at three too')
assert.equal(timeoutScheduled, 3, 'the three fallback callbacks all came from setTimeout')
assert.equal(rafScheduled, rafNoRaf, 'no rAF is scheduled in the fallback path')
useRaf = true

/* ---------------- ResizeObserver missing: the row still re-measures at least twice ---------------- */
ResizeObserverCtor = undefined
dom.rowWidth = 0
dom.childWidths = {}
resetFrames()
const observersBefore = observers.length
render('measure-no-ro', dockReg.component, dockProps)
assert.equal(observers.length, observersBefore, 'no ResizeObserver is constructed when the API is missing')
const roRuns = flushFrames()
assert.ok(roRuns >= 2, 'at least two fallback measurements run without a ResizeObserver')
dom.rowWidth = 260
dom.childWidths = { continue: 50, release: 50, collapse: 24, manage: 24 }
flushFrames() // the last queued callback now sees a settled width
assert.deepEqual(
  chipKinds(render('measure-no-ro-after', dockReg.component, dockProps)),
  ['继续', '发版', 'collapse', 'manage'],
  'without a ResizeObserver the deferred pass still adopts the settled width',
)
// With a ResizeObserver present, observing + a manual fire must also re-measure.
ResizeObserverCtor = FakeResizeObserver
observers.length = 0
dom.rowWidth = 100
dom.childWidths = { continue: 40, release: 40, collapse: 20, manage: 20 }
resetFrames()
render('measure-ro', dockReg.component, dockProps)
const ro = observers[observers.length - 1]
assert.ok(ro && ro.targets.length === 1, 'the row is observed by a ResizeObserver when available')
flushFrames()
ro.fire()
const roChips = chipKinds(render('measure-ro', dockReg.component, dockProps))
assert.ok(roChips.length < 4, 'a ResizeObserver callback re-measures and sheds chips at the observed width')
assert.equal(roChips[0], '继续', 'the first phrase survives a ResizeObserver re-measure')

/* ---------------- folded pill must not pollute the per-id cache ---------------- */
const cacheFoldName = 'cache-fold'
dom.rowWidth = 300
dom.childWidths = { continue: 60, release: 60, collapse: 20, manage: 20, pill: 9999 }
resetFrames()
render(cacheFoldName, dockReg.component, dockProps)
flushFrames()
widthFit.reset()
// Fold the row through the real collapse chip, using the SAME render name so
// the hook cells / refs persist across the interaction.
byClass(render(cacheFoldName, dockReg.component, dockProps), 'dqp-chip-collapse')[0].props.onClick()
const foldedCacheTree = render(cacheFoldName, dockReg.component, dockProps)
const foldedCacheChips = byClass(foldedCacheTree, 'dqp-chip')
assert.equal(foldedCacheChips.length, 1, 'folded row renders one pill')
assert.ok(foldedCacheChips[0].props.className.includes('dqp-pill'), 'the single chip is the pill')
assert.equal(foldedCacheChips[0].props['data-dqp-phrase-id'], undefined, 'the pill carries no phrase id')
const foldMetrics = metricsRefOf(cacheFoldName)
assert.ok(foldMetrics, 'the measurement cache is a persistent useRef cell')
assert.ok(
  !Object.prototype.hasOwnProperty.call(foldMetrics.current.phrases, 'pill'),
  'the folded pill width is not cached under a phrase id',
)
assert.ok(
  !Object.values(foldMetrics.current.phrases).includes(9999),
  'no phrase is poisoned by the pill width',
)
// Re-expand via the pill's own handler; the persistent cache is exercised end-to-end.
foldedCacheChips[0].props.onClick()
dom.childWidths.continue = 60
dom.childWidths.release = 60
resetFrames()
const expandedTree = render(cacheFoldName, dockReg.component, dockProps)
flushFrames()
const expandedChips = byClass(expandedTree, 'dqp-chip')
assert.equal(expandedChips[0].props['data-dqp-phrase-id'], 'continue', 'the first chip is tagged with its phrase id')
assert.notEqual(expandedChips[0].props['data-dqp-phrase-id'], 'pill', 'the first chip is not tagged as the pill')
const expandedMetrics = metricsRefOf(cacheFoldName)
assert.ok(expandedMetrics, 'the measurement cache persists across folding / expanding')
assert.ok(
  !Object.values(expandedMetrics.current.phrases).includes(9999),
  'no phrase inherits the folded pill width after expanding',
)
// Behavioral check: at 130px the first phrase (60px) still fits while the
// trailing controls are shed. If the pill's 9999px had been cached under a
// phrase id, even the first chip would disappear.
dom.rowWidth = 130
resetFrames()
const narrowExpanded = render(cacheFoldName, dockReg.component, dockProps)
assert.equal(
  byClass(narrowExpanded, 'dqp-chip')[0]?.props['data-dqp-phrase-id'],
  'continue',
  'the first phrase still fits on its own width after expanding',
)

/* ---------------- cache is keyed by phrase.id across label/order/CRUD edits ---------------- */
const storageKey = 'dsh.quick-phrases.v1'
const originalList = JSON.parse(localStorage.getItem(storageKey))
const cacheName = 'cache-by-id'
dom.rowWidth = 400
dom.childWidths = { a: 30, b: 70, collapse: 20, manage: 20 }
resetFrames()
render(cacheName, dockReg.component, dockProps)
flushFrames()
widthFit.reset()
// The DOM tags every phrase chip with its stable id, so even after a label
// change / reorder / CRUD the chip must map to the correct id. The width
// probe is reset, so the rendered chip ids reflect the DOM-cache alignment.
let cacheChips = byClass(render(cacheName, dockReg.component, dockProps), 'dqp-chip')
assert.deepEqual(cacheChips.slice(0, 2).map((c) => c.props['data-dqp-phrase-id']), ['continue', 'release'], 'initial chips carry the seeded ids')

function setPhrases(list) {
  localStorage.setItem(storageKey, JSON.stringify(list))
  // The module caches the list; a storage event is the real-browser signal
  // that tells mounted rows to reload it (see usePhrases in client.js).
  for (const fn of storageListeners) fn({ key: storageKey })
}
// Change only a label: id stays, so the chip keeps the same id.
setPhrases([
  { id: 'continue', label: 'A', text: 'text-a', hidden: false },
  { id: 'release', label: 'B-NEW-LABEL', text: 'text-b', hidden: false },
])
resetFrames()
cacheChips = byClass(render(cacheName, dockReg.component, dockProps), 'dqp-chip')
assert.equal(cacheChips[1].props['data-dqp-phrase-id'], 'release', 'the chip follows the unchanged id after a label edit')
assert.equal(textOf(cacheChips[1]), 'B-NEW-LABEL', 'the new label shows on the same id')
// Swap order: chip ids must follow the reordered list, not DOM positions.
setPhrases([
  { id: 'release', label: 'B-NEW-LABEL', text: 'text-b', hidden: false },
  { id: 'continue', label: 'A', text: 'text-a', hidden: false },
])
resetFrames()
cacheChips = byClass(render(cacheName, dockReg.component, dockProps), 'dqp-chip')
assert.deepEqual(cacheChips.slice(0, 2).map((c) => c.props['data-dqp-phrase-id']), ['release', 'continue'], 'chip order follows the reordered list')
// Remove one and add a fresh id: no id reuse, no leaked width.
setPhrases([
  { id: 'release', label: 'B-NEW-LABEL', text: 'text-b', hidden: false },
  { id: 'new-id', label: 'C', text: 'text-c', hidden: false },
])
dom.childWidths['new-id'] = 45
resetFrames()
cacheChips = byClass(render(cacheName, dockReg.component, dockProps), 'dqp-chip')
assert.deepEqual(cacheChips.slice(0, 2).map((c) => c.props['data-dqp-phrase-id']), ['release', 'new-id'], 'chips follow the edited list with fresh ids')
// Restore the phrase list the original assertions expect.
localStorage.setItem(storageKey, JSON.stringify(originalList))
for (const fn of storageListeners) fn({ key: storageKey })
dom.rowWidth = 1000
dom.childWidths = {}
resetFrames()

/* ---------------- hiding: the whole row folds into one pill ---------------- */

// The measurement/fidelity sections above folded and expanded the shared row.
// Reset the serialized UI toggles so the original hiding assertions start clean.
localStorage.removeItem('dsh.quick-phrases.collapsed.v1')
widthFit.reset()

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
assert.equal(byClass(render('dock', dockReg.component, dockProps), 'dqp-chip').length, 4, 'the row comes back')

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
assert.equal(draftChips.length, 4, 'the peeked row shows every chip again')
draftChips[1].props.onClick()
assert.equal(submitted.length, 0, 'a non-empty draft is not sent over')
assert.deepEqual(inserted, ['提交，推送，发布新版本，更新到本地'], 'the release phrase is inserted at the caret')
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
  4,
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
assert.ok(byClass(render('dock', dockReg.component, dockProps), 'dqp-chip').length === 4, 'default position is under the composer')
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
assert.equal(byClass(topTree, 'dqp-chip').length, 4, 'the new row renders above the composer')
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
assert.equal(byClass(toolTree, 'dqp-chip').length, 4)

// Back to the default so the CRUD assertions below read the dock row.
placementPicker = selectById(render('manager', sectionReg.component, { t }), 'dqp-placement')
placementPicker.props.onChange({ target: { value: 'composer-dock' } })
assert.equal(placementStored(), 'composer-dock', 'the position can be switched back')
assert.equal(byClass(render('dock', dockReg.component, dockProps), 'dqp-chip').length, 4)

/* ---------------- manager: the three-state row mode and per-phrase hiding ---------------- */

const stored = () => JSON.parse(localStorage.getItem('dsh.quick-phrases.v1'))

let managerTree = render('manager', sectionReg.component, { t })
assert.equal(rowsOf(managerTree).length, 2, 'two default rows')

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
  4,
  'the default row mode renders all four chips',
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
  4,
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
  4,
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
  4,
  'the phrase chips and the fold chip stay next to the icon',
)

manageSelect().props.onChange({ target: { value: 'hidden' } })
assert.equal(manageStored(), 'hidden', 'the hidden entry persists to manage.v1')
const hiddenManageDock = render('dock-manage-hidden', dockReg.component, dockProps)
assert.equal(byClass(hiddenManageDock, 'dqp-chip-manage').length, 0, 'hidden mode renders no manage chip')
assert.equal(
  byClass(hiddenManageDock, 'dqp-chip').length,
  3,
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
assert.equal(byClass(render('dock-hidden', dockReg.component, dockProps), 'dqp-chip').length, 3, 'a hidden phrase loses its chip')
assert.equal(rowsOf(render('manager', sectionReg.component, { t })).length, 2, 'the hidden row stays in the manager')
assert.ok(
  walk(render('manager', sectionReg.component, { t })).some(
    (n) => n.type === 'div' && String(n.props.className ?? '').includes('dqp-row-muted'),
  ),
  'the hidden row is dimmed',
)
managerTree = render('manager', sectionReg.component, { t })
click(managerTree, 'dqp-eye', 0)
assert.equal(stored()[0].hidden, false, 'the eye toggle shows the phrase again')
assert.equal(byClass(render('dock-shown', dockReg.component, dockProps), 'dqp-chip').length, 4)

/* ---------------- manager: add / edit / reorder / delete / reset ---------------- */

assert.equal(rowsOf(managerTree).length, 2, 'two default rows')

function click(tree, className, index = 0) {
  const buttons = byClass(tree, className)
  assert.ok(buttons[index], 'button ' + className + '[' + index + '] exists')
  buttons[index].props.onClick()
}

click(managerTree, 'dqp-btn-primary') // add
assert.equal(stored().length, 3, 'add appends a row')
assert.equal(stored()[2].label, '')

managerTree = render('manager', sectionReg.component, { t })
const rows = rowsOf(managerTree)
assert.equal(rows.length, 3)
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
  ['发版', '继续吧'],
  'move up swaps order',
)

// The edited row shows a live chip preview and a character count.
managerTree = render('manager', sectionReg.component, { t })
const firstRow = rowsOf(managerTree)[0]
const preview = walk(firstRow).find((n) => String(n.props?.className ?? '').includes('dqp-preview'))
assert.ok(preview, 'each row previews its chip caption')
assert.equal(textOf(preview), '发版', 'the preview uses the stored label')
assert.ok(
  textOf(firstRow).includes(t('manager.chars').replace('{n}', String(stored()[0].text.length))),
  'the row reports the sent-text length',
)

// Drag-and-drop reorder: grab the last row's grip and drop it on the first row.
managerTree = render('manager', sectionReg.component, { t })
let dragRows = rowsOf(managerTree)
const grip = walk(dragRows[2]).find((n) => String(n.props?.className ?? '') === 'dqp-grip')
assert.ok(grip && grip.props.draggable === true, 'each row has a drag handle')
grip.props.onDragStart({ dataTransfer: { setData() {}, effectAllowed: '' } })
dragRows[0].props.onDrop({ preventDefault() {} })
assert.equal(stored().at(0).label, '', 'dropping a row on the first position moves it there')

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
const labels = byClass(dockTree3, 'dqp-chip').slice(0, 2).map((c) => textOf(c))
assert.deepEqual(labels, ['发版', ''], 'dock order follows the list')

/* ---------------- restore defaults ---------------- */

managerTree = render('manager', sectionReg.component, { t })
assert.equal(stored().length, 2, 'list is two rows before reset')
buttonByText(managerTree, t('manager.reset')).props.onClick() // first click arms the confirm
managerTree = render('manager', sectionReg.component, { t })
assert.ok(
  walk(managerTree).some((n) => typeof n === 'string' && n === t('manager.resetConfirm')),
  'confirm label appears after the first click',
)
buttonByText(managerTree, t('manager.resetConfirm')).props.onClick() // second click resets
assert.equal(stored().length, 2, 'reset restores the two defaults')
assert.deepEqual(
  stored().map((p) => p.label),
  ['继续', '发版'],
  'reset restores default labels',
)
assert.equal(
  stored()[1].text,
  '提交，推送，发布新版本，更新到本地',
  'reset restores the release four-step text',
)

/* ---------------- language follows the host seat, with navigator fallback ---------------- */

const ALL_SEVEN = {
  zh: '提交，推送，发布新版本，更新到本地',
  en: 'Commit, push, publish the new version, then update locally',
  es: 'Haz commit, haz push, publica la nueva versión y actualiza tu copia local',
  fr: 'Fais un commit, pousse-le, publie la nouvelle version puis mets à jour en local',
  de: 'Committen, pushen, neue Version veröffentlichen und lokal aktualisieren',
  ru: 'Закоммитить, запушить, опубликовать новую версию и обновить локальную копию',
  pt: 'Commite, dê push, publique a nova versão e atualize localmente',
}
for (const [lang, text] of Object.entries(ALL_SEVEN)) {
  assert.equal(dictsSeen[0][lang]['default.release.text'], text, lang + ' four-step release text')
}

// Fresh VM per language: module-level phrase state starts empty, so seeding uses
// exactly the language source under test (host t first, navigator.language second).
function freshSeed({ language, tKeys }) {
  const box = { console, navigator: { language }, window: {
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    setTimeout: () => 1, clearTimeout() {}, addEventListener() {}, removeEventListener() {},
  }, require: (n) => n === 'react' ? React : (() => { throw new Error(n) })() }
  box.window.__ModuleLoader__ = { load(spec) { box._spec = spec } }
  vm.createContext(box); vm.runInContext(SOURCE, box, { filename: 'client.js' })
  const plug = box._spec.factory(box.require)
  const regs = []
  plug.apply({ effect(fn) { fn(); return () => {} }, locale: {
    register(ns, dicts) { box._dicts = dicts; return () => {} }, bind() { return () => '' },
  }, slots: { entries: () => [], inject(k, i) { i() }, register(o, c) { regs.push({ o, c }); return () => {} } } })
  const reg = regs.find((r) => r.o.name === 'conversation.composer.dock')
  const t = tKeys ? ((key) => box._dicts[tKeys][key] ?? key) : undefined
  const props = { inputActions: { setDraft() {} }, openManager: () => false }
  if (t) props.t = t
  const chips = byClass(render('fresh-' + language + '-' + tKeys, reg.c, props), 'dqp-chip')
  return { labels: chips.slice(0, 2).map((c) => textOf(c)), dict: box._dicts[tKeys || language.split('-')[0]] }
}
const deSeed = freshSeed({ language: 'de-DE' })
assert.deepEqual(deSeed.labels, [deSeed.dict['default.continue.label'], deSeed.dict['default.release.label']], 'navigator de-DE seeds German defaults')
const frSeed = freshSeed({ language: 'en-US', tKeys: 'fr' })
assert.deepEqual(frSeed.labels, [frSeed.dict['default.continue.label'], frSeed.dict['default.release.label']], 'host-bound French t wins over navigator en-US')
assert.equal(frSeed.dict['default.release.text'], ALL_SEVEN.fr, 'French four-step text matches')

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

const dockWithoutT = render('dock-without-t', dockReg.component, {
  inputActions: { setDraft: () => {} },
  openManager: () => false,
})
assert.ok(byClass(dockWithoutT, 'dqp-chip').length >= 3, 'dock renders without a t prop')
const managerWithoutT = render('manager-without-t', sectionReg.component, {})
assert.ok(rowsOf(managerWithoutT).length >= 1, 'manager renders without a t prop')

/* ---------------- narrow screens: nothing is shed from the manager ----------------
 * The fake React sandbox cannot apply CSS media queries, so completeness is
 * checked on the render tree (which is what the narrow CSS styles) and the
 * @media (max-width:560px) block is checked to keep every class rule that
 * lays those elements out. Key selectors only — no brittle whole-block string. */

const cssStyleNodes = (tree) => walk(tree).filter((n) => n.type === 'style')
const style = cssStyleNodes(render('manager-css', sectionReg.component, { t }))[0]
assert.ok(style, 'the manager embeds its own stylesheet')
const managerCss = String(style.children.join(''))
const mediaStart = managerCss.indexOf('@media (max-width:560px)')
assert.ok(mediaStart >= 0, 'the manager CSS has a 560px narrow-screen media query')
// Take the text from @media to the stylesheet end: the narrow block is last.
const narrowCss = managerCss.slice(mediaStart)
const cssHas = (fragment, why) =>
  assert.ok(narrowCss.includes(fragment), 'narrow CSS keeps ' + why)
for (const [fragment, why] of [
  ['.dqp-page{padding:', 'the tightened page padding'],
  ['.dqp-head{flex-wrap:wrap', 'the wrapping masthead'],
  ['.dqp-desc{overflow-wrap:anywhere}', 'the wrapping description'],
  ['.dqp-option{display:flex;flex-direction:row', 'the label + dropdown single row'],
  ['.dqp-option-hint{flex:1 1 100%', 'the full explanation on its own line'],
  ['.dqp-select-wrap{flex:0 0 44%', 'the 44%-wide dropdown'],
  ['.dqp-select{width:100%;min-width:0;height:36px', 'the 36px dropdown'],
  ['.dqp-btn{height:auto;min-height:36px', 'the 36px section buttons'],
  ['.dqp-section-title{flex:1 1 100%', 'the full-width section title'],
  ['.dqp-section-head .dqp-btn{flex:1 1 auto', 'the two buttons sharing a row'],
  ['.dqp-row-head{flex-wrap:wrap', 'the wrapping phrase card head'],
  ['.dqp-label-input{flex:1 1 100%', 'the full-width name input'],
  ['.dqp-row-actions{margin-left:auto', 'the action row'],
  ['.dqp-icon{width:36px;height:36px}', 'the 36px touch targets'],
  ['.dqp-icon-confirm{width:auto;min-width:36px', 'the 36px confirm target'],
  ['.dqp-textarea{min-height:52px', 'the taller textarea'],
  ['.dqp-preview{display:block', 'the wrapping preview'],
  ['white-space:normal;overflow-wrap:anywhere}', 'the unwrapped preview text'],
  ['.dqp-foot,.dqp-star{line-height:17px;overflow-wrap:anywhere}', 'the wrapping footer and star line'],
  ['.dqp-star-link{min-height:36px', 'the 36px star link'],
]) {
  cssHas(fragment, why)
}
assert.ok(!/\bdisplay\s*:\s*none\b/.test(narrowCss), 'no element is hidden by the narrow CSS')

// Small-screen render tree: every option keeps label + hint + select, every row
// keeps its name input, four controls, textarea, preview and character count.
// Render through a fresh store so this assertion does not depend on prior state.
const narrowTree = render('narrow-manager', sectionReg.component, { t })
const nodes = walk(narrowTree)
const classesOf = (node) => String(node.props?.className ?? '').split(/\s+/)
const hasClass = (node, cls) => classesOf(node).includes(cls)

const optionBlocks = nodes.filter((n) => hasClass(n, 'dqp-option'))
assert.equal(optionBlocks.length, 5, 'all five option blocks render on a narrow screen')
for (const id of ['dqp-placement', 'dqp-click', 'dqp-rowmode', 'dqp-manage', 'dqp-autohide']) {
  const select = nodes.find((n) => n.type === 'select' && n.props.id === id)
  assert.ok(select, 'dropdown #' + id + ' is present in the narrow render tree')
  const block = optionBlocks.find((b) => walk(b).includes(select))
  assert.ok(block, 'dropdown #' + id + ' sits inside an option block')
  assert.ok(
    walk(block).some((n) => hasClass(n, 'dqp-option-label') && n.props.htmlFor === id),
    'dropdown #' + id + ' keeps its label',
  )
  assert.ok(
    walk(block).some((n) => hasClass(n, 'dqp-option-hint') && textOf(n).length > 0),
    'dropdown #' + id + ' keeps its full explanation text',
  )
  assert.ok(walk(block).some((n) => hasClass(n, 'dqp-select-wrap')), 'dropdown #' + id + ' keeps its control wrapper')
}

const narrowRows = rowsOf(narrowTree)
assert.ok(narrowRows.length >= 2, 'phrase cards render on a narrow screen')
for (const [i, row] of narrowRows.entries()) {
  const rowNodes = walk(row)
  assert.ok(
    rowNodes.some((n) => n.type === 'input' && hasClass(n, 'dqp-label-input')),
    'narrow phrase card ' + i + ' keeps its name input',
  )
  for (const cls of ['dqp-eye', 'dqp-icon']) {
    assert.ok(
      rowNodes.filter((n) => n.type === 'button' && hasClass(n, cls)).length >= 1,
      'narrow phrase card ' + i + ' keeps its visibility toggle / move / delete buttons (' + cls + ')',
    )
  }
  // Four actions: eye, up, down, delete (the danger class marks delete).
  assert.equal(
    rowNodes.filter((n) => n.type === 'button' && hasClass(n, 'dqp-icon')).length,
    4,
    'narrow phrase card ' + i + ' keeps all four action buttons',
  )
  assert.equal(
    rowNodes.filter((n) => n.type === 'button' && hasClass(n, 'dqp-icon-danger')).length,
    1,
    'narrow phrase card ' + i + ' keeps the delete button',
  )
  assert.ok(
    rowNodes.some((n) => n.type === 'textarea' && hasClass(n, 'dqp-textarea')),
    'narrow phrase card ' + i + ' keeps its textarea',
  )
  assert.ok(
    rowNodes.some((n) => hasClass(n, 'dqp-preview')),
    'narrow phrase card ' + i + ' keeps its preview',
  )
  assert.ok(
    textOf(row).includes(t('manager.chars').replace('{n}', String(stored()[i].text.length))),
    'narrow phrase card ' + i + ' keeps its character count',
  )
}

assert.ok(
  nodes.some((n) => hasClass(n, 'dqp-badge') && textOf(n).includes(String(narrowRows.length))),
  'the header count badge is present on a narrow screen',
)
assert.ok(
  nodes.some((n) => hasClass(n, 'dqp-section-title') && textOf(n) === t('manager.phrases')),
  'the section title is present on a narrow screen',
)
assert.ok(
  nodes.some((n) => n.type === 'button' && textOf(n).trim() === t('manager.reset')),
  'the restore-defaults button is present on a narrow screen',
)
assert.ok(
  nodes.some((n) => n.type === 'button' && textOf(n).trim() === '+ ' + t('manager.add')),
  'the add-phrase button is present on a narrow screen',
)
assert.ok(
  nodes.some((n) => hasClass(n, 'dqp-foot') && textOf(n).includes(t('manager.savedHint')) && textOf(n).includes(t('manager.tip'))),
  'the full saved/tip footer is present on a narrow screen',
)
assert.ok(
  nodes.some((n) => hasClass(n, 'dqp-star') && textOf(n).includes(t('manager.starHint'))),
  'the star hint is present on a narrow screen',
)
assert.ok(
  nodes.some((n) => n.type === 'a' && hasClass(n, 'dqp-star-link') && textOf(n).includes(t('manager.starLink'))),
  'the star link is present on a narrow screen',
)

console.log('PASS — click-to-send, dock chips, width-fit shedding, folding, three-state row mode, complete hiding, manage entry modes, per-phrase hiding, manager CRUD, reorder, persistence, reset and settings jump behave')
console.log('PASS — narrow-screen manager keeps every dropdown, label, hint, phrase control, preview, count, footer and star link, with a matching @media (max-width:560px) rule set')
