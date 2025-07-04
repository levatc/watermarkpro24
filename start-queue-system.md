# 🚀 Queue-System Startanleitung

## Überblick

Das neue Queue-System ermöglicht es, mehrere Dateien gleichzeitig hochzuladen und sie im Hintergrund nacheinander zu verarbeiten. Dabei werden Echtzeit-Updates über WebSocket bereitgestellt.

## Features

✅ **Sofortiger Upload**: Dateien werden sofort hochgeladen und zur Queue hinzugefügt  
✅ **Hintergrund-Verarbeitung**: Jobs werden nacheinander im Hintergrund abgearbeitet  
✅ **Mehrere gleichzeitige Uploads**: Nutzer kann weitere Dateien hochladen während andere verarbeitet werden  
✅ **Echtzeit-Status**: WebSocket-basierte Updates mit Prozentanzeige und Animationen  
✅ **Automatischer Download**: Fertige Dateien können direkt heruntergeladen werden  

## System-Architektur

```
Frontend (React)
├── DropZone - Sofortiger Upload zur Queue
├── QueueDashboard - Echtzeit-Status mit WebSocket
└── useWebSocket Hook - WebSocket-Verbindung

Backend (Fastify)
├── QueueManager - Bull.js Queue mit Redis
├── WebSocket Server - Echtzeit-Updates
├── fileRoutes - Queue-basierte Datei-Verarbeitung
└── videoRoutes - Queue-basierte Video-Verarbeitung
```

## Installation & Start

### 1. Backend starten

```bash
cd backend

# Dependencies installieren (falls noch nicht geschehen)
npm install

# Redis starten (Docker)
docker run -d -p 6379:6379 redis:alpine

# Backend starten
npm run dev
```

### 2. Frontend starten

```bash
cd frontend

# Dependencies installieren (falls noch nicht geschehen)
npm install

# Frontend starten
npm run dev
```

### 3. System testen

1. **Frontend öffnen**: http://localhost:3000
2. **WebSocket-Verbindung prüfen**: Grüner "Verbunden" Status im Queue-Dashboard
3. **Dateien hochladen**: Bilder oder Videos in die DropZone ziehen
4. **Echtzeit-Updates beobachten**: Fortschritt in der Queue verfolgen

## API-Endpunkte

### Upload-Endpunkte (Queue-basiert)
- `POST /api/process-file` - Bilder/PDFs zur Queue hinzufügen
- `POST /api/process-video` - Videos zur Queue hinzufügen

### Queue-Management
- `GET /api/queue/status` - Aktuelle Queue-Statistiken
- `GET /api/queue/jobs/:uploadId` - Jobs für eine Upload-ID
- `GET /health` - System-Gesundheit inkl. Queue-Status

### WebSocket
- `ws://localhost:8000/ws` - Echtzeit-Updates

## WebSocket-Events

### Client → Server
```json
{ "type": "ping" }
{ "type": "get_queue_status" }
```

### Server → Client
```json
{
  "type": "job:update",
  "data": {
    "jobId": "uuid",
    "uploadId": "uuid", 
    "filename": "test.jpg",
    "progress": 75,
    "status": "processing"
  }
}

{
  "type": "job:completed",
  "data": {
    "jobId": "uuid",
    "result": { "resultUrl": "/output/processed_test.jpg" }
  }
}

{
  "type": "queue_status",
  "data": {
    "stats": { "waiting": 2, "active": 1, "completed": 5 },
    "activeJobs": [...]
  }
}
```

## Workflow

1. **Upload**: Nutzer zieht Dateien in DropZone
2. **Sofortiger Upload**: Dateien werden sofort zur Queue hinzugefügt
3. **Queue-Verarbeitung**: Jobs werden nacheinander abgearbeitet
4. **Echtzeit-Updates**: WebSocket sendet Fortschritt-Updates
5. **Download**: Fertige Dateien können heruntergeladen werden
6. **Weitere Uploads**: Nutzer kann weitere Dateien hochladen

## Vorteile

- **Keine Blockierung**: Nutzer kann weitere Dateien hochladen während andere verarbeitet werden
- **Skalierbar**: Queue kann beliebig viele Jobs verwalten
- **Robust**: Retry-Mechanismus bei Fehlern
- **Transparent**: Echtzeit-Fortschritt für alle Jobs
- **Effizient**: Parallele Verarbeitung mit konfigurierbaren Workern

## Konfiguration

### Queue-Einstellungen (QueueManager.ts)
```typescript
// Worker-Anzahl anpassen
this.watermarkQueue.process('image', 3, async (job) => {...})  // 3 parallele Bild-Jobs
this.watermarkQueue.process('video', 2, async (job) => {...})  // 2 parallele Video-Jobs

// Job-Optionen
defaultJobOptions: {
  removeOnComplete: 50,  // Behalte 50 abgeschlossene Jobs
  removeOnFail: 20,      // Behalte 20 fehlgeschlagene Jobs
  attempts: 3,           // 3 Wiederholungsversuche
  backoff: 'exponential' // Exponentieller Backoff
}
```

### WebSocket-Einstellungen
```typescript
// Ping-Intervall (useWebSocket.ts)
const pingInterval = 30000  // 30 Sekunden

// Reconnect-Einstellungen
const maxReconnectAttempts = 5
const reconnectDelay = 3000  // 3 Sekunden
```

## Debugging

### Backend-Logs
```bash
# Queue-Status prüfen
curl http://localhost:8000/api/queue/status

# Health-Check
curl http://localhost:8000/health

# Redis-Verbindung prüfen
redis-cli ping
```

### Frontend-Logs
```javascript
// Browser-Konsole
// WebSocket-Nachrichten werden automatisch geloggt
// Queue-Updates sind in der QueueDashboard-Komponente sichtbar
```

## Troubleshooting

### Redis-Verbindung fehlgeschlagen
```bash
# Redis starten
docker run -d -p 6379:6379 redis:alpine

# Redis-Status prüfen
docker ps | grep redis
```

### WebSocket-Verbindung fehlgeschlagen
- Backend-Server läuft auf Port 8000?
- CORS-Einstellungen korrekt?
- Browser-Konsole auf Fehler prüfen

### Jobs hängen fest
```bash
# Queue-Status prüfen
curl http://localhost:8000/api/queue/status

# Backend-Logs prüfen
npm run dev  # Im Backend-Verzeichnis
```

Das neue Queue-System ist jetzt vollständig implementiert und bereit für den Test! 🎉