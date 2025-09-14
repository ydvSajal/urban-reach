import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  X, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  Camera,
  FileImage
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  url?: string;
}

interface ImageUploadProps {
  maxFiles?: number;
  maxSizePerFile?: number; // in bytes
  acceptedTypes?: string[];
  maxWidth?: number; // max image width in pixels
  maxHeight?: number; // max image height in pixels
  onUpload?: (files: File[]) => Promise<string[]>;
  onRemove?: (fileId: string) => void;
  existingImages?: string[];
  disabled?: boolean;
  className?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  maxFiles = 5,
  maxSizePerFile = 5 * 1024 * 1024, // 5MB
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  maxWidth = 4096, // 4K width limit
  maxHeight = 4096, // 4K height limit
  onUpload,
  onRemove,
  existingImages = [],
  disabled = false,
  className = '',
}) => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);



  // Create image preview
  const createImagePreview = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Validate image dimensions
  const validateImageDimensions = (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        
        if (img.width > maxWidth || img.height > maxHeight) {
          resolve(`Image dimensions ${img.width}x${img.height} exceed maximum allowed ${maxWidth}x${maxHeight}.`);
        } else {
          resolve(null);
        }
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve('Failed to load image for dimension validation.');
      };
      
      img.src = url;
    });
  };

  // Validate file function (basic validation)
  const validateFileCallback = useCallback((file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return `File type ${file.type} is not supported. Please use ${acceptedTypes.join(', ')}.`;
    }
    
    if (file.size > maxSizePerFile) {
      const maxSizeMB = maxSizePerFile / (1024 * 1024);
      return `File size must be less than ${maxSizeMB}MB. Current size: ${(file.size / (1024 * 1024)).toFixed(1)}MB.`;
    }
    
    return null;
  }, [acceptedTypes, maxSizePerFile]);

  // Add files to the list
  const addFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const currentCount = images.length + existingImages.length;
    
    if (currentCount + fileArray.length > maxFiles) {
      toast({
        title: "Too many files",
        description: `You can only upload up to ${maxFiles} images. Currently have ${currentCount}.`,
        variant: "destructive",
      });
      return;
    }

    const newImages: ImageFile[] = [];
    
    for (const file of fileArray) {
      let error = validateFileCallback(file);
      
      try {
        const preview = await createImagePreview(file);
        
        // If basic validation passed, check dimensions
        if (!error) {
          error = await validateImageDimensions(file);
        }
        
        const imageFile: ImageFile = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          file,
          preview,
          status: error ? 'error' : 'pending',
          progress: 0,
          error,
        };
        newImages.push(imageFile);
      } catch (err) {
        console.error('Error creating preview:', err);
        const imageFile: ImageFile = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          file,
          preview: '',
          status: 'error',
          progress: 0,
          error: 'Failed to create image preview',
        };
        newImages.push(imageFile);
      }
    }

    setImages(prev => [...prev, ...newImages]);
  }, [images.length, existingImages.length, maxFiles, validateFileCallback]);

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles, disabled]);

  // Handle file input change
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      addFiles(e.target.files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, [addFiles]);

  // Remove image
  const removeImage = useCallback((imageId: string) => {
    setImages(prev => prev.filter(img => img.id !== imageId));
    if (onRemove) {
      onRemove(imageId);
    }
  }, [onRemove]);

  // Upload images
  const uploadImages = useCallback(async () => {
    if (!onUpload) return;
    
    const pendingImages = images.filter(img => img.status === 'pending');
    if (pendingImages.length === 0) return;

    setUploading(true);
    
    try {
      // Update status to uploading
      setImages(prev => prev.map(img => 
        img.status === 'pending' 
          ? { ...img, status: 'uploading' as const, progress: 0 }
          : img
      ));

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setImages(prev => prev.map(img => 
          img.status === 'uploading' 
            ? { ...img, progress: Math.min(img.progress + 10, 90) }
            : img
        ));
      }, 200);

      // Upload files
      const filesToUpload = pendingImages.map(img => img.file);
      const uploadedUrls = await onUpload(filesToUpload);

      clearInterval(progressInterval);

      // Update with results
      setImages(prev => prev.map(img => {
        if (img.status === 'uploading') {
          const index = pendingImages.findIndex(pending => pending.id === img.id);
          const url = uploadedUrls[index];
          return {
            ...img,
            status: url ? 'success' as const : 'error' as const,
            progress: 100,
            url,
            error: url ? undefined : 'Upload failed',
          };
        }
        return img;
      }));

      const successCount = uploadedUrls.filter(Boolean).length;
      const failCount = pendingImages.length - successCount;

      if (successCount > 0) {
        toast({
          title: "Upload successful",
          description: `${successCount} image${successCount === 1 ? '' : 's'} uploaded successfully.`,
        });
      }

      if (failCount > 0) {
        toast({
          title: "Upload failed",
          description: `${failCount} image${failCount === 1 ? '' : 's'} failed to upload.`,
          variant: "destructive",
        });
      }

    } catch (error: any) {
      console.error('Upload error:', error);
      
      // Mark all uploading images as failed
      setImages(prev => prev.map(img => 
        img.status === 'uploading' 
          ? { ...img, status: 'error' as const, progress: 0, error: error.message || 'Upload failed' }
          : img
      ));

      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload images. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }, [images, onUpload]);

  // Open file dialog
  const openFileDialog = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Camera capture (mobile)
  const captureFromCamera = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
    }
  };

  const totalImages = images.length + existingImages.length;
  const canAddMore = totalImages < maxFiles && !disabled;
  const hasPendingUploads = images.some(img => img.status === 'pending');

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      {canAddMore && (
        <Card 
          className={`border-2 border-dashed transition-colors ${
            dragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-primary/50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={openFileDialog}
        >
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              {/* Mobile camera button */}
              {/Mobi|Android/i.test(navigator.userAgent) && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      captureFromCamera();
                    }}
                    className="flex items-center gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    Camera
                  </Button>
                </div>
              )}
            </div>
            
            <h3 className="text-lg font-medium mb-2">
              {dragActive ? 'Drop images here' : 'Upload Images'}
            </h3>
            
            <p className="text-sm text-muted-foreground mb-4">
              Drag and drop images here, or click to select files
            </p>
            
            <div className="flex flex-wrap gap-2 justify-center text-xs text-muted-foreground">
              <Badge variant="outline">Max {maxFiles} files</Badge>
              <Badge variant="outline">Max {Math.round(maxSizePerFile / (1024 * 1024))}MB each</Badge>
              <Badge variant="outline">Max {maxWidth}x{maxHeight}px</Badge>
              <Badge variant="outline">{acceptedTypes.map(type => type.split('/')[1]).join(', ')}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        onChange={handleFileInput}
        className="hidden"
      />

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">
              Selected Images ({images.length})
            </h4>
            {hasPendingUploads && onUpload && (
              <Button
                onClick={uploadImages}
                disabled={uploading}
                size="sm"
              >
                {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Upload {images.filter(img => img.status === 'pending').length} Images
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image) => (
              <Card key={image.id} className="relative overflow-hidden">
                <CardContent className="p-2">
                  {/* Image Preview */}
                  <div className="aspect-square relative mb-2 bg-muted rounded overflow-hidden">
                    {image.preview ? (
                      <img
                        src={image.preview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileImage className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    
                    {/* Remove Button */}
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1 h-6 w-6 p-0"
                      onClick={() => removeImage(image.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>

                    {/* Status Overlay */}
                    {image.status === 'uploading' && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                      </div>
                    )}
                    
                    {image.status === 'success' && (
                      <div className="absolute top-1 left-1">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      </div>
                    )}
                    
                    {image.status === 'error' && (
                      <div className="absolute top-1 left-1">
                        <AlertCircle className="h-5 w-5 text-destructive" />
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium truncate">
                      {image.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(image.file.size / 1024).toFixed(1)} KB
                    </p>
                    
                    {/* Progress Bar */}
                    {image.status === 'uploading' && (
                      <Progress value={image.progress} className="h-1" />
                    )}
                    
                    {/* Error Message */}
                    {image.status === 'error' && image.error && (
                      <Alert variant="destructive" className="p-2">
                        <AlertCircle className="h-3 w-3" />
                        <AlertDescription className="text-xs">
                          {image.error}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Existing Images */}
      {existingImages.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium">
            Existing Images ({existingImages.length})
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {existingImages.map((url, index) => (
              <Card key={index} className="relative overflow-hidden">
                <CardContent className="p-2">
                  <div className="aspect-square relative bg-muted rounded overflow-hidden">
                    <img
                      src={url}
                      alt={`Existing image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {totalImages > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          {totalImages} of {maxFiles} images selected
        </div>
      )}
    </div>
  );
};

export default ImageUpload;