import React, { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Camera, Upload, Trash2, FileVideo, Loader2, ImageIcon, WifiOff } from "lucide-react";

// --- Types ---
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

interface PendingUpload {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  lineId: string;
  fkColumn: string;
  // stored as ArrayBuffer in IDB
}

interface LineMediaUploaderProps {
  lineId: string;
  tableName: "lines" | "solutions_lines";
}

// --- Constants ---
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = ["image/", "video/"];
const PENDING_DB_NAME = "line-media-pending";
const PENDING_STORE = "queue";

// --- IndexedDB helpers ---
function openPendingDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(PENDING_DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(PENDING_STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function savePendingUpload(entry: PendingUpload & { data: ArrayBuffer }) {
  const db = await openPendingDB();
  const tx = db.transaction(PENDING_STORE, "readwrite");
  tx.objectStore(PENDING_STORE).put(entry);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function getPendingUploads(lineId: string): Promise<(PendingUpload & { data: ArrayBuffer })[]> {
  const db = await openPendingDB();
  const tx = db.transaction(PENDING_STORE, "readonly");
  const all = await new Promise<(PendingUpload & { data: ArrayBuffer })[]>((resolve) => {
    const req = tx.objectStore(PENDING_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });
  db.close();
  return all.filter((i) => i.lineId === lineId);
}

async function removePendingUpload(id: string) {
  const db = await openPendingDB();
  const tx = db.transaction(PENDING_STORE, "readwrite");
  tx.objectStore(PENDING_STORE).delete(id);
  await new Promise<void>((resolve) => { tx.oncomplete = () => resolve(); });
  db.close();
}

// --- Component ---
export const LineMediaUploader: React.FC<LineMediaUploaderProps> = ({ lineId, tableName }) => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const fkColumn = tableName === "lines" ? "line_id" : "solutions_line_id";

  // --- Online/Offline tracking ---
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  // --- Fetch media from DB ---
  const fetchMedia = useCallback(async () => {
    const { data, error } = await supabase
      .from("line_media" as any)
      .select("*")
      .eq(fkColumn, lineId)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error fetching media:", error);
      setLoading(false);
      return;
    }

    const items = (data as any[]) || [];
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

  // --- Fetch pending from IDB ---
  const fetchPending = useCallback(async () => {
    const items = await getPendingUploads(lineId);
    setPending(items);
  }, [lineId]);

  useEffect(() => { fetchMedia(); fetchPending(); }, [fetchMedia, fetchPending]);

  // --- Replay pending uploads when coming back online ---
  useEffect(() => {
    if (!isOnline || pending.length === 0) return;

    const replay = async () => {
      setUploading(true);
      const stored = await getPendingUploads(lineId);
      for (const item of stored) {
        try {
          const sanitized = item.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").substring(0, 100);
          const storagePath = `${lineId}/${item.id}-${sanitized}`;
          const blob = new Blob([item.data], { type: item.fileType });

          const { error: uploadError } = await supabase.storage
            .from("line-media")
            .upload(storagePath, blob, { contentType: item.fileType });

          if (uploadError) { console.error("Replay upload failed:", uploadError); continue; }

          const insertData: Record<string, any> = {
            [item.fkColumn]: item.lineId,
            file_path: storagePath,
            file_name: item.fileName,
            file_type: item.fileType,
            file_size: item.fileSize,
            sort_order: media.length,
          };

          const { error: dbError } = await supabase.from("line_media" as any).insert(insertData);
          if (dbError) {
            await supabase.storage.from("line-media").remove([storagePath]);
            console.error("Replay DB insert failed:", dbError);
            continue;
          }

          await removePendingUpload(item.id);
        } catch (err) {
          console.error("Replay error:", err);
        }
      }
      setUploading(false);
      toast.success("Pending uploads synced");
      await fetchMedia();
      await fetchPending();
    };

    replay();
  }, [isOnline]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Validate file ---
  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) return `${file.name} exceeds 20MB limit`;
    if (!ALLOWED_TYPES.some((t) => file.type.startsWith(t))) return `${file.name} is not an image or video`;
    return null;
  };

  // --- Upload handler (online or offline queue) ---
  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        const validationError = validateFile(file);
        if (validationError) { toast.error(validationError); continue; }

        if (!navigator.onLine) {
          // Queue to IndexedDB for later sync
          const buffer = await file.arrayBuffer();
          const id = crypto.randomUUID();
          await savePendingUpload({
            id,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            lineId,
            fkColumn,
            data: buffer,
          });
          toast.info(`${file.name} queued for upload when back online`);
          continue;
        }

        // Online upload
        const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").substring(0, 100);
        const storagePath = `${lineId}/${crypto.randomUUID()}-${sanitized}`;

        const { error: uploadError } = await supabase.storage
          .from("line-media")
          .upload(storagePath, file, { contentType: file.type });

        if (uploadError) { toast.error(`Upload failed: ${uploadError.message}`); continue; }

        const insertData: Record<string, any> = {
          [fkColumn]: lineId,
          file_path: storagePath,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          sort_order: media.length,
        };

        const { error: dbError } = await supabase.from("line_media" as any).insert(insertData);
        if (dbError) {
          toast.error(`Failed to save metadata: ${dbError.message}`);
          await supabase.storage.from("line-media").remove([storagePath]);
          continue;
        }
      }

      if (navigator.onLine) {
        toast.success("Media uploaded successfully");
        await fetchMedia();
      }
      await fetchPending();
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

    if (error) toast.error("Failed to update description");
    else setMedia((prev) => prev.map((m) => (m.id === id ? { ...m, description } : m)));
  };

  const handleDelete = async (item: MediaItem) => {
    const { error: dbError } = await supabase.from("line_media" as any).delete().eq("id", item.id);
    if (dbError) { toast.error("Failed to delete"); return; }
    await supabase.storage.from("line-media").remove([item.file_path]);
    setMedia((prev) => prev.filter((m) => m.id !== item.id));
    toast.success("Media deleted");
  };

  const handleDeletePending = async (id: string) => {
    await removePendingUpload(id);
    setPending((prev) => prev.filter((p) => p.id !== id));
    toast.success("Pending upload removed");
  };

  const isVideo = (type: string) => type.startsWith("video/");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Line Photos & Videos</CardTitle>
          {!isOnline && (
            <Badge variant="outline" className="gap-1 text-xs">
              <WifiOff className="h-3 w-3" /> Offline
            </Badge>
          )}
          {pending.length > 0 && (
            <Badge variant="secondary" className="gap-1 text-xs">
              {pending.length} pending sync
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload buttons */}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Choose Files
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => cameraInputRef.current?.click()}>
            <Camera className="h-4 w-4 mr-2" />
            Take Photo/Video
          </Button>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
          <input ref={cameraInputRef} type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={(e) => handleUpload(e.target.files)} />
        </div>

        {/* Pending uploads (offline queue) */}
        {pending.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Queued for upload:</p>
            {pending.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-muted/50 rounded px-2 py-1">
                <span className="text-xs truncate">{p.fileName}</span>
                <Button type="button" variant="ghost" size="sm" className="h-5 text-xs text-destructive" onClick={() => handleDeletePending(p.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Media grid */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : media.length === 0 && pending.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No photos or videos uploaded yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {media.map((item) => (
              <div key={item.id} className="border rounded-lg overflow-hidden bg-card">
                <div className="aspect-video bg-muted flex items-center justify-center relative">
                  {isVideo(item.file_type) ? (
                    item.signedUrl ? (
                      <video src={item.signedUrl} className="w-full h-full object-cover" controls={false} muted preload="metadata" />
                    ) : (
                      <FileVideo className="h-10 w-10 text-muted-foreground" />
                    )
                  ) : item.signedUrl ? (
                    <img src={item.signedUrl} alt={item.description || item.file_name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <ImageIcon className="h-10 w-10 text-muted-foreground" />
                  )}
                  {isVideo(item.file_type) && (
                    <div className="absolute top-1 left-1">
                      <span className="bg-background/80 text-foreground text-xs px-1.5 py-0.5 rounded">Video</span>
                    </div>
                  )}
                </div>
                <div className="p-2 space-y-1.5">
                  <p className="text-xs text-muted-foreground truncate">{item.file_name}</p>
                  <Input
                    placeholder="Add description..."
                    className="h-7 text-xs"
                    defaultValue={item.description || ""}
                    onBlur={(e) => {
                      if (e.target.value !== (item.description || "")) handleDescriptionUpdate(item.id, e.target.value);
                    }}
                  />
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-xs text-destructive hover:text-destructive" onClick={() => handleDelete(item)}>
                    <Trash2 className="h-3 w-3 mr-1" /> Remove
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
