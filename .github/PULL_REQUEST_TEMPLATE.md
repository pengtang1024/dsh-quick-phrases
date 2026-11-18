# 变更说明

<!-- 一句话说清这个 PR 改了什么、为什么改；界面变化请附上截图或说明。 -->

## 关联 issue

<!-- 例如 Closes #12 / Fixes #34；没有就写「无」。 -->

Closes #

## 变更类型

- [ ] 缺陷修复（fix）
- [ ] 新功能 / 行为变更（feat）
- [ ] 文档 / 文案（docs）
- [ ] 重构 / 清理（refactor、chore，无行为变化）

## 验证清单

- [ ] `node --check client.js` 通过
- [ ] `node --check index.js` 通过
- [ ] `node test/smoke.mjs` 通过
- [ ] `package.json` 与 `locale/*.json` 仍是合法 JSON
- [ ] 涉及界面改动时，附上了预览截图（深色 / 浅色至少各一张）

<details>
<summary>本地验证命令</summary>

```bash
node --check client.js
node --check index.js
node test/smoke.mjs
node -e "for (const f of ['package.json','locale/zh.json','locale/en.json']) JSON.parse(require('fs').readFileSync(f,'utf8'))"
```

无需 `npm install`：本插件没有运行时依赖与构建步骤，Node >= 20 即可。

</details>

## 是否影响已存数据

<!-- 以下 localStorage 键按 DSH 的 Web 端存储隔离保存在本机浏览器里。 -->

- [ ] 不影响已存数据（只改渲染、样式或文案）
- [ ] 影响 `dsh.quick-phrases.v1`（短语列表）：已在说明里写清迁移方式或兼容处理
- [ ] 影响 `dsh.quick-phrases.placement.v1`（显示位置）
- [ ] 影响 `dsh.quick-phrases.click.v1`（点按行为）
- [ ] 其它键 / 存储方式：<!-- 请补充 -->

> 改了键名、数据形状或默认值时，请说明旧数据如何读取、读不出来时如何回退到默认值。

## 文档是否同步

- [ ] `docs/DETAIL.md` 已更新（行为、位置、管理页操作有变化时）
- [ ] `docs/DETAIL.en.md` 已同步（与中文版保持一致）
- [ ] `CHANGELOG.md` 已按版本追加条目
- [ ] 本次不需要改文档（纯内部改动或修复笔误）

## 补充说明

<!-- 截图对比、已知限制、后续计划等。 -->
