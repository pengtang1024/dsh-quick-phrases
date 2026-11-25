# Phrases rapides

## Ce que fait l'extension

Ajoute une rangée de boutons de phrase (`继续`, `提交`, `推送`, `发版` …) à côté du champ de saisie. Un clic envoie directement le **texte** de la phrase ; le bouton n'affiche que son **libellé**. Les deux se modifient séparément : le bouton peut rester court alors que le message envoyé est une phrase complète.

**Le comportement au clic est configurable** (par défaut : envoi direct) :

- **Envoyer directement (par défaut)** : lorsque le champ est vide et sans pièce jointe, un seul clic envoie la phrase.
- **Remplir le champ** : écrit seulement le texte dans le brouillon ; l'envoi reste à votre décision.

Dans les deux modes, si le champ **contient déjà du texte en cours de rédaction ou des pièces jointes**, le clic ne les remplace pas : la phrase est insérée au curseur.

## Où se trouve la rangée

Sa position peut être changée à tout moment depuis la page des paramètres ; le changement prend effet immédiatement :

| Position | Emplacement | Remarques |
| --- | --- | --- |
| Sous le champ de saisie (par défaut) | `conversation.composer.dock` | Une rangée complète sous la carte de saisie ; la plus spacieuse, idéale pour beaucoup de phrases. |
| Au-dessus du champ de saisie | `conversation.input.dock` | Une rangée complète au-dessus de la carte de saisie. Sa largeur et son centrage suivent la géométrie de la carte dock de l'hôte (`--dsh-composer-card-max-width` / `--dsh-composer-side-clearance` / `--dsh-composer-dock-inset`) : elle s'aligne sur les bords intérieurs de la carte et se place au-dessus de la file d'attente et du panneau des tâches, sans les séparer de la carte. |
| À droite de la barre d'outils | `conversation.input.right` | Dans la barre d'outils du champ (`+`, permissions, sélecteur de modèle), pour garder les boutons près du curseur ; l'espace est limité, la rangée défile donc horizontalement. |

Les trois rangées sont enregistrées, mais seule la rangée choisie est affichée : changer de position est un simple redessin, pas un rechargement de la page.

## Replier et masquer

La rangée ne doit pas gêner la saisie : elle peut être repliée à la demande et sa forme habituelle est un paramètre :

- **Replier manuellement** : cliquez sur `收起 ▾` à la fin de la rangée ; elle se réduit alors en une petite pastille `▸ 快捷短语`. Cliquez sur la pastille pour la déplier temporairement, puis de nouveau sur «收起» pour la replier.
- **Replier automatiquement** (par défaut) : avec «Quand le champ contient du texte» réglé sur «Replier automatiquement», la rangée se réduit en pastille dès que le champ contient du texte ou des pièces jointes, et se déplie quand le brouillon est vidé. Choisissez «Garder visible» pour que la rangée complète reste affichée.

Après avoir déplié la pastille, cliquer sur une phrase se comporte exactement comme avec la rangée ouverte : si le champ contient déjà du texte, celui-ci est inséré au curseur sans écraser le brouillon.

Le menu déroulant **Affichage de la rangée** des paramètres réduit la forme habituelle à trois choix :

- **Afficher la rangée complète** : la rangée reste visible et le bouton «收起» à la fin permet toujours de la replier temporairement ;
- **Replier en pastille** : il ne reste qu'une petite pastille à côté du champ ; cliquez dessus pour déplier ;
- **Masquer entièrement** : la rangée disparaît complètement de l'interface, **sans laisser même la pastille** ; rien n'est affiché. Pour la récupérer, retournez dans **Paramètres → Phrases rapides** et remettez le menu sur l'une des deux premières options (quand «Masquer entièrement» est choisi, la mention «整排已隐藏» s'affiche à côté). Revenir à «Afficher la rangée complète» efface en même temps l'état replié et la rangée complète réapparaît directement.

Le bouton `收起 ▾` à la fin équivaut à choisir «Replier en pastille». Ce menu déroulant ne stocke aucun état propre : sa valeur est dérivée de `dsh.quick-phrases.hidden.v1` (prioritaire) et de `dsh.quick-phrases.collapsed.v1` ; le changement écrit ces deux clés existantes.

Une phrase précise peut être masquée avec l'interrupteur **œil** sur sa carte dans le gestionnaire : son bouton disparaît de la rangée, mais la carte reste dans le gestionnaire marquée «已隐藏» ; recliquez pour la réafficher.

## Gérer les phrases

Ouvrez **Paramètres → Phrases rapides**. La page comporte deux parties : cinq paramètres de comportement en haut, la liste des phrases en bas.

**Paramètres de comportement** (appliqués dès la sélection, sans redémarrage). Valeurs, valeur par défaut et effet des cinq paramètres :

| Paramètre | Valeurs | Valeur par défaut | Effet |
| --- | --- | --- | --- |
| Position d'affichage | Sous le champ / Au-dessus du champ / À droite de la barre d'outils | Sous le champ | Détermine dans quel emplacement la rangée apparaît ; le déplacement est immédiat. Le détail de chaque position figure dans «Où se trouve la rangée», plus haut. |
| Lors d'un clic sur une phrase | Envoyer directement / Remplir le champ | Envoyer directement | «Envoyer directement» envoie la phrase en un clic quand le champ est vide et sans pièce jointe ; «Remplir le champ» écrit seulement le texte dans le brouillon. Dans les deux modes, un texte ou des pièces jointes existants sont préservés et la phrase est insérée au curseur. |
| Affichage de la rangée | Afficher la rangée complète / Replier en pastille / Masquer entièrement | Afficher la rangée complète | Contrôle la forme habituelle : «Replier en pastille» ne laisse qu'une pastille dépliable ; «Masquer entièrement» n'affiche rien, pas même la pastille, et seule cette page peut la rétablir. Choisir «Afficher la rangée complète» efface aussi l'état replié. Voir «Replier et masquer», plus haut. |
| Accès de gestion | Bouton texte / Icône engrenage / Masquer l'accès | Bouton texte | Apparence du bouton «Gérer» à la fin de la rangée. L'icône engrenage garde le nom accessible «Gérer» et le même comportement au clic ; «Masquer l'accès» supprime le bouton, mais la rangée continue de fonctionner et cette page reste accessible depuis ici. |
| Quand le champ contient du texte | Replier automatiquement / Garder visible | Replier automatiquement | Si la rangée se réduit en pastille lorsqu'un brouillon ou des pièces jointes apparaissent. «Replier automatiquement» la déplie quand le brouillon est vidé ; «Garder visible» maintient la rangée complète. |

**Liste des phrases** (une carte par phrase) :

- **Glisser pour réordonner** : saisissez la poignée à gauche et déplacez la carte vers le haut ou le bas ; au relâchement, elle prend sa nouvelle position. Vous pouvez aussi la déplacer d'un cran avec **↑ / ↓** à droite de la carte. L'ordre de la liste correspond à l'ordre de gauche à droite des boutons dans la rangée.
- **Libellé** : la première ligne de la carte est le texte du bouton ; cliquez dessus pour le modifier directement (par ex. `提交`).
- **Texte à envoyer** : le grand champ en dessous, capable de gérer plusieurs lignes.
- **Aperçu du bouton** : en bas de chaque carte, un aperçu en temps réel montre à quoi ressemble le bouton et combien de caractères il envoie, pour repérer un libellé trop large.
- **Œil** : masque ou restaure cette phrase. Masquée, elle quitte la rangée et sa carte reste dans le gestionnaire avec le badge «已隐藏».
- **✕** : le premier clic transforme seulement le bouton en «Confirmer» ; un second clic dans les quatre secondes supprime vraiment la phrase, pour éviter une suppression accidentelle.
- **Ajouter une phrase** : ajoute une carte vide et place le curseur sur le libellé ; **Restaurer les valeurs par défaut** passe en état de confirmation au premier clic et restaure les quatre phrases intégrées au second.

Les modifications sont enregistrées et appliquées immédiatement, sans redémarrage. Les phrases sont conservées dans le stockage local du navigateur (clé `localStorage` `dsh.quick-phrases.v1` ; la position dans `dsh.quick-phrases.placement.v1`, le comportement au clic dans `dsh.quick-phrases.click.v1`, l'état replié dans `dsh.quick-phrases.collapsed.v1`, l'option de repli automatique dans `dsh.quick-phrases.autohide.v1`, l'état de masquage total dans `dsh.quick-phrases.hidden.v1` et le style de l'accès de gestion dans `dsh.quick-phrases.manage.v1`), avec l'isolation du stockage Web de DSH : changer de machine ou effacer les données du site les fait perdre. Le menu «Affichage de la rangée» n'utilise aucune clé supplémentaire : il lit et écrit `hidden.v1` et `collapsed.v1`.

## Ouvrir depuis le champ de saisie

Le bouton **Gérer** à la fin de la rangée mène à la même page de paramètres (si la rangée est repliée en pastille, dépliez-la d'abord). L'accès de gestion peut être remplacé par une icône engrenage ou masqué dans les paramètres ; une fois masqué, la rangée n'affiche plus de bouton de gestion et **Paramètres → Phrases rapides** est la voie d'accès. Si l'entrée des paramètres n'est pas encore montée dans l'interface actuelle, le message «请在『设置 — 快捷短语』中管理» s'affiche à la place.

## Style

Boutons, champs et cartes utilisent les jetons sémantiques de l'hôte (`--dsw-alias-*`, `--dsw-radius-*`, `--dsw-focus-*`) et suivent les thèmes clair et sombre de DSH. La couleur de premier plan du bouton principal reprend `--dsw-alias-label-primary-foreground`, comme la variante primary du bouton de l'hôte, pour garantir le contraste dans les deux thèmes.

## Limites

- Les phrases sont du texte brut : ni variables interprétées, ni commandes exécutées.
- Elles n'apparaissent qu'autour du champ de saisie de la session ; les tâches en arrière-plan et les tâches planifiées ne sont pas affectées.
- La langue suit celle de l'interface DSH (chinois / anglais) ; les quatre phrases par défaut sont également générées dans la langue correspondante.

## Pour aller plus loin

- Détails d'implémentation (emplacements, couche de données, styles et tests) : [docs/ARCHITECTURE.md](ARCHITECTURE.md)
- Contribuer : [CONTRIBUTING.md](../CONTRIBUTING.md)
- Signalements de sécurité : [SECURITY.md](../SECURITY.md)
