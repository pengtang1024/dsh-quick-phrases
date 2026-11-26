# 变更记录

## 0.9.2

- **补齐支持版本与分类的用户可见声明**：README 安装前置与七语插件卡片元数据明确标注支持的 DSH SemVer 范围 `^0.2.2-rc.3`（0.2.2-rc.3 起、0.3.0 之前）与分类「界面增强 / UI Enhancements」；经核对市场索引的权威字段（`versions[].engines.dsh`、`metadata.categories.ui`、`metadata.category: ui`）已完整合法，未作改动。

## 0.9.1

- **修复设置页说明文字被裁剪**：五项选项的说明文字不再被单行省略号截断，改为自然换行完整显示；宽屏与 390 小屏下均完整可见、无横向溢出。

## 0.9.0

- **默认短语精简**：默认短语收敛为「继续」「发版」两条，短语行更清爽。
- **发版按钮改为四步工作流**：发送内容改为本地化的「提交，推送，发布新版本，更新到本地」，中 / 英 / 西 / 法 / 德 / 俄 / 葡七语各有对应文案。
- **本地化自动跟随 DSH 当前语言**：优先使用宿主 locale seat 的 `t`，取不到时以 `navigator.language` 兜底并扩展到七语，无需手动选语言。
- 测试同步：`test/smoke.mjs` 覆盖七语文案与语言跟随，`test/preview.mjs` 同步发版按钮文案。

## 0.8.0

- **修复小屏设置页无法滚动**：去掉 `.dqp-page` 的嵌套滚动与不确定高度，改由宿主 `.options` 统一承担滚动，小屏上设置内容可以正常滚到底。
- **精工仪表风视觉重塑管理页**：快捷短语管理页整体换成精工仪表风——刻度化标签、紧凑卡片与细线分隔，视觉更统一；同步新增宽屏 / 小屏 / 滚动状态预览图。
- **求 star 提示与七语本地化**：设置页底部新增求 star 引导（提示文案 + GitHub 链接），中 / 英 / 西 / 法 / 德 / 俄 / 葡七种语言各 69 个 key，切换语言时文案同步；新增求 star 状态预览图。
- **按苹果设计理念压缩纵向占用**：收紧间距与行高、精简卡片留白，设置页整体更紧凑——宽屏纵向占用减少 26.4%、小屏减少 31.2%，减少来回滚动；同步新增紧凑版预览图。
- **求 star 指路文案**：诚实说明 GitHub 没有指向仓库 Star 按钮的官方深链 / 锚点，链接仍指向仓库主页，提示用户到主页右上角自行点 Star，不做无效的「直达按钮」承诺；同步更新预览图。
- **短语行图标化**：行尾「收起」与「管理」改为纯图标胶囊（收起箭头 / 齿轮），不再显示文字标签，文案只保留在 title / aria-label 供无障碍使用；收起后整排仅留一个展开图标胶囊，点按临时展开。同步新增展开 / 收起状态的界面预览图。

## 0.7.1

- **README 多语言与 star 提示**：README 顶部新增 7 种语言切换行（中 / 英 / 西 / 法 / 德 / 俄 / 葡），并补上给项目点 star 的引导提示。
- **locale 新增五种语言**：插件卡片元数据新增西班牙语、法语、德语、俄语、葡萄牙语五种语言，剔除日语，与 README 的语言覆盖保持一致。
- **docs 五种语言详情页**：新增西班牙、法、德、俄、葡五种语言的详情页，与既有中英详情页并列，方便非中英用户阅读。
- **补齐 Git Flow 与签名 tag 规范文档**：新增 Git Flow 分支模型说明与 SSH 签名 tag 规范文档，统一分支命名、发布流程与 tag 签名要求。

## 0.7.0

- **新增 Host Config 声明式元数据**：`index.js` 引入 `@deepseek-ai/schemastery`（`~3.19.0`），导出 `Config`，声明显示位置、点按行为、短语行显示、管理入口、输入框有内容时五项配置，取值的白名单与默认值与客户端现有下拉一一对应；`cordis.patch.yml` 同步补上五项默认配置。**诚实说明：这里的 `Config` 只是给插件管理器看的元数据，客户端包没有读取 Host 配置行的桥接，改这些值不会驱动客户端行为；实际行为仍需在「设置 → 快捷短语」里调整，由 localStorage 持久化。** 新增依赖已写入 `package.json` 的 `dependencies`。
- **修正 CSS 字符串拼接 bug**：`client.js` 的 `MANAGER_CSS` 中 `.dqp-foot` 一行末尾漏了 `+`，导致其后的样式定义被拼成一个无效 CSS 选择器、整段样式失效；补回 `+` 后字段与管理卡片样式恢复。
- **补齐配置项文档**：README、`docs/DETAIL.md` / `docs/DETAIL.en.md`、中英 `locale` 插件卡片描述新增五项配置的可选值、默认值与作用说明（选中即生效、无需重启）；`test/smoke.mjs`、`test/preview.mjs` 与既有行为保持不变，复跑全绿。

## 0.6.0

- **短语行三态下拉**：设置里原来的「显示短语行」开关换成 `短语行显示` 下拉，直接选 **显示整排** / **收成胶囊** / **彻底隐藏**。值由既有键推导（`hidden` 优先，其次 `collapsed`），切换时组合写 `dsh.quick-phrases.hidden.v1` 与 `dsh.quick-phrases.collapsed.v1`，**不新增第四套状态键**；选「彻底隐藏」时仍保留「整排已隐藏」徽标与恢复提示。
- **管理入口可配置**：新增 `管理入口` 下拉（新键 `dsh.quick-phrases.manage.v1`，值 `text` / `icon` / `hidden`，默认 `text`）：文字「管理」chip、齿轮 `svg` 图标（无障碍名称仍是「管理」，点击行为不变），或从行尾完全隐藏。隐藏后管理页仍从 **设置 → 快捷短语** 进入，下拉 hint 写明了这一点。
- 新存储键复用 `makeEnumStore`，读写白名单校验与旧键一致；「短语行显示」不占新键。
- 中英字典对称：新增 rowmode / manage 三组选项名与 hint，替换旧的 `manager.visible*` 键；`test/smoke.mjs` 增加 zh/en 键集合完全对称的断言。
- `test/smoke.mjs` 覆盖三态短语行（默认 full、pill 写 `collapsed='1'` 且只剩胶囊、hidden 写 `hidden='1'` 且整排为 `null`、full 把两键写回 `'0'` 并恢复六个 chip）与三态管理入口（text / icon 含 svg 且无文字 / hidden 无管理 chip 但短语 chips 仍在，分别持久化到 `manage.v1`）；原有收起、自动收起、单条隐藏用例保持通过。
- `test/preview.mjs` 跟着新的下拉渲染，新增 `/tmp/dqp-modes-*.html` 三态短语行 + 三态管理入口状态页；README、`docs/DETAIL*.md`、`docs/ARCHITECTURE.md` 同步。

## 0.5.0

- **整排可彻底隐藏**：设置里的「显示短语行」开关关掉后，短语行从界面**完全消失**——不再留小胶囊，也不占位，界面上什么都不显示。只有回到 **设置 → 快捷短语** 重新打开开关才恢复，开关旁标注「整排已隐藏」并说明恢复路径（中英对称）。
- **收起与彻底隐藏分开**：行尾「收起 ▾」和「输入框有内容时」的自动收起仍然把整排折成一个小胶囊，点胶囊展开；`hidden` 优先，彻底隐藏时连胶囊都不渲染。
- 存储新增 `dsh.quick-phrases.hidden.v1`（`1` / `0`，缺省 `0`）；重新打开开关时同时清掉 `collapsed`，直接回到整排。
- 渲染顺序固定为「先判是否本位置 → 再判 hidden → 再算折叠」，hook 数量不随状态变化。
- `test/smoke.mjs` 补彻底隐藏的往返断言；`test/preview.mjs` 增加「整排完全隐藏」的渲染；README、`docs/DETAIL*.md`、`docs/ARCHITECTURE.md` 同步。

## 0.4.0

- **整排可收起**：行尾新增「收起 ▾」，点一下整排缩成一个小胶囊「▸ 快捷短语」，点胶囊临时展开；管理页新增「显示短语行」开关，关掉后同样只剩胶囊。
- **输入框有内容时自动收起**：默认「自动收起」——草稿或附件一出现就缩成胶囊，草稿清空后自动展开；也可选「保持显示」。收起状态下展开点按钮，仍然插到光标处，不覆盖草稿。
- **单条短语可隐藏**：管理页每张卡片新增眼睛开关，隐藏后该按钮从短语行消失，卡片留在管理页、标上「已隐藏」并变暗，再点一次恢复。
- 存储新增 `dsh.quick-phrases.collapsed.v1` 与 `dsh.quick-phrases.autohide.v1`，短语条目新增 `hidden` 字段（旧数据缺省为 `false`，无需迁移）。
- 管理页、短语行与文档截图同步更新：示意图新增「输入框有草稿时自动收起」与四个设置项。

## 0.3.5

- 文档截图改成自说明的**界面示意图**：图内带「界面示意图」标题，README 与发布说明都注明不是真机截屏。
- 修正示意图里的布局：输入框下方一排现在画在卡片**下面**（之前错画在上面），并去掉调试用的虚线框。
- **修正「输入框下方」的对齐**：该位置的短语行现在也按宿主 dock 几何（`--dsh-composer-side-clearance` / `--dsh-composer-dock-inset`）计算宽度并居中，和「输入框上方」一样与卡片内边对齐，不再贴整列左缘。

## 0.3.4

- 文档与发布说明同步：README 的 npm / 市场 / 本地目录三种安装方式、CONTRIBUTING 的完整发布流程、`docs/ARCHITECTURE.md` 的 `index.json` 说明。
- 市场索引补上 `0.3.4` 版本，`0.3.3` 作为首次 npm 发布保留在版本列表里。

## 0.3.3

按 DSH 插件发布方式分发：

- **发布到 npm**：包名 `dsh-quick-phrases`（原 `@local/dsh-quick-phrases`），`publishConfig` 固定 npmjs 与 public，可直接 `dsh plugin --profile <name> add dsh-quick-phrases` 安装。
- **新增市场索引** `index.json`（format 1）：声明名称、中英简介、分类、关键词与 npm 版本，已通过 `@deepseek-ai/dsh-plugin-market-index` 的 `parseMarketIndex` 校验；加到 Discover 的 Index sources 即可搜索安装。
- **`engines.dsh`** 声明 `^0.2.2-rc.3`，市场与 `plugin_manager` 据此判断兼容性。
- README 增加 npm / 市场 / 本地目录三种安装方式；CONTRIBUTING 补完整发布流程（发布、索引、校验、tag 与复核）。

## 0.3.2

文档与开源配套（不改插件行为）：

- 新增 `LICENSE`（MIT）、`CONTRIBUTING.md`、`SECURITY.md`、`CODE_OF_CONDUCT.md`。
- 新增 GitHub 配套：Issue 表单、PR 模板、`.github/workflows/ci.yml`（`node --check` + smoke）。
- 新增 `.editorconfig`、`docs/ARCHITECTURE.md`（插槽 / 数据层 / 样式 / 测试说明）与 `docs/images/` 截图。
- 重写 `README.md`：功能、安装、位置与点按行为、数据与隐私、开发命令、目录结构。
- `test/smoke.mjs` 改为相对路径读取 `client.js`；`test/preview.mjs` 自动发现 Playwright Chromium，并可用 `DQP_CHROME` / `DQP_ASAR` 覆盖。
- `package.json` 补齐 `license` / `author` / `repository` / `homepage` / `bugs` / `keywords` / `engines`。

## 0.3.1

- **管理页重做**：两项行为设置收成紧凑下拉框（显示位置 / 点按短语时），不再各占一张卡片。
- **短语编辑器**：一条短语一张卡片——左侧手柄可直接拖动排序，显示名称就地编辑，下方发送内容自动撑高，底部实时显示按钮预览与字数。
- **删除防误触**：✕ 第一次只进入「确认」态，4 秒后自动撤回，再点一次才删除。
- **新增短语**：追加空卡片并自动聚焦到名称；「恢复默认」移到左侧，避免误触。
- 文档同步（`docs/DETAIL.md` / `docs/DETAIL.en.md`）。

## 0.3.0

- **点按即发送（默认）**：输入框为空且没有附件时，点一下短语按钮就直接把这条短语发出去；输入框里已有内容或附件时改为插到光标处，不会覆盖正在写的内容。
- **点按行为可选**：设置页新增「点按短语时」——「直接发送」/「填入输入框」，默认直接发送，选择存在 `dsh.quick-phrases.click.v1`。
- **显示位置可选**：短语行可以在「输入框下方（默认）」「输入框上方」「工具行右侧」之间切换，切换即时生效。
- **修正「输入框上方」对齐**：按宿主 dock 卡的几何（`--dsh-composer-card-max-width` / `--dsh-composer-side-clearance` / `--dsh-composer-dock-inset`）计算宽度并居中，胶囊左边缘与输入卡片文字内边对齐；同时排到排队条、待办面板之上，不再把它们和卡片拆开。
- **修正主按钮配色**：前景改用 `--dsw-alias-label-primary-foreground`（与宿主 primary 按钮一致），悬停不再抢回次级底色，删掉绕过 token 的 `prefers-color-scheme` 硬编码。

## 0.2.0

- 管理页：新增 / 编辑 / ↑↓ 调序 / 删除 / 恢复默认，即时保存。
- 「显示名称」与「发送内容」分开编辑。

## 0.1.0

- 首个版本：输入框下方一排短语按钮，点击写入当前会话草稿。
