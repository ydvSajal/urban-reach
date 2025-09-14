import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  ZoomIn, 
  Download, 
  Share2, 
  ChevronLeft, 
  ChevronRight,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

interface ImageGalleryProps {
  images: string[];
  title?: string;
  className?: string;
  showDownload?: boolean;
  showShare?: boolean;
  lazy?: boolean;
}

interface ImageItemProps {
  src: string;
  alt: string;
  index: number;
  onClick: () => void;
  lazy?: boolean;
}

const ImageItem: React.FC<ImageItemProps> = ({ src, alt, index, onClick, lazy = true }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoad = () => setLoading(false);
  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  return (
    <Card className="relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow group">
      <CardContent className="p-0">
        <div className="aspect-square relative bg-muted">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              <ImageIcon className="h-8 w-8 mb-2" />
              <span className="text-xs">Failed to load</span>
            </div>
          ) : (
            <img
              src={src}
              alt={alt}
              className={`w-full h-full object-cover transition-opacity ${
                loading ? 'opacity-0' : 'opacity-100'
              }`}
              onLoad={handleLoad}
              onError={handleError}
              loading={lazy ? 'lazy' : 'eager'}
              onClick={onClick}
            />
          )}

          {/* Overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Image Number Badge */}
          <Badge 
            variant="secondary" 
            className="absolute top-2 left-2 text-xs"
          >
            {index + 1}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  title = "Images",
  className = "",
  showDownload = true,
  showShare = false,
  lazy = true,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [lightboxLoading, setLightboxLoading] = useState(false);

  const openLightbox = (index: number) => {
    setSelectedIndex(index);
    setLightboxLoading(true);
  };

  const closeLightbox = () => {
    setSelectedIndex(null);
    setLightboxLoading(false);
  };

  const goToPrevious = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
      setLightboxLoading(true);
    }
  };

  const goToNext = () => {
    if (selectedIndex !== null && selectedIndex < images.length - 1) {
      setSelectedIndex(selectedIndex + 1);
      setLightboxLoading(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (selectedIndex === null) return;
    
    switch (e.key) {
      case 'ArrowLeft':
        goToPrevious();
        break;
      case 'ArrowRight':
        goToNext();
        break;
      case 'Escape':
        closeLightbox();
        break;
    }
  };

  const downloadImage = async (imageUrl: string, index: number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `image-${index + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Download started",
        description: "Image download has started",
      });
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: "Download failed",
        description: "Failed to download image",
        variant: "destructive",
      });
    }
  };

  const shareImage = async (imageUrl: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Report Image',
          url: imageUrl,
        });
      } catch (error) {
        console.error('Share failed:', error);
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(imageUrl);
        toast({
          title: "Link copied",
          description: "Image link copied to clipboard",
        });
      } catch (error) {
        console.error('Copy failed:', error);
        toast({
          title: "Share failed",
          description: "Failed to share image",
          variant: "destructive",
        });
      }
    }
  };

  if (!images || images.length === 0) {
    return (
      <div className={`text-center py-8 text-muted-foreground ${className}`}>
        <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No images available</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Gallery Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">{title}</h3>
        <Badge variant="outline">
          {images.length} image{images.length === 1 ? '' : 's'}
        </Badge>
      </div>

      {/* Image Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image, index) => (
          <ImageItem
            key={index}
            src={image}
            alt={`Image ${index + 1}`}
            index={index}
            onClick={() => openLightbox(index)}
            lazy={lazy}
          />
        ))}
      </div>

      {/* Lightbox Modal */}
      <Dialog open={selectedIndex !== null} onOpenChange={closeLightbox}>
        <DialogContent 
          className="max-w-4xl w-full h-[90vh] p-0"
          onKeyDown={handleKeyDown}
        >
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center justify-between">
              <span>
                Image {selectedIndex !== null ? selectedIndex + 1 : 0} of {images.length}
              </span>
              <div className="flex items-center gap-2">
                {showDownload && selectedIndex !== null && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadImage(images[selectedIndex], selectedIndex)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
                {showShare && selectedIndex !== null && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => shareImage(images[selectedIndex])}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={closeLightbox}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 relative flex items-center justify-center p-4">
            {/* Navigation Buttons */}
            {selectedIndex !== null && selectedIndex > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
                onClick={goToPrevious}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}

            {selectedIndex !== null && selectedIndex < images.length - 1 && (
              <Button
                variant="outline"
                size="sm"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10"
                onClick={goToNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}

            {/* Main Image */}
            {selectedIndex !== null && (
              <div className="relative w-full h-full flex items-center justify-center">
                {lightboxLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                )}
                <img
                  src={images[selectedIndex]}
                  alt={`Image ${selectedIndex + 1}`}
                  className="max-w-full max-h-full object-contain"
                  onLoad={() => setLightboxLoading(false)}
                  onError={() => setLightboxLoading(false)}
                />
              </div>
            )}
          </div>

          {/* Thumbnail Strip */}
          {images.length > 1 && (
            <div className="p-4 border-t">
              <div className="flex gap-2 overflow-x-auto">
                {images.map((image, index) => (
                  <button
                    key={index}
                    className={`flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-colors ${
                      selectedIndex === index 
                        ? 'border-primary' 
                        : 'border-transparent hover:border-muted-foreground'
                    }`}
                    onClick={() => {
                      setSelectedIndex(index);
                      setLightboxLoading(true);
                    }}
                  >
                    <img
                      src={image}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImageGallery;