// File utilities
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileExtension = (filename: string): string => {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
};

export const isImageFile = (mimetype: string): boolean => {
  return mimetype.startsWith('image/');
};

export const isVideoFile = (mimetype: string): boolean => {
  return mimetype.startsWith('video/');
};

export const isArchiveFile = (mimetype: string): boolean => {
  return ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'].includes(mimetype);
};

// Validation utilities
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateFileSize = (size: number, maxSize: number = 500 * 1024 * 1024): boolean => {
  return size <= maxSize;
};

// Time utilities
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const estimateProcessingTime = (fileSize: number, fileType: 'image' | 'video'): number => {
  // Schätzung basierend auf Dateigröße und Typ (in Sekunden)
  const basetime = fileType === 'image' ? 0.5 : 10; // Basis-Zeit
  const sizeMultiplier = fileSize / (1024 * 1024); // MB
  
  return Math.max(basetime, basetime * sizeMultiplier * 0.1);
};

// Progress utilities
export const calculateProgress = (completed: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
};

// ID generation
export const generateId = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// Error handling
export const createError = (code: string, message: string, details?: any) => {
  return {
    code,
    message,
    details,
    timestamp: new Date().toISOString(),
    requestId: generateId()
  };
}; 