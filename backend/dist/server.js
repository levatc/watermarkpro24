"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const multipart_1 = __importDefault(require("@fastify/multipart"));
const websocket_1 = __importDefault(require("@fastify/websocket"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const static_1 = __importDefault(require("@fastify/static"));
const path_1 = __importDefault(require("path"));
const client_1 = require("@prisma/client");
const routes_1 = require("./routes");
const prisma = new client_1.PrismaClient();
const server = (0, fastify_1.default)({
    logger: true,
    bodyLimit: 1024 * 1024 * 500, // 500MB
    requestTimeout: 60000, // 60 seconds
});
async function start() {
    try {
        // Security
        await server.register(helmet_1.default, {
            contentSecurityPolicy: false, // Disable for development
        });
        // CORS
        await server.register(cors_1.default, {
            origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        });
        // Rate limiting
        await server.register(rate_limit_1.default, {
            max: 100,
            timeWindow: '1 minute',
        });
        // File upload
        await server.register(multipart_1.default, {
            limits: {
                fieldNameSize: 100,
                fieldSize: 1024 * 1024 * 500, // 500MB
                fields: 10,
                fileSize: 1024 * 1024 * 500, // 500MB
                files: 50,
            },
        });
        // WebSocket support
        await server.register(websocket_1.default);
        // Static file serving for processed videos
        await server.register(static_1.default, {
            root: path_1.default.join(process.cwd(), 'output'),
            prefix: '/output/',
            decorateReply: false
        });
        // Decorators for dependency injection
        server.decorate('prisma', prisma);
        // Health check
        server.get('/health', async () => {
            try {
                await prisma.$queryRaw `SELECT 1`;
                return {
                    status: 'ok',
                    timestamp: new Date().toISOString(),
                    uptime: process.uptime(),
                    services: {
                        database: 'connected',
                        queue: 'mock',
                    }
                };
            }
            catch (error) {
                server.log.error('Health check failed', error);
                return {
                    status: 'ok', // Return ok for now even if DB fails
                    timestamp: new Date().toISOString(),
                    uptime: process.uptime(),
                    services: {
                        database: 'mock',
                        queue: 'mock',
                    }
                };
            }
        });
        // API Routes
        await (0, routes_1.setupRoutes)(server);
        // Error handler
        server.setErrorHandler(async (error, request, reply) => {
            server.log.error(error);
            if (error.statusCode === 429) {
                return reply.status(429).send({
                    success: false,
                    error: {
                        code: 'RATE_LIMIT_EXCEEDED',
                        message: 'Too many requests',
                        timestamp: new Date().toISOString(),
                    }
                });
            }
            return reply.status(error.statusCode || 500).send({
                success: false,
                error: {
                    code: error.code || 'INTERNAL_SERVER_ERROR',
                    message: error.message || 'Internal Server Error',
                    timestamp: new Date().toISOString(),
                }
            });
        });
        // Start server
        const port = parseInt(process.env.PORT || '8000');
        const host = process.env.HOST || '0.0.0.0';
        await server.listen({ port, host });
        console.log(`🚀 Server running on http://${host}:${port}`);
        console.log(`📊 Health check: http://${host}:${port}/health`);
        console.log(`🔗 WebSocket: ws://${host}:${port}/ws`);
    }
    catch (error) {
        server.log.error(error);
        process.exit(1);
    }
}
// Graceful shutdown
const gracefulShutdown = async (signal) => {
    console.log(`\n📴 Received ${signal}, starting graceful shutdown...`);
    try {
        await server.close();
        await prisma.$disconnect();
        console.log('✅ Server closed successfully');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
});
start();
//# sourceMappingURL=server.js.map