import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GalleryImage, VideoContent } from "@/lib/cms/types";
import { useAdmin } from "../context";
import { BilingualText, ImageField, TextField } from "../fields";

const SPANS: { label: string; value: string }[] = [
  { label: "Normal", value: "" },
  { label: "Wide", value: "sm:col-span-2" },
  { label: "Tall", value: "sm:row-span-2" },
  { label: "Large", value: "sm:col-span-2 sm:row-span-2" },
];

export function GalleryEditor({
  images,
  onChange,
}: {
  images: GalleryImage[];
  onChange: (images: GalleryImage[]) => void;
}) {
  const { upload } = useAdmin();
  const inputRef = useRef<HTMLInputElement>(null);
  const [adding, setAdding] = useState(false);

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= images.length) return;
    const next = images.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  async function addFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setAdding(true);
    try {
      const uploaded: GalleryImage[] = [];
      for (const file of Array.from(files)) {
        const url = await upload(file);
        uploaded.push({ id: crypto.randomUUID(), url, span: "", alt: "" });
      }
      onChange([...images, ...uploaded]);
      toast.success(`${uploaded.length} image${uploaded.length > 1 ? "s" : ""} added`);
    } catch (e) {
      toast.error(`Upload failed: ${e instanceof Error ? e.message : "error"}`);
    } finally {
      setAdding(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{images.length} images</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        <Button size="sm" disabled={adding} onClick={() => inputRef.current?.click()}>
          {adding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          Add images
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((img, i) => (
          <div key={img.id} className="overflow-hidden rounded-lg border bg-background/40">
            <div className="relative aspect-[4/3] bg-secondary">
              <img src={img.url} alt={img.alt ?? ""} className="h-full w-full object-cover" />
              <span className="absolute left-2 top-2 rounded bg-background/85 px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                #{i + 1}
              </span>
            </div>
            <div className="space-y-2 p-2.5">
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={i === images.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
                <select
                  value={img.span ?? ""}
                  onChange={(e) =>
                    onChange(images.map((x, j) => (j === i ? { ...x, span: e.target.value } : x)))
                  }
                  className="ml-auto h-7 rounded-control border bg-background px-2 text-xs text-foreground"
                >
                  {SPANS.map((sp) => (
                    <option key={sp.label} value={sp.value}>
                      {sp.label}
                    </option>
                  ))}
                </select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => onChange(images.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Input
                value={img.alt ?? ""}
                placeholder="Alt text"
                className="h-7 text-xs"
                onChange={(e) =>
                  onChange(images.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))
                }
              />
            </div>
          </div>
        ))}
        {!images.length && (
          <p className="col-span-full rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No images yet — click “Add images”.
          </p>
        )}
      </div>
    </div>
  );
}

export function VideoEditor({
  video,
  onChange,
}: {
  video: VideoContent;
  onChange: (v: VideoContent) => void;
}) {
  return (
    <div className="space-y-4">
      <BilingualText
        label="Heading"
        value={video.label}
        onChange={(label) => onChange({ ...video, label })}
      />
      <BilingualText
        label="Subtitle"
        value={video.sub}
        onChange={(sub) => onChange({ ...video, sub })}
      />
      <TextField
        label="Video URL (mp4)"
        value={video.src}
        onChange={(src) => onChange({ ...video, src })}
        hint="Leave empty to hide the video. Place files in /public and use /name.mp4, or a full URL."
      />
      <ImageField
        label="Poster image"
        value={video.poster}
        onChange={(poster) => onChange({ ...video, poster })}
        aspect="aspect-video"
      />
    </div>
  );
}
