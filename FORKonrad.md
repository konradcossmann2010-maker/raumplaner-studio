# FORKonrad: Lautsprecher am Schreibtisch und eine Excel-Falle

Diese Datei erklärt die kleine zweite Runde am Raumplaner. Die große erste Runde (Preiseingabe, verständliche Fehler, automatische Prüfungen) steht im Pull Request „Preiseingabe reparieren, verständliche Fehler, automatische Prüfungen (CI)“.

---

## 1. Das große Bild

Der Audio-Planer konnte Lautsprecher für Musik im Raum oder fürs Heimkino platzieren. Für einen Schreibtisch, an dem du Videos schneidest oder Musik hörst, hat er sie aber immer **an die Wand** gestellt, auch wenn dein Kopf nur einen Meter vor dem Monitor ist. Dazu kam ein Fehler in der Einkaufsliste: Die CSV-Datei hat Preise so geschrieben, dass deutsches Excel sie als Datum liest.

## 2. Wo das im Code steckt

| Datei | Rolle |
|---|---|
| `src/audio.ts` | reine Geometrie: wo die Lautsprecher hinkommen |
| `src/PlanEditor.tsx` | die Bedienung im Hausplan |
| `src/model.ts` | Datenmodell mit zod-Schema und CSV-Export |
| `tests/audio.test.ts`, `tests/model.test.ts` | die Prüfungen |

## 3. Was neu ist

- **„Abstand zum Hörplatz“** bei Stereo/Heimkino: „an der Wand“ (wie bisher) oder 1,0 bis 3,0 m. Mit 1,2 m stehen beide Boxen und dein Kopf im gleichseitigen Dreieck, so wie es für Nahfeld-Monitore am Schreibtisch gedacht ist. Bei 5.1/7.1 liegen alle Lautsprecher auf einem Kreis um den Hörplatz.
- **CSV mit Dezimalkomma:** „12,50“ statt „12.50“.

## 4. Wie die Platzierung funktioniert

Stell dir vor, du hältst am Hörplatz eine Taschenlampe in Richtung ±30°. Bisher stand der Lautsprecher dort, wo der Lichtstrahl die Wand trifft (mit etwas Abstand). Jetzt gibt es eine zweite Grenze: deine gewählte Entfernung. Der Lautsprecher steht beim **kleineren** der beiden Werte.

```ts
const t = Math.min(...abständeBisZurWand, a.distance ?? Infinity);
```

`Infinity` bedeutet „keine zweite Grenze“, also das alte Verhalten. So bleibt jeder bestehende Plan genau, wie er war.

## 5. Entscheidungen

- **Optionales Feld statt neuer Modus.** Ein eigener Modus „Schreibtisch“ hätte die Auswahl verdoppelt. Ein Abstand ist allgemeiner: Er passt zum Schreibtisch (1,2 m), zum Sofa (3 m) und zum Heimkino-Kreis.
- **Verschobene Lautsprecher werden zurückgesetzt**, wenn du den Abstand änderst. Sonst würde eine alte, von Hand gezogene Position den neuen Abstand überdecken, und du wüsstest nicht, warum sich nichts tut.

## 6. Alternativen

- Den Abstand **aus dem Schreibtisch im 3D-Raum ableiten.** Eleganter, aber der Hausplan und der 3D-Raum sind getrennte Teile der App. Das wäre ein großer Umbau für wenig Gewinn.
- Ein **Schieberegler** statt fester Werte. Feste Werte mit Beschriftung („Schreibtisch“, „Sofa“) helfen mehr, wenn man nicht weiß, welche Zahl sinnvoll ist.

## 7. Stolpersteine

**Die stille Datenfalle.** Das Datenmodell wird mit `zod` geprüft, und zod entfernt beim Prüfen alle Felder, die es nicht kennt, **ohne Fehlermeldung**. Hätte ich nur `audio.ts` geändert, wäre der Abstand beim Speichern einfach verschwunden. Die App hätte funktioniert, bis du sie neu lädst. Deshalb steht `distance` jetzt auch im Schema, mit Grenzen (0,5 bis 20 m).

**Mein Test war zu optimistisch.** Ich hatte geprüft, dass bei 5.1 und 1,5 m alle Lautsprecher genau 1,5 m entfernt stehen. In einem 3,5 m breiten Raum stoßen die seitlichen Surround-Lautsprecher aber schon bei 1,49 m an die Wand. Der Code war richtig, der Test nicht. Jetzt prüft der Test beides: den Kreis bei 1,2 m und die Wand als Grenze bei 1,5 m.

**Ohne Internet testen.** In meiner Umgebung ließ sich `npm install` nicht ausführen. Die reine Geometrie habe ich deshalb mit `esbuild` und einem kleinen Ersatz für vitest lokal geprüft. Alles andere (TypeScript, alle Unit-Tests, Build, neun Browsertests, Online-Modus) hat die automatische Prüfung auf GitHub erledigt. Sie war grün.

**Die Excel-Falle.** Die CSV-Datei trennte Spalten mit Semikolon, also deutsches Format, schrieb Preise aber mit Punkt. Deutsches Excel liest „1.50“ dann als Datum (Jan 50) und Preise wie „199.00“ als Text. Summen hätten nicht gestimmt. Jetzt passt beides zusammen.

## 8. Wie gute Entwickler denken

- **Das Schema ist der Türsteher.** Jedes neue Feld braucht dort einen Eintrag, sonst kommt es nicht rein.
- **Formate gehören zusammen.** Wer Semikolon (deutsch) sagt, muss auch Komma (deutsch) sagen.
- **Geometrie mit Mathe prüfen, nicht mit Augenmaß:** Der Test misst den Abstand mit `Math.hypot` und den Winkel mit `Math.atan2`.

## 9. Lektionen und nächste Schritte

**Zum Mitnehmen**
1. Wenn ein Feld „manchmal verschwindet“, zuerst in das Schema schauen.
2. Ein fehlgeschlagener Test ist eine Frage, kein Urteil: Wer hat recht, der Code oder die Erwartung?

**Was du jetzt tun kannst**
- Den Pull Request auf GitHub mergen. Die automatischen Prüfungen sind grün.
- Den Branch `ci-baseline-tmp` löschen. Er war nur für einen Vergleichslauf da.
- Für einen Schreibtisch: Stereo 2.0, Hörplatz an den Stuhl, Abstand 1,2 m. Hochtöner auf Ohrhöhe, die Boxen nicht unter eine Dachschräge oder in eine Ecke.

**Ideen**
- Lautsprecher-Modelle als Vorschläge im Beispielkatalog (wie bei den Möbeln, mit Richtpreis und Raumgröße).
- Die geteilte Version unter `/geteilt.html` lädt Schriften von Google Fonts. Das lässt sich nur in der Quelle (`wnecossmann/raumplaner-studio`) dauerhaft ändern, weil diese Datei beim nächsten Veröffentlichen überschrieben wird.
