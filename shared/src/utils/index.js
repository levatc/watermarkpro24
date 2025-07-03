"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createError = exports.generateId = exports.calculateProgress = exports.estimateProcessingTime = exports.formatDuration = exports.validateFileSize = exports.validateEmail = exports.isArchiveFile = exports.isVideoFile = exports.isImageFile = exports.getFileExtension = exports.formatFileSize = void 0;
// File utilities
var formatFileSize = function (bytes) {
    if (bytes === 0)
        return '0 Bytes';
    var k = 1024;
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
exports.formatFileSize = formatFileSize;
var getFileExtension = function (filename) {
    return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
};
exports.getFileExtension = getFileExtension;
var isImageFile = function (mimetype) {
    return mimetype.startsWith('image/');
};
exports.isImageFile = isImageFile;
var isVideoFile = function (mimetype) {
    return mimetype.startsWith('video/');
};
exports.isVideoFile = isVideoFile;
var isArchiveFile = function (mimetype) {
    return ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'].includes(mimetype);
};
exports.isArchiveFile = isArchiveFile;
// Validation utilities
var validateEmail = function (email) {
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
exports.validateEmail = validateEmail;
var validateFileSize = function (size, maxSize) {
    if (maxSize === void 0) { maxSize = 500 * 1024 * 1024; }
    return size <= maxSize;
};
exports.validateFileSize = validateFileSize;
// Time utilities
var formatDuration = function (seconds) {
    var hours = Math.floor(seconds / 3600);
    var minutes = Math.floor((seconds % 3600) / 60);
    var remainingSeconds = Math.floor(seconds % 60);
    if (hours > 0) {
        return "".concat(hours, ":").concat(minutes.toString().padStart(2, '0'), ":").concat(remainingSeconds.toString().padStart(2, '0'));
    }
    return "".concat(minutes, ":").concat(remainingSeconds.toString().padStart(2, '0'));
};
exports.formatDuration = formatDuration;
var estimateProcessingTime = function (fileSize, fileType) {
    // Schätzung basierend auf Dateigröße und Typ (in Sekunden)
    var basetime = fileType === 'image' ? 0.5 : 10; // Basis-Zeit
    var sizeMultiplier = fileSize / (1024 * 1024); // MB
    return Math.max(basetime, basetime * sizeMultiplier * 0.1);
};
exports.estimateProcessingTime = estimateProcessingTime;
// Progress utilities
var calculateProgress = function (completed, total) {
    if (total === 0)
        return 0;
    return Math.round((completed / total) * 100);
};
exports.calculateProgress = calculateProgress;
// ID generation
var generateId = function () {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
};
exports.generateId = generateId;
// Error handling
var createError = function (code, message, details) {
    return {
        code: code,
        message: message,
        details: details,
        timestamp: new Date().toISOString(),
        requestId: (0, exports.generateId)()
    };
};
exports.createError = createError;
