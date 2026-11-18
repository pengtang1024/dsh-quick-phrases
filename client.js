/**
 * dsh-quick-phrases — client half.
 *
 * Two surfaces, one phrase list:
 * - A row of chips next to the composer (under it by default; the manager can
 *   move it above the card or into the tool row). Clicking a chip sends that
 *   phrase's 发送内容 (text) right away when the composer is empty, and
 *   inserts it at the caret otherwise; the manager can switch it to
 *   fill-only.
 * - `settings.section`: the management page (add / edit / delete / reorder,
 *   and the display position), where 显示名称 (label) and 发送内容 (text) are
 *   edited as separate fields.
 *
 * The list and the placement live in localStorage, so they are per browser
 * profile and survive restarts without a Host-side service. Keep this file
 * dependency-free: it is served verbatim to the Web page, there is no build step.
 */
window.__ModuleLoader__.load({
  id: 'dsh-quick-phrases',
  factory(require) {
    'use strict'

    var React = require('react')
    var h = React.createElement

    var NS = 'dsh-quick-phrases'
    var STORAGE_KEY = 'dsh.quick-phrases.v1'
    var PLACEMENT_KEY = 'dsh.quick-phrases.placement.v1'
    var CLICK_KEY = 'dsh.quick-phrases.click.v1'
    var SECTION_ID = 'quick-phrases'
    var DOCK_ORDER = 5
    var SECTION_ORDER = 26

    /**
     * Where the phrase row lives. Each value is one composer slot; the manager
     * writes the choice here and every registered row re-evaluates it, so the
     * row moves between slots without an extra round of registration.
     */
    var PLACEMENTS = [
      { slot: 'conversation.composer.dock', value: 'composer-dock', tag: 'dock', order: DOCK_ORDER, compact: false, inset: true, key: 'manager.placementDock' },
      // `dock` rows live in the composer stack, whose children stretch to the
      // whole column; the card itself is narrower. `inset: true` copies the
      // host's own dock geometry (QueueDock/TodoPanel) so the row lines up with
      // the card instead of hanging off the column's left edge.
      { slot: 'conversation.input.dock', value: 'input-dock', tag: 'top', order: -10, compact: false, inset: true, key: 'manager.placementTop' },
      { slot: 'conversation.input.right', value: 'tool-right', tag: 'tool', order: -5, compact: true, key: 'manager.placementTool' },
    ]
    var DEFAULT_PLACEMENT = PLACEMENTS[0].value

    /**
     * What a chip click does. `send` sends the phrase straight away when the
     * composer is empty (the shortcut case); `fill` only writes it into the
     * draft. Either way a draft that already has content is never thrown away.
     */
    var CLICK_MODES = ['send', 'fill']
    var DEFAULT_CLICK = 'send'

    var DICTS = {
      zh: {
        'section.title': '快捷短语',
        'section.description': '在输入框附近放一排短语按钮。按钮上显示的是「显示名称」，发送内容单独编辑，两者可以完全不同。下面的两项决定它出现在哪里、点一下会发生什么。',
        'dock.manage': '管理',
        'dock.openFailed': '请在「设置 — 快捷短语」中管理',
        'dock.tooltip': '写入输入框',
        'manager.add': '新增短语',
        'manager.phrases': '短语',
        'manager.count': '{n} 条',
        'manager.preview': '按钮预览',
        'manager.untitled': '未命名',
        'manager.chars': '{n} 字',
        'manager.drag': '拖动排序',
        'manager.deleteConfirm': '删除这条短语',
        'manager.deleteShort': '确认',
        'manager.reset': '恢复默认',
        'manager.resetConfirm': '再点一次确认',
        'manager.delete': '删除',
        'manager.moveUp': '上移',
        'manager.moveDown': '下移',
        'manager.placement': '显示位置',
        'manager.placementDock': '输入框下方',
        'manager.placementTop': '输入框上方',
        'manager.placementTool': '工具行右侧',
        'manager.placementHint': '切换后短语行会立刻移动到新位置。工具行右侧空间有限，超出的短语可以横向滚动。',
        'manager.clickMode': '点按短语时',
        'manager.clickSend': '直接发送',
        'manager.clickInsert': '填入输入框',
        'manager.clickHint': '「直接发送」在输入框为空时一次点按就发出这条短语；输入框里已有文字或附件时会改为插到光标处，不会覆盖你正在写的内容。',
        'manager.label': '显示名称',
        'manager.text': '发送内容',
        'manager.labelPlaceholder': '按钮上显示的文字，例如：提交',
        'manager.textPlaceholder': '点按按钮后写入输入框的内容，例如：提交改动并推送到远端',
        'manager.newPhrase': '新短语',
        'manager.empty': '列表是空的，先新增一条短语。',
        'manager.savedHint': '改动会自动保存并立即生效，无需重启。',
        'manager.tip': '拖动手柄或 ↑↓ 都能调整顺序，改动会自动保存。',
        'default.continue.label': '继续',
        'default.continue.text': '继续',
        'default.commit.label': '提交',
        'default.commit.text': '提交改动并推送到远端',
        'default.push.label': '推送',
        'default.push.text': '把本地提交推送到远端',
        'default.release.label': '发版',
        'default.release.text': '发布新版本',
      },
      en: {
        'section.title': 'Quick phrases',
        'section.description': 'A row of phrase chips next to the composer. A chip shows its display name while the text it inserts is edited separately. The two options below decide where it lives and what a click does.',
        'dock.manage': 'Manage',
        'dock.openFailed': 'Manage them in Settings — Quick phrases',
        'dock.tooltip': 'Insert into the composer',
        'manager.add': 'Add phrase',
        'manager.phrases': 'Phrases',
        'manager.count': '{n}',
        'manager.preview': 'Chip preview',
        'manager.untitled': 'Untitled',
        'manager.chars': '{n} chars',
        'manager.drag': 'Drag to reorder',
        'manager.deleteConfirm': 'Delete this phrase',
        'manager.deleteShort': 'Confirm',
        'manager.reset': 'Restore defaults',
        'manager.resetConfirm': 'Click again to confirm',
        'manager.delete': 'Delete',
        'manager.moveUp': 'Move up',
        'manager.moveDown': 'Move down',
        'manager.placement': 'Position',
        'manager.placementDock': 'Below the composer',
        'manager.placementTop': 'Above the composer',
        'manager.placementTool': 'Composer tool row',
        'manager.placementHint': 'The row moves as soon as you switch. The tool row is narrow, so long lists scroll sideways.',
        'manager.clickMode': 'On click',
        'manager.clickSend': 'Send right away',
        'manager.clickInsert': 'Fill the composer',
        'manager.clickHint': '“Send right away” fires the phrase with one click while the composer is empty; when it already holds text or attachments the phrase is inserted at the caret instead, so nothing you were writing is lost.',
        'manager.label': 'Display name',
        'manager.text': 'Sent text',
        'manager.labelPlaceholder': 'Chip caption, e.g. Commit',
        'manager.textPlaceholder': 'What the chip inserts, e.g. Commit the changes and push to the remote',
        'manager.newPhrase': 'New phrase',
        'manager.empty': 'The list is empty. Add one phrase to start.',
        'manager.savedHint': 'Changes save automatically and apply immediately.',
        'manager.tip': 'Drag the handle or use ↑↓ to reorder; edits are saved automatically.',
        'default.continue.label': 'Continue',
        'default.continue.text': 'Continue',
        'default.commit.label': 'Commit',
        'default.commit.text': 'Commit the changes and push to the remote',
        'default.push.label': 'Push',
        'default.push.text': 'Push local commits to the remote',
        'default.release.label': 'Release',
        'default.release.text': 'Release a new version',
      },
    }

    var DEFAULT_SPECS = [
      { id: 'continue', label: 'default.continue.label', text: 'default.continue.text' },
      { id: 'commit', label: 'default.commit.label', text: 'default.commit.text' },
      { id: 'push', label: 'default.push.label', text: 'default.push.text' },
      { id: 'release', label: 'default.release.label', text: 'default.release.text' },
    ]

    /* ------------------------------------------------------------------ *
     * Phrase store: module-level state shared by the dock and the manager.
     * ------------------------------------------------------------------ */

    var state = null
    var placement = null
    var clickMode = null
    var listeners = new Set()

    function uniqueId() {
      return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
    }

    function normalize(item, index) {
      if (item === null || typeof item !== 'object') return null
      var label = typeof item.label === 'string' ? item.label : ''
      var text = typeof item.text === 'string' ? item.text : ''
      if (label === '' && text === '') return null
      var id = typeof item.id === 'string' && item.id !== '' ? item.id : 'p' + index
      return { id: id, label: label, text: text }
    }

    function readStorage() {
      try {
        var raw = window.localStorage.getItem(STORAGE_KEY)
        if (raw === null) return null
        var parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) return null
        var out = []
        parsed.forEach(function (item, index) {
          var next = normalize(item, index)
          if (next !== null) out.push(next)
        })
        return out
      } catch (error) {
        console.warn('[quick-phrases] could not read stored phrases', error)
        return null
      }
    }

    function persist() {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      } catch (error) {
        console.warn('[quick-phrases] could not persist phrases', error)
      }
    }

    function emit() {
      listeners.forEach(function (listener) {
        try {
          listener()
        } catch (error) {
          console.warn('[quick-phrases] listener failed', error)
        }
      })
    }

    function seededPhrases(t) {
      return DEFAULT_SPECS.map(function (spec) {
        return { id: spec.id, label: t(spec.label), text: t(spec.text) }
      })
    }

    /** Seeds on first use: stored list wins, otherwise localized defaults. */
    function ensureSeeded(t) {
      if (state !== null) return state
      var stored = readStorage()
      state = stored === null ? seededPhrases(t) : stored
      if (stored === null) persist()
      return state
    }

    function replacePhrases(next) {
      state = next
      persist()
      emit()
    }

    function updatePhrase(index, patch) {
      if (state === null) return
      var next = state.slice()
      var current = next[index]
      if (current === undefined) return
      next[index] = {
        id: current.id,
        label: typeof patch.label === 'string' ? patch.label : current.label,
        text: typeof patch.text === 'string' ? patch.text : current.text,
      }
      replacePhrases(next)
    }

    function insertPhrase() {
      if (state === null) return null
      var id = uniqueId()
      replacePhrases(state.concat([{ id: id, label: '', text: '' }]))
      return id
    }

    function removePhrase(index) {
      if (state === null || state[index] === undefined) return
      replacePhrases(state.filter(function (_item, at) { return at !== index }))
    }

    function movePhrase(index, delta) {
      if (state === null) return
      var target = index + delta
      if (target < 0 || target >= state.length) return
      var next = state.slice()
      var moved = next[index]
      next[index] = next[target]
      next[target] = moved
      replacePhrases(next)
    }

    /** Drag-and-drop reorder: pull one entry out and drop it at `to`. */
    function movePhraseTo(from, to) {
      if (state === null) return
      if (from < 0 || to < 0 || from >= state.length || to >= state.length || from === to) return
      var next = state.slice()
      var moved = next.splice(from, 1)[0]
      next.splice(to, 0, moved)
      replacePhrases(next)
    }

    function resetPhrases(t) {
      replacePhrases(seededPhrases(t))
    }

    function subscribe(listener) {
      listeners.add(listener)
      return function () {
        listeners.delete(listener)
      }
    }

    /** Subscribes this component to the shared list and returns the current one. */
    function usePhrases(t) {
      var tick = React.useState(0)
      var setTick = tick[1]
      React.useEffect(function () {
        var unsubscribe = subscribe(function () {
          setTick(function (value) { return value + 1 })
        })
        function onStorage(event) {
          if (event.key !== STORAGE_KEY) return
          var stored = readStorage()
          if (stored !== null) state = stored
          setTick(function (value) { return value + 1 })
        }
        window.addEventListener('storage', onStorage)
        return function () {
          unsubscribe()
          window.removeEventListener('storage', onStorage)
        }
      }, [])
      return ensureSeeded(t)
    }

    /* ------------------------------------------------------------------ *
     * Placement store: which composer slot the row lives in.
     * ------------------------------------------------------------------ */

    function isPlacement(value) {
      for (var i = 0; i < PLACEMENTS.length; i += 1) {
        if (PLACEMENTS[i].value === value) return true
      }
      return false
    }

    function readPlacement() {
      try {
        var raw = window.localStorage.getItem(PLACEMENT_KEY)
        if (raw !== null && isPlacement(raw)) return raw
      } catch (error) {
        console.warn('[quick-phrases] could not read the stored placement', error)
      }
      return DEFAULT_PLACEMENT
    }

    function ensurePlacement() {
      if (placement !== null) return placement
      placement = readPlacement()
      return placement
    }

    function setPlacement(next) {
      if (!isPlacement(next) || next === ensurePlacement()) return
      placement = next
      try {
        window.localStorage.setItem(PLACEMENT_KEY, next)
      } catch (error) {
        console.warn('[quick-phrases] could not persist the placement', error)
      }
      emit()
    }

    /** Subscribes a component to the shared placement and returns the current one. */
    function usePlacement() {
      var tick = React.useState(0)
      var setTick = tick[1]
      React.useEffect(function () {
        var unsubscribe = subscribe(function () {
          setTick(function (value) { return value + 1 })
        })
        function onStorage(event) {
          if (event.key !== PLACEMENT_KEY) return
          placement = readPlacement()
          setTick(function (value) { return value + 1 })
        }
        window.addEventListener('storage', onStorage)
        return function () {
          unsubscribe()
          window.removeEventListener('storage', onStorage)
        }
      }, [])
      return ensurePlacement()
    }

    /* ------------------------------------------------------------------ *
     * Click store: send the phrase at once, or only fill it in.
     * ------------------------------------------------------------------ */

    function isClickMode(value) {
      return CLICK_MODES.indexOf(value) >= 0
    }

    function readClickMode() {
      try {
        var raw = window.localStorage.getItem(CLICK_KEY)
        if (raw !== null && isClickMode(raw)) return raw
      } catch (error) {
        console.warn('[quick-phrases] could not read the stored click mode', error)
      }
      return DEFAULT_CLICK
    }

    function ensureClickMode() {
      if (clickMode !== null) return clickMode
      clickMode = readClickMode()
      return clickMode
    }

    function setClickMode(next) {
      if (!isClickMode(next) || next === ensureClickMode()) return
      clickMode = next
      try {
        window.localStorage.setItem(CLICK_KEY, next)
      } catch (error) {
        console.warn('[quick-phrases] could not persist the click mode', error)
      }
      emit()
    }

    /** Subscribes a component to the shared click mode and returns the current one. */
    function useClickMode() {
      var tick = React.useState(0)
      var setTick = tick[1]
      React.useEffect(function () {
        var unsubscribe = subscribe(function () {
          setTick(function (value) { return value + 1 })
        })
        function onStorage(event) {
          if (event.key !== CLICK_KEY) return
          clickMode = readClickMode()
          setTick(function (value) { return value + 1 })
        }
        window.addEventListener('storage', onStorage)
        return function () {
          unsubscribe()
          window.removeEventListener('storage', onStorage)
        }
      }, [])
      return ensureClickMode()
    }

    /* ------------------------------------------------------------------ *
     * Styles: local to each component, removed on unmount.
     * ------------------------------------------------------------------ */

    var DOCK_CSS =
      '.dqp-dock{display:flex;align-items:center;flex-wrap:wrap;gap:6px;min-width:0;font-size:12px;line-height:18px;font-family:inherit}' +
      '.dqp-dock-tool{flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;max-width:min(50vw,460px);scrollbar-width:none;padding-bottom:1px}' +
      '.dqp-dock-tool::-webkit-scrollbar{display:none}' +
      '.dqp-chip{box-sizing:border-box;display:inline-flex;align-items:center;flex:0 0 auto;height:24px;max-width:200px;padding:0 10px;' +
      'border:.5px solid var(--dsw-alias-border-l2,#494949);border-radius:999px;background:var(--dsw-alias-bg-layer-1,rgba(255,255,255,.04));' +
      'color:var(--dsw-alias-label-secondary,#b9b9b9);font:inherit;font-size:12px;line-height:1;cursor:pointer;white-space:nowrap;' +
      'overflow:hidden;text-overflow:ellipsis;transition:background-color .12s ease,color .12s ease,border-color .12s ease}' +
      '.dqp-dock-tool .dqp-chip{height:22px;padding:0 8px;font-size:11px;max-width:130px}' +
      // Same geometry as the host dock cards above the composer (QueueDock /
      // TodoPanel): the stack stretches children to the whole column while the
      // input card is narrower and centred, so match the card's width, centre,
      // and cancel the stack gap the way an attached dock does.
      '.dqp-dock-inset{box-sizing:border-box;width:calc(100% - var(--dsh-composer-side-clearance,16px) - var(--dsh-composer-side-clearance,16px) - var(--dsh-composer-dock-inset,8px) - var(--dsh-composer-dock-inset,8px));' +
      'max-width:calc(var(--dsh-composer-card-max-width,952px) - var(--dsh-composer-dock-inset,8px) - var(--dsh-composer-dock-inset,8px));' +
      'margin:0 auto;padding:0 var(--dsh-composer-dock-inset,8px)}' +
      '.dqp-chip:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));color:var(--dsw-alias-label-primary,#eee);' +
      'border-color:var(--dsw-alias-border-l3,#5a5a5a)}' +
      '.dqp-chip:active{background:var(--dsw-alias-interactive-bg-hover-solid,rgba(255,255,255,.12))}' +
      '.dqp-chip:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary,#4c6fff));outline-offset:2px}' +
      '.dqp-chip-manage{color:var(--dsw-alias-label-tertiary,#9a9a9a);border-style:dashed;background:transparent}' +
      '.dqp-hint{color:var(--dsw-alias-state-warn-primary,#e0a33a);white-space:nowrap}'

    var MANAGER_CSS =
      '.dqp-page{box-sizing:border-box;height:100%;min-height:0;overflow-y:auto;display:flex;justify-content:center;' +
      'padding:24px clamp(20px,4vw,44px) 48px;font-family:inherit;color:var(--dsw-alias-label-primary,#eee)}' +
      '.dqp-inner{width:100%;max-width:760px;display:flex;flex-direction:column;gap:18px}' +
      '.dqp-head{display:flex;align-items:flex-start;gap:12px}' +
      '.dqp-head-text{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:4px}' +
      '.dqp-title{margin:0;font-size:16px;line-height:24px;font-weight:600}' +
      '.dqp-desc{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary,#b9b9b9)}' +
      '.dqp-badge{flex:0 0 auto;display:inline-flex;align-items:center;height:20px;padding:0 8px;border-radius:999px;' +
      'background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.05));color:var(--dsw-alias-label-tertiary,#9a9a9a);font-size:11px;line-height:1}' +
      '.dqp-options{display:flex;flex-direction:column;border:.5px solid var(--dsw-alias-border-l2,#494949);' +
      'border-radius:var(--dsw-radius-md,10px);background:var(--dsw-alias-settings-card-fill,transparent);overflow:hidden}' +
      '.dqp-option{display:flex;align-items:center;gap:16px;padding:10px 12px;border-top:.5px solid var(--dsw-alias-border-l1,#3a3a3a)}' +
      '.dqp-option:first-child{border-top:0}' +
      '.dqp-option-text{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:1px}' +
      '.dqp-option-label{font-size:12px;line-height:18px;color:var(--dsw-alias-label-primary,#eee)}' +
      '.dqp-option-hint{font-size:11px;line-height:16px;color:var(--dsw-alias-label-caption,#7d7d7d)}' +
      '.dqp-select-wrap{position:relative;flex:0 0 auto;display:inline-flex}' +
      '.dqp-select-wrap::after{content:"";position:absolute;right:10px;top:50%;width:6px;height:6px;margin-top:-4px;' +
      'border-right:1.4px solid var(--dsw-alias-label-tertiary,#9a9a9a);border-bottom:1.4px solid var(--dsw-alias-label-tertiary,#9a9a9a);' +
      'transform:rotate(45deg);pointer-events:none}' +
      '.dqp-select{box-sizing:border-box;height:28px;min-width:136px;padding:0 28px 0 10px;border:.5px solid var(--dsw-alias-border-l2,#494949);' +
      'border-radius:var(--dsw-radius-sm,8px);background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.05));' +
      'color:var(--dsw-alias-label-primary,#eee);font:inherit;font-size:12px;line-height:1;appearance:none;-webkit-appearance:none;cursor:pointer}' +
      '.dqp-select:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08))}' +
      '.dqp-select:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary,#4c6fff));outline-offset:1px}' +
      '.dqp-section{display:flex;flex-direction:column;gap:10px}' +
      '.dqp-section-head{display:flex;align-items:center;flex-wrap:wrap;gap:8px}' +
      '.dqp-section-title{flex:1 1 auto;margin:0;font-size:13px;line-height:20px;font-weight:600}' +
      '.dqp-btn{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:4px;height:28px;padding:0 12px;' +
      'border:.5px solid var(--dsw-alias-border-l2,#494949);border-radius:var(--dsw-radius-sm,8px);' +
      'background:var(--dsw-alias-bg-layer-1,rgba(255,255,255,.04));color:var(--dsw-alias-label-primary,#eee);' +
      'font:inherit;font-size:12px;line-height:1;cursor:pointer;' +
      'transition:background-color .12s ease,border-color .12s ease,color .12s ease}' +
      '.dqp-btn:not(.dqp-btn-primary):hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08))}' +
      '.dqp-btn:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary,#4c6fff));outline-offset:2px}' +
      '.dqp-btn-primary{border-color:transparent;background:var(--dsw-alias-button-primary-fill,#4c6fff);' +
      'color:var(--dsw-alias-label-primary-foreground,#fff)}' +
      '.dqp-btn-primary:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover,#3f5fe0)}' +
      '.dqp-btn-warn{color:var(--dsw-alias-state-warn-primary,#e0a33a);border-color:var(--dsw-alias-state-warn-primary,#e0a33a)}' +
      '.dqp-list{display:flex;flex-direction:column;gap:8px}' +
      '.dqp-row{display:flex;align-items:flex-start;gap:8px;padding:10px 12px 10px 6px;border:.5px solid var(--dsw-alias-border-l2,#494949);' +
      'border-radius:var(--dsw-radius-md,10px);background:var(--dsw-alias-settings-card-fill,transparent);' +
      'transition:border-color .12s ease,box-shadow .12s ease,opacity .12s ease}' +
      '.dqp-row:hover{border-color:var(--dsw-alias-border-l3,#5a5a5a)}' +
      '.dqp-row-dragging{opacity:.45}' +
      '.dqp-row-over{border-color:var(--dsw-alias-brand-primary,#4c6fff);box-shadow:0 0 0 1px var(--dsw-alias-brand-primary,#4c6fff)}' +
      '.dqp-grip{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;width:20px;height:28px;padding:0;' +
      'border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-caption,#7d7d7d);font:inherit;font-size:13px;' +
      'line-height:1;letter-spacing:-1px;cursor:grab;user-select:none}' +
      '.dqp-grip:hover{color:var(--dsw-alias-label-secondary,#b9b9b9);background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06))}' +
      '.dqp-grip:active{cursor:grabbing}' +
      '.dqp-grip:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary,#4c6fff));outline-offset:1px}' +
      '.dqp-body{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:6px}' +
      '.dqp-row-head{display:flex;align-items:center;gap:6px}' +
      '.dqp-label-input{box-sizing:border-box;flex:1 1 auto;min-width:0;height:26px;padding:0 8px;border:.5px solid transparent;' +
      'border-radius:var(--dsw-radius-sm,8px);background:transparent;color:var(--dsw-alias-label-primary,#eee);' +
      'font:inherit;font-size:13px;font-weight:500;line-height:18px}' +
      '.dqp-label-input:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.05))}' +
      '.dqp-label-input:focus{outline:none;background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.04));' +
      'border-color:var(--dsw-alias-brand-primary,#4c6fff)}' +
      '.dqp-label-input::placeholder{color:var(--dsw-alias-label-caption,#7d7d7d);font-weight:400}' +
      '.dqp-row-actions{display:flex;align-items:center;gap:2px;flex:0 0 auto}' +
      '.dqp-icon{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;padding:0;' +
      'border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-tertiary,#9a9a9a);' +
      'font:inherit;font-size:12px;line-height:1;cursor:pointer;transition:background-color .12s ease,color .12s ease}' +
      '.dqp-icon:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));color:var(--dsw-alias-label-primary,#eee)}' +
      '.dqp-icon:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary,#4c6fff));outline-offset:1px}' +
      '.dqp-icon:disabled{opacity:.35;cursor:default}' +
      '.dqp-icon-danger:hover:not(:disabled){background:var(--dsw-alias-state-error-primary,#e35d5d);color:var(--dsw-alias-label-on-color,#fff)}' +
      '.dqp-icon-confirm{width:auto;padding:0 6px;font-size:11px;color:var(--dsw-alias-state-error-primary,#e35d5d);' +
      'background:transparent;box-shadow:inset 0 0 0 .5px var(--dsw-alias-state-error-primary,#e35d5d)}' +
      '.dqp-textarea{box-sizing:border-box;width:100%;min-height:48px;padding:6px 8px;border:.5px solid var(--dsw-alias-border-l2,#494949);' +
      'border-radius:var(--dsw-radius-sm,8px);background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.03));' +
      'color:var(--dsw-alias-label-primary,#eee);font:inherit;font-size:12px;line-height:18px;resize:vertical}' +
      '.dqp-textarea:hover{border-color:var(--dsw-alias-border-l3,#5a5a5a)}' +
      '.dqp-textarea:focus{outline:none;border-color:var(--dsw-alias-brand-primary,#4c6fff)}' +
      '.dqp-textarea::placeholder{color:var(--dsw-alias-label-caption,#7d7d7d)}' +
      '.dqp-row-meta{display:flex;align-items:center;gap:8px;min-width:0;font-size:11px;line-height:16px;' +
      'color:var(--dsw-alias-label-caption,#7d7d7d)}' +
      '.dqp-preview{display:inline-flex;align-items:center;height:20px;max-width:240px;padding:0 8px;' +
      'border:.5px solid var(--dsw-alias-border-l2,#494949);border-radius:999px;' +
      'background:var(--dsw-alias-bg-layer-1,rgba(255,255,255,.04));color:var(--dsw-alias-label-secondary,#b9b9b9);' +
      'overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.dqp-preview-empty{opacity:.55}' +
      '.dqp-meta-grow{flex:1 1 auto}' +
      '.dqp-empty{padding:28px 12px;text-align:center;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary,#9a9a9a)}' +
      '.dqp-foot{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-caption,#7d7d7d)}'
      '.dqp-fields{flex:1;min-width:0;display:flex;flex-direction:column;gap:8px}' +
      '.dqp-field{display:flex;align-items:flex-start;gap:8px;min-width:0}' +
      '.dqp-field-name{flex:0 0 64px;padding-top:6px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary,#9a9a9a)}' +
      '.dqp-input{box-sizing:border-box;flex:1;min-width:0;width:100%;padding:6px 10px;border:.5px solid var(--dsw-alias-border-l2,#494949);' +
      'border-radius:var(--dsw-radius-sm,8px);background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.03));' +
      'color:var(--dsw-alias-label-primary,#eee);font:inherit;font-size:12px;line-height:18px;resize:vertical}' +
      '.dqp-input::placeholder{color:var(--dsw-alias-label-caption,#7d7d7d)}' +
      '.dqp-input:focus{outline:none;border-color:var(--dsw-alias-brand-primary,#4c6fff)}' +
      '.dqp-textarea{min-height:52px}' +
      '.dqp-empty{padding:28px 12px;text-align:center;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary,#9a9a9a)}' +
      '.dqp-foot{font-size:12px;line-height:18px;color:var(--dsw-alias-label-caption,#7d7d7d)}' +
      '.dqp-badge{display:inline-flex;align-items:center;height:20px;padding:0 8px;border-radius:999px;' +
      'background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.05));color:var(--dsw-alias-label-tertiary,#9a9a9a);font-size:11px;line-height:1}'

    /* ------------------------------------------------------------------ *
     * Dock chips
     * ------------------------------------------------------------------ */

    /** Fallback translator: the slot synthesizes `t` from the locale seat, but a
     * host that drops it must not blank our entry. */
    function resolveT(props) {
      if (typeof props.t === 'function') return props.t
      var zh = typeof navigator !== 'undefined' && /^zh/i.test(navigator.language || '')
      var dict = zh ? DICTS.zh : DICTS.en
      return function (key) {
        return dict[key] !== undefined ? dict[key] : key
      }
    }

    function phraseCaption(phrase) {
      if (phrase.label !== '') return phrase.label
      var firstLine = phrase.text.split('\n')[0]
      return firstLine.length > 24 ? firstLine.slice(0, 24) + '…' : firstLine
    }

    /** Narrow selectors so the row only re-renders when these two change. */
    function draftOf(state) {
      return state === null || state === undefined || typeof state.draft !== 'string' ? '' : state.draft
    }

    function attachmentCountOf(state) {
      if (state === null || state === undefined || state.attachmentIds === null || state.attachmentIds === undefined) return 0
      return state.attachmentIds.length
    }

    /**
     * One chip row bound to one composer slot. All rows stay registered; the
     * placement store decides which one renders, so a switch is a re-render
     * instead of a re-registration.
     */
    function makeChips(spec) {
      return function Chips(props) {
        var t = resolveT(props)
        var inputActions = props.inputActions
        var openManager = props.openManager
        var phrases = usePhrases(t)
        var current = usePlacement()
        var mode = useClickMode()
        // `useInput` is part of the session slot kit; both calls sit here so the
        // hook order never depends on the phrase list or on the placement.
        var draft = typeof props.useInput === 'function' ? props.useInput(draftOf) : ''
        var attachments = typeof props.useInput === 'function' ? props.useInput(attachmentCountOf) : 0
        var showHint = React.useState(false)
        var setShowHint = showHint[1]
        var hintTimer = React.useRef(null)
        var usable = phrases.filter(function (phrase) { return phrase.text.trim() !== '' })

        React.useEffect(function () {
          return function () {
            if (hintTimer.current !== null) window.clearTimeout(hintTimer.current)
          }
        }, [])

        if (current !== spec.value) return null

        function insertIntoCaret(phrase) {
          if (typeof inputActions.captureInsertion === 'function' && typeof inputActions.insertText === 'function') {
            try {
              return inputActions.insertText(phrase.text, inputActions.captureInsertion()) === true
            } catch (error) {
              console.warn('[quick-phrases] could not insert the phrase at the caret', error)
            }
          }
          return false
        }

        function activate(phrase) {
          if (inputActions === null || typeof inputActions !== 'object') {
            console.warn('[quick-phrases] the slot did not provide inputActions')
            return
          }
          var sendNow = mode === 'send' && draft.trim() === '' && attachments === 0
          try {
            if (sendNow) {
              inputActions.setDraft(phrase.text)
              if (typeof inputActions.submit === 'function') {
                try {
                  inputActions.submit()
                } catch (error) {
                  // The draft is already written; reporting beats sending twice.
                  console.warn('[quick-phrases] could not send the phrase', error)
                }
              }
              return
            }
            if (!insertIntoCaret(phrase)) inputActions.setDraft(phrase.text)
          } catch (error) {
            console.warn('[quick-phrases] could not use the phrase', error)
          }
        }

        function handleManage() {
          var opened = false
          try {
            opened = openManager()
          } catch (error) {
            console.warn('[quick-phrases] could not open the manager', error)
          }
          if (!opened) {
            setShowHint(true)
            if (hintTimer.current !== null) window.clearTimeout(hintTimer.current)
            hintTimer.current = window.setTimeout(function () { setShowHint(false) }, 3600)
          }
        }

        var rowClass = 'dqp-dock'
        if (spec.compact) rowClass += ' dqp-dock-tool'
        if (spec.inset) rowClass += ' dqp-dock-inset'

        var children = [
          h('style', { key: 'style' }, DOCK_CSS),
          h('div', { key: 'row', className: rowClass },
            usable.map(function (phrase, index) {
              return h('button', {
                key: phrase.id + ':' + index,
                type: 'button',
                className: 'dqp-chip',
                title: phrase.text,
                'aria-label': phraseCaption(phrase) + ' — ' + t('dock.tooltip'),
                onClick: function () { activate(phrase) },
              }, phraseCaption(phrase))
            }),
            h('button', {
              key: 'manage',
              type: 'button',
              className: 'dqp-chip dqp-chip-manage',
              onClick: handleManage,
            }, t('dock.manage')),
          ),
        ]
        if (showHint[0]) {
          children.push(h('div', { key: 'hint', className: 'dqp-hint' }, t('dock.openFailed')))
        }
        return children
      }
    }

    /* ------------------------------------------------------------------ *
     * Settings page (the management surface)
     * ------------------------------------------------------------------ */

    function ManagerPage(props) {
      var t = resolveT(props)
      var phrases = usePhrases(t)
      var placementNow = usePlacement()
      var clickNow = useClickMode()

      var resetState = React.useState(false)
      var isResetting = resetState[0]
      var setIsResetting = resetState[1]
      var deleteState = React.useState(null)
      var pendingDelete = deleteState[0]
      var setPendingDelete = deleteState[1]
      var dragState = React.useState(null)
      var dragFrom = dragState[0]
      var setDragFrom = dragState[1]
      // The drop handler must see the drag source even before React re-renders.
      var dragRef = React.useRef(null)
      var dropState = React.useState(null)
      var dragOver = dropState[0]
      var setDragOver = dropState[1]
      var focusState = React.useState(null)
      var focusId = focusState[0]
      var setFocusId = focusState[1]

      // A pending delete forgets itself so a stray click cannot remove a phrase later.
      React.useEffect(function () {
        if (pendingDelete === null) return undefined
        var timer = window.setTimeout(function () { setPendingDelete(null) }, 4000)
        return function () { window.clearTimeout(timer) }
      }, [pendingDelete])

      React.useEffect(function () {
        if (focusId !== null) setFocusId(null)
      }, [focusId])

      function handleReset() {
        if (!isResetting) {
          setIsResetting(true)
          return
        }
        setIsResetting(false)
        resetPhrases(t)
      }

      function handleAdd() {
        var id = insertPhrase()
        if (id !== null) setFocusId(id)
      }

      function handleDrop(index) {
        var from = dragRef.current
        if (from !== null) movePhraseTo(from, index)
        endDrag()
      }

      function endDrag() {
        dragRef.current = null
        setDragFrom(null)
        setDragOver(null)
      }

      var rows = phrases.map(function (phrase, index) {
        var deleting = pendingDelete === phrase.id
        var isDragging = dragFrom === index
        var isDropTarget = dragOver === index && dragFrom !== null && dragFrom !== index
        // Rough height hint: one row per line, plus one per ~72 characters.
        var textRows = phrase.text === ''
          ? 2
          : Math.min(8, Math.max(2, phrase.text.split('\n').length + Math.floor(phrase.text.length / 72)))

        return h('div', {
          key: phrase.id,
          className: 'dqp-row' + (isDragging ? ' dqp-row-dragging' : '') + (isDropTarget ? ' dqp-row-over' : ''),
          onDragOver: function (event) {
            event.preventDefault()
            if (dragFrom !== null) setDragOver(index)
          },
          onDragLeave: function () {
            if (dragOver === index) setDragOver(null)
          },
          onDrop: function (event) {
            event.preventDefault()
            handleDrop(index)
          },
        },
          h('button', {
            type: 'button',
            className: 'dqp-grip',
            draggable: true,
            title: t('manager.drag'),
            'aria-label': t('manager.drag'),
            onDragStart: function (event) {
              dragRef.current = index
              setDragFrom(index)
              if (event && event.dataTransfer) {
                event.dataTransfer.effectAllowed = 'move'
                // Firefox only starts a drag when the payload is set.
                try { event.dataTransfer.setData('text/plain', phrase.id) } catch (error) { /* ignore */ }
              }
            },
            onDragEnd: endDrag,
          }, '\u283f'),

          h('div', { className: 'dqp-body' },
            h('div', { className: 'dqp-row-head' },
              h('input', {
                type: 'text',
                className: 'dqp-label-input',
                value: phrase.label,
                placeholder: t('manager.labelPlaceholder'),
                'aria-label': t('manager.label'),
                spellCheck: false,
                autoFocus: focusId === phrase.id,
                onChange: function (event) { updatePhrase(index, { label: event.target.value }) },
              }),
              h('div', { className: 'dqp-row-actions' },
                h('button', {
                  type: 'button',
                  className: 'dqp-icon',
                  title: t('manager.moveUp'),
                  'aria-label': t('manager.moveUp'),
                  disabled: index === 0,
                  onClick: function () { movePhrase(index, -1) },
                }, '\u2191'),
                h('button', {
                  type: 'button',
                  className: 'dqp-icon',
                  title: t('manager.moveDown'),
                  'aria-label': t('manager.moveDown'),
                  disabled: index === phrases.length - 1,
                  onClick: function () { movePhrase(index, 1) },
                }, '\u2193'),
                h('button', {
                  type: 'button',
                  className: 'dqp-icon dqp-icon-danger' + (deleting ? ' dqp-icon-confirm' : ''),
                  title: deleting ? t('manager.deleteConfirm') : t('manager.delete'),
                  'aria-label': deleting ? t('manager.deleteConfirm') : t('manager.delete'),
                  onClick: function () {
                    if (!deleting) {
                      setPendingDelete(phrase.id)
                      return
                    }
                    setPendingDelete(null)
                    removePhrase(index)
                  },
                }, deleting ? t('manager.deleteShort') : '\u2715'),
              ),
            ),

            h('textarea', {
              className: 'dqp-textarea',
              value: phrase.text,
              rows: textRows,
              placeholder: t('manager.textPlaceholder'),
              'aria-label': t('manager.text'),
              spellCheck: false,
              onChange: function (event) { updatePhrase(index, { text: event.target.value }) },
            }),

            h('div', { className: 'dqp-row-meta' },
              h('span', null, t('manager.preview')),
              h('span', {
                className: 'dqp-preview' + (phraseCaption(phrase) === '' ? ' dqp-preview-empty' : ''),
                title: phrase.text,
              }, phraseCaption(phrase) || t('manager.untitled')),
              h('span', { className: 'dqp-meta-grow' }),
              h('span', null, t('manager.chars').replace('{n}', String(phrase.text.length))),
            ),
          ),
        )
      })

      var placementOption = h('div', { className: 'dqp-option' },
        h('div', { className: 'dqp-option-text' },
          h('label', { className: 'dqp-option-label', htmlFor: 'dqp-placement' }, t('manager.placement')),
          h('span', { className: 'dqp-option-hint' }, t('manager.placementHint')),
        ),
        h('div', { className: 'dqp-select-wrap' },
          h('select', {
            id: 'dqp-placement',
            className: 'dqp-select',
            value: placementNow,
            onChange: function (event) { setPlacement(event.target.value) },
          },
          PLACEMENTS.map(function (item) {
            return h('option', { key: item.value, value: item.value }, t(item.key))
          }),
          ),
        ),
      )

      var clickOption = h('div', { className: 'dqp-option' },
        h('div', { className: 'dqp-option-text' },
          h('label', { className: 'dqp-option-label', htmlFor: 'dqp-click' }, t('manager.clickMode')),
          h('span', { className: 'dqp-option-hint' }, t('manager.clickHint')),
        ),
        h('div', { className: 'dqp-select-wrap' },
          h('select', {
            id: 'dqp-click',
            className: 'dqp-select',
            value: clickNow,
            onChange: function (event) { setClickMode(event.target.value) },
          },
          CLICK_MODES.map(function (value) {
            return h('option', { key: value, value: value }, t(value === 'send' ? 'manager.clickSend' : 'manager.clickInsert'))
          }),
          ),
        ),
      )

      return h('div', { className: 'dqp-page' },
        h('style', null, MANAGER_CSS),
        h('div', { className: 'dqp-inner' },
          h('div', { className: 'dqp-head' },
            h('div', { className: 'dqp-head-text' },
              h('h2', { className: 'dqp-title' }, t('section.title')),
              h('p', { className: 'dqp-desc' }, t('section.description')),
            ),
            h('span', { className: 'dqp-badge' }, t('manager.count').replace('{n}', String(phrases.length))),
          ),
          h('div', { className: 'dqp-options' }, placementOption, clickOption),
          h('div', { className: 'dqp-section' },
            h('div', { className: 'dqp-section-head' },
              h('h3', { className: 'dqp-section-title' }, t('manager.phrases')),
              h('button', {
                type: 'button',
                className: 'dqp-btn' + (isResetting ? ' dqp-btn-warn' : ''),
                onClick: handleReset,
              }, isResetting ? t('manager.resetConfirm') : t('manager.reset')),
              h('button', {
                type: 'button',
                className: 'dqp-btn dqp-btn-primary',
                onClick: handleAdd,
              }, '+ ' + t('manager.add')),
            ),
            rows.length > 0
              ? h('div', { className: 'dqp-list' }, rows)
              : h('div', { className: 'dqp-list' },
                  h('div', { className: 'dqp-empty' }, t('manager.empty')),
                ),
          ),
          h('p', { className: 'dqp-foot' }, t('manager.savedHint') + ' ' + t('manager.tip')),
        ),
      )
    }

    /* ------------------------------------------------------------------ *
     * Settings navigation glyph (optional; the page works without it)
     * ------------------------------------------------------------------ */

    function SectionIcon(props) {
      var size = typeof props.size === 'number' ? props.size : 18
      var color = props.active
        ? 'var(--dsw-alias-brand-primary,#4c6fff)'
        : 'var(--dsw-alias-label-secondary,#b9b9b9)'
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        'aria-hidden': true,
        style: { display: 'block' },
      },
      h('rect', { x: 3, y: 5, width: 18, height: 15, rx: 4, stroke: color, strokeWidth: 1.6 }),
      h('path', { d: 'M7 11h7M7 15h4', stroke: color, strokeWidth: 1.6, strokeLinecap: 'round' }),
      h('path', { d: 'M16.5 14.5v4M14.5 16.5h4', stroke: color, strokeWidth: 1.6, strokeLinecap: 'round' }),
      )
    }

    /* ------------------------------------------------------------------ *
     * Plugin body
     * ------------------------------------------------------------------ */

    return {
      inject: ['slots', 'locale'],
      apply: function apply(ctx) {
        ctx.effect(function () {
          return ctx.locale.register(NS, DICTS)
        })

        function openManager() {
          var rows = typeof ctx.slots.entries === 'function' ? ctx.slots.entries('sidebar.settings') : []
          for (var i = 0; i < rows.length; i += 1) {
            var row = rows[i]
            if (row === null || row === undefined || row.store === null || row.store === undefined) continue
            if (typeof row.store.create !== 'function') continue
            var handle = row.store.create()
            if (handle !== null && handle !== undefined && handle.actions !== null && handle.actions !== undefined &&
              typeof handle.actions.openSection === 'function') {
              handle.actions.openSection(SECTION_ID)
              return true
            }
          }
          return false
        }

        PLACEMENTS.forEach(function (spec) {
          ctx.slots.inject(spec.slot, function () {
            return ctx.slots.register({
              name: spec.slot,
              id: SECTION_ID + '-' + spec.tag,
              order: spec.order,
              locale: NS,
              inject: function () { return { openManager: openManager } },
            }, makeChips(spec))
          })
        })

        ctx.slots.inject('settings.section', function () {
          return ctx.slots.register({
            name: 'settings.section',
            id: SECTION_ID,
            order: SECTION_ORDER,
            locale: NS,
            label: function () { return ctx.locale.bind(NS)('section.title') },
          }, ManagerPage)
        })

        ctx.slots.inject('settings.section.icon', function () {
          return ctx.slots.register({
            name: 'settings.section.icon',
            id: SECTION_ID,
          }, SectionIcon)
        })
      },
    }
  },
})
