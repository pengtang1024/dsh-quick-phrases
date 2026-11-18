// Static preview for dsh-quick-phrases — renders the real manager component and
// the real chip row to HTML, styles them with the host's own design tokens, and
// writes dark + light pages to /tmp so a headless browser can screenshot them.
//
//   node test/preview.mjs            # writes /tmp/dqp-{dark,light}.html
//   node test/preview.mjs --shot     # also screenshots with headless chromium
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const PKG = path.resolve(HERE, '..')
const SOURCE = fs.readFileSync(path.join(PKG, 'client.js'), 'utf8')

const ASAR = '/opt/DSH NEXT/resources/app.asar/node_modules/@deepseek-ai'
const THEME_CSS = path.join(ASAR, 'dsh-client-ui-theme/src/styles/design-platform.css')
const CHROME = '/home/pt/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome'

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

const themeCss = fs.readFileSync(THEME_CSS, 'utf8')
const managerHtml = serialize(render('manager', manager, { t }))
const dockHtml = serialize(render('dock', dock, { t, inputActions: { setDraft() {} }, openManager: () => true }))

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
<body${dark ? ' data-ds-dark-theme' : ''}><div class="stage">
<p class="stage-label">settings.section — 管理页（${dark ? '深色' : '浅色'}）</p>
${managerHtml}
</div><div class="stage">
<p class="stage-label">conversation.composer.dock — 短语行</p>
<div style="background:var(--dsw-alias-bg-layer-1,#222);border-radius:12px;padding:10px 12px">${dockHtml}</div>
</div></body></html>`
  const file = '/tmp/dqp-' + (dark ? 'dark' : 'light') + '.html'
  fs.writeFileSync(file, html)
  console.log('wrote', file, html.length + ' bytes')
}

/* Chips-only page: same row, in both themes, for a close look at the composer surface. */
{
  const dockHtmlForChips = serialize(render('dock', dock, { t, inputActions: { setDraft() {} }, openManager: () => true }))
  const chips = `<!doctype html><html><head><meta charset="utf-8"><style>${themeCss}</style><style>${PAGE_CSS}
    body { padding: 16px; }
    .composer { max-width: 640px; border-radius: 22px; padding: 14px 16px 10px; background: var(--dsw-alias-bg-layer-1, #262626); box-shadow: inset 0 0 0 .5px var(--dsw-alias-border-l2, #444); }
    .line { height: 34px; color: var(--dsw-alias-label-caption, #7d7d7d); }
    .status { display: flex; align-items: center; gap: 10px; margin-top: 6px; font-size: 12px; color: var(--dsw-alias-label-caption, #7d7d7d); }
  </style></head>
<body><div class="composer"><div class="line">发消息或创建任务，/ 调用指令，@ 文件或对话</div>
<div class="status"><span>3 轮 114 步 · 120 tok/s</span><span style="margin-left:auto"></span>${dockHtmlForChips}</div></div></body></html>`
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
  const segButtons = []
  ;(function walk(node) {
    if (node == null || typeof node !== 'object') return
    if (Array.isArray(node)) return node.forEach(walk)
    if (String(node.props?.className ?? '').includes('dqp-seg-item')) segButtons.push(node)
    ;(node.children ?? []).forEach(walk)
  })(managerTree)
  segButtons[1].props.onClick()
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
      padding: 10px 0; outline: 1px dashed rgba(128,128,128,.3); }
    .col-label { font-size: 11px; color: var(--dsw-alias-label-caption,#7d7d7d); }
  `
  const page = (dark) => `<!doctype html><html><head><meta charset="utf-8"><style>${themeCss}</style><style>${PAGE_CSS}${stackCss}</style></head>
<body${dark ? ' data-ds-dark-theme' : ''}>
<p class="stage-label">输入框下方（当前默认）</p>
<div class="col">${dockHtml2}${CARD}</div>
<p class="stage-label">输入框上方（inset 对齐卡片）</p>
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
    ['/tmp/dqp-dark.html', '/tmp/dqp-dark.png', '780,820'],
    ['/tmp/dqp-light.html', '/tmp/dqp-light.png', '780,820'],
    ['/tmp/dqp-chips-dark.html', '/tmp/dqp-chips-dark.png', '700,180'],
    ['/tmp/dqp-chips-light.html', '/tmp/dqp-chips-light.png', '700,180'],
    ['/tmp/dqp-stack-dark.html', '/tmp/dqp-stack-dark.png', '980,460'],
    ['/tmp/dqp-stack-light.html', '/tmp/dqp-stack-light.png', '980,460'],
  ]
  for (const [html, out, size] of shots) {
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
