"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCodes = exports.JobPriority = exports.JobStatus = void 0;
// Job Types
var JobStatus;
(function (JobStatus) {
    JobStatus["PENDING"] = "pending";
    JobStatus["PROCESSING"] = "processing";
    JobStatus["COMPLETED"] = "completed";
    JobStatus["FAILED"] = "failed";
    JobStatus["CANCELLED"] = "cancelled";
})(JobStatus || (exports.JobStatus = JobStatus = {}));
var JobPriority;
(function (JobPriority) {
    JobPriority["LOW"] = "low";
    JobPriority["NORMAL"] = "normal";
    JobPriority["HIGH"] = "high";
    JobPriority["URGENT"] = "urgent";
})(JobPriority || (exports.JobPriority = JobPriority = {}));
// Error Codes
var ErrorCodes;
(function (ErrorCodes) {
    // Authentication
    ErrorCodes["INVALID_TOKEN"] = "INVALID_TOKEN";
    ErrorCodes["TOKEN_EXPIRED"] = "TOKEN_EXPIRED";
    ErrorCodes["INSUFFICIENT_PERMISSIONS"] = "INSUFFICIENT_PERMISSIONS";
    // Validation
    ErrorCodes["INVALID_INPUT"] = "INVALID_INPUT";
    ErrorCodes["FILE_TOO_LARGE"] = "FILE_TOO_LARGE";
    ErrorCodes["UNSUPPORTED_FORMAT"] = "UNSUPPORTED_FORMAT";
    ErrorCodes["MISSING_REQUIRED_FIELD"] = "MISSING_REQUIRED_FIELD";
    // Processing
    ErrorCodes["PROCESSING_FAILED"] = "PROCESSING_FAILED";
    ErrorCodes["WATERMARK_NOT_FOUND"] = "WATERMARK_NOT_FOUND";
    ErrorCodes["JOB_NOT_FOUND"] = "JOB_NOT_FOUND";
    ErrorCodes["QUEUE_FULL"] = "QUEUE_FULL";
    // System
    ErrorCodes["INTERNAL_SERVER_ERROR"] = "INTERNAL_SERVER_ERROR";
    ErrorCodes["SERVICE_UNAVAILABLE"] = "SERVICE_UNAVAILABLE";
    ErrorCodes["RATE_LIMIT_EXCEEDED"] = "RATE_LIMIT_EXCEEDED";
})(ErrorCodes || (exports.ErrorCodes = ErrorCodes = {}));
