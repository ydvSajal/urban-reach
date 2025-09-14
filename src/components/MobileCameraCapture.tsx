import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { 
  Camera, 
  RotateCw, 
  Crop, 
  CheckCircle, 
  X, 
  Download,
  Maximize2,
  Sun,
  Contrast,
  Palette
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileCameraCaptureProps {
  onImageCapture?: (file: File) => void;
  onClose?: () => void;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

interface ImageEditSettings {
  rotation: number;
  brightness: number;
  contrast: number;
  saturation: number;
  cropArea?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

const MobileCameraCapture: React.FC<MobileCameraCaptureProps> = ({
  onImageCapture,
  onClose,
  maxWidth = 1920,
  maxHeight = 1080,
  quality = 0.8,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editSettings, setEditSettings] = useState<ImageEditSettings>({
    rotation: 0,
    brightness: 100,
    contrast: 100,
    saturation: 100,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isMobile = useIsMobile();

  // Open camera capture
  const openCamera = useCallback(() => {
    if (!isMobile) {
      toast({
        title: "Camera not available",
        description: "Camera capture is only available on mobile devices",
        variant: "destructive"
      });
      return;
    }
    setIsOpen(true);
  }, [isMobile]);

  // Handle file capture from camera
  const handleCameraCapture = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCapturedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    // Reset input for future captures
    e.target.value = '';
  }, []);

  // Apply image filters
  const applyImageFilters = useCallback((imageData: string, settings: ImageEditSettings): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        resolve(imageData);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(imageData);
        return;
      }

      const img = new Image();
      img.onload = () => {
        // Set canvas size
        canvas.width = img.width;
        canvas.height = img.height;

        // Apply rotation
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((settings.rotation * Math.PI) / 180);
        ctx.translate(-img.width / 2, -img.height / 2);

        // Apply filters
        ctx.filter = `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%)`;
        
        ctx.drawImage(img, 0, 0);
        ctx.restore();

        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = imageData;
    });
  }, [quality]);

  // Compress and resize image
  const processImage = useCallback((imageData: string): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        reject(new Error('Canvas not available'));
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height;
          if (width > height) {
            width = maxWidth;
            height = width / aspectRatio;
          } else {
            height = maxHeight;
            width = height * aspectRatio;
          }
        }

        // Resize canvas
        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `camera-capture-${Date.now()}.jpg`, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(file);
          } else {
            reject(new Error('Failed to process image'));
          }
        }, 'image/jpeg', quality);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageData;
    });
  }, [maxWidth, maxHeight, quality]);

  // Handle edit save
  const handleSaveEdit = async () => {
    if (!capturedImage) return;

    setIsProcessing(true);
    try {
      // Apply filters
      const filteredImage = await applyImageFilters(capturedImage, editSettings);
      
      // Process and compress
      const processedFile = await processImage(filteredImage);
      
      // Call callback with processed file
      if (onImageCapture) {
        onImageCapture(processedFile);
      }

      toast({
        title: "Image captured",
        description: "Photo has been processed and added to your report",
      });

      // Reset state
      setCapturedImage(null);
      setIsEditing(false);
      setEditSettings({
        rotation: 0,
        brightness: 100,
        contrast: 100,
        saturation: 100,
      });
      setIsOpen(false);
      
    } catch (error) {
      console.error('Image processing error:', error);
      toast({
        title: "Processing failed",
        description: "Failed to process image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Render preview with filters applied
  const PreviewImage = ({ src }: { src: string }) => (
    <img
      src={src}
      alt="Captured"
      className="max-w-full max-h-64 object-contain rounded-lg"
      style={{
        transform: `rotate(${editSettings.rotation}deg)`,
        filter: `brightness(${editSettings.brightness}%) contrast(${editSettings.contrast}%) saturate(${editSettings.saturation}%)`
      }}
    />
  );

  if (!isMobile) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className="opacity-50"
      >
        <Camera className="h-4 w-4 mr-2" />
        Camera (Mobile Only)
      </Button>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={openCamera}
        className="flex items-center gap-2"
      >
        <Camera className="h-4 w-4" />
        Camera
      </Button>

      {/* Hidden file input for camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraCapture}
        className="hidden"
      />

      {/* Camera Capture Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Camera Capture
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!capturedImage ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="space-y-4">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                      <Camera className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-2">Take a Photo</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Tap the button below to open your camera and capture an image
                      </p>
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full"
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Open Camera
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Image Preview */}
                <div className="text-center">
                  <PreviewImage src={capturedImage} />
                </div>

                {/* Edit Controls */}
                {isEditing && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Palette className="h-4 w-4" />
                        Edit Photo
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Rotation */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <RotateCw className="h-3 w-3" />
                          Rotation
                        </Label>
                        <Slider
                          value={[editSettings.rotation]}
                          onValueChange={([value]) => 
                            setEditSettings(prev => ({ ...prev, rotation: value }))
                          }
                          max={360}
                          min={0}
                          step={90}
                          className="w-full"
                        />
                        <div className="text-xs text-muted-foreground">{editSettings.rotation}°</div>
                      </div>

                      {/* Brightness */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Sun className="h-3 w-3" />
                          Brightness
                        </Label>
                        <Slider
                          value={[editSettings.brightness]}
                          onValueChange={([value]) => 
                            setEditSettings(prev => ({ ...prev, brightness: value }))
                          }
                          max={200}
                          min={50}
                          step={5}
                          className="w-full"
                        />
                        <div className="text-xs text-muted-foreground">{editSettings.brightness}%</div>
                      </div>

                      {/* Contrast */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Contrast className="h-3 w-3" />
                          Contrast
                        </Label>
                        <Slider
                          value={[editSettings.contrast]}
                          onValueChange={([value]) => 
                            setEditSettings(prev => ({ ...prev, contrast: value }))
                          }
                          max={200}
                          min={50}
                          step={5}
                          className="w-full"
                        />
                        <div className="text-xs text-muted-foreground">{editSettings.contrast}%</div>
                      </div>

                      {/* Saturation */}
                      <div className="space-y-2">
                        <Label>Saturation</Label>
                        <Slider
                          value={[editSettings.saturation]}
                          onValueChange={([value]) => 
                            setEditSettings(prev => ({ ...prev, saturation: value }))
                          }
                          max={200}
                          min={0}
                          step={5}
                          className="w-full"
                        />
                        <div className="text-xs text-muted-foreground">{editSettings.saturation}%</div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {!isEditing ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setIsEditing(true)}
                        className="flex-1"
                      >
                        <Palette className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        onClick={handleSaveEdit}
                        disabled={isProcessing}
                        className="flex-1"
                      >
                        {isProcessing ? (
                          <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-b-transparent" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        Use Photo
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveEdit}
                        disabled={isProcessing}
                        className="flex-1"
                      >
                        {isProcessing ? (
                          <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-b-transparent" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        Save Changes
                      </Button>
                    </>
                  )}
                </div>

                {/* Retake Button */}
                <Button
                  variant="ghost"
                  onClick={() => {
                    setCapturedImage(null);
                    setIsEditing(false);
                  }}
                  className="w-full"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Retake Photo
                </Button>
              </div>
            )}

            {/* Cancel Button */}
            <Button
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                setCapturedImage(null);
                setIsEditing(false);
                if (onClose) onClose();
              }}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />
    </>
  );
};

export default MobileCameraCapture;
