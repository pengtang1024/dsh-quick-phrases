# Schnellphrasen

## Was es tut

Fügt neben dem Eingabefeld eine Zeile mit Phrasen-Schaltflächen hinzu (`继续`, `提交`, `推送`, `发版` …).

- **Beschriftung**: die Schaltfläche zeigt nur den kurzen Namen der Phrase.
- **Text**: ein Klick sendet den vollständigen Text der Phrase direkt ab.
- Beides wird getrennt bearbeitet, sodass die Schaltfläche kurz bleiben kann, während die gesendete Nachricht ein vollständiger Satz ist.

**Das Klickverhalten ist konfigurierbar** (Standard: direkt senden):

- **Direkt senden (Standard)**: bei leerem Eingabefeld und ohne Anhänge genügt ein Klick, um die Phrase zu senden.
- **Eingabefeld füllen**: der Text wird nur in den Entwurf geschrieben; ob gesendet wird, entscheidest du.

In beiden Modi gilt: Ist im Eingabefeld **bereits Text, den du gerade schreibst, oder sind Anhänge vorhanden**, wird dieser durch den Klick nicht überschrieben — die Phrase wird an der Cursorposition eingefügt.

## Wo die Zeile sitzt

Die Position der Phrasenzeile kann jederzeit auf der Einstellungsseite geändert werden; die Änderung wirkt sofort:

| Position | Slot | Hinweise |
| --- | --- | --- |
| Unter dem Eingabefeld (Standard) | `conversation.composer.dock` | Eine vollständige Zeile unter der Eingabekarte; am geräumigsten, gut für viele Phrasen. |
| Über dem Eingabefeld | `conversation.input.dock` | Eine vollständige Zeile über der Eingabekarte. Breite und Zentrierung folgen der Dock-Karten-Geometrie des Hosts (`--dsh-composer-card-max-width` / `--dsh-composer-side-clearance` / `--dsh-composer-dock-inset`) und fluchten mit den inneren Kanten der Karte; die Zeile steht außerdem über der Warteschlange und dem Aufgabenbereich, damit diese nicht von der Karte getrennt werden. |
| Rechts neben der Werkzeugzeile | `conversation.input.right` | Innerhalb der Werkzeugzeile des Eingabefelds (`+`, Berechtigungen, Modellauswahl), damit die Schaltflächen nah am Cursor liegen; der Platz ist knapp, daher scrollt die Zeile horizontal. |

Alle drei Zeilen sind registriert, aber nur die ausgewählte wird gerendert — der Wechsel ist ein Neuzeichnen, kein Neuladen der Seite.

## Einklappen und Verbergen

Die Phrasenzeile soll beim Schreiben nicht im Weg sein: Sie kann bei Bedarf eingeklappt werden, und ihre dauerhafte Form ist eine Einstellung:

- **Manuell einklappen**: Klicke auf `收起 ▾` am Ende der Zeile; die ganze Zeile schrumpft zu einer kleinen Pille `▸ 快捷短语`. Klicke auf die Pille, um sie vorübergehend auszuklappen, und erneut auf „收起", um sie wieder einzuklappen.
- **Automatisch einklappen** (Standard): Wenn unter „Wenn das Eingabefeld Text enthält" die Option „Automatisch einklappen" gewählt ist, schrumpft die Zeile zur Pille, sobald Text oder Anhänge im Feld stehen, und klappt sich nach dem Leeren des Entwurfs wieder aus.
- **Sichtbar lassen**: wähle diese Option, damit die ganze Zeile dauerhaft bleibt.

Nach dem Ausklappen der Pille verhält sich ein Klick auf eine Phrase genau wie bei offener Zeile: Ist bereits Text im Eingabefeld, wird er an der Cursorposition eingefügt und der Entwurf nicht überschrieben.

Der Dropdown **Phrasenzeile anzeigen** in den Einstellungen fasst die dauerhafte Form in drei Zustände zusammen:

- **Ganze Zeile anzeigen**: Die Zeile bleibt dauerhaft, und „收起" am Zeilenende kann sie weiterhin vorübergehend einklappen;
- **Zur Pille einklappen**: Nur eine kleine Pille bleibt neben dem Eingabefeld; ein Klick darauf klappt sie aus;
- **Vollständig verbergen**: Die Zeile verschwindet vollständig aus der Oberfläche, **ohne dass auch nur die Pille bleibt** — es wird nichts angezeigt.
  - Der einzige Weg zurück führt zu **Einstellungen → Schnellphrasen**, wo der Dropdown auf eine der ersten beiden Optionen gesetzt wird (bei „Vollständig verbergen" steht daneben „整排已隐藏").
  - Die Rückkehr zu „Ganze Zeile anzeigen" löscht zugleich den Einklappzustand und stellt die ganze Zeile direkt wieder her.

Die Schaltfläche `收起 ▾` am Zeilenende entspricht der Wahl von „Zur Pille einklappen". Dieser Dropdown speichert keinen eigenen Zustand: Sein Wert wird aus `dsh.quick-phrases.hidden.v1` (hat Vorrang) und `dsh.quick-phrases.collapsed.v1` abgeleitet; beim Umschalten werden diese beiden vorhandenen Schlüssel gemeinsam geschrieben.

> **Hinweis**: Beide Schlüssel sind bereits vorhanden; das Umschalten schreibt sie nur in Kombination neu — es wird kein neuer Speicherschlüssel angelegt.

### Automatisches Ausblenden auf schmalen Bildschirmen

Wird das Fenster schmaler, gibt die Zeile ihre Elemente **nacheinander entsprechend der tatsächlich verfügbaren Breite** auf:

- ohne Einstellung und ohne festen Pixel-Schwellenwert;
- die Berechnung nutzt die gemessene Breite, sodass kurze und lange Beschriftungen gleichermaßen korrekt abgestuft werden.

1. zuerst die Schaltfläche **收起** (am wenigsten wichtig);
2. dann der Zugang **Verwalten**;
3. dann die Phrasen **von der letzten nach vorn**, die vorderen bleiben am längsten.

Bei extrem geringer Breite **bleibt nur die erste verwendbare Phrase**; die Zeile wird nie leer, und ohne Phrasen bleiben Einklappen- und Verwalten-Zugang erreichbar. Beim Verbreitern des Fensters kommen die Elemente nach denselben Regeln zurück.

Auch wenn die Einklappen-Schaltfläche auf schmalen Bildschirmen entfällt, lässt sich die Zeile weiter einklappen:

- ein Entwurf faltet sie mit „Automatisch einklappen" zur Pille;
- oder Sie wählen „Zur Pille einklappen" im Dropdown „Phrasenzeile anzeigen".

Entfällt der Verwalten-Zugang, öffnet **Einstellungen → Schnellphrasen** weiterhin den Verwaltungsbereich. Die drei Zustände, das automatische Einklappen und das Verbergen einzelner Phrasen bleiben unverändert.

Eine einzelne Phrase lässt sich im Verwaltungsbereich über den **Augen**-Schalter auf ihrer Karte verbergen: Danach erscheint ihre Schaltfläche nicht mehr in der Zeile, die Karte bleibt im Verwaltungsbereich und ist mit „已隐藏" markiert; ein weiterer Klick stellt sie wieder sichtbar.

## Phrasen verwalten

Öffne **Einstellungen → Schnellphrasen**. Die Seite hat zwei Ebenen: oben fünf Verhaltensoptionen, unten die Phrasenliste.

> **Optimierung für kleine Bildschirme**: Auf schmalen Bildschirmen (≤560px) wird im Verwalter nur das Layout angepasst — Beschriftung und Dropdown stehen in einer Zeile, Erklärungen bleiben vollständig, Touch-Ziele werden größer, Abschnittsbuttons teilen sich eine Zeile, Ränder werden enger und langer Text umbricht an beliebiger Stelle; **es wird kein Element entfernt und keine Funktion geändert** (ein anderer Mechanismus als das breitenbasierte Ausblenden der Zeile, siehe oben).

**Verhaltensoptionen** (gelten sofort nach Auswahl, kein Neustart nötig). Werte, Standardwert und Wirkung der fünf Optionen:

| Option | Werte | Standardwert | Wirkung |
| --- | --- | --- | --- |
| Anzeigeposition | Unter dem Eingabefeld / Über dem Eingabefeld / Rechts neben der Werkzeugzeile | Unter dem Eingabefeld | Bestimmt, in welchem Slot die Zeile erscheint; nach dem Wechsel wandert sie sofort. Details zu den Positionen siehe „Wo die Zeile sitzt", oben. |
| Bei Klick auf eine Phrase | Direkt senden / Eingabefeld füllen | Direkt senden | „Direkt senden" verschickt die Phrase mit einem Klick, wenn das Feld leer ist und keine Anhänge vorliegen; „Eingabefeld füllen" schreibt sie nur in den Entwurf. In beiden Moden bleiben vorhandener Text oder Anhänge erhalten und die Phrase wird an der Cursorposition eingefügt. |
| Phrasenzeile anzeigen | Ganze Zeile anzeigen / Zur Pille einklappen / Vollständig verbergen | Ganze Zeile anzeigen | Steuert die dauerhafte Form: „Zur Pille einklappen" lässt nur eine ausklappbare Pille; „Vollständig verbergen" rendert nichts, nicht einmal die Pille, und ist nur von dieser Seite rückgängig zu machen. Die Wahl von „Ganze Zeile anzeigen" löscht außerdem den Einklappzustand. Siehe „Einklappen und Verbergen", oben. |
| Verwaltungszugang | Textschaltfläche / Zahnrad-Symbol / Zugang verbergen | Textschaltfläche | Darstellung der Schaltfläche „Verwalten" am Zeilenende. Das Zahnrad-Symbol behält den barrierefreien Namen „Verwalten" und dieselbe Klickfunktion; „Zugang verbergen" entfernt die Schaltfläche, während die Phrasenzeile normal nutzbar bleibt und diese Seite von hier aus erreichbar ist. |
| Wenn das Eingabefeld Text enthält | Automatisch einklappen / Sichtbar lassen | Automatisch einklappen | Ob die Zeile bei vorhandenem Entwurf oder Anhängen zur Pille schrumpft. „Automatisch einklappen" klappt nach dem Leeren des Entwurfs wieder aus; „Sichtbar lassen" hält die ganze Zeile dauerhaft. |

**Phrasenliste** (eine Karte pro Phrase):

- **Ziehen zum Sortieren**: Greife den Griff links und ziehe die Karte nach oben oder unten; beim Loslassen nimmt sie ihre neue Position ein. Mit **↑ / ↓** rechts an der Karte kannst du sie auch Schritt für Schritt verschieben. Die Listenreihenfolge entspricht der Reihenfolge der Schaltflächen in der Zeile von links nach rechts.
- **Beschriftung**: Die erste Zeile der Karte ist der Schaltflächentext; klicke direkt darauf, um ihn zu ändern (z. B. `提交`).
- **Sendetext**: Das große Feld darunter, mehrzeilig.
- **Schaltflächenvorschau**: Am unteren Rand jeder Karte siehst du in Echtzeit, wie die Schaltfläche aussieht und wie viele Zeichen sie sendet — so erkennst du eine zu breite Beschriftung rechtzeitig.
- **Auge**: Verbirgt oder stellt diese Phrase wieder her. Verborgen verschwindet die Schaltfläche aus der Zeile, während die Karte mit dem Abzeichen „已隐藏" im Verwaltungsbereich bleibt.
- **✕**: Der erste Klick verwandelt die Schaltfläche nur in „Bestätigen"; erst ein zweiter Klick innerhalb von vier Sekunden löscht die Phrase wirklich und verhindert versehentliches Löschen.
- **Phrase hinzufügen** fügt eine leere Karte an und setzt den Cursor auf die Beschriftung; **Standardwerte wiederherstellen** wechselt beim ersten Klick in den Bestätigungszustand und stellt beim zweiten die vier integrierten Phrasen wieder her.

Änderungen werden sofort gespeichert und angewendet, ohne Neustart. Die Phrasen liegen im lokalen Browserspeicher (`localStorage`), entsprechend der Web-Speicher-Isolation von DSH — ein anderer Rechner oder gelöschte Websitedaten lassen sie verloren gehen. Jeder Zustand entspricht einem Schlüssel:

```text
dsh.quick-phrases.v1             Phrasenliste
dsh.quick-phrases.placement.v1   Position
dsh.quick-phrases.click.v1       Klickverhalten
dsh.quick-phrases.collapsed.v1   Einklappzustand
dsh.quick-phrases.autohide.v1    Option für automatisches Einklappen
dsh.quick-phrases.hidden.v1      Zustand des vollständigen Verbergens
dsh.quick-phrases.manage.v1      Form des Verwaltungszugangs
```

Der Dropdown „Phrasenzeile anzeigen" belegt keinen eigenen Schlüssel: Er liest und schreibt `hidden.v1` und `collapsed.v1`.

## Direkt aus dem Eingabefeld öffnen

Die Schaltfläche **Verwalten** am Zeilenende führt zur selben Einstellungsseite (ist die Zeile zur Pille eingeklappt, zuerst ausklappen).

- Der Zugang lässt sich in den Einstellungen auf ein Zahnrad-Symbol umstellen oder verbergen.
- Ist er verborgen, erscheint am Zeilenende keine Verwaltungsschaltfläche mehr und **Einstellungen → Schnellphrasen** ist der Zugangsweg.
- Falls der Einstieg in die Einstellungen in der aktuellen Oberfläche noch nicht eingebunden ist, erscheint stattdessen „请在『设置 — 快捷短语』中管理".

## Gestaltung

Schaltflächen, Felder und Karten verwenden die semantischen Tokens des Hosts (`--dsw-alias-*`, `--dsw-radius-*`, `--dsw-focus-*`) und folgen damit dem dunklen und hellen Design von DSH.

Die Vordergrundfarbe der primären Schaltfläche nutzt `--dsw-alias-label-primary-foreground`, entsprechend der Primary-Variante der Host-Schaltfläche, damit der Kontrast in beiden Themen gewahrt bleibt.

## Grenzen

- Phrasen sind reiner Text: keine Variablenauswertung, keine Befehlsausführung.
- Sie erscheinen nur rund um das Sitzungs-Eingabefeld; Hintergrundaufgaben und geplante Aufgaben bleiben unberührt.
- Die Sprache folgt der DSH-Oberflächensprache (Chinesisch / Englisch); auch die vier Standardphrasen werden sprachabhängig lokalisiert erzeugt.

## Weitere Informationen

- Implementierungsdetails (Slots, Datenschicht, Gestaltung, Tests): [docs/ARCHITECTURE.md](ARCHITECTURE.md)
- Mitwirken: [CONTRIBUTING.md](../CONTRIBUTING.md)
- Sicherheitsmeldungen: [SECURITY.md](../SECURITY.md)