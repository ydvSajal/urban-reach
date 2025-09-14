import { supabase } from '@/integrations/supabase/client';
import { logError, classifyError } from './error-handling';

// Storage configuration
export const STORAGE_CONFIG = {
  BUCKET_NAME: 'reports',
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  THUMBNAIL_SIZE: 300,
  QUALITY: 0.8,
} as const;

// Image compression utility
const compressImage = (file: File, maxWidth: number = 1920, quality: number = 0.8): Promise<File> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        file.type,
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

// Generate thumbnail
const generateThumbnail = (file: File): Promise<File> => {
  return compressImage(file, STORAGE_CONFIG.THUMBNAIL_SIZE, 0.7);
};

// Generate unique file path
const generateFilePath = (reportId: string, fileName: string, isThumb: boolean = false): string => {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15);
  const extension = fileName.split('.').pop();
  const baseName = fileName.replace(/\.[^/.]+$/, '');
  const sanitizedName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');
  
  const folder = isThumb ? 'thumbnails' : 'original';
  const suffix = isThumb ? '_thumb' : '';
  
  return `${reportId}/${folder}/${sanitizedName}_${timestamp}_${randomId}${suffix}.${extension}`;
};

// Upload single file to Supabase Storage
export const uploadFile = async (
  file: File, 
  reportId: string, 
  onProgress?: (progress: number) => void
): Promise<{ url: string; thumbnailUrl: string }> => {
  try {
    // Validate file
    if (!STORAGE_CONFIG.ALLOWED_TYPES.includes(file.type as any)) {
      throw new Error(`File type ${file.type} is not allowed`);
    }

    if (file.size > STORAGE_CONFIG.MAX_FILE_SIZE) {
      throw new Error(`File size exceeds ${STORAGE_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB limit`);
    }

    onProgress?.(10);

    // Compress original image
    const compressedFile = await compressImage(file, 1920, STORAGE_CONFIG.QUALITY);
    onProgress?.(30);

    // Generate thumbnail
    const thumbnailFile = await generateThumbnail(file);
    onProgress?.(50);

    // Generate file paths
    const originalPath = generateFilePath(reportId, file.name, false);
    const thumbnailPath = generateFilePath(reportId, file.name, true);

    onProgress?.(60);

    // Upload original image
    const { data: originalData, error: originalError } = await supabase.storage
      .from(STORAGE_CONFIG.BUCKET_NAME)
      .upload(originalPath, compressedFile, {
        cacheControl: '3600',
        upsert: false,
      });

    if (originalError) {
      logError(originalError, 'uploadFile:original', { reportId, fileName: file.name });
      throw originalError;
    }

    onProgress?.(80);

    // Upload thumbnail
    const { data: thumbnailData, error: thumbnailError } = await supabase.storage
      .from(STORAGE_CONFIG.BUCKET_NAME)
      .upload(thumbnailPath, thumbnailFile, {
        cacheControl: '3600',
        upsert: false,
      });

    if (thumbnailError) {
      logError(thumbnailError, 'uploadFile:thumbnail', { reportId, fileName: file.name });
      // Don't fail if thumbnail upload fails, just log it
      console.warn('Thumbnail upload failed:', thumbnailError);
    }

    onProgress?.(90);

    // Get public URLs
    const { data: originalUrl } = supabase.storage
      .from(STORAGE_CONFIG.BUCKET_NAME)
      .getPublicUrl(originalPath);

    const { data: thumbnailUrl } = supabase.storage
      .from(STORAGE_CONFIG.BUCKET_NAME)
      .getPublicUrl(thumbnailPath);

    onProgress?.(100);

    return {
      url: originalUrl.publicUrl,
      thumbnailUrl: thumbnailData ? thumbnailUrl.publicUrl : originalUrl.publicUrl,
    };

  } catch (error: any) {
    logError(error, 'uploadFile', { reportId, fileName: file.name });
    const classifiedError = classifyError(error);
    throw new Error(classifiedError.userMessage);
  }
};

// Upload multiple files
export const uploadFiles = async (
  files: File[],
  reportId: string,
  onProgress?: (fileIndex: number, progress: number) => void
): Promise<string[]> => {
  const results: string[] = [];
  
  for (let i = 0; i < files.length; i++) {
    try {
      const { url } = await uploadFile(files[i], reportId, (progress) => {
        onProgress?.(i, progress);
      });
      results.push(url);
    } catch (error) {
      console.error(`Failed to upload file ${files[i].name}:`, error);
      results.push(''); // Empty string indicates failed upload
    }
  }
  
  return results;
};

// Delete file from storage
export const deleteFile = async (filePath: string): Promise<void> => {
  try {
    // Extract path from URL if full URL is provided
    let path = filePath;
    if (filePath.includes('/storage/v1/object/public/')) {
      path = filePath.split('/storage/v1/object/public/reports/')[1];
    }

    const { error } = await supabase.storage
      .from(STORAGE_CONFIG.BUCKET_NAME)
      .remove([path]);

    if (error) {
      logError(error, 'deleteFile', { filePath });
      throw error;
    }
  } catch (error: any) {
    logError(error, 'deleteFile', { filePath });
    throw error;
  }
};

// Delete multiple files
export const deleteFiles = async (filePaths: string[]): Promise<void> => {
  try {
    const paths = filePaths.map(filePath => {
      if (filePath.includes('/storage/v1/object/public/')) {
        return filePath.split('/storage/v1/object/public/reports/')[1];
      }
      return filePath;
    });

    const { error } = await supabase.storage
      .from(STORAGE_CONFIG.BUCKET_NAME)
      .remove(paths);

    if (error) {
      logError(error, 'deleteFiles', { filePaths });
      throw error;
    }
  } catch (error: any) {
    logError(error, 'deleteFiles', { filePaths });
    throw error;
  }
};

// Get file info
export const getFileInfo = async (filePath: string) => {
  try {
    let path = filePath;
    if (filePath.includes('/storage/v1/object/public/')) {
      path = filePath.split('/storage/v1/object/public/reports/')[1];
    }

    const { data, error } = await supabase.storage
      .from(STORAGE_CONFIG.BUCKET_NAME)
      .list(path.split('/').slice(0, -1).join('/'), {
        search: path.split('/').pop(),
      });

    if (error) {
      logError(error, 'getFileInfo', { filePath });
      throw error;
    }

    return data?.[0] || null;
  } catch (error: any) {
    logError(error, 'getFileInfo', { filePath });
    throw error;
  }
};

// Check if file exists
export const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    const info = await getFileInfo(filePath);
    return !!info;
  } catch (error) {
    return false;
  }
};

// Get storage usage for a report
export const getReportStorageUsage = async (reportId: string): Promise<number> => {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_CONFIG.BUCKET_NAME)
      .list(reportId, {
        limit: 100,
      });

    if (error) {
      logError(error, 'getReportStorageUsage', { reportId });
      return 0;
    }

    return data?.reduce((total, file) => total + (file.metadata?.size || 0), 0) || 0;
  } catch (error: any) {
    logError(error, 'getReportStorageUsage', { reportId });
    return 0;
  }
};

// Cleanup old files (utility for maintenance)
export const cleanupOldFiles = async (reportId: string, keepCount: number = 10): Promise<void> => {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_CONFIG.BUCKET_NAME)
      .list(`${reportId}/original`, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      logError(error, 'cleanupOldFiles', { reportId });
      return;
    }

    if (data && data.length > keepCount) {
      const filesToDelete = data.slice(keepCount).map(file => `${reportId}/original/${file.name}`);
      await deleteFiles(filesToDelete);
    }
  } catch (error: any) {
    logError(error, 'cleanupOldFiles', { reportId });
  }
};

// Storage utilities
export const storageUtils = {
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  isImageFile: (file: File): boolean => {
    return STORAGE_CONFIG.ALLOWED_TYPES.includes(file.type as any);
  },

  validateFileSize: (file: File): boolean => {
    return file.size <= STORAGE_CONFIG.MAX_FILE_SIZE;
  },

  getFileExtension: (fileName: string): string => {
    return fileName.split('.').pop()?.toLowerCase() || '';
  },

  sanitizeFileName: (fileName: string): string => {
    return fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  },
};