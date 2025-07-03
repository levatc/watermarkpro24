# Wasserzeichen-Feature für Videos, Bilder und PDFs

## Überblick

Das WatermarkPro-System wurde erfolgreich erweitert, um nicht nur Videos, sondern auch Bilder und PDFs mit Wasserzeichen zu versehen. Das System unterstützt jetzt drei Hauptdateitypen:

- **Videos**: MP4, AVI, MOV, MKV, WebM (bis 100MB)
- **Bilder**: JPG, PNG, WebP (bis 50MB)  
- **PDFs**: PDF-Dokumente (bis 50MB)

## Neue Backend-Features

### 1. FileProcessor Service (`backend/src/services/fileProcessor.ts`)

Neuer Service für die Verarbeitung von Bildern und PDFs:

- **Bildverarbeitung**: Verwendet Sharp mit SVG-basierten Text-Wasserzeichen
- **PDF-Verarbeitung**: Verwendet PDF-lib für Text-Wasserzeichen auf allen Seiten
- **Positionierung**: Unterstützt alle 5 Positionen (top-left, top-right, bottom-left, bottom-right, center)
- **Anpassbare Einstellungen**: Schriftgröße, Farbe, Transparenz

### 2. Neue API-Routen (`backend/src/routes/fileRoutes.ts`)

- `POST /api/process-file` - Verarbeitung von Bildern und PDFs
- `GET /output/:filename` - Download verarbeiteter Dateien (erweitert für alle Typen)
- `GET /api/file/health` - Health-Check für File-Processing

### 3. Erweiterte Dependencies

Neue Packages installiert:
- `sharp` - Hochperformante Bildverarbeitung
- `pdf-lib` - PDF-Manipulation und Wasserzeichen

## Neue Frontend-Features

### 1. Universelle FileDropZone (`frontend/src/components/FileDropZone.tsx`)

Ersetzt die alte VideoDropZone mit:

- **Multi-Format-Unterstützung**: Automatische Erkennung von Videos, Bildern und PDFs
- **Intelligente API-Auswahl**: Verwendet die richtige API basierend auf Dateityp
- **Visuelle Unterscheidung**: Verschiedene Icons für verschiedene Dateitypen
- **Optimierte UX**: Klare Anzeige unterstützter Formate

### 2. Aktualisierte HomePage (`frontend/src/pages/HomePage.tsx`)

- Neuer Titel: "Universelles Wasserzeichen Tool"
- Erweiterte Beschreibung für alle Dateitypen
- Integration der neuen FileDropZone-Komponente

## Technische Details

### Bildverarbeitung

```typescript
// SVG-basierte Wasserzeichen für bessere Qualität
const svgWatermark = `
  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <text x="${x}" y="${y + textHeight}" 
          font-family="Arial, sans-serif" 
          font-size="${fontSize}" 
          fill="${rgba}">
      ${text}
    </text>
  </svg>
`
```

### PDF-Verarbeitung

```typescript
// Wasserzeichen auf allen Seiten
for (const page of pages) {
  page.drawText(settings.text, {
    x, y,
    size: settings.fontSize,
    color: rgb(r/255, g/255, b/255),
    opacity: settings.opacity
  })
}
```

## API-Endpunkte

### Video-Verarbeitung (bestehend)
- `POST /api/process-video` - Video mit Wasserzeichen versehen

### Neue Datei-Verarbeitung
- `POST /api/process-file` - Bilder und PDFs mit Wasserzeichen versehen

### Downloads
- `GET /output/:filename` - Download verarbeiteter Dateien aller Typen

## Unterstützte Formate

| Typ | Formate | Max. Größe | Verarbeitung |
|-----|---------|------------|--------------|
| Videos | MP4, AVI, MOV, MKV, WebM | 100MB | FFmpeg |
| Bilder | JPG, PNG, WebP | 50MB | Sharp + SVG |
| PDFs | PDF | 50MB | PDF-lib |

## Installation und Start

1. **Backend Dependencies installieren:**
```bash
cd backend
npm install sharp pdf-lib
```

2. **Frontend starten:**
```bash
cd frontend
npm run dev
```

3. **Backend starten:**
```bash
cd backend
npm run dev
```

## Verwendung

1. **Wasserzeichen konfigurieren:**
   - Text eingeben
   - Schriftgröße anpassen (12-72px)
   - Farbe wählen
   - Position auswählen
   - Transparenz einstellen (0-100%)

2. **Datei hochladen:**
   - Drag & Drop oder Klick zum Auswählen
   - Automatische Formatserkennung
   - Unterstützte Formate werden angezeigt

3. **Verarbeitung:**
   - Fortschrittsanzeige
   - Automatischer Download nach Fertigstellung
   - Fehlerbehandlung mit detaillierten Meldungen

## Vorteile der neuen Implementierung

- **Universell**: Ein Interface für alle Dateitypen
- **Performant**: Optimierte Libraries (Sharp, PDF-lib)
- **Skalierbar**: Modularer Aufbau für einfache Erweiterungen
- **Benutzerfreundlich**: Intuitive Bedienung mit visuellen Hinweisen
- **Robust**: Umfassende Fehlerbehandlung

## Zukünftige Erweiterungen

Das modulare Design ermöglicht einfache Erweiterungen:
- Weitere Bildformate (TIFF, BMP)
- Bild-Wasserzeichen (nicht nur Text)
- Batch-Verarbeitung
- Cloud-Storage-Integration
- Erweiterte PDF-Features (Seiten-spezifische Wasserzeichen)

Das System ist jetzt vollständig funktionsfähig und bereit für die Verwendung mit Videos, Bildern und PDFs!