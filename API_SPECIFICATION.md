# 🔌 WatermarkPro API Spezifikation

## 📋 Übersicht

RESTful API für die WatermarkPro-Anwendung mit WebSocket-Support für Echtzeit-Updates.

**Base URL**: `https://api.watermarkpro.com/v1`
**WebSocket URL**: `wss://ws.watermarkpro.com/v1`

## 🔐 Authentifizierung

```typescript
// JWT-basierte Authentifizierung
interface AuthHeaders {
  'Authorization': 'Bearer <jwt_token>';
  'Content-Type': 'application/json';
}

// API Key für externe Services
interface APIKeyHeaders {
  'X-API-Key': '<api_key>';
  'Content-Type': 'application/json';
}
```

## 📁 File Upload & Management

### POST /files/upload
**Beschreibung**: Upload einzelner oder mehrerer Dateien

```typescript
// Request (multipart/form-data)
interface UploadRequest {
  files: File | File[];
  metadata?: {
    originalName?: string;
    tags?: string[];
    folder?: string;
  };
}

// Response
interface UploadResponse {
  success: boolean;
  data: {
    uploadId: string;
    files: UploadedFile[];
    totalSize: number;
    estimatedProcessingTime: number;
  };
  message: string;
}

interface UploadedFile {
  id: string;
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  metadata: FileMetadata;
}

interface FileMetadata {
  width?: number;
  height?: number;
  duration?: number; // für Videos in Sekunden
  format: string;
  colorSpace?: string;
  hasAlpha?: boolean;
}
```

### GET /files
**Beschreibung**: Liste aller hochgeladenen Dateien

```typescript
// Query Parameters
interface FilesQuery {
  page?: number;
  limit?: number;
  type?: 'image' | 'video' | 'archive';
  sortBy?: 'createdAt' | 'size' | 'name';
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

// Response
interface FilesResponse {
  success: boolean;
  data: {
    files: UploadedFile[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}
```

### DELETE /files/:id
**Beschreibung**: Datei löschen

```typescript
// Response
interface DeleteFileResponse {
  success: boolean;
  message: string;
}
```

## 💧 Watermark Management

### POST /watermarks
**Beschreibung**: Neues Wasserzeichen erstellen

```typescript
// Request
interface CreateWatermarkRequest {
  name: string;
  type: 'image' | 'text';
  settings: WatermarkSettings;
  file?: File; // nur bei type: 'image'
}

interface WatermarkSettings {
  // Gemeinsame Einstellungen
  opacity: number; // 0-1
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'custom';
  customPosition?: { x: number; y: number }; // in Prozent
  scale: number; // 0-1
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay';
  
  // Text-spezifische Einstellungen
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  color?: string;
  strokeColor?: string;
  strokeWidth?: number;
  
  // Bild-spezifische Einstellungen
  tiled?: boolean;
  spacing?: { x: number; y: number };
}

// Response
interface WatermarkResponse {
  success: boolean;
  data: {
    id: string;
    name: string;
    type: 'image' | 'text';
    settings: WatermarkSettings;
    previewUrl?: string;
    createdAt: string;
  };
}
```

### GET /watermarks
**Beschreibung**: Liste aller Wasserzeichen

```typescript
// Response
interface WatermarksResponse {
  success: boolean;
  data: WatermarkResponse['data'][];
}
```

### PUT /watermarks/:id
**Beschreibung**: Wasserzeichen aktualisieren

```typescript
// Request & Response analog zu POST /watermarks
```

### DELETE /watermarks/:id
**Beschreibung**: Wasserzeichen löschen

## ⚙️ Processing Jobs

### POST /jobs/watermark
**Beschreibung**: Wasserzeichen-Job erstellen

```typescript
// Request
interface CreateJobRequest {
  files: string[]; // Array von File-IDs
  watermarkId: string;
  outputSettings: OutputSettings;
  priority?: JobPriority;
  webhookUrl?: string;
}

interface OutputSettings {
  format?: 'original' | 'jpg' | 'png' | 'webp' | 'mp4';
  quality?: number; // 1-100
  compression?: 'none' | 'low' | 'medium' | 'high';
  resize?: {
    width?: number;
    height?: number;
    maintainAspectRatio?: boolean;
  };
}

enum JobPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

// Response
interface CreateJobResponse {
  success: boolean;
  data: {
    jobId: string;
    status: JobStatus;
    estimatedDuration: number;
    queuePosition: number;
    files: JobFile[];
    createdAt: string;
  };
}

enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

interface JobFile {
  fileId: string;
  status: JobStatus;
  progress: number; // 0-100
  resultUrl?: string;
  error?: string;
}
```

### GET /jobs/:id
**Beschreibung**: Job-Status abrufen

```typescript
// Response
interface JobResponse {
  success: boolean;
  data: {
    id: string;
    status: JobStatus;
    progress: number; // 0-100
    files: JobFile[];
    startedAt?: string;
    completedAt?: string;
    duration?: number;
    error?: string;
  };
}
```

### GET /jobs
**Beschreibung**: Alle Jobs auflisten

```typescript
// Query Parameters
interface JobsQuery {
  status?: JobStatus;
  page?: number;
  limit?: number;
}

// Response
interface JobsResponse {
  success: boolean;
  data: {
    jobs: JobResponse['data'][];
    pagination: {
      page: number;
      limit: number;
      total: number;
    };
  };
}
```

### DELETE /jobs/:id
**Beschreibung**: Job abbrechen

```typescript
// Response
interface CancelJobResponse {
  success: boolean;
  message: string;
}
```

## 📊 Analytics & Statistics

### GET /stats/overview
**Beschreibung**: Übersichts-Statistiken

```typescript
// Response
interface StatsResponse {
  success: boolean;
  data: {
    totalFiles: number;
    totalJobs: number;
    totalProcessingTime: number;
    averageProcessingTime: number;
    successRate: number;
    queueLength: number;
    activeWorkers: number;
  };
}
```

### GET /stats/performance
**Beschreibung**: Performance-Metriken

```typescript
// Query Parameters
interface PerformanceQuery {
  timeframe?: '1h' | '24h' | '7d' | '30d';
  granularity?: 'minute' | 'hour' | 'day';
}

// Response
interface PerformanceResponse {
  success: boolean;
  data: {
    timeframe: string;
    metrics: PerformanceMetric[];
  };
}

interface PerformanceMetric {
  timestamp: string;
  averageProcessingTime: number;
  throughput: number; // Jobs pro Minute
  errorRate: number;
  queueLength: number;
}
```

## 🔌 WebSocket Events

### Connection
```typescript
// Client to Server
interface WSConnection {
  type: 'auth';
  token: string;
}

// Server to Client
interface WSAuthResponse {
  type: 'auth_response';
  success: boolean;
  message?: string;
}
```

### Job Updates
```typescript
// Server to Client - Job Status Updates
interface WSJobUpdate {
  type: 'job_update';
  data: {
    jobId: string;
    status: JobStatus;
    progress: number;
    fileUpdates?: {
      fileId: string;
      status: JobStatus;
      progress: number;
      resultUrl?: string;
      error?: string;
    }[];
  };
}

// Server to Client - Job Completed
interface WSJobCompleted {
  type: 'job_completed';
  data: {
    jobId: string;
    duration: number;
    results: {
      fileId: string;
      resultUrl: string;
      downloadUrl: string;
    }[];
  };
}
```

### Queue Updates
```typescript
// Server to Client - Queue Status
interface WSQueueUpdate {
  type: 'queue_update';
  data: {
    queueLength: number;
    activeJobs: number;
    estimatedWaitTime: number;
  };
}
```

### System Status
```typescript
// Server to Client - System Status
interface WSSystemStatus {
  type: 'system_status';
  data: {
    status: 'online' | 'maintenance' | 'degraded';
    activeWorkers: number;
    throughput: number;
    message?: string;
  };
}
```

## 🚨 Error Handling

### Standard Error Response
```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId: string;
  };
}
```

### Error Codes
```typescript
enum ErrorCodes {
  // Authentication
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // Validation
  INVALID_INPUT = 'INVALID_INPUT',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Processing
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  WATERMARK_NOT_FOUND = 'WATERMARK_NOT_FOUND',
  JOB_NOT_FOUND = 'JOB_NOT_FOUND',
  QUEUE_FULL = 'QUEUE_FULL',
  
  // System
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
}
```

## 🔄 Rate Limiting

### Request Limits
```typescript
interface RateLimits {
  uploads: {
    requests: 100; // pro Stunde
    totalSize: 5; // GB pro Tag
  };
  api: {
    requests: 1000; // pro Stunde
    burst: 10; // pro Minute
  };
  processing: {
    concurrentJobs: 5; // gleichzeitige Jobs
    queuedJobs: 50; // wartende Jobs
  };
}
```

### Rate Limit Headers
```typescript
interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'X-RateLimit-Retry-After'?: string;
}
```

## 📝 API Versioning

### Version Header
```typescript
interface VersionHeaders {
  'Accept': 'application/vnd.watermarkpro.v1+json';
  'API-Version': 'v1';
}
```

### Changelog
- **v1.0**: Initial API Release
- **v1.1**: WebSocket Support hinzugefügt
- **v1.2**: Batch-Processing verbessert
- **v1.3**: Analytics-Endpoints erweitert

## 🧪 Testing

### Test Environment
**Base URL**: `https://api-test.watermarkpro.com/v1`

### Mock Responses
Alle Endpoints unterstützen einen `X-Mock-Response` Header für Testzwecke:

```typescript
interface MockHeaders {
  'X-Mock-Response': 'success' | 'error' | 'timeout' | 'rate-limit';
  'X-Mock-Delay'?: string; // in Millisekunden
}
```

## 📚 SDK & Client Libraries

### JavaScript/TypeScript
```bash
npm install @watermarkpro/client
```

```typescript
import { WatermarkProClient } from '@watermarkpro/client';

const client = new WatermarkProClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.watermarkpro.com/v1'
});

// Upload und verarbeiten
const result = await client.processFiles({
  files: [file1, file2],
  watermarkId: 'watermark-123',
  onProgress: (progress) => console.log(progress)
});
```

### Python
```bash
pip install watermarkpro-client
```

```python
from watermarkpro import WatermarkProClient

client = WatermarkProClient(api_key='your-api-key')
result = client.process_files(
    files=[file1, file2],
    watermark_id='watermark-123'
)
```

---

**Diese API-Spezifikation bietet eine vollständige, typsichere und skalierbare Schnittstelle für die WatermarkPro-Anwendung mit umfassender Fehlerbehandlung und Echtzeit-Funktionalität.** 