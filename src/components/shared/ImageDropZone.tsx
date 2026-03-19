import { useState, useRef, useCallback } from 'react';
import { ImageIcon, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ImageLightbox } from './ImageLightbox';

interface ImageDropZoneProps {
  preview?: string | null;
  onFileSelect: (file: File) => void;
  onClear: () => void;
  maxSizeMB?: number;
  accept?: string;
  className?: string;
}

export function ImageDropZone({
  preview,
  onFileSelect,
  onClear,
  maxSizeMB = 2,
  accept = 'image/*',
  className,
}: ImageDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validate = useCallback((file: File): boolean => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file type', description: 'Please select an image file', variant: 'destructive' });
      return false;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast({ title: 'File too large', description: `Maximum file size is ${maxSizeMB}MB`, variant: 'destructive' });
      return false;
    }
    return true;
  }, [maxSizeMB]);

  const handleFile = useCallback((file: File) => {
    if (validate(file)) onFileSelect(file);
  }, [validate, onFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (preview) {
    return (
      <>
        <div className={`relative inline-block border rounded-lg p-2 bg-muted/30 ${className || ''}`}>
          <img
            src={preview}
            alt="Preview"
            className="max-h-32 rounded object-contain cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setLightboxOpen(true)}
          />
          <button
            type="button"
            onClick={onClear}
            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 hover:opacity-80"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <ImageLightbox src={preview} open={lightboxOpen} onOpenChange={setLightboxOpen} />
      </>
    );
  }

  return (
    <label
      className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors ${
        isDragOver ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
      } ${className || ''}`}
      onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
      onDragEnter={e => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <ImageIcon className="h-8 w-8 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">
        {isDragOver ? 'Drop image here' : 'Click or drag an image here'}
      </span>
      <span className="text-xs text-muted-foreground">Max {maxSizeMB}MB · JPG, PNG, WebP</span>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleInputChange}
      />
    </label>
  );
}
