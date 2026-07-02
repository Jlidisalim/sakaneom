import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { saveUpload } from "@/server/store";

const PNG_1x1 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC";

let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "sak-upload-"));
  process.env.UPLOAD_DIR = join(dir, "uploads");
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("saveUpload — magic-byte validation (don't trust client MIME)", () => {
  it("accepts a real PNG and stores it with a .png name", async () => {
    const url = await saveUpload(`data:image/png;base64,${PNG_1x1}`);
    expect(url).toMatch(/^\/uploads\/[\w.-]+\.png$/);
  });

  it("rejects an SVG even when the MIME header claims image/png (XSS vector)", async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    ).toString("base64");
    await expect(saveUpload(`data:image/png;base64,${svg}`)).rejects.toThrow(/Unsupported image/);
  });

  it("rejects arbitrary non-image bytes", async () => {
    const txt = Buffer.from("not an image at all").toString("base64");
    await expect(saveUpload(`data:image/webp;base64,${txt}`)).rejects.toThrow(/Unsupported image/);
  });
});
