# Raumplaner Studio

Private deutschsprachige Raumplanung für Handy und PC. Fotos hochladen, Möbel über Produktlinks oder SerpApi finden, im Foto manuell platzieren, Budgets verwalten und PNG/CSV exportieren.

## Start auf dem eigenen Computer

Node.js 22 oder neuer installieren. Dann im Projektordner:

```sh
npm ci
npm run db:local
npm run dev
```

Adresse: http://127.0.0.1:8787. Lokale Projekte und Bilder bleiben in `.wrangler/state`. Die lokale Anmeldung gilt ausschließlich auf localhost/127.0.0.1. Auf einem veröffentlichten Site übernimmt Sites den privaten Zugang mit ChatGPT.

## Online-Betrieb

Die Sites-Kennung steht in `.openai/hosting.json`. Die App benötigt D1 als `DB`, R2 als `BUCKET` und die SQL-Migration samt Drizzle-Metadaten im Ordner `drizzle`. Der Build erzeugt einen eigenständigen ESM-Worker unter `dist/server/index.js` mit eingebetteter Oberfläche. `dist/.openai/hosting.json` gehört zum Veröffentlichungsarchiv. Server-Laufzeitvariablen enthalten niemals `LOCAL_DEV` im Onlinebetrieb.

## Kostenlose Live-Möbelsuche einrichten

1. Kostenloses Konto auf https://serpapi.com anlegen; Gratis-Tarif wählen.
2. In den Sites-Umgebungsvariablen den geheimen Wert `SERPAPI_API_KEY` hinterlegen. Den Schlüssel weder in den Quellcode noch in einen Chat schreiben.
3. App neu laden. Die Suche zeigt das verbleibende Kontingent an.

Ohne Schlüssel funktionieren eigene Produkte, Fotoeditor, Budgets und Speicherung. Die App lässt ausschließlich den kostenlosen Suchtarif mit verbleibendem Monatskontingent zu. Suche und gegebenenfalls das Nachladen von Händlerangeboten verbrauchen Abrufe. Keine automatische Tarifumstellung. Bereits abgerufene Ergebnisse werden eine Stunde zwischengespeichert.

## Bedienung

- Raum anlegen und JPG/PNG/WebP hochladen (bis 10 MB, maximal 20 MP). Arbeitsbilder werden auf maximal 2048 px Kantenlänge reduziert. Das hochgeladene Bild bleibt im Editor unverändert; bearbeitet werden nur die Möbel.
- Produktlink einlesen oder Namen, Kategorie, Preis, Händler und Bild selbst ergänzen. Manche Shops sperren den Abruf; dann die Daten selbst eintragen. Produktbilder werden auf dem Server gespeichert.
- In „Meine Auswahl“ das Möbel zur aktuellen Raumansicht hinzufügen. Mit Ziehpunkten und Zahlenfeldern verschieben, skalieren, drehen und spiegeln. „Bild freistellen“ öffnet Zuschneiden/Radierer.
- Mengen gehören zur Möbelauswahl. Mehrere Platzierungen desselben Möbels auf verschiedenen Fotos erhöhen die Einkaufsmenge nicht. Für zwei gleiche Schränke die Menge auf zwei setzen.
- Kategorie-Preisgrenzen filtern den Einzelpreis. Kategoriegesamtbudget und Gesamtbudget prüfen die Auswahl; Versandkosten je Händler ergänzen. Unbekannte Kosten bleiben offen.
- Speichern erfolgt automatisch. Vor dem Verlassen einer Seite gilt der sichtbare Speicherstatus. Bei gleichzeitigem Bearbeiten auf mehreren Geräten lässt sich der lokale Entwurf als JSON sichern und der Serverstand laden.
- PNG exportiert die aktuelle Fotoansicht; CSV enthält die Einkaufsliste mit Produktlinks. Preise und gewählte Variante vor Bestellung im Shop prüfen.

Die Vorschau ist eine Fotomontage; keine maßstabsgetreue 3D-Planung und keine automatische KI-Bildgenerierung.

## Prüfungen

```sh
npm test
npm run check
npm run build
```

Mit laufendem lokalen Server: `node scripts/smoke.mjs`. Dieser Test nutzt Playwright und standardmäßig Chromium unter `/usr/bin/chromium`, erzeugt ein klar benanntes Testfoto, prüft Upload, Möbelanlage, Platzierung, Budget/Menge, Speicherung, Wiederöffnen, PNG-Export und mobile Breite. Screenshots landen in `outputs/`. Live-Suche kann erst mit gültigem SerpApi-Schlüssel geprüft werden.

## Architektur

React/TypeScript, react-konva, Cloudflare Worker, D1 und R2. Geschützte Endpunkte liegen unter `/api`. Fotos und gespeicherte Projekte sind an den angemeldeten Eigentümer gebunden. Externe Abrufe prüfen Zieladressen/Weiterleitungen, Dateityp und Größe. Produktionsschlüssel sind ausschließlich serverseitig.
