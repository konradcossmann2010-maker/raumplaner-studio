# Raumplaner Studio – ohne externe API-Schlüssel

Raumfotos hochladen, Möbelbilder manuell platzieren, Kategorien und Preise einstellen und PNG/CSV exportieren. Keine SerpApi, kein kostenpflichtiger Suchdienst, kein zusätzlicher API-Zugang.

## Sofort starten: einzelne Offline-Datei

`Raumplaner-Offline.html` aus dem Download in einem aktuellen Browser öffnen. Kein Server, keine Installation und keine Anmeldung nötig. Der Fotoeditor, Preise, Budgets und gespeicherte Projekte funktionieren ohne Internet. Die Datei enthält die komplette Anwendung.

Die Daten liegen im lokalen Browserspeicher (IndexedDB). Nutze einen normalen Browsermodus und dieselbe Browser-App. Löschen der Browserdaten kann Projekte entfernen. Über „Sicherung“ ein Projekt mit eingebetteten Fotos als JSON-Datei speichern; über „Projektdatei öffnen“ auf der Startseite wiederherstellen, auch auf einem anderen Computer. Diese Sicherung ist auch vor einem Gerätewechsel sinnvoll.

## Möbel ohne Such-API finden

1. Kategorie, Suchbegriff und Preisbereich wählen, dann „Möbel suchen“.
2. Eine der normalen Shop-Suchseiten öffnen: Google Shopping, IKEA, OTTO oder Amazon. Dafür braucht der Browser Internet; ein API-Schlüssel ist nicht nötig. Google Shopping und Amazon erhalten den Preisbereich im Link; andere Shops haben eigene Filter.
3. Den Produktlink kopieren und „Eigenen Produktlink hinzufügen“ öffnen.
4. Namen, Preis und Händler eintragen, Produktbild vom Gerät hochladen. In der Online-Version versucht „Einlesen“, die Shop-Seite direkt auszulesen; manche Shops sperren das. Offline trägst du die Daten selbst ein.
5. Das Möbel in „Meine Auswahl“ zur gewünschten Raumansicht hinzufügen.

Die Shop-Seiten werden in einem neuen Tab geöffnet. Suchtreffer, Preise und Produktbilder werden nicht automatisch aus den Shops in die App übertragen.

## Fotoeditor und Budget

JPG/PNG/WebP bis 10 MB und 20 MP; Arbeitsbilder werden auf 2048 px Kantenlänge verkleinert. Möbel verschieben, skalieren, drehen, spiegeln oder mit Radierer/Zuschnitt bearbeiten. Die Vorschau ist eine Fotomontage.

Mengen gehören zur Möbelauswahl. Dasselbe Möbel auf mehreren Raumfotos erhöht die Einkaufsmenge nicht. Preisgrenzen pro Stück, Kategoriegesamtbudget und Raumgesamtbudget sind einstellbar. Versandkosten je Händler ergänzen. Unbekannte Kosten bleiben offen. Endpreis und Variante im Shop prüfen.

PNG exportiert die aktuelle Ansicht, CSV die Einkaufsliste mit Kauflinks. Offline-Sicherungen enthalten Bilder und Daten. Online-Projekte werden weiterhin privat auf dem Server gespeichert; der Offline-Modus speichert unabhängig davon auf dem Gerät.

## Entwicklung / eigener Start

Node.js 22 oder neuer:

```sh
npm ci
npm run db:local
npm run dev
```

http://127.0.0.1:8787. Mit `?offline=1` läuft der lokale Browsermodus. Der Build legt die einzelne Offline-Datei unter `dist/raumplaner-offline.html` ab. Diese lässt sich ohne weitere Dateien weitergeben.

## Hosting

Die bestehende private Sites-App nutzt `DB` (D1) und `BUCKET` (R2); Bindungsnamen stehen in `.openai/hosting.json`. Die Schema-Migrationen und Drizzle-Metadaten bleiben für bestehende Online-Projekte erhalten. `LOCAL_DEV` darf im Onlinebetrieb nicht gesetzt sein. Die Offline-Datei ist dort ebenfalls zum Herunterladen erreichbar.

## Prüfungen

```sh
npm test
npm run check
npm run build
node scripts/offline-smoke.mjs
```

Der Offline-Browsertest startet Chromium mit abgeschaltetem Netzwerk und prüft Suche-Links, Raum-/Möbelbilder, Platzierung, Budget, Speichern/Wiederöffnen, PNG-Export, Projektsicherung und Wiederherstellung. Er erwartet null HTTP-Anfragen. Standardpfad für Chromium: `/usr/bin/chromium`.

Mit laufendem lokalem Server prüfen `scripts/smoke.mjs` und `scripts/edge-cases.mjs` zusätzlich den bisherigen Online-Speicherweg. Testbilder und Screenshots liegen in `outputs/` und sind nicht Teil des Quellcodes.

## Möbel direkt im Raumfoto

Neue Möbel mit Bild werden beim Speichern automatisch in die aktuelle Raumansicht eingesetzt. Ist noch kein Raumfoto vorhanden, werden sie beim Hinzufügen eines Fotos mit platziert. Dabei bleibt das Seitenverhältnis des Produktbilds erhalten.

„Einfarbigen Hintergrund automatisch entfernen“ entfernt zusammenhängende einfache Hintergründe am Bildrand und schneidet das verbleibende Möbel zu. Das Original bleibt über „Originalbild verwenden“ erreichbar. Bei komplexen Hintergründen ist der manuelle Radierer verfügbar. Die Verarbeitung läuft im Browser, ohne externe API oder Bilddienst.

Nach dem Anklicken eines Möbels kannst du neben Position und Größe auch Schatten, Helligkeit und Neigung einstellen. „Original zeigen“ blendet die Möbel zum Vergleich aus. Der PNG-Export enthält die sichtbare Raumansicht samt Anpassungen. Die automatische Platzierung ist ein veränderbarer Vorschlag; Raumgeometrie, tatsächliche Möbelmaße und Verdeckungen werden nicht automatisch erkannt.

## Hauspläne und Audioempfehlungen

„Hausplan hochladen“ akzeptiert JPG, PNG, WebP und PDF (PDF bis 20 MB). Bei mehrseitigen PDFs wählst du eine Seite; sie wird lokal als Bild übernommen. PDF-Worker und Bilddecoder sind eingebettet, es wird kein PDF-Service oder API-Schlüssel benötigt. Beschädigte oder nicht unterstützte Bilddaten blockieren die Übernahme mit einer Fehlermeldung. CAD-Dateien und passwortgeschützte PDFs bitte vorher als Bild/PDF ohne Schutz exportieren.

Im Plan markierst du einen rechteckigen Raum innerhalb seiner Wände. Gib die tatsächliche Breite/Tiefe in Metern und die Frontwand an. Die App erkennt Räume und den Maßstab nicht automatisch. Für L-förmige, schräge oder offene Bereiche jeweils den zu beschallenden rechteckigen Bereich auswählen; mehrere Pläne/Ansichten pro Projekt sind möglich.

- **Musik im ganzen Raum:** 2, 4 oder 6 verteilte Lautsprecher. Standardmäßig werden vier Positionen vorgeschlagen. Ausrichtung und Abstrahlwinkel lassen sich einstellen; Lautsprecher können direkt verschoben werden.
- **Stereo / Heimkino:** 2.0, 2.1, 5.1 oder 7.1. Hörplatz im Plan setzen, Frontwand wählen und Vorschläge verschieben. Frontwinkel starten bei ±30°, 5.1-Surrounds bei ±110°, 7.1-Seiten bei ±100° und die hinteren Kanäle bei ±145°.
- **Export:** „Audioplan speichern“ erzeugt ein PNG mit Positionen. Projekte einschließlich Grundriss und Audioeinstellungen werden mitgespeichert und lassen sich offline sichern/wiederherstellen.

Die grünen Flächen stellen schematische Richtungen dar, keine gemessene oder simulierte Raumabdeckung. Verteilung im ganzen Raum ist ein geometrischer Startvorschlag; Lautsprechermodell, Wände, Türen, Einrichtung, Montagehöhe und Raumakustik müssen bei der tatsächlichen Aufstellung berücksichtigt werden. Insbesondere Subwooferposition und Pegel vor Ort prüfen. Das Programm berechnet weder Schallpegel noch Raummoden und garantiert keine gleichmäßige Lautstärke.

Grundlagen: [Dolby Aufstellung](https://www.dolby.com/about/support/guide/surround-sound-speaker-setup) und [QSC Ausrichtung/Abstrahlung](https://blogs.qsc.com/live-sound/practical-tips-on-loudspeaker-placement-for-live-sound-part-iii/).

Zusätzliche Browsertests: `node scripts/audio-smoke.mjs` und `node scripts/pdf-codecs-smoke.mjs`. Die kleinen PDF-Dateien unter `tests/fixtures` sind synthetische Regressionstestdaten; keine echten Hauspläne.
