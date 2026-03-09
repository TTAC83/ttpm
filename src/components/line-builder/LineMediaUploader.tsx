import React, { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Camera, Upload, Trash2, FileVideo, Loader2, ImageIcon } from "lucide-react";

interface MediaItem {
  id: string;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  description: string | null;
  sort_order: number;
  signedUrl?: string;
}

interface LineMediaUploaderProps {
  lineId: string;
  tableName: "lines" | "solutions_lines";
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = ["image/", "video/"];

export const LineMediaUploader: React.FC<LineMediaUploaderProps> = ({ lineId, tableName }) => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const fkColumn = tableName === "lines" ? "line_id" : "solutions_line_id";

  const fetchMedia = useCallback(async () => {
    const { data, error } = await supabase
      .from("line_media" as any)
      .select("*")
      .eq(fkColumn, lineId)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error fetching media:", error);
      return;
    }

    const items = (data as any[]) || [];
    // Generate signed URLs for display
    const withUrls = await Promise.all(
      items.map(async (item) => {
        const { data: urlData } = await supabase.storage
          .from("line-media")
          .createSignedUrl(item.file_path, 3600);
        return { ...item, signedUrl: urlData?.signedUrl || "" };
      })
    );
    setMedia(withUrls);
    setLoading(false);
  }, [lineId, fkColumn]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) return `${file.name} exceeds 20MB limit`;
    if (!ALLOWED_TYPES.some((t) => file.type.startsWith(t))) return `${file.name} is not an image or video`;
    return null;
  };

  const sanitizeFilename = (name: string) =>
    name.replace(/[^a-zA-Z0-9._-]/g, "_").substring(0, 100);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        const validationError = validateFile(file);
        if (validationError) {
          toast.error(validationError);
          continue;
        }

        const sanitized = sanitizeFilename(file.name);
        const storagePath = `${lineId}/${crypto.randomUUID()}-${sanitized}`;

        const { error: uploadError } = await supabase.storage
          .from("line-media")
          .upload(storagePath, file, { contentType: file.type });

        if (uploadError) {
          toast.error(`Upload failed: ${uploadError.message}`);
          continue;
        }

        const insertData: Record<string, any> = {
          [fkColumn]: lineId,
          file_path: storagePath,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          sort_order: media.length,
        };

        const { error: dbError } = await supabase
          .from("line_media" as any)
          .insert(insertData);

        if (dbError) {
          toast.error(`Failed to save metadata: ${dbError.message}`);
          // Clean up uploaded file
          await supabase.storage.from("line-media").remove([storagePath]);
          continue;
        }
      }

      toast.success("Media uploaded successfully");
      await fetchMedia();
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Upload failed unexpectedly");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const handleDescriptionUpdate = async (id: string, description: string) => {
    const { error } = await supabase
      .from("line_media" as any)
      .update({ description } as any)
      .eq("id", id);

    if (error) {
      toast.error("Failed to update description");
    } else {
      setMedia((prev) => prev.map((m) => (m.id === id ? { ...m, description } : m)));
    }
  };

  const handleDelete = async (item: MediaItem) => {
    const { error: dbError } = await supabase
      .from("line_media" as any)
      .delete()
      .eq("id", item.id);

    if (dbError) {
      toast.error("Failed to delete");
      return;
    }

    await supabase.storage.from("line-media").remove([item.file_path]);
    setMedia((prev) => prev.filter((m) => m.id !== item.id));
    toast.success("Media deleted");
  };

  const isVideo = (type: string) => type.startsWith("video/");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Line Photos & Videos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Choose Files
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="h-4 w-4 mr-2" />
            Take Photo/Video
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*,video/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
        </div>

        {/* Media grid */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : media.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No photos or videos uploaded yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {media.map((item) => (
              <div key={item.id} className="border rounded-lg overflow-hidden bg-card">
                {/* Thumbnail / preview */}
                <div className="aspect-video bg-muted flex items-center justify-center relative">
                  {isVideo(item.file_type) ? (
                    item.signedUrl ? (
                      <video
                        src={item.signedUrl}
                        className="w-full h-full object-cover"
                        controls={false}
                        muted
                        preload="metadata"
                      />
                    ) : (
                      <FileVideo className="h-10 w-10 text-muted-foreground" />
                    )
                  ) : item.signedUrl ? (
                    <img
                      src={item.signedUrl}
                      alt={item.description || item.file_name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <ImageIcon className="h-10 w-10 text-muted-foreground" />
                  )}
                  {isVideo(item.file_type) && (
                    <div className="absolute top-1 left-1">
                      <span className="bg-background/80 text-foreground text-xs px-1.5 py-0.5 rounded">Video</span>
                    </div>
                  )}
                </div>

                {/* Info & controls */}
                <div className="p-2 space-y-1.5">
                  <p className="text-xs text-muted-foreground truncate">{item.file_name}</p>
                  <Input
                    placeholder="Add description..."
                    className="h-7 text-xs"
                    defaultValue={item.description || ""}
                    onBlur={(e) => {
                      if (e.target.value !== (item.description || "")) {
                        handleDescriptionUpdate(item.id, e.target.value);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-destructive hover:text-destructive"
                    onClick={() => handleDelete(item)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
