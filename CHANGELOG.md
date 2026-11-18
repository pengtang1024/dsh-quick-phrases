# 变更记录

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
