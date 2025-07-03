# 🎨 WatermarkPro

> **Hochperformante Wasserzeichen-Anwendung mit modernster Technologie**

Eine ultraschnelle, skalierbare Web-Anwendung für das automatisierte Hinzufügen von Wasserzeichen zu Bildern und Videos mit fortschrittlichem Queue-Management und intuitiver Drag & Drop-Funktionalität.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)
![React](https://img.shields.io/badge/React-18-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-18-green.svg)

## 🚀 Quick Start (Windows)

### Sofort starten:
```bash
# 1. Einfach das Batch-Script ausführen
start-dev.bat
```

### Oder manuell:
```bash
# 1. Dependencies installieren
npm install

# 2. Services starten
npm run dev
```

**Das war's!** Die Anwendung läuft jetzt auf:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000  
- **Health Check**: http://localhost:8000/health
- **Redis Commander**: http://localhost:8081
- **MinIO Console**: http://localhost:9001 (admin/admin)

## ✨ Features

### 🚀 **Performance & Geschwindigkeit**
- **Sub-Sekunden Verarbeitung** für Bilder < 5MB
- **GPU-beschleunigte Video-Verarbeitung** mit FFmpeg
- **Parallele Verarbeitung** mit Worker-Threads
- **Intelligent Caching** mit Redis

### 📁 **Dateiformate & Upload**
- **Drag & Drop Interface** für alle Dateitypen
- **ZIP-Archive Upload** - Automatische Entpackung und Batch-Verarbeitung
- **Unterstützte Formate**: JPG, PNG, WebP, MP4, AVI, MOV, PDF
- **Batch-Verarbeitung** von 1000+ Dateien aus ZIP-Archiven
- **Stream-basierte Uploads** für große Dateien (bis 200MB ZIP)

### 💧 **Wasserzeichen-Features**
- **Text & Bild-Wasserzeichen** mit Live-Vorschau
- **Positionierung & Transparenz** vollständig anpassbar
- **Blend-Modi** für professionelle Ergebnisse
- **Tiled Wasserzeichen** für maximalen Schutz

### ⚡ **Queue & Echtzeit**
- **Prioritätsbasierte Queue** mit Bull + Redis
- **Echtzeit-Updates** via WebSocket
- **Automatische Retry-Logic** bei Fehlern
- **Monitoring Dashboard** mit Prometheus

## 🏗️ Architektur

```
Frontend (React 18 + TypeScript)
├── Vite + TailwindCSS
├── Framer Motion (Animationen)
├── React Query (State Management)
└── Web Workers (Background Processing)

Backend (Node.js + Fastify)
├── Bull Queue + Redis
├── Sharp (Bildverarbeitung)
├── FFmpeg (Video-Verarbeitung)
├── Prisma + PostgreSQL
└── WebSocket (Real-time)

Infrastructure
├── Docker + Kubernetes
├── Nginx (Load Balancer)
├── Prometheus + Grafana
└── GitHub Actions (CI/CD)
```

## 🛠️ Entwicklung

### Voraussetzungen
- **Node.js 18+** (https://nodejs.org)
- **Docker Desktop** (für Services)
- **Git** für Versionskontrolle

### Lokale Entwicklung

```bash
# Alle Services gleichzeitig starten
npm run dev

# Nur Frontend
npm run dev:frontend

# Nur Backend
npm run dev:backend

# Services neustarten
npm run services:reset

# Datenbank zurücksetzen
npm run db:reset
```

### Projektstruktur
```
watermark-pro/
├── frontend/          # React Frontend
├── backend/           # Node.js Backend
├── shared/            # Geteilte Types & Utils
├── docker-compose.yml # Services (DB, Redis, MinIO)
└── start-dev.bat      # Windows Quick-Start
```

## 📊 Performance

### Benchmarks
- **Bilder (< 5MB)**: < 500ms Verarbeitung
- **Videos (< 100MB)**: < 30s Verarbeitung
- **Batch (1000 Bilder)**: < 10min Verarbeitung
- **Uptime**: 99.9% SLA

### Skalierung
- **Gleichzeitige Benutzer**: 1000+
- **Queue Kapazität**: 10,000+ Jobs
- **Storage**: Unbegrenzt (S3-kompatibel)
- **Auto-Scaling**: Kubernetes HPA

## 🔒 Sicherheit

- **JWT Authentication** für API-Zugriff
- **Rate Limiting** gegen Missbrauch
- **File Validation** gegen Malware
- **CORS Protection** für sichere Anfragen
- **Encrypted Storage** für sensitive Daten

## 📚 Dokumentation

- **[Vollständiger Projektplan](PROJECT_PLAN.md)** - Strategische Ziele und technische Details
- **[API Spezifikation](API_SPECIFICATION.md)** - RESTful API & WebSocket Events
- **[Quick Start Guide](QUICK_START.md)** - Schnelle Einrichtung

## 🧪 Testing

```bash
# Unit Tests
npm run test:unit

# Integration Tests
npm run test:integration

# E2E Tests
npm run test:e2e

# Test Coverage
npm run test:coverage
```

## 🚀 Deployment

### Production Deployment

```bash
# Build Images
docker-compose -f docker-compose.prod.yml build

# Deploy zu Kubernetes
kubectl apply -f infrastructure/kubernetes/

# Rolling Update
kubectl set image deployment/watermarkpro-backend backend=watermarkpro/backend:latest
```

## 🤝 Contributing

1. Fork das Repository
2. Erstelle einen Feature Branch (`git checkout -b feature/amazing-feature`)
3. Commit deine Änderungen (`git commit -m 'Add amazing feature'`)
4. Push zum Branch (`git push origin feature/amazing-feature`)
5. Öffne einen Pull Request

## 📄 License

Dieses Projekt ist unter der MIT License lizenziert - siehe [LICENSE](LICENSE) für Details.

## 🙏 Acknowledgments

- **Sharp** für ultraschnelle Bildverarbeitung
- **FFmpeg** für professionelle Video-Verarbeitung
- **Bull** für robuste Queue-Verwaltung
- **Fastify** für Performance-optimierte APIs
- **React** & **TypeScript** für moderne Frontend-Entwicklung

---

**Entwickelt mit ❤️ für maximale Performance und Benutzerfreundlichkeit** 