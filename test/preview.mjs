// Static preview for dsh-quick-phrases — renders the real manager component and
// the real chip row to HTML, styles them with the host's own design tokens, and
// writes dark + light pages to /tmp so a headless browser can screenshot them.
//
//   node test/preview.mjs            # writes /tmp/dqp-{dark,light}.html
//   node test/preview.mjs --shot     # also screenshots with headless chromium
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const PKG = path.resolve(HERE, '..')
const SOURCE = fs.readFileSync(path.join(PKG, 'client.js'), 'utf8')

// Host assets are only needed for the themed screenshots; HTML output works without them.
const ASAR = process.env.DQP_ASAR || '/opt/DSH NEXT/resources/app.asar/node_modules/@deepseek-ai'
const THEME_CSS = path.join(ASAR, 'dsh-client-ui-theme/src/styles/design-platform.css')
// Chromium: explicit env first, then the Playwright browser cache, else skip screenshots.
function findChrome() {
  const cache = path.join(process.env.HOME || '', '.cache', 'ms-playwright')
  try {
    for (const dir of fs.readdirSync(cache).sort().reverse()) {
      if (!dir.startsWith('chromium')) continue
      for (const sub of ['chrome-linux64/chrome', 'chrome-linux/chrome']) {
        const candidate = path.join(cache, dir, sub)
        if (fs.existsSync(candidate)) return candidate
      }
    }
  } catch (error) {
    // No Playwright cache: screenshots stay skipped.
  }
  return ''
}
const CHROME = process.env.DQP_CHROME || process.env.CHROME_PATH || findChrome()

/* ---------------- loader + fake React (same shape as the smoke test) ---------------- */

const storage = new Map()
const localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
}

const stores = new Map()
let cells = []
let cursor = 0
function render(name, component, props) {
  cells = stores.get(name) ?? []
  stores.set(name, cells)
  cursor = 0
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

const plugin = loaded[0].factory(sandbox.require)

const registrations = []
const dicts = []
const t = (key) => dicts[0]?.zh?.[key] ?? key
const ctx = {
  effect: (fn) => fn(),
  locale: {
    register: (ns, dict) => (dicts.push({ ns, ...dict }), () => {}),
    bind: () => t,
  },
  slots: {
    entries: () => [],
    inject: (key, install) => install(),
    register: (options, component) => (registrations.push({ options, component }), () => {}),
  },
}
plugin.apply(ctx)

const manager = registrations.find((r) => r.options.name === 'settings.section').component
const dock = registrations.find((r) => r.options.id === 'quick-phrases-dock').component

/* ---------------- serializer ---------------- */

const VOID = new Set(['input', 'br', 'img', 'hr', 'meta', 'link'])
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const kebab = (k) => k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())
const styleText = (obj) =>
  Object.entries(obj)
    .filter(([, v]) => v != null && v !== false)
    .map(([k, v]) => kebab(k) + ':' + v)
    .join(';')

const SKIP = new Set(['key', 'onClick', 'onChange', 'onInput', 'onKeyDown', 'spellCheck', 'ref', 'dangerouslySetInnerHTML'])

function serialize(node) {
  if (node == null || node === false || node === true) return ''
  if (typeof node === 'string' || typeof node === 'number') return esc(node)
  if (Array.isArray(node)) return node.map(serialize).join('')
  const { type, props, children } = node
  const attrs = []
  let value = null
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false || SKIP.has(k)) continue
    if (k === 'value') { value = v; continue }
    if (k === 'className') { attrs.push('class="' + esc(v) + '"'); continue }
    if (k === 'style') { attrs.push('style="' + esc(styleText(v)) + '"'); continue }
    if (k === 'disabled') { if (v) attrs.push('disabled'); continue }
    attrs.push(k + '="' + esc(v) + '"')
  }
  if (type === 'input' && value != null) attrs.push('value="' + esc(value) + '"')
  const inner = type === 'textarea' ? esc(value ?? '') : type === 'input' ? '' : children.map(serialize).join('')
  if (VOID.has(type)) return '<' + type + ' ' + attrs.join(' ') + '>'
  return '<' + type + ' ' + attrs.join(' ') + '>' + inner + '</' + type + '>'
}

/* ---------------- pages ---------------- */

const themeCss = fs.existsSync(THEME_CSS)
  ? fs.readFileSync(THEME_CSS, 'utf8')
  : '/* theme tokens not found — set DQP_ASAR to the host app.asar node_modules/@deepseek-ai */'
const managerHtml = serialize(render('manager', manager, { t }))

/* The completely hidden row must leave the page empty; the manager dropdown is
   the only way back, so render that state too instead of trusting it blind. */
function collectNodes(node, out = []) {
  if (node == null || typeof node !== 'object') return out
  if (Array.isArray(node)) {
    node.forEach((child) => collectNodes(child, out))
    return out
  }
  out.push(node)
  ;(node.children ?? []).forEach((child) => collectNodes(child, out))
  return out
}
const manageProps = { t }
const selectById = (id) =>
  collectNodes(render('preview-manager', manager, manageProps)).find(
    (n) => n.type === 'select' && n.props.id === id,
  )
const rowModeSelect = () => selectById('dqp-rowmode')
const manageSelect = () => selectById('dqp-manage')
assert.ok(rowModeSelect(), 'the manager offers a row-mode dropdown')
assert.ok(manageSelect(), 'the manager offers a manage-entry dropdown')
const dockStub = { t, inputActions: { setDraft() {} }, openManager: () => true }

rowModeSelect().props.onChange({ target: { value: 'hidden' } })
const hiddenManagerHtml = serialize(render('preview-manager-hidden', manager, manageProps))
const hiddenDockHtml = serialize(render('preview-dock-hidden', dock, dockStub))
assert.equal(hiddenDockHtml, '', 'a completely hidden row renders nothing at all')

// The three row modes and the three manage entries each get a state to look at.
const buttonsByClass = (tree, className) =>
  collectNodes(tree).filter(
    (n) => n.type === 'button' && String(n.props?.className ?? '').includes(className),
  )
rowModeSelect().props.onChange({ target: { value: 'pill' } })
const pillDockTree = render('preview-dock-pill', dock, dockStub)
const pillButtons = buttonsByClass(pillDockTree, 'dqp-chip')
assert.equal(pillButtons.length, 1, 'the folded row keeps one expand pill')
assert.ok(pillButtons[0].props.className.includes('dqp-chip-icon'), 'the pill is an icon pill')
assert.equal(pillButtons[0].props['aria-label'], t('dock.expandHint'), 'the pill keeps its accessible name')
assert.ok(collectNodes(pillDockTree).some((n) => n.type === 'svg'), 'the pill renders an svg')
const pillDockHtml = serialize(pillDockTree)
rowModeSelect().props.onChange({ target: { value: 'full' } })
const fullDockTree = render('preview-dock-full', dock, dockStub)
assert.equal(buttonsByClass(fullDockTree, 'dqp-chip-collapse').length, 1, 'the full row keeps the fold chip')
const collapseBtn = buttonsByClass(fullDockTree, 'dqp-chip-collapse')[0]
assert.equal(collapseBtn.props['aria-label'], t('dock.collapseHint'), 'the fold chip keeps its accessible name')
assert.ok(collectNodes(collapseBtn).some((n) => n.type === 'svg'), 'the fold chip renders an svg')
const fullDockHtml = serialize(fullDockTree)

assert.equal(manageSelect().props.value, 'text', 'the manage entry defaults to the stored text value')
manageSelect().props.onChange({ target: { value: 'icon' } })
const manageIconTree = render('preview-dock-manage-icon', dock, dockStub)
assert.equal(buttonsByClass(manageIconTree, 'dqp-chip-manage').length, 1, 'the icon manage entry keeps one button')
assert.ok(collectNodes(manageIconTree).some((n) => n.type === 'svg'), 'the icon manage entry renders an svg')
assert.equal(
  buttonsByClass(manageIconTree, 'dqp-chip-manage')[0].props['aria-label'],
  t('dock.manage'),
  'the icon manage entry keeps its accessible name',
)
const manageIconDockHtml = serialize(manageIconTree)
manageSelect().props.onChange({ target: { value: 'hidden' } })
const manageHiddenTree = render('preview-dock-manage-hidden', dock, dockStub)
assert.equal(buttonsByClass(manageHiddenTree, 'dqp-chip-manage').length, 0, 'the hidden manage entry renders no manage chip')
assert.equal(buttonsByClass(manageHiddenTree, 'dqp-chip').length, 5, 'the phrases and the fold chip still render')
const manageHiddenDockHtml = serialize(manageHiddenTree)
manageSelect().props.onChange({ target: { value: 'text' } }) // back to the default for the pages below

const PAGE_CSS = `
  html, body { margin: 0; padding: 0; }
  body {
    background: var(--dsw-alias-bg-base, #1a1a1a);
    color: var(--dsw-alias-label-primary, #eee);
    font: 13px/20px "Noto Sans CJK SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
    padding: 20px;
  }
  .stage { max-width: 720px; }
  .stage + .stage { margin-top: 18px; }
  .stage-label { font-size: 12px; color: var(--dsw-alias-label-caption, #7d7d7d); margin: 0 0 8px; }
`

for (const dark of [true, false]) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${themeCss}</style><style>${PAGE_CSS}</style></head>
<body${dark ? ' data-ds-dark-theme' : ''}>
<p class="stage-label">界面示意图 · 管理页（${dark ? '深色' : '浅色'}）</p>
<div class="stage">
${managerHtml}
</div></body></html>`
  const file = '/tmp/dqp-' + (dark ? 'dark' : 'light') + '.html'
  fs.writeFileSync(file, html)
  console.log('wrote', file, html.length + ' bytes')
}

/* Manager page in the hidden state: the status badge and the restore hint. */
for (const dark of [true, false]) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${themeCss}</style><style>${PAGE_CSS}</style></head>
<body${dark ? ' data-ds-dark-theme' : ''}>
<p class="stage-label">界面示意图 · 管理页（整排已隐藏，${dark ? '深色' : '浅色'}）</p>
<div class="stage">
${hiddenManagerHtml}
</div></body></html>`
  const file = '/tmp/dqp-hidden-' + (dark ? 'dark' : 'light') + '.html'
  fs.writeFileSync(file, html)
  console.log('wrote', file, html.length + ' bytes')
}

/* Row-mode / manage-entry showcase: the three visibility states of the row and
   the three manage entries, so the new dropdowns can be eyeballed. */
for (const dark of [true, false]) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${themeCss}</style><style>${PAGE_CSS}
    body { padding: 16px; }
    .composer { max-width: 640px; border-radius: 22px; padding: 14px 16px 10px; background: var(--dsw-alias-bg-layer-1, #262626); box-shadow: inset 0 0 0 .5px var(--dsw-alias-border-l2, #444); }
    .line { height: 34px; color: var(--dsw-alias-label-caption, #7d7d7d); }
    .status { display: flex; align-items: center; gap: 10px; margin-top: 6px; font-size: 12px; color: var(--dsw-alias-label-caption, #7d7d7d); }
  </style></head>
<body${dark ? ' data-ds-dark-theme' : ''}>
<p class="stage-label">界面示意图 · 短语行显示：显示整排（${dark ? '深色' : '浅色'}）</p><div class="composer"><div class="line">发消息或创建任务，/ 调用指令，@ 文件或对话</div>
<div class="status"><span>3 轮 114 步 · 120 tok/s</span><span style="margin-left:auto"></span>${fullDockHtml}</div></div>
<p class="stage-label">界面示意图 · 短语行显示：收成胶囊</p><div class="composer"><div class="line">发消息或创建任务，/ 调用指令，@ 文件或对话</div>
<div class="status"><span>3 轮 114 步 · 120 tok/s</span><span style="margin-left:auto"></span>${pillDockHtml}</div></div>
<p class="stage-label">界面示意图 · 短语行显示：彻底隐藏（这里什么都不渲染，连胶囊都没有）</p><div class="composer"><div class="line">发消息或创建任务，/ 调用指令，@ 文件或对话</div>
<div class="status"><span>3 轮 114 步 · 120 tok/s</span><span style="margin-left:auto"></span>${hiddenDockHtml}</div></div>
<p class="stage-label">界面示意图 · 管理入口：齿轮图标</p><div class="composer"><div class="line">发消息或创建任务，/ 调用指令，@ 文件或对话</div>
<div class="status"><span>3 轮 114 步 · 120 tok/s</span><span style="margin-left:auto"></span>${manageIconDockHtml}</div></div>
<p class="stage-label">界面示意图 · 管理入口：隐藏（短语行仍然可用）</p><div class="composer"><div class="line">发消息或创建任务，/ 调用指令，@ 文件或对话</div>
<div class="status"><span>3 轮 114 步 · 120 tok/s</span><span style="margin-left:auto"></span>${manageHiddenDockHtml}</div></div>
</body></html>`
  const file = '/tmp/dqp-modes-' + (dark ? 'dark' : 'light') + '.html'
  fs.writeFileSync(file, html)
  console.log('wrote', file)
}

/* Chips-only page: same row, in both themes, for a close look at the composer surface. */
{
  const dockHtmlForChips = serialize(render('dock', dock, { t, inputActions: { setDraft() {} }, openManager: () => true }))
  const draftDockProps = {
    t,
    inputActions: { setDraft() {} },
    openManager: () => true,
    useInput: (sel) => sel({ draft: '帮我补一下这段说明', attachmentIds: [] }),
  }
  const dockHtmlFolded = serialize(render('dock-folded', dock, draftDockProps))
  const chips = `<!doctype html><html><head><meta charset="utf-8"><style>${themeCss}</style><style>${PAGE_CSS}
    body { padding: 16px; }
    .composer { max-width: 640px; border-radius: 22px; padding: 14px 16px 10px; background: var(--dsw-alias-bg-layer-1, #262626); box-shadow: inset 0 0 0 .5px var(--dsw-alias-border-l2, #444); }
    .composer + .stage-label { margin-top: 18px; }
    .line { height: 34px; color: var(--dsw-alias-label-caption, #7d7d7d); }
    .status { display: flex; align-items: center; gap: 10px; margin-top: 6px; font-size: 12px; color: var(--dsw-alias-label-caption, #7d7d7d); }
  </style></head>
<body><p class="stage-label">界面示意图 · 短语行（深色 / 浅色）</p><div class="composer"><div class="line">发消息或创建任务，/ 调用指令，@ 文件或对话</div>
<div class="status"><span>3 轮 114 步 · 120 tok/s</span><span style="margin-left:auto"></span>${dockHtmlForChips}</div></div>
<p class="stage-label">界面示意图 · 输入框有草稿时自动收起</p><div class="composer"><div class="line">帮我补一下这段说明</div>
<div class="status"><span>3 轮 114 步 · 120 tok/s</span><span style="margin-left:auto"></span>${dockHtmlFolded}</div></div>
<p class="stage-label">界面示意图 · 整排完全隐藏（这里什么都不渲染，连胶囊都没有）</p><div class="composer"><div class="line">发消息或创建任务，/ 调用指令，@ 文件或对话</div>
<div class="status"><span>3 轮 114 步 · 120 tok/s</span><span style="margin-left:auto"></span>${hiddenDockHtml}</div></div></body></html>`
  for (const dark of [true, false]) {
    const file = '/tmp/dqp-chips-' + (dark ? 'dark' : 'light') + '.html'
    fs.writeFileSync(file, chips.replace('<body>', '<body' + (dark ? ' data-ds-dark-theme' : '') + '>'))
    console.log('wrote', file)
  }
}

/* Stack page: below / above placements inside a composer stack, so the row can be
   checked against the card's own width the way the host lays it out. */
{
  const topReg = registrations.find((r) => r.options.id === 'quick-phrases-top')
  const dockReg = registrations.find((r) => r.options.id === 'quick-phrases-dock')
  const managerReg = registrations.find((r) => r.options.name === 'settings.section')
  const props = { t, inputActions: { setDraft() {} }, openManager: () => true }
  const dockHtml2 = serialize(render('dock', dockReg.component, props))
  // Only the selected placement renders, so switch it through the manager's own
  // control instead of poking at module state.
  const managerTree = render('preview-manager', managerReg.component, { t })
  let placementSelect = null
  ;(function walk(node) {
    if (node == null || typeof node !== 'object') return
    if (Array.isArray(node)) return node.forEach(walk)
    if (node.type === 'select' && node.props?.id === 'dqp-placement') placementSelect = node
    ;(node.children ?? []).forEach(walk)
  })(managerTree)
  assert.ok(placementSelect, 'the manager offers a position dropdown')
  placementSelect.props.onChange({ target: { value: 'input-dock' } })
  const topHtml = serialize(render('top', topReg.component, props))
  // The real InputBar card is `width:100%; max-width: var(--dsh-composer-card-max-width)`.
  const CARD = `<div style="width:100%;max-width:var(--dsh-composer-card-max-width);
    margin:0 auto;box-sizing:border-box;padding:14px 16px 10px;border-radius:22px;
    background:var(--dsw-alias-bg-layer-1,#262626);box-shadow:inset 0 0 0 .5px var(--dsw-alias-border-l2,#444)">
    <div style="color:var(--dsw-alias-label-caption,#7d7d7d);font-size:13px">发消息或创建任务，/ 调用指令，@ 文件或对话</div>
    <div style="display:flex;gap:10px;margin-top:12px;color:var(--dsw-alias-label-caption,#7d7d7d);font-size:12px">＋ ⓘ 完全权限 · PUA<span style="margin-left:auto">DeepSeek V4.1 Flash Max</span></div>
  </div>`
  const stackCss = `
    .col { width: 900px; box-sizing: border-box; display: flex; flex-direction: column; gap: 6px;
      --dsh-composer-card-max-width: 700px; --dsh-composer-side-clearance: 16px; --dsh-composer-dock-inset: 8px;
      padding: 10px 0; }
    .col-label { font-size: 11px; color: var(--dsw-alias-label-caption,#7d7d7d); }
  `
  const page = (dark) => `<!doctype html><html><head><meta charset="utf-8"><style>${themeCss}</style><style>${PAGE_CSS}${stackCss}</style></head>
<body${dark ? ' data-ds-dark-theme' : ''}>
<p class="stage-label">界面示意图 · 输入框下方（当前默认）</p>
<div class="col">${CARD}${dockHtml2}</div>
<p class="stage-label">界面示意图 · 输入框上方（inset 对齐卡片）</p>
<div class="col">${topHtml}${CARD}</div>
</body></html>`
  for (const dark of [true, false]) {
    const file = '/tmp/dqp-stack-' + (dark ? 'dark' : 'light') + '.html'
    fs.writeFileSync(file, page(dark))
    console.log('wrote', file)
  }
}

if (process.argv.includes('--shot')) {
  const shots = [
    ['/tmp/dqp-dark.html', '/tmp/dqp-dark.png', '760,1190'],
    ['/tmp/dqp-light.html', '/tmp/dqp-light.png', '760,1190'],
    ['/tmp/dqp-chips-dark.html', '/tmp/dqp-chips-dark.png', '700,300'],
    ['/tmp/dqp-chips-light.html', '/tmp/dqp-chips-light.png', '700,300'],
    ['/tmp/dqp-stack-dark.html', '/tmp/dqp-stack-dark.png', '980,460'],
    ['/tmp/dqp-stack-light.html', '/tmp/dqp-stack-light.png', '980,460'],
    ['/tmp/dqp-hidden-dark.html', '/tmp/dqp-hidden-dark.png', '760,700'],
    ['/tmp/dqp-hidden-light.html', '/tmp/dqp-hidden-light.png', '760,700'],
  ]
  const chromeMissing = !fs.existsSync(CHROME)
  if (chromeMissing) {
    console.log('skip screenshots: no chrome at ' + CHROME + ' (set DQP_CHROME to a chromium binary)')
  }
  for (const [html, out, size] of chromeMissing ? [] : shots) {
    execFileSync(CHROME, [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      '--force-device-scale-factor=2',
      '--window-size=' + size,
      '--virtual-time-budget=2000',
      '--screenshot=' + out,
      'file://' + html,
    ], { stdio: 'inherit' })
    console.log('shot', out)
  }
}
