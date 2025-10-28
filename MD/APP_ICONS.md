# App Icons erstellen

Für die PWA (Progressive Web App) Funktionalität benötigen Sie App-Icons.

## Benötigte Icons:

1. **icon-192x192.png** (192x192 Pixel)
2. **icon-512x512.png** (512x512 Pixel)

## Wie erstelle ich die Icons?

### Option 1: Online Tool (Einfach)
1. Besuchen Sie: https://realfavicongenerator.net/ oder https://www.pwabuilder.com/imageGenerator
2. Laden Sie Ihr Logo hoch
3. Generieren Sie die Icons
4. Laden Sie die `icon-192x192.png` und `icon-512x512.png` herunter
5. Speichern Sie beide Dateien im `/public` Ordner

### Option 2: Manuell (Photoshop/Figma/Canva)
1. Erstellen Sie ein quadratisches Design (512x512 px)
2. Exportieren Sie es als PNG in zwei Größen:
   - 192x192 px → `icon-192x192.png`
   - 512x512 px → `icon-512x512.png`
3. Speichern Sie beide Dateien im `/public` Ordner

## Design-Tipps:

- ✅ **Einfaches Design** - Klare Formen und Farben
- ✅ **Guter Kontrast** - Erkennbar auf hellem und dunklem Hintergrund
- ✅ **Keine transparenten Bereiche** - Hintergrundfarbe verwenden
- ✅ **Zentriert** - Logo sollte zentriert sein mit etwas Padding
- ✅ **Lesbar** - Auch in kleiner Größe gut erkennbar

## Empfohlene Farben für Rampenlicht:

- Primärfarbe: `#2563eb` (Blau)
- Hintergrund (Light): `#ffffff` (Weiß)
- Hintergrund (Dark): `#1f2937` (Dunkelgrau)

## Testen:

Nach dem Hochladen der Icons:
1. Öffnen Sie die App auf dem iPhone/Android
2. Tippen Sie auf "Zum Homescreen hinzufügen"
3. Das Icon sollte angezeigt werden

## Aktueller Status:

🔴 **Icons fehlen noch** - Bitte erstellen und im `/public` Ordner speichern:
   - `/public/icon-192x192.png`
   - `/public/icon-512x512.png`

Bis die Icons erstellt sind, wird das Standard Vite-Icon verwendet.

