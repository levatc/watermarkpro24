# 🛠️ WatermarkPro - Technisches Setup & Implementierung

## 📦 Projekt-Initialisierung

### 1. Grundstruktur erstellen

```bash
# Hauptverzeichnis erstellen
mkdir watermark-pro && cd watermark-pro

# Projektstruktur erstellen
mkdir -p {frontend,backend,shared,infrastructure,docs,tests,scripts}
mkdir -p frontend/{src,public,src/{components,hooks,services,utils,workers,types}}
mkdir -p backend/{src,prisma,src/{controllers,services,middleware,utils,workers,types}}
mkdir -p backend/src/services/{watermark,queue,file}
mkdir -p shared/{types,utils}
mkdir -p infrastructure/{docker,kubernetes,nginx,monitoring}
mkdir -p tests/{unit,integration,e2e}
```

### 2. Git & Development Setup

```bash
# Git Repository initialisieren
git init
echo "node_modules/\n.env\n*.log\ndist/\nbuild/\n.DS_Store" > .gitignore

# GitHub Repository erstellen (optional)
gh repo create watermark-pro --public --description "Hochperformante Wasserzeichen-Anwendung"
```

## 🎨 Frontend-Setup (React + TypeScript)

### 1. Vite-Projekt erstellen

```bash
cd frontend
npm create vite@latest . -- --template react-ts
npm install
```

### 2. Essential Dependencies

```bash
# Core Dependencies
npm install \
  @tanstack/react-query \
  zustand \
  react-dropzone \
  framer-motion \
  @headlessui/react \
  @heroicons/react \
  clsx \
  tailwind-merge

# Development Dependencies
npm install -D \
  @types/node \
  @vitejs/plugin-react \
  tailwindcss \
  postcss \
  autoprefixer \
  eslint \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin \
  prettier \
  vite-tsconfig-paths
```

### 3. TailwindCSS Konfiguration

```bash
# TailwindCSS Setup
npx tailwindcss init -p
```

```typescript
// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-gentle': 'bounce 2s infinite',
      },
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        }
      }
    },
  },
  plugins: [
    require('@headlessui/tailwindcss'),
    require('@tailwindcss/forms'),
  ],
}
```

### 4. Vite Konfiguration

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@headlessui/react', 'framer-motion'],
          utils: ['@tanstack/react-query', 'zustand'],
        },
      },
    },
  },
  worker: {
    format: 'es',
  },
})
```

### 5. Kern-Komponenten erstellen

```typescript
// src/components/DropZone/DropZone.tsx
import React, { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion } from 'framer-motion'
import { CloudArrowUpIcon } from '@heroicons/react/24/outline'

interface DropZoneProps {
  onDrop: (files: File[]) => void
  accept?: Record<string, string[]>
  maxSize?: number
  multiple?: boolean
}

export const DropZone: React.FC<DropZoneProps> = ({
  onDrop,
  accept = {
    'image/*': ['.jpg', '.jpeg', '.png', '.webp'],
    'video/*': ['.mp4', '.avi', '.mov', '.mkv'],
    'application/zip': ['.zip'],
  },
  maxSize = 500 * 1024 * 1024, // 500MB
  multiple = true,
}) => {
  const onDropAccepted = useCallback(
    (acceptedFiles: File[]) => {
      onDrop(acceptedFiles)
    },
    [onDrop]
  )

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop: onDropAccepted,
    accept,
    maxSize,
    multiple,
  })

  return (
    <motion.div
      {...getRootProps()}
      className={`
        relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
        transition-colors duration-200
        ${isDragActive && !isDragReject ? 'border-primary-500 bg-primary-50' : ''}
        ${isDragReject ? 'border-red-500 bg-red-50' : ''}
        ${!isDragActive ? 'border-gray-300 hover:border-gray-400' : ''}
      `}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <input {...getInputProps()} />
      <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
      <p className="mt-2 text-sm text-gray-600">
        {isDragActive
          ? 'Dateien hier ablegen...'
          : 'Dateien hierher ziehen oder klicken zum Auswählen'}
      </p>
      <p className="text-xs text-gray-500 mt-1">
        Unterstützt: Bilder, Videos, ZIP-Archive (max. 500MB)
      </p>
    </motion.div>
  )
}
```

```typescript
// src/hooks/useFileUpload.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { uploadFiles } from '@/services/api'

export const useFileUpload = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: uploadFiles,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
      // Zeige Success-Notification
    },
    onError: (error) => {
      // Zeige Error-Notification
      console.error('Upload failed:', error)
    },
  })
}
```

## 🔧 Backend-Setup (Node.js + Fastify)

### 1. Node.js Projekt initialisieren

```bash
cd backend
npm init -y
```

### 2. Core Dependencies

```bash
# Production Dependencies
npm install \
  fastify \
  @fastify/cors \
  @fastify/rate-limit \
  @fastify/multipart \
  @fastify/websocket \
  @fastify/jwt \
  @prisma/client \
  bull \
  ioredis \
  sharp \
  fluent-ffmpeg \
  node-stream-zip \
  winston \
  helmet \
  dotenv \
  zod

# Development Dependencies
npm install -D \
  @types/node \
  @types/fluent-ffmpeg \
  typescript \
  tsx \
  nodemon \
  prisma \
  eslint \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin \
  prettier \
  jest \
  @types/jest \
  supertest \
  @types/supertest
```

### 3. TypeScript Konfiguration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@shared/*": ["../shared/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 4. Prisma Schema

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  apiKey    String?  @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  files      File[]
  watermarks Watermark[]
  jobs       Job[]

  @@map("users")
}

model File {
  id           String    @id @default(cuid())
  originalName String
  filename     String    @unique
  mimetype     String
  size         Int
  url          String
  thumbnailUrl String?
  metadata     Json?
  uploadedAt   DateTime  @default(now())
  
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  jobFiles JobFile[]

  @@map("files")
}

model Watermark {
  id        String   @id @default(cuid())
  name      String
  type      String   // 'image' | 'text'
  settings  Json
  fileUrl   String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  jobs Job[]

  @@map("watermarks")
}

model Job {
  id               String    @id @default(cuid())
  status           String    @default("pending")
  priority         String    @default("normal")
  outputSettings   Json
  progress         Int       @default(0)
  estimatedDuration Int?
  startedAt        DateTime?
  completedAt      DateTime?
  error            String?
  createdAt        DateTime  @default(now())

  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  watermarkId String
  watermark   Watermark @relation(fields: [watermarkId], references: [id])
  
  files JobFile[]

  @@map("jobs")
}

model JobFile {
  id        String  @id @default(cuid())
  status    String  @default("pending")
  progress  Int     @default(0)
  resultUrl String?
  error     String?

  jobId  String
  job    Job    @relation(fields: [jobId], references: [id], onDelete: Cascade)
  fileId String
  file   File   @relation(fields: [fileId], references: [id], onDelete: Cascade)

  @@unique([jobId, fileId])
  @@map("job_files")
}
```

### 5. Server-Setup

```typescript
// src/server.ts
import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import websocket from '@fastify/websocket'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'
import { setupRoutes } from './routes'
import { logger } from './utils/logger'

const prisma = new PrismaClient()

const server = Fastify({
  logger: logger,
  bodyLimit: 1024 * 1024 * 500, // 500MB
})

async function start() {
  try {
    // Plugins registrieren
    await server.register(cors, {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
    })

    await server.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
    })

    await server.register(multipart, {
      limits: {
        fieldNameSize: 100,
        fieldSize: 1024 * 1024 * 500, // 500MB
        fields: 10,
        fileSize: 1024 * 1024 * 500, // 500MB
        files: 50,
      },
    })

    await server.register(websocket)

    await server.register(jwt, {
      secret: process.env.JWT_SECRET || 'supersecret',
    })

    // Middleware für Prisma
    server.decorate('prisma', prisma)

    // Routes registrieren
    await setupRoutes(server)

    // Health Check
    server.get('/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() }
    })

    // Server starten
    const port = parseInt(process.env.PORT || '8000')
    await server.listen({ port, host: '0.0.0.0' })
    
    console.log(`🚀 Server running on http://localhost:${port}`)
  } catch (error) {
    server.log.error(error)
    process.exit(1)
  }
}

// Graceful Shutdown
const gracefulShutdown = async () => {
  try {
    await server.close()
    await prisma.$disconnect()
    process.exit(0)
  } catch (error) {
    console.error('Error during shutdown:', error)
    process.exit(1)
  }
}

process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)

start()
```

### 6. Queue-System Setup

```typescript
// src/services/queue/QueueManager.ts
import Queue from 'bull'
import Redis from 'ioredis'
import { ProcessingWorker } from './workers/ProcessingWorker'

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: 3,
})

export class QueueManager {
  private watermarkQueue: Queue.Queue

  constructor() {
    this.watermarkQueue = new Queue('watermark processing', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 5,
        attempts: 3,
        backoff: 'exponential',
      },
    })

    this.setupWorkers()
    this.setupEventHandlers()
  }

  private setupWorkers() {
    // Image Processing Workers
    this.watermarkQueue.process('image', 5, async (job) => {
      const worker = new ProcessingWorker()
      return await worker.processImage(job)
    })

    // Video Processing Workers
    this.watermarkQueue.process('video', 2, async (job) => {
      const worker = new ProcessingWorker()
      return await worker.processVideo(job)
    })

    // Archive Processing Workers
    this.watermarkQueue.process('archive', 3, async (job) => {
      const worker = new ProcessingWorker()
      return await worker.processArchive(job)
    })
  }

  private setupEventHandlers() {
    this.watermarkQueue.on('completed', (job, result) => {
      console.log(`Job ${job.id} completed with result:`, result)
    })

    this.watermarkQueue.on('failed', (job, error) => {
      console.error(`Job ${job.id} failed:`, error)
    })

    this.watermarkQueue.on('progress', (job, progress) => {
      console.log(`Job ${job.id} progress: ${progress}%`)
      // WebSocket Update senden
    })
  }

  async addJob(type: string, data: any, options?: any) {
    return await this.watermarkQueue.add(type, data, options)
  }

  async getJobStats() {
    return {
      waiting: await this.watermarkQueue.getWaiting(),
      active: await this.watermarkQueue.getActive(),
      completed: await this.watermarkQueue.getCompleted(),
      failed: await this.watermarkQueue.getFailed(),
    }
  }
}
```

## 🐳 Docker Setup

### 1. Frontend Dockerfile

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 2. Backend Dockerfile

```dockerfile
# backend/Dockerfile
FROM node:18-alpine AS base
WORKDIR /app
RUN apk add --no-cache ffmpeg
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production && npm run prisma:generate

FROM node:18-alpine AS build
WORKDIR /app
RUN apk add --no-cache ffmpeg
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/
RUN npm ci
COPY src ./src/
RUN npm run build

FROM node:18-alpine AS production
WORKDIR /app
RUN apk add --no-cache ffmpeg
COPY --from=base /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package*.json ./
EXPOSE 8000
CMD ["npm", "run", "start:prod"]
```

### 3. Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: watermarkpro
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/watermarkpro
      REDIS_HOST: redis
      MINIO_ENDPOINT: minio:9000
    depends_on:
      - postgres
      - redis
      - minio
    volumes:
      - ./backend:/app
      - /app/node_modules

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

## 🚀 Deployment & Production

### 1. Kubernetes Manifests

```yaml
# infrastructure/kubernetes/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: watermarkpro
```

```yaml
# infrastructure/kubernetes/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: watermarkpro-backend
  namespace: watermarkpro
spec:
  replicas: 3
  selector:
    matchLabels:
      app: watermarkpro-backend
  template:
    metadata:
      labels:
        app: watermarkpro-backend
    spec:
      containers:
      - name: backend
        image: watermarkpro/backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: url
        - name: REDIS_HOST
          value: "redis-service"
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### 2. GitHub Actions CI/CD

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: |
            frontend/package-lock.json
            backend/package-lock.json
      
      - name: Install and test frontend
        run: |
          cd frontend
          npm ci
          npm run test
          npm run build
      
      - name: Install and test backend
        run: |
          cd backend
          npm ci
          npm run test
          npm run build

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build and push Docker images
        run: |
          docker build -t ${{ secrets.REGISTRY }}/watermarkpro-frontend:${{ github.sha }} ./frontend
          docker build -t ${{ secrets.REGISTRY }}/watermarkpro-backend:${{ github.sha }} ./backend
          
          echo ${{ secrets.REGISTRY_PASSWORD }} | docker login ${{ secrets.REGISTRY }} -u ${{ secrets.REGISTRY_USERNAME }} --password-stdin
          
          docker push ${{ secrets.REGISTRY }}/watermarkpro-frontend:${{ github.sha }}
          docker push ${{ secrets.REGISTRY }}/watermarkpro-backend:${{ github.sha }}
      
      - name: Deploy to Kubernetes
        run: |
          echo "${{ secrets.KUBECONFIG }}" | base64 -d > kubeconfig
          export KUBECONFIG=kubeconfig
          
          kubectl set image deployment/watermarkpro-frontend frontend=${{ secrets.REGISTRY }}/watermarkpro-frontend:${{ github.sha }} -n watermarkpro
          kubectl set image deployment/watermarkpro-backend backend=${{ secrets.REGISTRY }}/watermarkpro-backend:${{ github.sha }} -n watermarkpro
          
          kubectl rollout status deployment/watermarkpro-frontend -n watermarkpro
          kubectl rollout status deployment/watermarkpro-backend -n watermarkpro
```

## 📝 Development Scripts

```json
// package.json (root)
{
  "name": "watermarkpro",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:frontend": "cd frontend && npm run dev",
    "dev:backend": "cd backend && npm run dev",
    "build": "npm run build:frontend && npm run build:backend",
    "build:frontend": "cd frontend && npm run build",
    "build:backend": "cd backend && npm run build",
    "test": "npm run test:frontend && npm run test:backend",
    "test:frontend": "cd frontend && npm run test",
    "test:backend": "cd backend && npm run test",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "docker:build": "docker-compose build",
    "prisma:generate": "cd backend && npx prisma generate",
    "prisma:migrate": "cd backend && npx prisma migrate dev",
    "prisma:studio": "cd backend && npx prisma studio"
  },
  "devDependencies": {
    "concurrently": "^7.6.0"
  }
}
```

## 🔧 Environment Setup

```bash
# .env.example
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/watermarkpro"

# Redis
REDIS_HOST="localhost"
REDIS_PORT="6379"

# JWT
JWT_SECRET="your-super-secret-jwt-key-here"

# File Storage (MinIO)
MINIO_ENDPOINT="localhost:9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET="watermarkpro"

# API Configuration
PORT="8000"
FRONTEND_URL="http://localhost:3000"

# Monitoring
PROMETHEUS_ENABLED="true"
LOG_LEVEL="info"

# Production
NODE_ENV="development"
```

---

**Diese technische Setup-Dokumentation bietet eine vollständige Anleitung zur Implementierung der WatermarkPro-Anwendung von der lokalen Entwicklung bis zur Production-Deployment.** 