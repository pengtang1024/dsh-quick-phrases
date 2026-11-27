# 实现说明

这份文档写给要继续改 `client.js` 的人：它怎么挂进 DSH、数据放在哪、以及哪些约束不能碰。

## 插件形态

DSH 的插件是「bundle」：一个 npm 包 + 一行 Cordis patch。本仓库的 Host 侧是空壳，所有能力都在客户端：

| 文件 | 作用 |
| --- | --- |
| `index.js` | `export function apply() {}` —— Host 侧不注册任何东西 |
| `cordis.patch.yml` | 把 `dsh-quick-phrases` 插入到 bundle 列表 |
| `client.js` | 客户端插件：`window.__ModuleLoader__.load({ id, factory })` |
| `locale/{zh,en}.json` | 插件管理器详情页的标题 / 描述 / 详情文档路径 |
| `icon.svg` | 插件列表图标 |
| `index.json` | 插件市场索引（format 1），让 Discover 能搜到并安装本插件 |

`package.json` 里声明 `dsh.client.platform = "web"`、`immediately: true`、`inject: ["@deepseek-ai/dsh-client-ui-conversation"]`；`dsh.bundle.patch` 指向 patch 文件。`engines.dsh` 声明兼容的 DSH 版本，市场索引与 `plugin_manager` 用它判断可装性。没有构建步骤，改完 `client.js` 让渲染进程重载即可。

## 客户端入口

`factory(require)` 返回一个 Cordis 风格的插件对象：

```js
return {
  inject: ['slots', 'locale'],
  apply(ctx) {
    ctx.effect(() => ctx.locale.register(NS, DICTS))   // 中英文字典，返回清理函数
    ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({...}, Component))
    ...
  },
}
```

- `require('react')` 取的是 DSH 浏览器端的 React，不需要打包。
- 所有注册都放进 `apply`，用 `ctx.slots.inject` 等待插槽出现；插槽消失时框架会自动调用注册返回的清理函数。
- 组件不能往 `document.body` 追加东西，也不能读别的插件的 DOM。

## 插槽

| 插槽 | 用途 | 注册参数 |
| --- | --- | --- |
| `conversation.composer.dock` | 输入卡片下方一整行（默认位置） | `id: quick-phrases-dock`、`order: 5` |
| `conversation.input.dock` | 输入卡片上方一整行 | `id: quick-phrases-top`、`order: -10`（排在排队条、待办面板之上） |
| `conversation.input.right` | 工具行右侧紧凑控件 | `id: quick-phrases-tool`、`order: -5` |
| `settings.section` | 设置页里的「快捷短语」 | `id: quick-phrases`、`order: 26`、`label: () => t('section.title')` |
| `settings.section.icon` | 设置侧栏字形 | 与 section 同 `id`，可选 |

三个短语行**都会注册**，但组件先跑完所有 hook、再判断「当前选中的是不是我」，不是就 `return null`。这样切位置只是一次重渲染，hook 顺序也保持稳定。

`conversation.*` 作用域的组件会拿到框架给的标准 props：`inputActions`（`setDraft` / `insertText` / `submit` …）、`useInput`、`sessionId` 等。`settings.section` 的组件拿到 `ownerProps.close`。`locale: NS` 会给组件合成一个 `t` prop；如果 locale 座位缺失（比如别的宿主版本），`resolveT()` 会退回内置字典，避免整条插槽崩掉。

## 数据层

七个 store 都是模块级状态 + `localStorage`，不经过 Host：

| store | 存储键 | 读写 |
| --- | --- | --- |
| 短语列表 | `dsh.quick-phrases.v1` | `normalize()` 清洗 → `persist()` 写回 → `emit()` 通知订阅者 |
| 显示位置 | `dsh.quick-phrases.placement.v1` | 校验非法值，坏值回落默认 |
| 点按行为 | `dsh.quick-phrases.click.v1` | 同上 |
| 整排收起 | `dsh.quick-phrases.collapsed.v1` | `'1'` / `'0'`，缺省 `'0'` |
| 自动收起选项 | `dsh.quick-phrases.autohide.v1` | `'fold'` / `'keep'`，缺省 `'fold'` |
| 整排彻底隐藏 | `dsh.quick-phrases.hidden.v1` | `'1'` / `'0'`，缺省 `'0'`；`'1'` 时三个位置都不渲染 |
| 管理入口 | `dsh.quick-phrases.manage.v1` | `'text'` / `'icon'` / `'hidden'`，缺省 `'text'`；`hidden` 时行尾不渲染管理按钮 |

整排收起 / 自动收起 / 整排彻底隐藏 / 管理入口这四个都用同一个工厂 `makeEnumStore(key, values, fallback, label)` 造出来：读取时白名单外的值一律回落 fallback，写入前也做同样校验，所以旧版本留下的脏值或手改的 `localStorage` 不会让界面进入未定义状态。新增一个类似开关时优先复用它，不要再手写第三份 read/ensure/set/use（显示位置 / 点按行为两处仍是手写实现）。

设置页的「短语行显示」下拉**没有自己的存储键**：`rowModeOf(hidden, collapsed)` 按 `hidden → 'hidden'`、`collapsed → 'pill'`、否则 `'full'` 推导当前值；`setRowMode(mode)` 组合写两个既有键（`hidden` 优先，选 `full` / `pill` 时先清 `hidden`），所以旧版本、多窗口和「收起」chip 写下的状态始终是同一份真相。

`usePhrases()` / `usePlacement()` / `useClickMode()` / `useCollapsed()` / `useAutoHide()` / `useHidden()` / `useManageEntry()` 是 `useState` + `subscribe` 的小包装，同时监听 `storage` 事件，多窗口之间也能同步。首次使用时按当前界面语言写入四条默认短语。

短语条目里除了 `id` / `label` / `text` 还有一个 `hidden` 布尔值（`normalize()` 缺成 `false`）。短语行渲染前会滤掉 `hidden === true` 的条目，管理页则照常渲染并用 `dqp-row-muted` 变暗、加「已隐藏」徽标。

可见性判断也在 `DockChips` 里，顺序固定：先把 hook 全部跑完（数量不随状态变化），再依次判断位置、彻底隐藏、折叠、宽度降级：

```
if (current !== spec.value) return null   // 只有选中位置的那一行渲染
if (hidden) return null                   // 彻底隐藏：什么都不渲染，连胶囊都不留
hasDraft = draft.trim() !== '' || attachments > 0
folded   = collapsed || (autoHide === 'fold' && hasDraft && !peeked)
plan     = fitRowToWidth(available, {...}) // 只在未折叠时按可用宽度决定渲染哪些控件
```

`hidden` 优先于折叠：即使之前用「收起」写过 `collapsed='1'`，隐藏后也不会冒出胶囊。设置页下拉选「显示整排」时同时 `setHidden(false)` 与 `setCollapsed(false)`，直接回到整排；选「收成胶囊」写 `hidden='0'`、`collapsed='1'`；选「彻底隐藏」只写 `hidden='1'`。

### 宽度降级（按实际宽度逐级舍弃）

短语行不再靠固定 px 断点，而是测「实际可用宽度」后动态舍弃控件：

- `ResizeObserver` 观察整行节点，`measure()` 读 `node.clientWidth` 并缓存每个胶囊的实测宽度（`metricsRef`）；没有该 API 或没有 DOM 时每次渲染仍兜底测量一遍，拿不到宽度就渲染整排（安全降级）。
- 被舍弃的胶囊保留其缓存宽度，否则丢一个后下一帧估算成 0px 会让行来回抖动。
- 无 DOM 的纯函数 `fitRowToWidth(available, options)` 计算存活方案 `{ phraseCount, collapse, manage }`：先算当前总占用（各胶囊宽 + 间距），超宽时按固定优先级舍弃——**收起按钮（`.dqp-chip-collapse`）→ 管理按钮（`.dqp-chip-manage`）→ 短语从末尾往前逐个（`phraseCount--`）**；**第一条可用短语永不丢弃**，一条短语都没有时收起与管理仍可达。管理入口设为 `hidden` 时 `manage` 从一开始就是 `false`。
- 宽度来源有两条：真实 DOM 测量（`metricsRef.current.available`），或测试探针 `widthFitProbe.available`；短语宽度同理，优先探针、其次 DOM 缓存、最后按标题字数估算（工具行封顶 130px，普通行 200px）。窗口变宽后同一套规则会把控件自动加回来。
- 窄屏自动舍弃是纯渲染层行为，不写任何 `localStorage` 键、不新增设置项；三态 full/pill/hidden、自动收起 / peek、单条隐藏、管理入口三态等既有行为不变。「收起」在窄屏不可见时，仍可通过草稿自动收起或设置页「短语行显示 = 收成胶囊」折叠整排，管理入口不可见时仍可从设置页进入。

管理入口在同一个 `DockChips` 里按 `manage.v1` 渲染：`text` 是原来的「管理」文字 chip，`icon` 是同样点击行为的齿轮 `svg`（`aria-label` 仍取 `dock.manage`），`hidden` 连按钮都不渲染。三种模式都不影响短语 chips、「收起」chip 和管理页本身；`hidden` 模式下宽度拟合的 `plan.manage` 恒为 `false`，不再为已隐藏的入口预留宽度。

`peeked` 是组件内部的临时状态：点胶囊时置 `true` 并同时展开（`setCollapsed(false)`），这样"临时看一眼"不会写进 `localStorage`，草稿清空后 `useEffect` 会把它清掉。手动收起（`setCollapsed(true)`）是持久状态，跨会话保留。

点按逻辑在 `DockChips` 里：

1. 取当前会话的 `useInput` 快照，看草稿是否为空、有没有附件；
2. 草稿非空或带附件 → `inputActions.insertText(text, inputActions.captureInsertion())`，插到光标处；
3. 否则按点按行为：`setDraft(text)` + `submit()`，或只 `setDraft(text)`。

折叠不影响第 1 步：胶囊展开后草稿还在，点按照样走 2。

## 样式

每个组件自带一段 `<style>`，随组件卸载消失，不污染全局。所有颜色、圆角、焦点环都走宿主 token：

- 文字：`--dsw-alias-label-primary` / `-secondary` / `-tertiary` / `-caption`
- 背景与边框：`--dsw-alias-bg-base` / `bg-layer-*`、`--dsw-alias-border-l*`、`settings-card-fill`、`interactive-bg-hover`
- 主按钮：`--dsw-alias-button-primary-fill` + `--dsw-alias-label-primary-foreground`（与宿主 `Button` 的 primary 变体一致，深浅主题都对得上）
- 焦点：`--dsw-focus-ring-width` / `--dsw-focus-ring-color`

不要写死颜色，也不要用 `prefers-color-scheme` 判断主题——DSH 用 `data-ds-dark-theme` 切换，硬编码会两边都对不上。

短语行的宽度拟合相关样式：`DOCK_CSS` 里 `.dqp-dock` 用 `display:flex; flex-wrap:wrap; gap:6px; min-width:0`，`.dqp-chip` 是 `flex:0 0 auto` 并带 `max-width`（普通行 200px / 工具行 130px）——胶囊不收缩、超出就换行，实测宽度才稳定可缓存；`CHIP_GAP = 6` 与 CSS 的 `gap:6px` 保持一致，拟合计算才和实际占用对得上。工具行 `.dqp-dock-tool` 另有 `flex-wrap:nowrap; overflow-x:auto`，窄屏在滚动之上仍先按上述顺序舍弃控件。

「输入框上方」的位置需要复制宿主 dock 的几何，否则会贴在会话栏左缘：

```css
width: calc(100% - 2 * var(--dsh-composer-side-clearance) - 2 * var(--dsh-composer-dock-inset));
max-width: calc(var(--dsh-composer-card-max-width) - 2 * var(--dsh-composer-dock-inset));
margin: 0 auto;
```

## 测试

`test/smoke.mjs` 把真实的 `client.js` 放进 `vm` 沙箱，用最小假 React（按组件名分配 hook 单元）和假 ModuleLoader 跑起来，直接调组件自己的 `onClick` / `onChange`，断言落在 `localStorage` 和渲染树上的结果。改行为时先改这里——它是唯一能在没有宿主的情况下验证「显示与发送分离」「位置切换」「拖动排序」「收起与隐藏」是否还成立的护栏。

与收起/隐藏相关的断言：点「收起」写入 `collapsed.v1='1'` 且只剩 `.dqp-pill`；点胶囊回到 `'0'` 并恢复六个 chip；草稿出现时默认折成胶囊、展开后点第二条仍插到光标处；`autohide` 切到 `keep` 后草稿不再折叠；`#dqp-rowmode` 默认 `full`、选 `pill` 写 `collapsed='1'` 且 dock 只剩一个 `.dqp-pill`、选 `hidden` 写 `hidden='1'` 且整排组件返回 `null`（连胶囊都没有）、hidden 时改选 `pill` 会清掉 `hidden` 并折回胶囊、再选 `full` 把两个键都写成 `'0'` 并恢复六个 chip；管理页在 hidden 时显示「整排已隐藏」徽标与恢复提示。`#dqp-manage` 默认 `text`（显示「管理」chip）、`icon` 渲染含 `svg` 且无文字、`aria-label` 仍是「管理」、`hidden` 时行尾没有管理 chip 但短语 chips 照常渲染，且三态分别持久化到 `manage.v1`。隐藏一条后短语行少一个 chip、管理页仍是四张卡片且第一张带 `dqp-row-muted`；字典还有一条 zh/en 键集合完全对称的断言。

与宽度降级相关的断言走测试探针 `window.__DQP_WIDTH_FIT__`（`fit` 纯函数 + `setAvailableWidth` / `setChipWidths` / `setTrailingWidths` 注入宽度 + `reset` 复位；沙箱没有 DOM / ResizeObserver，由探针代替真实测量）：纯函数 `fit` 依次覆盖**四级**——够宽全部保留 → 稍窄先丢 `collapse` → 更窄丢 `manage` → 再窄短语从末尾往前逐个减少 → 极窄只剩 1 个短语且两个尾部控件都没了；另测 `manage:false` 入参恒不渲染管理、无短语时收起与管理仍可达。DOM 渲染段用探针固定每个胶囊宽度，按几个宽度档位（渲染名前缀 `wf-`）断言存活 chip 的数量与顺序，末尾 `reset()` 恢复真实测量。

`test/preview.mjs` 把组件渲染成静态 HTML，拼上宿主主题 CSS，可用无头 Chromium 截图，用来肉眼核对深浅两套主题；它还会渲染「整排完全隐藏」的管理页状态和三态短语行 / 三态管理入口的状态页（`/tmp/dqp-modes-*.html`），并断言隐藏时短语行序列化出来是空字符串；另有一组「窄屏宽度降级」预览（宽 / 中 / 窄 / 极窄四档），便于肉眼核对舍弃顺序。`docs/images/` 下的图就是它产出的**界面示意图**（图内带「界面示意图」标题），不是真机截屏。

## 兼容性注意

- 插件只依赖 `slots` / `locale` 两个宿主服务，以及会话组件自带的标准 props；宿主升级时优先检查这两个契约。
- 存储结构一旦变更要升版本键（`…v1` → `…v2`）并写迁移，别原地改字段含义。
- 组件文案必须走字典（`DICTS.zh` / `DICTS.en`），中文英文键要一一对称；测试会读到 `t` 座位缺失的情况。
