// Client-side image preparation: downscale + re-encode before upload so payloads
// stay small and the admin/site stay fast. Returns a data URL ready for upload.

export type DownscaleOptions = {
  maxDim?: number; // longest edge in px
  quality?: number; // 0..1 for jpeg/webp
  mime?: "image/webp" | "image/jpeg";
};

const DEFAULTS: Required<DownscaleOptions> = {
  maxDim: 2000,
  quality: 0.82,
  mime: "image/webp",
};

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Load, downscale and re-encode an image file. GIFs pass through untouched
 * (canvas would drop animation). SVG is rejected — it can carry scripts and is
 * refused server-side anyway, so fail early with a clear message.
 */
export async function prepareImage(file: File, opts: DownscaleOptions = {}): Promise<string> {
  const { maxDim, quality, mime } = { ...DEFAULTS, ...opts };
  if (file.type === "image/svg+xml") {
    throw new Error("SVG images aren't supported — upload a PNG, JPEG or WebP instead.");
  }
  if (file.type === "image/gif") {
    return fileToDataUrl(file);
  }

  const dataUrl = await fileToDataUrl(file);
  const img = await loadImage(dataUrl);

  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl; // canvas unsupported — fall back to original
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);

  try {
    const out = canvas.toDataURL(mime, quality);
    // Guard against browsers that silently ignore webp and return png.
    return out && out.length < dataUrl.length ? out : dataUrl;
  } catch {
    return dataUrl;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}
