"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createError = exports.generateId = exports.calculateProgress = exports.estimateProcessingTime = exports.formatDuration = exports.validateFileSize = exports.validateEmail = exports.isArchiveFile = exports.isVideoFile = exports.isImageFile = exports.getFileExtension = exports.formatFileSize = void 0;
// File utilities
const formatFileSize = (bytes) => {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
exports.formatFileSize = formatFileSize;
const getFileExtension = (filename) => {
    return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
};
exports.getFileExtension = getFileExtension;
const isImageFile = (mimetype) => {
    return mimetype.startsWith('image/');
};
exports.isImageFile = isImageFile;
const isVideoFile = (mimetype) => {
    return mimetype.startsWith('video/');
};
exports.isVideoFile = isVideoFile;
const isArchiveFile = (mimetype) => {
    return ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'].includes(mimetype);
};
exports.isArchiveFile = isArchiveFile;
// Validation utilities
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
exports.validateEmail = validateEmail;
const validateFileSize = (size, maxSize = 500 * 1024 * 1024) => {
    return size <= maxSize;
};
exports.validateFileSize = validateFileSize;
// Time utilities
const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};
exports.formatDuration = formatDuration;
const estimateProcessingTime = (fileSize, fileType) => {
    // Schätzung basierend auf Dateigröße und Typ (in Sekunden)
    const basetime = fileType === 'image' ? 0.5 : 10; // Basis-Zeit
    const sizeMultiplier = fileSize / (1024 * 1024); // MB
    return Math.max(basetime, basetime * sizeMultiplier * 0.1);
};
exports.estimateProcessingTime = estimateProcessingTime;
// Progress utilities
const calculateProgress = (completed, total) => {
    if (total === 0)
        return 0;
    return Math.round((completed / total) * 100);
};
exports.calculateProgress = calculateProgress;
// ID generation
const generateId = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
};
exports.generateId = generateId;
// Error handling
const createError = (code, message, details) => {
    return {
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
        requestId: (0, exports.generateId)()
    };
};
exports.createError = createError;
//# sourceMappingURL=index.js.map