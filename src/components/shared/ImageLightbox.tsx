import {
  Dialog, DialogContent,
} from '@/components/ui/dialog';

interface ImageLightboxProps {
  src: string | null;
  alt?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImageLightbox({ src, alt = 'Image', open, onOpenChange }: ImageLightboxProps) {
  if (!src) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] p-2 flex items-center justify-center bg-background/95 backdrop-blur-sm">
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-[85vh] object-contain rounded"
        />
      </DialogContent>
    </Dialog>
  );
}
