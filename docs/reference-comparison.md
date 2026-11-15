# Vergleich mit wnecossmann/raumplaner-studio

Referenz: https://github.com/wnecossmann/raumplaner-studio, geprüft am 15.11.2026. Gelesen: README.md und index.html (Blob 31c06e2f7937f7e73bfc5c591238086652ac6906).

Die Referenz ist eine eigenständige HTML-Anwendung. Übernommen wurden Ideen, mit eigener Implementierung in der bestehenden React-Anwendung:

- Maßstäbliche Draufsicht aus den bestätigten Raum- und Objektmaßen. Fußabdrücke und Prüffarben verwenden dieselbe Geometrie und Passprüfung wie die 3D-Ansicht, einschließlich Höhe, Rotation und Dachschrägen. Verschieben per Maus/Touch und Pfeiltasten, gemeinsame Positionen für beide Ansichten. Unbekannte Maße bleiben als Platzhalter erkennbar.
- Bestand als optionale Möbelkennzeichnung: bleibt für Darstellung und Kollisionen erhalten, entfällt aus Warenkosten, Händler-Versandkosten und CSV-Einkaufsliste. Alte Projekte ohne Kennzeichnung bleiben unverändert.
- Zusätzliche Suchlinks home24, Wayfair, eBay und Kleinanzeigen. Shop-Seiten öffnen erst nach Nutzeraktion. Preisfilter werden nur dort zugesagt, wo im Link gesetzt.

Bewusst nicht übernommen: fest eingetragene personenbezogene Zimmerdaten, aus Fotos geschätzte Produktmaße, nachträglicher CDN-Download für Three.js. Das bestehende Programm bleibt nach dem Laden ohne externe API nutzbar. Türen/Fenster und ein Vorher-Nachher-Vergleich sind weiterhin mögliche spätere Erweiterungen, keine Bestandteile dieser Änderung.

Prüfung: Budgetregression für gemischten Bestand/Neukauf und CSV, Browserablauf mit Bestandskennzeichnung, Grundriss-Verschieben und Tastatursteuerung, bestehende Offline-Abläufe und Geometrieprüfungen.
