# ZIP-Upload Feature

## Übersicht

Das ZIP-Upload Feature ermöglicht es Benutzern, ZIP-Archive hochzuladen, die automatisch entpackt und alle enthaltenen unterstützten Dateien mit Wasserzeichen versehen werden.

## Funktionalität

### Unterstützte Dateiformate in ZIP-Archiven

- **Bilder**: JPG, JPEG, PNG, WebP, BMP, TIFF
- **Videos**: MP4, AVI, MOV, MKV, WebM, FLV, WMV
- **Dokumente**: PDF

### Backend-Implementierung

#### Neue Services

1. **ZipProcessor** (`backend/src/services/zipProcessor.ts`)
   - Entpackt ZIP-Archive mit der `yauzl` Bibliothek
   - Filtert unterstützte Dateiformate
   - Verarbeitet Dateien sequenziell mit entsprechenden Prozessoren
   - Bietet detaillierte Progress-Callbacks
   - Automatisches Cleanup von temporären Dateien

2. **Neue API-Route** (`/api/process-zip`)
   - Akzeptiert ZIP-Dateien bis 200MB
   - Verwendet Multipart-Upload für ZIP + Wasserzeichen-Einstellungen
   - Gibt detaillierte Verarbeitungsergebnisse zurück

#### Technische Details

```typescript
interface ZipProcessResult {
  success: boolean
  totalFiles: number
  processedFiles: ProcessedFileResult[]
  skippedFiles: string[]
  processingTime: number
  error?: string
}

interface ProcessedFileResult {
  originalName: string
  processedUrl: string
  fileType: 'image' | 'video' | 'pdf'
  processingTime: number
  success: boolean
  error?: string
}
```

#### Verarbeitungsablauf

1. **ZIP-Upload**: Benutzer lädt ZIP-Datei hoch
2. **Entpackung**: ZIP wird in temporäres Verzeichnis entpackt
3. **Filterung**: Nur unterstützte Dateiformate werden extrahiert
4. **Verarbeitung**: Jede Datei wird sequenziell verarbeitet:
   - Bilder und PDFs: `fileProcessor`
   - Videos: `videoProcessor`
5. **Cleanup**: Temporäre Dateien werden gelöscht
6. **Ergebnis**: Liste der verarbeiteten Dateien wird zurückgegeben

### Frontend-Implementierung

#### Neue Komponenten

1. **ZipDropZone** (`frontend/src/components/ZipDropZone.tsx`)
   - Spezielle DropZone für ZIP-Dateien
   - Progress-Anzeige während der Verarbeitung
   - Übersicht über verarbeitete und übersprungene Dateien
   - Einzelne Download-Links für jede verarbeitete Datei
   - "Alle herunterladen" Funktion

2. **Erweiterte HomePage**
   - Tab-Navigation zwischen einzelnen Dateien und ZIP-Archiven
   - Einheitliche Wasserzeichen-Einstellungen für beide Modi

#### Benutzeroberfläche

- **Upload-Bereich**: Drag & Drop für ZIP-Dateien
- **Progress-Anzeige**: Echtzeit-Updates während der Verarbeitung
- **Ergebnisübersicht**: 
  - Anzahl verarbeiteter vs. gesamte Dateien
  - Verarbeitungszeit
  - Liste erfolgreich verarbeiteter Dateien
  - Liste übersprungener Dateien mit Fehlermeldungen
- **Download-Optionen**:
  - Einzelne Dateien herunterladen
  - Alle verarbeiteten Dateien auf einmal herunterladen

## Installation und Abhängigkeiten

### Backend

```bash
cd backend
npm install yauzl @types/yauzl
```

### Neue Dependencies

- `yauzl`: ZIP-Entpackung
- `@types/yauzl`: TypeScript-Typen für yauzl

## API-Endpunkte

### POST `/api/process-zip`

**Request:**
- `Content-Type`: `multipart/form-data`
- `zip`: ZIP-Datei (max. 200MB)
- `watermark`: JSON-String mit Wasserzeichen-Einstellungen

**Response:**
```json
{
  "success": true,
  "data": {
    "totalFiles": 5,
    "processedFiles": [
      {
        "originalName": "image1.jpg",
        "processedUrl": "/output/watermarked_abc123.jpg",
        "fileType": "image",
        "processingTime": 2.1,
        "success": true
      }
    ],
    "skippedFiles": ["unsupported.txt: Unsupported file type"],
    "processingTime": 15.3,
    "filename": "archive.zip"
  }
}
```

## Sicherheitsaspekte

- **Dateigröße-Limits**: ZIP-Dateien sind auf 200MB begrenzt
- **Dateiformat-Validierung**: Nur unterstützte Formate werden verarbeitet
- **Path-Traversal-Schutz**: Sichere Extraktion verhindert Pfad-Manipulation
- **System-Dateien-Filter**: __MACOSX, .DS_Store werden automatisch übersprungen
- **Temporäre Dateien**: Automatisches Cleanup nach Verarbeitung

## Fehlerbehandlung

- **Ungültige ZIP-Dateien**: Klare Fehlermeldungen
- **Beschädigte Dateien**: Werden übersprungen, andere werden weiter verarbeitet
- **Speicher-/Timeout-Probleme**: Graceful Degradation
- **Teilweise Erfolge**: Detaillierte Aufschlüsselung von Erfolgen und Fehlern

## Performance-Optimierungen

- **Sequenzielle Verarbeitung**: Verhindert Speicher-Überlastung
- **Streaming-Extraktion**: Effiziente Speichernutzung bei großen ZIP-Dateien
- **Progress-Callbacks**: Echtzeit-Feedback für Benutzer
- **Automatisches Cleanup**: Verhindert Speicher-Leaks

## Zukünftige Erweiterungen

- **Parallele Verarbeitung**: Für bessere Performance bei vielen kleinen Dateien
- **RAR/7Z-Support**: Unterstützung für weitere Archive-Formate
- **Batch-Download**: ZIP-Download aller verarbeiteten Dateien
- **Progress-WebSockets**: Echtzeit-Progress über WebSocket-Verbindung

## Nutzung

1. Öffnen Sie die Anwendung im Browser
2. Wählen Sie den "ZIP-Archive" Tab
3. Konfigurieren Sie Ihre Wasserzeichen-Einstellungen
4. Laden Sie eine ZIP-Datei hoch (Drag & Drop oder Klick)
5. Klicken Sie auf "ZIP verarbeiten"
6. Warten Sie auf die Verarbeitung (Progress wird angezeigt)
7. Laden Sie einzelne Dateien oder alle auf einmal herunter

Das Feature ist vollständig in das bestehende System integriert und nutzt die gleichen Wasserzeichen-Einstellungen und Verarbeitungs-Engines wie die Einzeldatei-Verarbeitung.