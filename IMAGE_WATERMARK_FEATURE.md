# 🖼️ Image Watermark Feature

Das Image Watermark Feature wurde erfolgreich zur WatermarkPro Anwendung hinzugefügt. Diese Funktion ermöglicht es Benutzern, sowohl Text- als auch Bild-Wasserzeichen auf ihre Videos anzuwenden.

## ✨ Neue Funktionen

### 🔄 Wasserzeichen-Typ Auswahl
- **Text-Wasserzeichen**: Traditionelle textbasierte Wasserzeichen mit konfigurierbarer Schriftgröße, Farbe und Position
- **Bild-Wasserzeichen**: Upload und Verwendung von Bildern als Wasserzeichen mit konfigurierbarer Größe, Transparenz und Position

### 📤 Bild-Upload
- **Unterstützte Formate**: JPEG, PNG, GIF, WebP
- **Maximale Dateigröße**: 5MB
- **Drag & Drop Interface**: Benutzerfreundliches Upload-Interface
- **Bild-Vorschau**: Sofortige Vorschau des hochgeladenen Bildes
- **Bild-Verwaltung**: Möglichkeit zum Entfernen und Ersetzen von Bildern

### ⚙️ Bild-Wasserzeichen Einstellungen
- **Position**: 5 Positionsoptionen (Oben Links, Oben Rechts, Unten Links, Unten Rechts, Mitte)
- **Größe**: Skalierbare Größe von 30% bis 200%
- **Transparenz**: Einstellbare Transparenz von 10% bis 100%

## 🛠️ Technische Implementierung

### Backend Änderungen

#### Neue API Endpoints
```typescript
POST /api/upload-watermark  // Upload von Wasserzeichen-Bildern
POST /api/process-video     // Erweitert für Bild-Wasserzeichen
```

#### Erweiterte WatermarkSettings Interface
```typescript
interface WatermarkSettings {
  type: 'text' | 'image'
  // Text watermark properties
  text?: string
  fontSize?: number
  color?: string
  // Image watermark properties
  imagePath?: string
  imageOpacity?: number
  imageScale?: number
  // Common properties
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
  opacity: number
}
```

#### FFmpeg Integration
- **Text-Wasserzeichen**: Verwendet `drawtext` Filter
- **Bild-Wasserzeichen**: Verwendet `overlay` Filter mit komplexen Filtern
- **Automatisches Fallback**: Falls Wasserzeichen-Verarbeitung fehlschlägt, wird das Video ohne Wasserzeichen verarbeitet

### Frontend Änderungen

#### Erweiterte WatermarkEditor Komponente
- **Radio Button Typ-Auswahl**: Umschalten zwischen Text und Bild
- **Bild-Upload Interface**: Drag & Drop Bereich mit Datei-Browser
- **Dynamische Einstellungen**: Kontextabhängige Einstellungsfelder je nach Wasserzeichen-Typ
- **Bild-Vorschau**: Anzeige des hochgeladenen Bildes mit Entfernen-Option

## 📁 Dateien Struktur

### Neue/Geänderte Backend Dateien
- `src/services/videoProcessor.ts` - Erweitert für Bild-Wasserzeichen-Verarbeitung
- `src/routes/videoRoutes.ts` - Neuer Upload-Endpoint und erweiterte Verarbeitung
- `watermarks/` - Neues Verzeichnis für hochgeladene Wasserzeichen-Bilder

### Neue/Geänderte Frontend Dateien
- `src/components/WatermarkEditor.tsx` - Komplett erweitert für Bild-Support

## 🎯 Verwendung

### Schritt 1: Wasserzeichen-Typ auswählen
Wählen Sie zwischen "Text" und "Bild" im Wasserzeichen-Editor.

### Schritt 2: Bild hochladen (für Bild-Wasserzeichen)
1. Klicken Sie auf den Upload-Bereich oder ziehen Sie ein Bild hinein
2. Wählen Sie eine Bilddatei (JPEG, PNG, GIF, WebP, max. 5MB)
3. Das Bild wird automatisch hochgeladen und eine Vorschau wird angezeigt

### Schritt 3: Einstellungen konfigurieren
- **Position**: Wählen Sie wo das Wasserzeichen platziert werden soll
- **Größe**: Passen Sie die Größe des Bild-Wasserzeichens an (30%-200%)
- **Transparenz**: Stellen Sie die Transparenz ein (10%-100%)

### Schritt 4: Video verarbeiten
Laden Sie Ihr Video hoch und starten Sie die Verarbeitung. Das Bild-Wasserzeichen wird auf das Video angewendet.

## 🔧 FFmpeg Filter Details

### Text-Wasserzeichen
```bash
drawtext=text='Text':fontsize=24:fontcolor=0xffffff80:x=w-tw-20:y=h-th-20
```

### Bild-Wasserzeichen
```bash
[1:v]scale=200:-1,format=rgba,colorchannelmixer=aa=0.8[watermark];[0:v][watermark]overlay=main_w-overlay_w-20:main_h-overlay_h-20
```

## ⚠️ Wichtige Hinweise

1. **Bildqualität**: Verwenden Sie hochwertige Bilder für bessere Ergebnisse
2. **Transparenz**: PNG-Bilder mit Transparenz werden unterstützt
3. **Performance**: Größere Bilder können die Verarbeitungszeit erhöhen
4. **Speicher**: Hochgeladene Bilder werden im `watermarks/` Verzeichnis gespeichert

## 🚀 Zukünftige Erweiterungen

Mögliche Verbesserungen für zukünftige Versionen:
- Batch-Upload von mehreren Wasserzeichen-Bildern
- Wasserzeichen-Vorlagen/Bibliothek
- Erweiterte Positionierung (X/Y Koordinaten)
- Animierte Wasserzeichen (GIF Support)
- Wasserzeichen-Rotation und weitere Transformationen