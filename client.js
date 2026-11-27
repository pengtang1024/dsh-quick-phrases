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
    var COLLAPSE_KEY = 'dsh.quick-phrases.collapsed.v1'
    var AUTOHIDE_KEY = 'dsh.quick-phrases.autohide.v1'
    var HIDDEN_KEY = 'dsh.quick-phrases.hidden.v1'
    var MANAGE_KEY = 'dsh.quick-phrases.manage.v1'
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

    /**
     * What happens to the row while the composer already holds text or files.
     * `fold` pulls it down to one small pill (so a draft can still take a phrase
     * at the caret after one click), `keep` leaves the whole row out.
     */
    var AUTO_HIDE_MODES = ['fold', 'keep']
    var DEFAULT_AUTO_HIDE = 'fold'

    /**
     * What the end of the row shows for opening the manager. All rendered
     * modes are now gear-icon pills with the same accessible name; `text` is
     * kept as the stored default for backward compatibility with existing
     * settings, not as a visible text label.
     */
    var MANAGE_MODES = ['text', 'icon', 'hidden']
    var DEFAULT_MANAGE = 'text'

    /**
     * The settings dropdown that exposes the row's two visibility toggles as one
     * three-way choice. There is deliberately no storage key of its own: the
     * value is derived from `hidden` (wins) and `collapsed`.
     */
    var ROW_MODES = ['full', 'pill', 'hidden']

    var DICTS = {
      zh: {
        'section.title': '快捷短语',
        'section.description': '在输入框附近放一排短语按钮。按钮上显示的是「显示名称」，发送内容单独编辑，两者可以完全不同。下面的设置决定它出现在哪里、点一下会发生什么，以及什么时候收起。',
        'dock.manage': '管理',
        'dock.openFailed': '请在「设置 — 快捷短语」中管理',
        'dock.tooltip': '写入输入框',
        'dock.collapse': '收起',
        'dock.collapseHint': '收起这一排短语，只留一个小胶囊',
        'dock.expand': '快捷短语',
        'dock.expandHint': '展开快捷短语',
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
        'manager.rowMode': '短语行显示',
        'manager.rowModeFull': '显示整排',
        'manager.rowModePill': '收成胶囊',
        'manager.rowModeHidden': '彻底隐藏',
        'manager.rowModeHint': '控制短语行出现的形态：「收成胶囊」只留一个可展开的小胶囊；「彻底隐藏」把整排从界面移除，连胶囊都不留。输入框有内容时是否自动收起由下面一项决定。',
        'manager.rowModeHintOff': '整排已完全隐藏，界面里不再显示任何按钮或胶囊。把这一项改回「显示整排」或「收成胶囊」即可恢复，不必重启。',
        'manager.rowHiddenBadge': '整排已隐藏',
        'manager.manageEntry': '管理入口',
        'manager.manageText': '文字按钮',
        'manager.manageIcon': '齿轮图标',
        'manager.manageHidden': '隐藏入口',
        'manager.manageHint': '短语行末尾的「管理」可以保持文字、换成齿轮图标，或直接隐藏；隐藏后只能从「设置 → 快捷短语」进入管理。',
        'manager.autoHide': '输入框有内容时',
        'manager.autoHideFold': '自动收起',
        'manager.autoHideKeep': '保持显示',
        'manager.autoHideHint': '输入框里已有文字或附件时把短语行收成一个小胶囊；点胶囊还能临时展开，不挡正在写的内容。',
        'manager.hide': '隐藏这条短语',
        'manager.show': '显示这条短语',
        'manager.hiddenBadge': '已隐藏',
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
        'default.release.text': '提交，推送，发布新版本，更新到本地',
        'manager.starHint': '觉得好用？点开下面的链接，在仓库右上角点 Star 支持一下：',
        'manager.starLink': '点个 star',
      },
      en: {
        'section.title': 'Quick phrases',
        'section.description': 'A row of phrase chips next to the composer. A chip shows its display name while the text it inserts is edited separately. The options below decide where it lives, what a click does, and when it folds away.',
        'dock.manage': 'Manage',
        'dock.openFailed': 'Manage them in Settings — Quick phrases',
        'dock.tooltip': 'Insert into the composer',
        'dock.collapse': 'Hide',
        'dock.collapseHint': 'Fold the row into a small pill',
        'dock.expand': 'Quick phrases',
        'dock.expandHint': 'Show the quick phrases',
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
        'manager.rowMode': 'Phrase row',
        'manager.rowModeFull': 'Show the full row',
        'manager.rowModePill': 'Fold into a pill',
        'manager.rowModeHidden': 'Hide completely',
        'manager.rowModeHint': 'Controls the shape of the row: “Fold into a pill” leaves one expandable pill, while “Hide completely” removes the whole row, pill included. The option below still decides whether a draft folds it automatically.',
        'manager.rowModeHintOff': 'The whole row is completely hidden: no chips and no pill are rendered anywhere. Switch this back to “Show the full row” or “Fold into a pill” to restore it — no restart needed.',
        'manager.rowHiddenBadge': 'Row hidden',
        'manager.manageEntry': 'Manage button',
        'manager.manageText': 'Text button',
        'manager.manageIcon': 'Gear icon',
        'manager.manageHidden': 'Hidden',
        'manager.manageHint': 'The “Manage” chip at the end of the row can stay text, become a gear icon, or be left out entirely; once hidden it can only be reached in Settings → Quick phrases.',
        'manager.autoHide': 'When the composer has text',
        'manager.autoHideFold': 'Fold automatically',
        'manager.autoHideKeep': 'Keep it visible',
        'manager.autoHideHint': 'Folds the row into a small pill while the composer holds text or attachments; click the pill to expand it for the current draft.',
        'manager.hide': 'Hide this phrase',
        'manager.show': 'Show this phrase',
        'manager.hiddenBadge': 'Hidden',
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
        'default.release.text': 'Commit, push, publish the new version, then update locally',
        'manager.starHint': 'Enjoying it? Open the link and click Star at the top right of the repo:',
        'manager.starLink': 'Star on GitHub',
      },
      es: {
        'section.title': 'Frases rápidas',
        'section.description': 'Una fila de botones con frases junto al campo de texto. El botón muestra el nombre visible, mientras que el texto que se envía se edita por separado. Las opciones de abajo deciden dónde aparece la fila, qué ocurre al pulsar y cuándo se pliega.',
        'dock.manage': 'Gestionar',
        'dock.openFailed': 'Gestiona las frases en Ajustes → Frases rápidas',
        'dock.tooltip': 'Insertar en el campo de texto',
        'dock.collapse': 'Ocultar',
        'dock.collapseHint': 'Plegar la fila en una pequeña píldora',
        'dock.expand': 'Frases rápidas',
        'dock.expandHint': 'Mostrar las frases rápidas',
        'manager.add': 'Añadir frase',
        'manager.phrases': 'Frases',
        'manager.count': '{n}',
        'manager.preview': 'Vista previa',
        'manager.untitled': 'Sin título',
        'manager.chars': '{n} caracteres',
        'manager.drag': 'Arrastrar para reordenar',
        'manager.deleteConfirm': 'Eliminar esta frase',
        'manager.deleteShort': 'Confirmar',
        'manager.reset': 'Restablecer valores',
        'manager.resetConfirm': 'Pulsa de nuevo para confirmar',
        'manager.delete': 'Eliminar',
        'manager.moveUp': 'Subir',
        'manager.moveDown': 'Bajar',
        'manager.placement': 'Ubicación',
        'manager.placementDock': 'Debajo del campo',
        'manager.placementTop': 'Encima del campo',
        'manager.placementTool': 'Barra de herramientas',
        'manager.placementHint': 'La fila se mueve en cuanto cambias la opción. La barra de herramientas es estrecha, así que las frases que no caben se desplazan horizontalmente.',
        'manager.clickMode': 'Al pulsar una frase',
        'manager.clickSend': 'Enviar directamente',
        'manager.clickInsert': 'Insertar en el campo',
        'manager.clickHint': '«Enviar directamente» envía la frase con un clic cuando el campo está vacío; si ya hay texto o archivos adjuntos, la frase se inserta en el cursor para no perder lo que estabas escribiendo.',
        'manager.rowMode': 'Visualización de la fila',
        'manager.rowModeFull': 'Mostrar la fila completa',
        'manager.rowModePill': 'Plegar en una píldora',
        'manager.rowModeHidden': 'Ocultar por completo',
        'manager.rowModeHint': 'Controla la forma de la fila: «Plegar en una píldora» deja una pequeña píldora que se puede desplegar, mientras que «Ocultar por completo» elimina toda la fila, incluida la píldora. La opción siguiente decide si un borrador la pliega automáticamente.',
        'manager.rowModeHintOff': 'La fila está completamente oculta: no se muestra ningún botón ni píldora. Vuelve a «Mostrar la fila completa» o «Plegar en una píldora» para restaurarla, sin necesidad de reiniciar.',
        'manager.rowHiddenBadge': 'Fila oculta',
        'manager.manageEntry': 'Acceso de gestión',
        'manager.manageText': 'Botón de texto',
        'manager.manageIcon': 'Icono de engranaje',
        'manager.manageHidden': 'Sin acceso',
        'manager.manageHint': 'El botón «Gestionar» al final de la fila puede seguir siendo texto, convertirse en un engranaje o no mostrarse; al ocultarlo, solo se puede acceder desde Ajustes → Frases rápidas.',
        'manager.autoHide': 'Cuando el campo tiene texto',
        'manager.autoHideFold': 'Plegar automáticamente',
        'manager.autoHideKeep': 'Mantener visible',
        'manager.autoHideHint': 'Pliega la fila en una pequeña píldora mientras el campo contiene texto o archivos adjuntos; pulsa la píldora para desplegarla sin tapar lo que estás escribiendo.',
        'manager.hide': 'Ocultar esta frase',
        'manager.show': 'Mostrar esta frase',
        'manager.hiddenBadge': 'Oculta',
        'manager.label': 'Nombre visible',
        'manager.text': 'Texto enviado',
        'manager.labelPlaceholder': 'Texto del botón, p. ej. Confirmar',
        'manager.textPlaceholder': 'Lo que inserta el botón, p. ej. Confirmar los cambios y enviarlos al remoto',
        'manager.newPhrase': 'Nueva frase',
        'manager.empty': 'La lista está vacía. Añade una frase para empezar.',
        'manager.savedHint': 'Los cambios se guardan automáticamente y se aplican al instante.',
        'manager.tip': 'Arrastra el control o usa ↑↓ para reordenar; los cambios se guardan automáticamente.',
        'default.continue.label': 'Continuar',
        'default.continue.text': 'Continuar',
        'default.commit.label': 'Confirmar',
        'default.commit.text': 'Confirmar los cambios y enviarlos al remoto',
        'default.push.label': 'Enviar',
        'default.push.text': 'Enviar los commits locales al remoto',
        'default.release.label': 'Publicar',
        'default.release.text': 'Haz commit, haz push, publica la nueva versión y actualiza tu copia local',
        'manager.starHint': '¿Te resulta útil? Abre el enlace y pulsa Star arriba a la derecha del repositorio:',
        'manager.starLink': 'Dar una estrella',
      },
      fr: {
        'section.title': 'Phrases rapides',
        'section.description': 'Une rangée de boutons de phrases à côté du champ de saisie. Le bouton affiche le nom choisi, tandis que le texte envoyé se modifie séparément. Les options ci-dessous déterminent où se trouve la rangée, ce que fait un clic et quand elle se replie.',
        'dock.manage': 'Gérer',
        'dock.openFailed': 'Gérez-les dans Paramètres → Phrases rapides',
        'dock.tooltip': 'Insérer dans le champ de saisie',
        'dock.collapse': 'Replier',
        'dock.collapseHint': 'Replier la rangée en une petite pastille',
        'dock.expand': 'Phrases rapides',
        'dock.expandHint': 'Afficher les phrases rapides',
        'manager.add': 'Ajouter une phrase',
        'manager.phrases': 'Phrases',
        'manager.count': '{n}',
        'manager.preview': 'Aperçu du bouton',
        'manager.untitled': 'Sans titre',
        'manager.chars': '{n} caractères',
        'manager.drag': 'Glisser pour réorganiser',
        'manager.deleteConfirm': 'Supprimer cette phrase',
        'manager.deleteShort': 'Confirmer',
        'manager.reset': 'Restaurer les valeurs par défaut',
        'manager.resetConfirm': 'Cliquez encore pour confirmer',
        'manager.delete': 'Supprimer',
        'manager.moveUp': 'Monter',
        'manager.moveDown': 'Descendre',
        'manager.placement': 'Emplacement',
        'manager.placementDock': 'Sous le champ de saisie',
        'manager.placementTop': 'Au-dessus du champ de saisie',
        'manager.placementTool': 'Barre d’outils',
        'manager.placementHint': 'La rangée se déplace dès que vous changez d’option. La barre d’outils est étroite : les phrases qui débordent défilent horizontalement.',
        'manager.clickMode': 'Au clic sur une phrase',
        'manager.clickSend': 'Envoyer directement',
        'manager.clickInsert': 'Insérer dans le champ',
        'manager.clickHint': '« Envoyer directement » envoie la phrase en un clic quand le champ est vide ; s’il contient déjà du texte ou des pièces jointes, la phrase est insérée au curseur, sans rien écraser.',
        'manager.rowMode': 'Affichage de la rangée',
        'manager.rowModeFull': 'Afficher toute la rangée',
        'manager.rowModePill': 'Replier en pastille',
        'manager.rowModeHidden': 'Masquer complètement',
        'manager.rowModeHint': 'Contrôle l’apparence de la rangée : « Replier en pastille » ne laisse qu’une petite pastille dépliable, tandis que « Masquer complètement » supprime toute la rangée, pastille comprise. L’option ci-dessous décide si un brouillon la replie automatiquement.',
        'manager.rowModeHintOff': 'La rangée est complètement masquée : aucun bouton ni pastille ne s’affiche. Revenez à « Afficher toute la rangée » ou « Replier en pastille » pour la rétablir, sans redémarrer.',
        'manager.rowHiddenBadge': 'Rangée masquée',
        'manager.manageEntry': 'Accès à la gestion',
        'manager.manageText': 'Bouton texte',
        'manager.manageIcon': 'Icône engrenage',
        'manager.manageHidden': 'Masqué',
        'manager.manageHint': 'Le bouton « Gérer » en fin de rangée peut rester du texte, devenir un engrenage ou disparaître ; une fois masqué, il n’est accessible que via Paramètres → Phrases rapides.',
        'manager.autoHide': 'Quand le champ contient du texte',
        'manager.autoHideFold': 'Replier automatiquement',
        'manager.autoHideKeep': 'Garder visible',
        'manager.autoHideHint': 'Replie la rangée en une petite pastille quand le champ contient du texte ou des pièces jointes ; cliquez sur la pastille pour la déplier sans gêner votre saisie.',
        'manager.hide': 'Masquer cette phrase',
        'manager.show': 'Afficher cette phrase',
        'manager.hiddenBadge': 'Masquée',
        'manager.label': 'Nom affiché',
        'manager.text': 'Texte envoyé',
        'manager.labelPlaceholder': 'Texte du bouton, ex. : Valider',
        'manager.textPlaceholder': 'Ce que le bouton insère, ex. : Valider les modifications et pousser vers le dépôt distant',
        'manager.newPhrase': 'Nouvelle phrase',
        'manager.empty': 'La liste est vide. Ajoutez une phrase pour commencer.',
        'manager.savedHint': 'Les modifications sont enregistrées et appliquées immédiatement.',
        'manager.tip': 'Glissez la poignée ou utilisez ↑↓ pour réorganiser ; les modifications sont enregistrées automatiquement.',
        'default.continue.label': 'Continuer',
        'default.continue.text': 'Continuer',
        'default.commit.label': 'Valider',
        'default.commit.text': 'Valider les modifications et pousser vers le dépôt distant',
        'default.push.label': 'Pousser',
        'default.push.text': 'Pousser les commits locaux vers le dépôt distant',
        'default.release.label': 'Publier',
        'default.release.text': 'Fais un commit, pousse-le, publie la nouvelle version puis mets à jour en local',
        'manager.starHint': 'Utile au quotidien ? Ouvrez le lien et cliquez sur Star en haut à droite du dépôt :',
        'manager.starLink': 'Mettre une étoile',
      },
      de: {
        'section.title': 'Schnellphrasen',
        'section.description': 'Eine Reihe von Phrasen-Schaltflächen neben dem Eingabefeld. Die Schaltfläche zeigt den Anzeigenamen, der gesendete Text wird getrennt bearbeitet. Die Optionen unten legen fest, wo die Reihe sitzt, was ein Klick bewirkt und wann sie sich einklappt.',
        'dock.manage': 'Verwalten',
        'dock.openFailed': 'In Einstellungen → Schnellphrasen verwalten',
        'dock.tooltip': 'In das Eingabefeld einfügen',
        'dock.collapse': 'Einklappen',
        'dock.collapseHint': 'Die Reihe zu einer kleinen Pille einklappen',
        'dock.expand': 'Schnellphrasen',
        'dock.expandHint': 'Schnellphrasen einblenden',
        'manager.add': 'Phrase hinzufügen',
        'manager.phrases': 'Phrasen',
        'manager.count': '{n}',
        'manager.preview': 'Schaltflächenvorschau',
        'manager.untitled': 'Ohne Titel',
        'manager.chars': '{n} Zeichen',
        'manager.drag': 'Ziehen zum Sortieren',
        'manager.deleteConfirm': 'Diese Phrase löschen',
        'manager.deleteShort': 'Bestätigen',
        'manager.reset': 'Standard wiederherstellen',
        'manager.resetConfirm': 'Erneut klicken zum Bestätigen',
        'manager.delete': 'Löschen',
        'manager.moveUp': 'Nach oben',
        'manager.moveDown': 'Nach unten',
        'manager.placement': 'Position',
        'manager.placementDock': 'Unter dem Eingabefeld',
        'manager.placementTop': 'Über dem Eingabefeld',
        'manager.placementTool': 'Werkzeugleiste',
        'manager.placementHint': 'Die Reihe wechselt sofort die Position. In der schmalen Werkzeugleiste scrollen zu lange Listen seitwärts.',
        'manager.clickMode': 'Bei Klick auf eine Phrase',
        'manager.clickSend': 'Direkt senden',
        'manager.clickInsert': 'In das Eingabefeld einfügen',
        'manager.clickHint': '„Direkt senden“ verschickt die Phrase mit einem Klick, solange das Feld leer ist; enthält es bereits Text oder Anhänge, wird die Phrase an der Cursorposition eingefügt, sodass nichts verloren geht.',
        'manager.rowMode': 'Darstellung der Reihe',
        'manager.rowModeFull': 'Ganze Reihe anzeigen',
        'manager.rowModePill': 'Zu einer Pille einklappen',
        'manager.rowModeHidden': 'Vollständig ausblenden',
        'manager.rowModeHint': 'Steuert die Form der Reihe: „Zu einer Pille einklappen“ lässt nur eine kleine ausklappbare Pille übrig, „Vollständig ausblenden“ entfernt die ganze Reihe samt Pille. Die Option darunter bestimmt, ob ein Entwurf sie automatisch einklappt.',
        'manager.rowModeHintOff': 'Die Reihe ist vollständig ausgeblendet: Es wird weder eine Schaltfläche noch eine Pille angezeigt. Wechseln Sie zurück zu „Ganze Reihe anzeigen“ oder „Zu einer Pille einklappen“, ohne neu zu starten.',
        'manager.rowHiddenBadge': 'Reihe ausgeblendet',
        'manager.manageEntry': 'Verwaltungszugang',
        'manager.manageText': 'Textschaltfläche',
        'manager.manageIcon': 'Zahnrad-Symbol',
        'manager.manageHidden': 'Ausgeblendet',
        'manager.manageHint': 'Die Schaltfläche „Verwalten“ am Ende der Reihe kann als Text bleiben, zu einem Zahnrad werden oder ganz entfallen; ausgeblendet ist sie nur noch unter Einstellungen → Schnellphrasen erreichbar.',
        'manager.autoHide': 'Wenn das Eingabefeld Text enthält',
        'manager.autoHideFold': 'Automatisch einklappen',
        'manager.autoHideKeep': 'Sichtbar lassen',
        'manager.autoHideHint': 'Klappt die Reihe zu einer kleinen Pille ein, solange das Feld Text oder Anhänge enthält; ein Klick auf die Pille klappt sie für den aktuellen Entwurf wieder aus.',
        'manager.hide': 'Diese Phrase ausblenden',
        'manager.show': 'Diese Phrase einblenden',
        'manager.hiddenBadge': 'Ausgeblendet',
        'manager.label': 'Anzeigename',
        'manager.text': 'Gesendeter Text',
        'manager.labelPlaceholder': 'Beschriftung der Schaltfläche, z. B. Absenden',
        'manager.textPlaceholder': 'Was die Schaltfläche einfügt, z. B. Änderungen committen und zum Remote pushen',
        'manager.newPhrase': 'Neue Phrase',
        'manager.empty': 'Die Liste ist leer. Fügen Sie eine Phrase hinzu.',
        'manager.savedHint': 'Änderungen werden automatisch gespeichert und sofort übernommen.',
        'manager.tip': 'Ziehen Sie den Griff oder nutzen Sie ↑↓ zum Sortieren; Änderungen werden automatisch gespeichert.',
        'default.continue.label': 'Weiter',
        'default.continue.text': 'Weiter',
        'default.commit.label': 'Committen',
        'default.commit.text': 'Änderungen committen und zum Remote pushen',
        'default.push.label': 'Pushen',
        'default.push.text': 'Lokale Commits zum Remote pushen',
        'default.release.label': 'Release',
        'default.release.text': 'Committen, pushen, neue Version veröffentlichen und lokal aktualisieren',
        'manager.starHint': 'Gefällt dir die Erweiterung? Öffne den Link und klicke oben rechts im Repo auf Star:',
        'manager.starLink': 'Stern geben',
      },
      ru: {
        'section.title': 'Быстрые фразы',
        'section.description': 'Ряд кнопок с фразами рядом с полем ввода. На кнопке показан её заголовок, а отправляемый текст редактируется отдельно. Настройки ниже определяют, где находится ряд, что происходит по нажатию и когда он сворачивается.',
        'dock.manage': 'Управление',
        'dock.openFailed': 'Управляйте фразами в «Настройки → Быстрые фразы»',
        'dock.tooltip': 'Вставить в поле ввода',
        'dock.collapse': 'Свернуть',
        'dock.collapseHint': 'Свернуть ряд в небольшую пилюлю',
        'dock.expand': 'Быстрые фразы',
        'dock.expandHint': 'Показать быстрые фразы',
        'manager.add': 'Добавить фразу',
        'manager.phrases': 'Фразы',
        'manager.count': '{n}',
        'manager.preview': 'Предпросмотр кнопки',
        'manager.untitled': 'Без названия',
        'manager.chars': '{n} символ.',
        'manager.drag': 'Перетащите, чтобы изменить порядок',
        'manager.deleteConfirm': 'Удалить эту фразу',
        'manager.deleteShort': 'Подтвердить',
        'manager.reset': 'Восстановить по умолчанию',
        'manager.resetConfirm': 'Нажмите ещё раз для подтверждения',
        'manager.delete': 'Удалить',
        'manager.moveUp': 'Выше',
        'manager.moveDown': 'Ниже',
        'manager.placement': 'Расположение',
        'manager.placementDock': 'Под полем ввода',
        'manager.placementTop': 'Над полем ввода',
        'manager.placementTool': 'Панель инструментов',
        'manager.placementHint': 'Ряд перемещается сразу после переключения. На узкой панели инструментов длинный список прокручивается горизонтально.',
        'manager.clickMode': 'При нажатии на фразу',
        'manager.clickSend': 'Отправить сразу',
        'manager.clickInsert': 'Вставить в поле ввода',
        'manager.clickHint': '«Отправить сразу» отправляет фразу одним нажатием, когда поле пусто; если в нём уже есть текст или вложения, фраза вставляется в позицию курсора — написанное не теряется.',
        'manager.rowMode': 'Вид ряда',
        'manager.rowModeFull': 'Показывать весь ряд',
        'manager.rowModePill': 'Свернуть в пилюлю',
        'manager.rowModeHidden': 'Скрыть полностью',
        'manager.rowModeHint': 'Задаёт вид ряда: «Свернуть в пилюлю» оставляет одну небольшую раскрывающуюся пилюлю, а «Скрыть полностью» убирает весь ряд вместе с ней. Настройка ниже решает, сворачивать ли ряд автоматически при наличии черновика.',
        'manager.rowModeHintOff': 'Ряд полностью скрыт: кнопки и пилюля не отображаются. Верните «Показывать весь ряд» или «Свернуть в пилюлю», чтобы восстановить его без перезапуска.',
        'manager.rowHiddenBadge': 'Ряд скрыт',
        'manager.manageEntry': 'Доступ к управлению',
        'manager.manageText': 'Текстовая кнопка',
        'manager.manageIcon': 'Значок шестерни',
        'manager.manageHidden': 'Скрыт',
        'manager.manageHint': 'Кнопка «Управление» в конце ряда может остаться текстом, стать значком шестерни или исчезнуть; если её скрыть, попасть в управление можно только через «Настройки → Быстрые фразы».',
        'manager.autoHide': 'Когда в поле есть текст',
        'manager.autoHideFold': 'Сворачивать автоматически',
        'manager.autoHideKeep': 'Оставлять видимым',
        'manager.autoHideHint': 'Сворачивает ряд в небольшую пилюлю, когда в поле есть текст или вложения; нажмите на пилюлю, чтобы временно раскрыть её, не мешая вводу.',
        'manager.hide': 'Скрыть эту фразу',
        'manager.show': 'Показать эту фразу',
        'manager.hiddenBadge': 'Скрыта',
        'manager.label': 'Отображаемое имя',
        'manager.text': 'Отправляемый текст',
        'manager.labelPlaceholder': 'Текст на кнопке, например: Отправить',
        'manager.textPlaceholder': 'Что вставляет кнопка, например: Закоммитить изменения и запушить в удалённый репозиторий',
        'manager.newPhrase': 'Новая фраза',
        'manager.empty': 'Список пуст. Добавьте фразу, чтобы начать.',
        'manager.savedHint': 'Изменения сохраняются автоматически и применяются сразу.',
        'manager.tip': 'Перетащите маркер или используйте ↑↓ для изменения порядка; изменения сохраняются автоматически.',
        'default.continue.label': 'Продолжить',
        'default.continue.text': 'Продолжить',
        'default.commit.label': 'Коммит',
        'default.commit.text': 'Закоммитить изменения и запушить в удалённый репозиторий',
        'default.push.label': 'Пуш',
        'default.push.text': 'Запушить локальные коммиты в удалённый репозиторий',
        'default.release.label': 'Релиз',
        'default.release.text': 'Закоммитить, запушить, опубликовать новую версию и обновить локальную копию',
        'manager.starHint': 'Полезно? Откройте ссылку и нажмите Star в правом верхнем углу репозитория:',
        'manager.starLink': 'Поставить звезду',
      },
      pt: {
        'section.title': 'Frases rápidas',
        'section.description': 'Uma linha de botões de frases junto ao campo de texto. O botão mostra o nome de exibição, enquanto o texto enviado é editado separadamente. As opções abaixo decidem onde a linha aparece, o que acontece ao clicar e quando ela recolhe.',
        'dock.manage': 'Gerenciar',
        'dock.openFailed': 'Gerencie em Configurações → Frases rápidas',
        'dock.tooltip': 'Inserir no campo de texto',
        'dock.collapse': 'Recolher',
        'dock.collapseHint': 'Recolher a linha em uma pequena pílula',
        'dock.expand': 'Frases rápidas',
        'dock.expandHint': 'Mostrar as frases rápidas',
        'manager.add': 'Adicionar frase',
        'manager.phrases': 'Frases',
        'manager.count': '{n}',
        'manager.preview': 'Prévia do botão',
        'manager.untitled': 'Sem título',
        'manager.chars': '{n} caracteres',
        'manager.drag': 'Arraste para reordenar',
        'manager.deleteConfirm': 'Excluir esta frase',
        'manager.deleteShort': 'Confirmar',
        'manager.reset': 'Restaurar padrões',
        'manager.resetConfirm': 'Clique novamente para confirmar',
        'manager.delete': 'Excluir',
        'manager.moveUp': 'Mover para cima',
        'manager.moveDown': 'Mover para baixo',
        'manager.placement': 'Posição',
        'manager.placementDock': 'Abaixo do campo de texto',
        'manager.placementTop': 'Acima do campo de texto',
        'manager.placementTool': 'Barra de ferramentas',
        'manager.placementHint': 'A linha se move assim que você troca a opção. A barra de ferramentas é estreita, então frases que não cabem rolam horizontalmente.',
        'manager.clickMode': 'Ao clicar na frase',
        'manager.clickSend': 'Enviar diretamente',
        'manager.clickInsert': 'Inserir no campo de texto',
        'manager.clickHint': '«Enviar diretamente» envia a frase com um clique quando o campo está vazio; se já houver texto ou anexos, a frase é inserida no cursor, sem apagar nada do que você estava escrevendo.',
        'manager.rowMode': 'Exibição da linha',
        'manager.rowModeFull': 'Mostrar a linha completa',
        'manager.rowModePill': 'Recolher em pílula',
        'manager.rowModeHidden': 'Ocultar completamente',
        'manager.rowModeHint': 'Controla a forma da linha: «Recolher em pílula» deixa apenas uma pequena pílula expansível, enquanto «Ocultar completamente» remove toda a linha, inclusive a pílula. A opção abaixo decide se um rascunho a recolhe automaticamente.',
        'manager.rowModeHintOff': 'A linha está completamente oculta: nenhum botão ou pílula aparece. Volte para «Mostrar a linha completa» ou «Recolher em pílula» para restaurá-la, sem reiniciar.',
        'manager.rowHiddenBadge': 'Linha oculta',
        'manager.manageEntry': 'Acesso à gestão',
        'manager.manageText': 'Botão de texto',
        'manager.manageIcon': 'Ícone de engrenagem',
        'manager.manageHidden': 'Oculto',
        'manager.manageHint': 'O botão «Gerenciar» no fim da linha pode continuar como texto, virar uma engrenagem ou ser omitido; uma vez oculto, só é acessível em Configurações → Frases rápidas.',
        'manager.autoHide': 'Quando o campo tem texto',
        'manager.autoHideFold': 'Recolher automaticamente',
        'manager.autoHideKeep': 'Manter visível',
        'manager.autoHideHint': 'Recolhe a linha em uma pequena pílula enquanto o campo contém texto ou anexos; clique na pílula para expandi-la sem atrapalhar o que você está escrevendo.',
        'manager.hide': 'Ocultar esta frase',
        'manager.show': 'Mostrar esta frase',
        'manager.hiddenBadge': 'Oculta',
        'manager.label': 'Nome de exibição',
        'manager.text': 'Texto enviado',
        'manager.labelPlaceholder': 'Texto do botão, ex.: Enviar',
        'manager.textPlaceholder': 'O que o botão insere, ex.: Fazer commit das alterações e enviar ao remoto',
        'manager.newPhrase': 'Nova frase',
        'manager.empty': 'A lista está vazia. Adicione uma frase para começar.',
        'manager.savedHint': 'As alterações são salvas automaticamente e entram em vigor na hora.',
        'manager.tip': 'Arraste a alça ou use ↑↓ para reordenar; as alterações são salvas automaticamente.',
        'default.continue.label': 'Continuar',
        'default.continue.text': 'Continuar',
        'default.commit.label': 'Commit',
        'default.commit.text': 'Fazer commit das alterações e enviar ao remoto',
        'default.push.label': 'Push',
        'default.push.text': 'Enviar commits locais ao remoto',
        'default.release.label': 'Publicar',
        'default.release.text': 'Commite, dê push, publique a nova versão e atualize localmente',
        'manager.starHint': 'Gostou? Abra o link e clique em Star no canto superior direito do repositório:',
        'manager.starLink': 'Dar uma estrela',
      },
    }

    var DEFAULT_SPECS = [
      { id: 'continue', label: 'default.continue.label', text: 'default.continue.text' },
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
      return { id: id, label: label, text: text, hidden: item.hidden === true }
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
        return { id: spec.id, label: t(spec.label), text: t(spec.text), hidden: false }
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
        hidden: typeof patch.hidden === 'boolean' ? patch.hidden : current.hidden === true,
      }
      replacePhrases(next)
    }

    function insertPhrase() {
      if (state === null) return null
      var id = uniqueId()
      replacePhrases(state.concat([{ id: id, label: '', text: '', hidden: false }]))
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
     * Visibility: the row folds into a pill, and the manager can hide it
     * entirely (no pill, nothing rendered; only Settings brings it back).
     * ------------------------------------------------------------------ */

    /**
     * One localStorage-backed string toggle shared by the dock and the manager.
     * `values` is the whitelist, so a hand-edited storage entry can never put a
     * component into a state it does not know how to render.
     */
    function makeEnumStore(key, values, fallback, label) {
      var current = null

      function isValue(value) {
        return values.indexOf(value) >= 0
      }

      function read() {
        try {
          var raw = window.localStorage.getItem(key)
          if (raw !== null && isValue(raw)) return raw
        } catch (error) {
          console.warn('[quick-phrases] could not read the stored ' + label, error)
        }
        return fallback
      }

      function ensure() {
        if (current !== null) return current
        current = read()
        return current
      }

      function set(next) {
        if (!isValue(next) || next === ensure()) return
        current = next
        try {
          window.localStorage.setItem(key, next)
        } catch (error) {
          console.warn('[quick-phrases] could not persist the ' + label, error)
        }
        emit()
      }

      /** Subscribes a component to this toggle and returns the current value. */
      function use() {
        var tick = React.useState(0)
        var setTick = tick[1]
        React.useEffect(function () {
          var unsubscribe = subscribe(function () {
            setTick(function (value) { return value + 1 })
          })
          function onStorage(event) {
            if (event.key !== key) return
            current = read()
            setTick(function (value) { return value + 1 })
          }
          window.addEventListener('storage', onStorage)
          return function () {
            unsubscribe()
            window.removeEventListener('storage', onStorage)
          }
        }, [])
        return ensure()
      }

      return { read: read, set: set, use: use }
    }

    var collapseStore = makeEnumStore(COLLAPSE_KEY, ['0', '1'], '0', 'collapsed state')
    var autoHideStore = makeEnumStore(AUTOHIDE_KEY, AUTO_HIDE_MODES, DEFAULT_AUTO_HIDE, 'auto-hide mode')
    var hiddenStore = makeEnumStore(HIDDEN_KEY, ['0', '1'], '0', 'row hidden state')
    var manageStore = makeEnumStore(MANAGE_KEY, MANAGE_MODES, DEFAULT_MANAGE, 'manage entry mode')

    function useCollapsed() {
      return collapseStore.use() === '1'
    }

    function setCollapsed(value) {
      collapseStore.set(value ? '1' : '0')
    }

    function useAutoHide() {
      return autoHideStore.use()
    }

    function setAutoHide(value) {
      autoHideStore.set(value)
    }

    /** `true` while the manager keeps the whole row out of the UI. */
    function useHidden() {
      return hiddenStore.use() === '1'
    }

    function setHidden(value) {
      hiddenStore.set(value ? '1' : '0')
    }

    /** `text` | `icon` | `hidden`, default `text`. */
    function useManageEntry() {
      return manageStore.use()
    }

    function setManageEntry(value) {
      manageStore.set(value)
    }

    /** Derives the settings dropdown value: hidden wins over a leftover fold. */
    function rowModeOf(hidden, collapsed) {
      if (hidden) return 'hidden'
      if (collapsed) return 'pill'
      return 'full'
    }

    /**
     * Writes the two existing keys instead of adding a third. `full` and `pill`
     * clear the hidden flag first; `hidden` leaves the collapsed value alone so
     * a folded row cannot reappear as a pill while it is hidden.
     */
    function setRowMode(mode) {
      if (mode === 'hidden') {
        setHidden(true)
        return
      }
      if (mode === 'pill') {
        setHidden(false)
        setCollapsed(true)
        return
      }
      if (mode !== 'full') return
      setHidden(false)
      setCollapsed(false)
    }

    /* ------------------------------------------------------------------ *
     * Width fitting: shed the least important chips first. Driven by the
     * row's real content width (ResizeObserver), never by a fixed px
     * breakpoint, so short and long captions both degrade correctly.
     * ------------------------------------------------------------------ */

    var CHIP_GAP = 6

    function finitePx(value) {
      return typeof value === 'number' && isFinite(value) ? value : null
    }

    function widthOf(value) {
      var px = finitePx(value)
      return px === null || px < 0 ? 0 : px
    }

    /**
     * Pure, DOM-free fitter. Return the chips that survive at `available` px.
     * Priority: collapse (least important) -> manage -> phrase chips from the
     * end. The first usable phrase chip is never dropped; with no phrase at
     * all both trailing controls stay reachable.
     *
     * options: { phraseWidths, collapseWidth, manageWidth, manage, gap }
     * returns: { phraseCount, collapse, manage }
     */
    function fitRowToWidth(available, options) {
      var opts = options && typeof options === 'object' ? options : {}
      var widths = Array.isArray(opts.phraseWidths) ? opts.phraseWidths : []
      var gap = widthOf(opts.gap)
      if (gap === 0) gap = CHIP_GAP
      var collapseWidth = widthOf(opts.collapseWidth)
      var manageWidth = widthOf(opts.manageWidth)
      var manage = opts.manage !== false
      var plan = { phraseCount: widths.length, collapse: true, manage: manage }
      var px = finitePx(available)

      if (px === null || px <= 0 || widths.length === 0) return plan

      function used(candidate) {
        var total = 0
        var count = 0
        for (var i = 0; i < candidate.phraseCount; i += 1) {
          total += widthOf(widths[i])
          count += 1
        }
        if (candidate.collapse) { total += collapseWidth; count += 1 }
        if (candidate.manage) { total += manageWidth; count += 1 }
        if (count > 1) total += gap * (count - 1)
        return total
      }

      while (used(plan) > px) {
        if (plan.collapse) plan.collapse = false
        else if (plan.manage) plan.manage = false
        else if (plan.phraseCount > 1) plan.phraseCount -= 1
        else break
      }
      return plan
    }

    /**
     * Test seam: the smoke-test sandbox has no DOM / ResizeObserver, so it can
     * pin the available width and the per-chip measured widths here. `null`
     * restores real DOM measurement. No user-facing code writes this object.
     */
    var widthFitProbe = {
      available: null,
      phrases: null,
      collapseWidth: null,
      manageWidth: null,
    }

    window.__DQP_WIDTH_FIT__ = {
      fit: fitRowToWidth,
      setAvailableWidth: function (value) { widthFitProbe.available = finitePx(value) },
      setChipWidths: function (widths) {
        widthFitProbe.phrases = Array.isArray(widths) ? widths.slice() : null
      },
      setTrailingWidths: function (collapse, manage) {
        widthFitProbe.collapseWidth = finitePx(collapse)
        widthFitProbe.manageWidth = finitePx(manage)
      },
      reset: function () {
        widthFitProbe.available = null
        widthFitProbe.phrases = null
        widthFitProbe.collapseWidth = null
        widthFitProbe.manageWidth = null
      },
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
      '.dqp-chip-manage-icon{padding:0;width:24px}' +
      '.dqp-chip-manage svg{display:block}' +
      '.dqp-chip-collapse{color:var(--dsw-alias-label-caption,#7d7d7d);border-style:dashed;background:transparent}' +
      '.dqp-chip-collapse:hover{color:var(--dsw-alias-label-secondary,#b9b9b9)}' +
      '.dqp-pill{gap:4px;color:var(--dsw-alias-label-tertiary,#9a9a9a);border-style:dashed;background:transparent}' +
      '.dqp-pill:hover{color:var(--dsw-alias-label-primary,#eee)}' +
      '.dqp-chip-icon{justify-content:center;width:24px;padding:0;gap:0;border-style:solid;' +
      'border-color:var(--dsw-alias-border-l1,#3f3f3f);background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.05))}' +
      '.dqp-chip-icon:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));' +
      'border-color:var(--dsw-alias-border-l3,#5a5a5a)}' +
      '.dqp-chip-icon svg{display:block;flex:0 0 auto}' +
      '.dqp-chip-icon:active svg{transform:scale(.9)}' +
      '.dqp-dock-tool .dqp-chip-icon,.dqp-dock-tool .dqp-chip-manage-icon{width:22px;height:22px}' +
      '.dqp-chip-icon svg,.dqp-dock-tool .dqp-chip-icon svg{transition:transform .12s ease}' +
      '.dqp-hint{color:var(--dsw-alias-state-warn-primary,#e0a33a);white-space:nowrap}'

    var MANAGER_CSS =
      /* ------------------------------------------------------------------ *
       * MANAGER PAGE — Apple-settings restraint: grouped rows, hairline
       * dividers, one accent, precise alignment. The host's settings .options
       * cell owns scrolling; this page must stay naturally growing
       * (min-width:0; min-height:100% — never height:100%/overflow).
       * ------------------------------------------------------------------ */
      '.dqp-page{box-sizing:border-box;min-width:0;min-height:100%;display:flex;justify-content:center;' +
      'padding:18px clamp(16px,4vw,48px) 24px;font-family:inherit;color:var(--dsw-alias-label-primary,#eee)}' +
      '.dqp-inner{width:100%;max-width:800px;display:flex;flex-direction:column;gap:18px}' +
      /* Masthead: rule, title, description, count — like an instrument label. */
      '.dqp-head{display:flex;align-items:flex-start;gap:12px;position:relative;padding:0 0 0 12px}' +
      '.dqp-head::before{content:"";position:absolute;left:0;top:4px;bottom:4px;width:2px;' +
      'border-radius:2px;background:var(--dsw-alias-brand-primary,#4c6fff)}' +
      '.dqp-head-text{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:2px}' +
      '.dqp-title{margin:0;font-size:17px;line-height:24px;font-weight:650;letter-spacing:.01em}' +
      '.dqp-desc{max-width:88ch;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary,#b9b9b9)}' +
      '.dqp-badge{flex:0 0 auto;display:inline-flex;align-items:center;height:20px;padding:0 9px;border-radius:5px;' +
      'border:.5px solid var(--dsw-alias-border-l2,#494949);' +
      'background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.05));color:var(--dsw-alias-label-tertiary,#9a9a9a);' +
      'font-size:11px;line-height:1;font-variant-numeric:tabular-nums;white-space:nowrap}' +
      /* Setting groups: labelled rows on a shared surface, hairline dividers. */
      '.dqp-options{display:flex;flex-direction:column;border:.5px solid var(--dsw-alias-border-l2,#494949);' +
      'border-radius:var(--dsw-radius-md,10px);background:var(--dsw-alias-settings-card-fill,transparent);overflow:hidden}' +
      '.dqp-option{display:flex;align-items:center;gap:16px;padding:5px 14px;min-height:34px;' +
      'border-top:.5px solid var(--dsw-alias-border-l1,#3a3a3a);' +
      'transition:background-color .14s ease}' +
      '.dqp-option:first-child{border-top:0}' +
      '.dqp-option:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.04))}' +
      '.dqp-option-text{flex:1 1 auto;min-width:0;display:flex;flex-direction:row;align-items:baseline;flex-wrap:wrap;gap:2px 10px}' +
      '.dqp-option-label{font-size:12px;line-height:17px;font-weight:600;letter-spacing:.01em;' +
      'color:var(--dsw-alias-label-primary,#eee)}' +
      '.dqp-option-hint{flex:1 1 100%;min-width:0;overflow-wrap:anywhere;font-size:10px;line-height:14px;' +
      'color:var(--dsw-alias-label-caption,#7d7d7d)}' +
      '.dqp-select-wrap{position:relative;flex:0 0 auto;display:inline-flex}' +
      '.dqp-select-wrap::after{content:"";position:absolute;right:11px;top:50%;width:5px;height:5px;margin-top:-4px;' +
      'border-right:1.4px solid var(--dsw-alias-label-tertiary,#9a9a9a);border-bottom:1.4px solid var(--dsw-alias-label-tertiary,#9a9a9a);' +
      'transform:rotate(45deg);pointer-events:none}' +
      '.dqp-select{box-sizing:border-box;height:28px;min-width:136px;padding:0 30px 0 11px;' +
      'border:.5px solid var(--dsw-alias-border-l2,#494949);' +
      'border-radius:var(--dsw-radius-sm,8px);background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.05));' +
      'color:var(--dsw-alias-label-primary,#eee);font:inherit;font-size:12px;line-height:1;appearance:none;-webkit-appearance:none;cursor:pointer;' +
      'transition:border-color .14s ease,background-color .14s ease}' +
      '.dqp-select:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));' +
      'border-color:var(--dsw-alias-border-l3,#5a5a5a)}' +
      '.dqp-select:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary,#4c6fff));outline-offset:1px;' +
      'border-color:var(--dsw-alias-brand-primary,#4c6fff)}' +
      '.dqp-row-muted .dqp-body{opacity:.55}' +
      '.dqp-badge-hidden{margin-left:2px;border:.5px solid var(--dsw-alias-state-warn-primary,#e0a33a);' +
      'background:transparent;color:var(--dsw-alias-state-warn-primary,#e0a33a)}' +
      '.dqp-option-label-row{display:flex;align-items:center;flex-wrap:wrap;gap:6px}' +
      '.dqp-badge-row-hidden{margin-left:0;padding:1px 7px;border:.5px solid var(--dsw-alias-state-warn-primary,#e0a33a);' +
      'background:transparent;color:var(--dsw-alias-state-warn-primary,#e0a33a)}' +
      '.dqp-option-hint-warn{color:var(--dsw-alias-state-warn-primary,#e0a33a)}' +
      '.dqp-eye-off{color:var(--dsw-alias-label-caption,#7d7d7d)}' +
      '.dqp-eye-off:hover:not(:disabled){color:var(--dsw-alias-label-primary,#eee)}' +
      /* Phrase section: title with rule + count, then editor rows. */
      '.dqp-section{display:flex;flex-direction:column;gap:8px}' +
      '.dqp-section-head{display:flex;align-items:center;flex-wrap:wrap;gap:8px;min-height:28px;' +
      'padding-bottom:6px;border-bottom:.5px solid var(--dsw-alias-border-l2,#494949)}' +
      '.dqp-section-title{flex:1 1 auto;margin:0;font-size:13px;line-height:19px;font-weight:650;letter-spacing:.02em}' +
      '.dqp-btn{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:5px;height:28px;padding:0 13px;' +
      'border:.5px solid var(--dsw-alias-border-l2,#494949);border-radius:var(--dsw-radius-sm,8px);' +
      'background:var(--dsw-alias-bg-layer-1,rgba(255,255,255,.04));color:var(--dsw-alias-label-primary,#eee);' +
      'font:inherit;font-size:12px;line-height:1;cursor:pointer;' +
      'transition:background-color .14s ease,border-color .14s ease,color .14s ease,transform .14s ease}' +
      '.dqp-btn:not(.dqp-btn-primary):hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));' +
      'border-color:var(--dsw-alias-border-l3,#5a5a5a)}' +
      '.dqp-btn:active:not(:disabled){transform:translateY(1px)}' +
      '.dqp-btn:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary,#4c6fff));outline-offset:2px}' +
      '.dqp-btn-primary{border-color:transparent;background:var(--dsw-alias-button-primary-fill,#4c6fff);' +
      'color:var(--dsw-alias-label-primary-foreground,#fff);font-weight:600;' +
      'box-shadow:0 1px 2px var(--dsw-alias-bg-mask-2,rgba(0,0,0,.25))}' +
      '.dqp-btn-primary:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover,#3f5fe0)}' +
      '.dqp-btn-warn{color:var(--dsw-alias-state-warn-primary,#e0a33a);border-color:var(--dsw-alias-state-warn-primary,#e0a33a)}' +
      '.dqp-list{display:flex;flex-direction:column;gap:6px;min-width:0}' +
      /* Each row: handle, editable body. Hover/focus light up the leading rule;
         drop target uses the brand accent as a single signal. */
      '.dqp-row{display:flex;align-items:flex-start;gap:8px;min-width:0;padding:8px 12px 8px 4px;' +
      'border:.5px solid var(--dsw-alias-border-l2,#494949);' +
      'border-radius:var(--dsw-radius-md,10px);background:var(--dsw-alias-settings-card-fill,transparent);' +
      'box-shadow:inset 2px 0 0 var(--dsw-alias-border-l1,#3a3a3a);' +
      'transition:border-color .14s ease,box-shadow .14s ease,opacity .14s ease,background-color .14s ease}' +
      '.dqp-row:hover{border-color:var(--dsw-alias-border-l3,#5a5a5a);' +
      'box-shadow:inset 2px 0 0 var(--dsw-alias-brand-primary,#4c6fff)}' +
      '.dqp-row:focus-within{border-color:var(--dsw-alias-border-l3,#5a5a5a);' +
      'box-shadow:inset 2px 0 0 var(--dsw-alias-brand-primary,#4c6fff)}' +
      '.dqp-row-dragging{opacity:.45}' +
      '.dqp-row-over{border-color:var(--dsw-alias-brand-primary,#4c6fff);' +
      'box-shadow:0 0 0 1px var(--dsw-alias-brand-primary,#4c6fff);background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.04))}' +
      '.dqp-grip{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;width:22px;height:28px;padding:0;' +
      'border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-caption,#7d7d7d);' +
      'font:inherit;font-size:13px;line-height:1;letter-spacing:-1px;cursor:grab;user-select:none;' +
      'transition:background-color .14s ease,color .14s ease}' +
      '.dqp-grip:hover{color:var(--dsw-alias-label-primary,#eee);' +
      'background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06))}' +
      '.dqp-grip:active{cursor:grabbing}' +
      '.dqp-grip:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary,#4c6fff));outline-offset:1px}' +
      '.dqp-body{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:4px}' +
      '.dqp-row-head{display:flex;align-items:center;flex-wrap:wrap;gap:6px;min-width:0}' +
      '.dqp-label-input{box-sizing:border-box;flex:1 1 120px;min-width:0;height:28px;padding:0 9px;' +
      'border:.5px solid transparent;border-radius:var(--dsw-radius-sm,8px);background:transparent;' +
      'color:var(--dsw-alias-label-primary,#eee);font:inherit;font-size:13px;font-weight:600;letter-spacing:.01em;line-height:18px;' +
      'transition:background-color .14s ease,border-color .14s ease,box-shadow .14s ease}' +
      '.dqp-label-input:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.05))}' +
      '.dqp-label-input:focus{outline:none;background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.04));' +
      'border-color:var(--dsw-alias-brand-primary,#4c6fff);box-shadow:0 0 0 2px rgba(0,0,0,.12)}' +
      '.dqp-label-input::placeholder{color:var(--dsw-alias-label-caption,#7d7d7d);font-weight:400}' +
      '.dqp-row-actions{display:flex;align-items:center;gap:2px;flex:0 0 auto;margin-left:auto}' +
      '.dqp-icon{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;' +
      'border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-tertiary,#9a9a9a);' +
      'font:inherit;font-size:12px;line-height:1;cursor:pointer;transition:background-color .14s ease,color .14s ease,transform .14s ease}' +
      '.dqp-icon:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));color:var(--dsw-alias-label-primary,#eee)}' +
      '.dqp-icon:active:not(:disabled){transform:scale(.92)}' +
      '.dqp-icon:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary,#4c6fff));outline-offset:1px}' +
      '.dqp-icon:disabled{opacity:.35;cursor:default}' +
      '.dqp-icon-danger:hover:not(:disabled){background:var(--dsw-alias-state-error-primary,#e35d5d);color:var(--dsw-alias-label-on-color,#fff)}' +
      '.dqp-icon-confirm{width:auto;padding:0 7px;font-size:11px;color:var(--dsw-alias-state-error-primary,#e35d5d);' +
      'background:transparent;box-shadow:inset 0 0 0 .5px var(--dsw-alias-state-error-primary,#e35d5d)}' +
      '.dqp-textarea{box-sizing:border-box;width:100%;min-height:44px;padding:5px 10px;border:.5px solid var(--dsw-alias-border-l2,#494949);' +
      'border-radius:var(--dsw-radius-sm,8px);background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.03));' +
      'color:var(--dsw-alias-label-primary,#eee);font:inherit;font-size:12px;line-height:18px;resize:vertical;' +
      'transition:border-color .14s ease,box-shadow .14s ease}' +
      '.dqp-textarea:hover{border-color:var(--dsw-alias-border-l3,#5a5a5a)}' +
      '.dqp-textarea:focus{outline:none;border-color:var(--dsw-alias-brand-primary,#4c6fff);box-shadow:0 0 0 2px rgba(0,0,0,.12)}' +
      '.dqp-textarea::placeholder{color:var(--dsw-alias-label-caption,#7d7d7d)}' +
      '.dqp-row-meta{display:flex;align-items:center;flex-wrap:wrap;gap:8px;min-width:0;font-size:10px;line-height:15px;' +
      'color:var(--dsw-alias-label-caption,#7d7d7d);font-variant-numeric:tabular-nums}' +
      '.dqp-preview{display:inline-flex;align-items:center;height:20px;max-width:240px;padding:0 9px;' +
      'border:.5px solid var(--dsw-alias-border-l2,#494949);border-radius:5px;' +
      'background:var(--dsw-alias-bg-layer-1,rgba(255,255,255,.04));color:var(--dsw-alias-label-secondary,#b9b9b9);' +
      'overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.dqp-preview-empty{opacity:.55}' +
      '.dqp-meta-grow{flex:1 1 auto}' +
      /* Empty state: a quiet inset panel with a measured, centred message. */
      '.dqp-empty{padding:40px 20px;text-align:center;font-size:12px;line-height:20px;' +
      'color:var(--dsw-alias-label-tertiary,#9a9a9a);border:.5px dashed var(--dsw-alias-border-l2,#494949);' +
      'border-radius:var(--dsw-radius-md,10px);background:var(--dsw-alias-bg-layer-1,rgba(255,255,255,.02))}' +
      /* Footer: top rule, caption type — a closing instrument label. */
      '.dqp-foot{margin:0;padding-top:8px;border-top:.5px solid var(--dsw-alias-border-l1,#3a3a3a);' +
      'font-size:10px;line-height:15px;color:var(--dsw-alias-label-caption,#7d7d7d)}' +
      /* Support line: a small calibrated label; the star link is the one quiet
         accent in the otherwise caption-coloured closing block. */
      '.dqp-star{min-width:0;margin:2px 0 0;font-size:10px;line-height:15px;' +
      'color:var(--dsw-alias-label-caption,#7d7d7d)}' +
      '.dqp-star-link{display:inline-flex;align-items:center;gap:4px;margin-left:5px;' +
      'padding:4px 8px;min-height:28px;border-radius:5px;text-decoration:none;white-space:nowrap;' +
      'color:var(--dsw-alias-brand-text,var(--dsw-alias-brand-primary,#4c6fff));' +
      'font:inherit;font-variant-numeric:tabular-nums;font-weight:600;' +
      'transition:background-color .14s ease,color .14s ease,box-shadow .14s ease}' +
      '.dqp-star-link:hover{background:var(--dsw-alias-interactive-bg-hover-accent,rgba(76,111,255,.14));' +
      'color:var(--dsw-alias-brand-primary,#4c6fff)}' +
      '.dqp-star-link:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary,#4c6fff));outline-offset:2px}' +
      '.dqp-star-glyph{font-size:10px;line-height:1}' +
      '.dqp-fields{flex:1;min-width:0;display:flex;flex-direction:column;gap:8px}' +
      '.dqp-field{display:flex;align-items:flex-start;gap:8px;min-width:0}' +
      '.dqp-field-name{flex:0 0 64px;padding-top:8px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary,#9a9a9a)}' +
      '.dqp-input{box-sizing:border-box;flex:1;min-width:0;width:100%;padding:7px 11px;border:.5px solid var(--dsw-alias-border-l2,#494949);' +
      'border-radius:var(--dsw-radius-sm,8px);background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.03));' +
      'color:var(--dsw-alias-label-primary,#eee);font:inherit;font-size:12px;line-height:18px;resize:vertical;' +
      'transition:border-color .14s ease,box-shadow .14s ease}' +
      '.dqp-input::placeholder{color:var(--dsw-alias-label-caption,#7d7d7d)}' +
      '.dqp-input:focus{outline:none;border-color:var(--dsw-alias-brand-primary,#4c6fff);box-shadow:0 0 0 2px rgba(0,0,0,.12)}' +
      /* Narrow viewports: stack option label above its control and let phrase
         rows breathe; never introduce horizontal overflow. */
      '@media (max-width:560px){' +
      '.dqp-page{padding:14px 14px 20px}' +
      '.dqp-inner{gap:14px}' +
      '.dqp-head{padding-left:10px}' +
      '.dqp-title{font-size:17px;line-height:24px}' +
      '.dqp-option{align-items:stretch;flex-direction:column;gap:2px;padding:7px 12px;min-height:0}' +
      '.dqp-select-wrap{width:100%}' +
      '.dqp-select{width:100%;min-width:0}' +
      '.dqp-btn{height:28px}' +
      '.dqp-row{gap:6px;padding:6px 10px 6px 2px;flex-wrap:nowrap;align-items:flex-start}' +
      '.dqp-row-head{flex-wrap:wrap}' +
      '.dqp-label-input{flex:1 1 90px;min-width:0}' +
      '.dqp-row-actions{flex:0 0 auto;margin-left:auto;gap:0}' +
      '.dqp-icon{width:28px;height:28px}' +
      '.dqp-preview{max-width:170px}' +
      '}'

    /* ------------------------------------------------------------------ *
     * Dock chips
     * ------------------------------------------------------------------ */

    var DICT_KEYS = ['zh', 'en', 'es', 'fr', 'de', 'ru', 'pt']

    /** Language of the last-resort dictionary when the host gives us no `t`. */
    function navigatorDictKey() {
      if (typeof navigator === 'undefined') return 'en'
      var raw = String(navigator.language || navigator.userLanguage || '').toLowerCase()
      var base = raw.replace(/_/g, '-').split('-')[0]
      for (var i = 0; i < DICT_KEYS.length; i += 1) {
        if (base === DICT_KEYS[i]) return DICT_KEYS[i]
      }
      return 'en'
    }

    /** The slot synthesizes `t` from the locale seat, already bound to the DSH
     * language; both seeded defaults and UI strings use that same source. A host
     * that drops the seat falls back to navigator.language across all seven
     * dictionaries instead of the old zh/en-only split. */
    function resolveT(props) {
      if (typeof props.t === 'function') return props.t
      var dict = DICTS[navigatorDictKey()] || DICTS.en
      return function (key) {
        return dict[key] !== undefined ? dict[key] : key
      }
    }

    function phraseCaption(phrase) {
      if (phrase.label !== '') return phrase.label
      var firstLine = phrase.text.split('\n')[0]
      return firstLine.length > 24 ? firstLine.slice(0, 24) + '…' : firstLine
    }

    /** Inline 24px-grid glyphs — hairline strokes, square caps, no font dependency. */
    function dockIcon(name) {
      return h('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
        h('path', {
          d: name === 'expand' ? 'm9 6 6 6-6 6'
            : name === 'collapse' ? 'm6 9 6 6 6-6'
              : 'M10.6 3.8a1.6 1.6 0 0 1 2.8 0l1 1.8c.2.3.5.5.9.5l2-.2a1.6 1.6 0 0 1 1.7 2.3l-1 1.8a1.7 1.7 0 0 0 0 1.6l1 1.8a1.6 1.6 0 0 1-1.7 2.3l-2-.2a1.7 1.7 0 0 0-.9.5l-1 1.8a1.6 1.6 0 0 1-2.8 0l-1-1.8a1.7 1.7 0 0 0-.9-.5l-2 .2a1.6 1.6 0 0 1-1.7-2.3l1-1.8a1.7 1.7 0 0 0 0-1.6l-1-1.8A1.6 1.6 0 0 1 6.7 6.2l2 .2c.4 0 .7-.2.9-.5l1-1.8Z',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
        name === 'manage' ? h('circle', { cx: 12, cy: 12, r: 3, stroke: 'currentColor', strokeWidth: 1.6 }) : null)
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
        var collapsed = useCollapsed()
        var autoHide = useAutoHide()
        var hidden = useHidden()
        var manageEntry = useManageEntry()
        var peekState = React.useState(false)
        var peeked = peekState[0]
        var setPeeked = peekState[1]
        var showHint = React.useState(false)
        var setShowHint = showHint[1]
        var hintTimer = React.useRef(null)
        // Width fitting state. These hooks are unconditional so the hook count
        // never changes with the placement, folded state, or fitted chip count.
        var widthTickState = React.useState(0)
        var bumpWidth = widthTickState[1]
        var rowRef = React.useRef(null)
        var metricsRef = React.useRef({ available: null, phrases: {} })
        var hasDraft = draft.trim() !== '' || attachments > 0
        var folded = collapsed || (autoHide === 'fold' && hasDraft && !peeked)
        var usable = phrases.filter(function (phrase) {
          return phrase.text.trim() !== '' && phrase.hidden !== true
        })

        // A peek only covers the draft that asked for it: once the composer is
        // empty again the row is back to its normal width on its own.
        React.useEffect(function () {
          if (!hasDraft) setPeeked(false)
        }, [hasDraft])

        React.useEffect(function () {
          return function () {
            if (hintTimer.current !== null) window.clearTimeout(hintTimer.current)
          }
        }, [])

        // Re-measure on every render so changes in caption/phrase list update
        // the fit. ResizeObserver adds a nudge when the container changes without
        // a React update; without it the row still fits on each render.
        React.useEffect(function () {
          function measure() {
            var node = rowRef.current
            if (node === null || node === undefined) return
            var available = finitePx(node.clientWidth)
            if (available === null) return
            // Shed chips must keep their cached widths; otherwise dropping one
            // would free an estimated 0px next render and make the row oscillate.
            var phrases = {}
            for (var key in metricsRef.current.phrases) {
              if (Object.prototype.hasOwnProperty.call(metricsRef.current.phrases, key)) {
                phrases[key] = metricsRef.current.phrases[key]
              }
            }
            var collapseWidth = metricsRef.current.collapseWidth
            var manageWidth = metricsRef.current.manageWidth
            for (var i = 0; i < node.children.length; i += 1) {
              var child = node.children[i]
              if (child === null || child === undefined || typeof child.className !== 'string') continue
              var value = finitePx(child.getBoundingClientRect ? child.getBoundingClientRect().width : child.offsetWidth)
              if (value === null) continue
              if (child.className.indexOf('dqp-chip-collapse') >= 0) collapseWidth = value
              else if (child.className.indexOf('dqp-chip-manage') >= 0) manageWidth = value
              else if (child.className.indexOf('dqp-chip') >= 0) phrases[i] = value
            }
            var prev = metricsRef.current
            var changed = prev.available !== available || prev.collapseWidth !== collapseWidth ||
              prev.manageWidth !== manageWidth
            if (!changed) {
              for (var nextKey in phrases) {
                if (Object.prototype.hasOwnProperty.call(phrases, nextKey) && prev.phrases[nextKey] !== phrases[nextKey]) {
                  changed = true
                  break
                }
              }
            }
            if (changed) {
              metricsRef.current = { available: available, phrases: phrases, collapseWidth: collapseWidth, manageWidth: manageWidth }
              bumpWidth(function (value) { return value + 1 })
            }
          }
          measure()
          var node = rowRef.current
          if (node === null || node === undefined || typeof window.ResizeObserver !== 'function') return undefined
          var observer = new window.ResizeObserver(measure)
          observer.observe(node)
          return function () { observer.disconnect() }
        })

        if (current !== spec.value) return null

        // A completely hidden row leaves nothing on screen — no chips, no pill,
        // not even an empty wrapper. It wins over the folded state, so a row the
        // user hid while folded cannot come back as a pill on the next render.
        if (hidden) return null

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

        // Available width comes from the real DOM measurement (or the test
        // probe). Without either we render the full row — safe degradation.
        var available = widthFitProbe.available !== null
          ? widthFitProbe.available
          : finitePx(metricsRef.current.available)
        var measured = widthFitProbe.phrases
        var phraseWidths = usable.map(function (phrase, index) {
          if (measured !== null && finitePx(measured[index]) !== null) return widthOf(measured[index])
          var fromDom = finitePx(metricsRef.current.phrases[index])
          if (fromDom !== null) return widthOf(fromDom)
          var caption = phraseCaption(phrase)
          var units = 0
          for (var ci = 0; ci < caption.length; ci += 1) {
            units += caption.charCodeAt(ci) > 255 ? 12 : 7
          }
          return Math.min(spec.compact ? 130 : 200, units + (spec.compact ? 22 : 26))
        })
        var collapseWidth = widthFitProbe.collapseWidth !== null
          ? widthFitProbe.collapseWidth
          : widthOf(metricsRef.current.collapseWidth) || 24
        var manageWidth = widthFitProbe.manageWidth !== null
          ? widthFitProbe.manageWidth
          : widthOf(metricsRef.current.manageWidth) || 24
        var plan = fitRowToWidth(available, {
          phraseWidths: phraseWidths,
          collapseWidth: collapseWidth,
          manageWidth: manageWidth,
          manage: manageEntry !== 'hidden',
          gap: CHIP_GAP,
        })
        var visiblePhrases = usable.slice(0, plan.phraseCount)

        var children = [h('style', { key: 'style' }, DOCK_CSS)]
        if (folded) {
          // One pill keeps the caret-insertion path reachable: opening it is a
          // single click that does not touch the draft being written.
          children.push(h('div', { key: 'row', className: rowClass },
            h('button', {
              key: 'expand',
              type: 'button',
              className: 'dqp-chip dqp-chip-icon dqp-pill',
              title: t('dock.expandHint'),
              'aria-label': t('dock.expandHint'),
              'aria-expanded': false,
              onClick: function () {
                setPeeked(true)
                setCollapsed(false)
              },
            }, dockIcon('expand')),
          ))
        } else {
          children.push(h('div', { key: 'row', ref: rowRef, className: rowClass },
            visiblePhrases.map(function (phrase, index) {
              return h('button', {
                key: phrase.id + ':' + index,
                type: 'button',
                className: 'dqp-chip',
                title: phrase.text,
                'aria-label': phraseCaption(phrase) + ' — ' + t('dock.tooltip'),
                onClick: function () { activate(phrase) },
              }, phraseCaption(phrase))
            }),
            plan.collapse ? h('button', {
              key: 'collapse',
              type: 'button',
              className: 'dqp-chip dqp-chip-icon dqp-chip-collapse',
              title: t('dock.collapseHint'),
              'aria-label': t('dock.collapseHint'),
              'aria-expanded': true,
              onClick: function () {
                setPeeked(false)
                setCollapsed(true)
              },
            }, dockIcon('collapse')) : null,
            plan.manage && manageEntry !== 'hidden' ? h('button', {
              key: 'manage',
              type: 'button',
              className: 'dqp-chip dqp-chip-manage dqp-chip-icon' + (manageEntry === 'text' ? ' dqp-chip-manage-icon' : ''),
              title: t('dock.manage'),
              'aria-label': t('dock.manage'),
              onClick: handleManage,
            }, dockIcon('manage')) : null,
          ))
        }
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
      var rowHidden = useHidden()
      var rowFolded = useCollapsed()
      var rowMode = rowModeOf(rowHidden, rowFolded)
      var manageNow = useManageEntry()
      var autoHideNow = useAutoHide()

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
        var isHidden = phrase.hidden === true
        // Rough height hint: one row per line, plus one per ~72 characters.
        var textRows = phrase.text === ''
          ? 2
          : Math.min(8, Math.max(2, phrase.text.split('\n').length + Math.floor(phrase.text.length / 72)))

        return h('div', {
          key: phrase.id,
          className: 'dqp-row' + (isDragging ? ' dqp-row-dragging' : '') + (isDropTarget ? ' dqp-row-over' : '') +
            (isHidden ? ' dqp-row-muted' : ''),
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
              isHidden
                ? h('span', { className: 'dqp-badge dqp-badge-hidden' }, t('manager.hiddenBadge'))
                : null,
              h('div', { className: 'dqp-row-actions' },
                h('button', {
                  type: 'button',
                  className: 'dqp-icon dqp-eye' + (isHidden ? ' dqp-eye-off' : ''),
                  title: isHidden ? t('manager.show') : t('manager.hide'),
                  'aria-label': isHidden ? t('manager.show') : t('manager.hide'),
                  'aria-pressed': isHidden,
                  onClick: function () { updatePhrase(index, { hidden: !isHidden }) },
                },
                isHidden
                  ? h('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
                      h('path', { d: 'M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z', stroke: 'currentColor', strokeWidth: 1.7 }),
                      h('circle', { cx: 12, cy: 12, r: 2.6, stroke: 'currentColor', strokeWidth: 1.7 }),
                      h('path', { d: 'M4 20 20 4', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' }))
                  : h('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
                      h('path', { d: 'M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z', stroke: 'currentColor', strokeWidth: 1.7 }),
                      h('circle', { cx: 12, cy: 12, r: 2.6, stroke: 'currentColor', strokeWidth: 1.7 }))),
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

      var rowModeOption = h('div', { className: 'dqp-option' },
        h('div', { className: 'dqp-option-text' },
          h('div', { className: 'dqp-option-label-row' },
            h('label', { className: 'dqp-option-label', htmlFor: 'dqp-rowmode' }, t('manager.rowMode')),
            rowHidden
              ? h('span', { className: 'dqp-badge dqp-badge-row-hidden' }, t('manager.rowHiddenBadge'))
              : null,
          ),
          h('span', {
            className: 'dqp-option-hint' + (rowHidden ? ' dqp-option-hint-warn' : ''),
          }, rowHidden ? t('manager.rowModeHintOff') : t('manager.rowModeHint')),
        ),
        h('div', { className: 'dqp-select-wrap' },
          h('select', {
            id: 'dqp-rowmode',
            className: 'dqp-select',
            value: rowMode,
            onChange: function (event) { setRowMode(event.target.value) },
          },
          ROW_MODES.map(function (value) {
            return h('option', { key: value, value: value },
              t(value === 'full' ? 'manager.rowModeFull' : value === 'pill' ? 'manager.rowModePill' : 'manager.rowModeHidden'))
          }),
          ),
        ),
      )

      var manageOption = h('div', { className: 'dqp-option' },
        h('div', { className: 'dqp-option-text' },
          h('label', { className: 'dqp-option-label', htmlFor: 'dqp-manage' }, t('manager.manageEntry')),
          h('span', { className: 'dqp-option-hint' }, t('manager.manageHint')),
        ),
        h('div', { className: 'dqp-select-wrap' },
          h('select', {
            id: 'dqp-manage',
            className: 'dqp-select',
            value: manageNow,
            onChange: function (event) { setManageEntry(event.target.value) },
          },
          MANAGE_MODES.map(function (value) {
            return h('option', { key: value, value: value },
              t(value === 'text' ? 'manager.manageText' : value === 'icon' ? 'manager.manageIcon' : 'manager.manageHidden'))
          }),
          ),
        ),
      )

      var autoHideOption = h('div', { className: 'dqp-option' },
        h('div', { className: 'dqp-option-text' },
          h('label', { className: 'dqp-option-label', htmlFor: 'dqp-autohide' }, t('manager.autoHide')),
          h('span', { className: 'dqp-option-hint' }, t('manager.autoHideHint')),
        ),
        h('div', { className: 'dqp-select-wrap' },
          h('select', {
            id: 'dqp-autohide',
            className: 'dqp-select',
            value: autoHideNow,
            onChange: function (event) { setAutoHide(event.target.value) },
          },
          AUTO_HIDE_MODES.map(function (value) {
            return h('option', { key: value, value: value }, t(value === 'fold' ? 'manager.autoHideFold' : 'manager.autoHideKeep'))
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
          h('div', { className: 'dqp-options' }, placementOption, clickOption, rowModeOption, manageOption, autoHideOption),
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
          h('p', { className: 'dqp-star' }, t('manager.starHint'),
            h('a', {
              className: 'dqp-star-link',
              href: 'https://github.com/pengtang1024/dsh-quick-phrases',
              target: '_blank',
              rel: 'noopener noreferrer',
            },
            h('span', { className: 'dqp-star-glyph', 'aria-hidden': true }, '\u2605'),
            t('manager.starLink')),
          ),
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
