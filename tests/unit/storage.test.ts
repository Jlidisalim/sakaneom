import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { getStorage } from "@/server/storage";

let dir: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "sak-storage-"));
  process.env.DATA_DIR = join(dir, "data");
  process.env.UPLOAD_DIR = join(dir, "uploads");
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("fs storage adapter", () => {
  const store = getStorage();

  it("round-trips a JSON blob and returns the fallback when absent", async () => {
    expect(await store.readBlob("leads", [])).toEqual([]);
    await store.writeBlob("leads", [{ id: "1", name: "Amira" }]);
    expect(await store.readBlob("leads", [])).toEqual([{ id: "1", name: "Amira" }]);
  });

  it("passes the writable probe", async () => {
    await expect(store.probe()).resolves.toBeUndefined();
  });

  it("saves an upload and serves it back with the right ext", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const url = await store.saveUpload(bytes, "png");
    expect(url).toMatch(/^\/uploads\/[a-z0-9-]+\.png$/);
    const name = url.replace("/uploads/", "");
    const read = await store.readUpload(name);
    expect(read?.ext).toBe("png");
    expect(new Uint8Array(read!.bytes)).toEqual(bytes);
  });

  it("rejects path traversal and unsafe upload names", async () => {
    expect(await store.readUpload("../package.json")).toBeNull();
    expect(await store.readUpload("/etc/passwd")).toBeNull();
    expect(await store.readUpload("sub/dir.png")).toBeNull();
    expect(await store.readUpload("nope.png")).toBeNull(); // missing
    expect(await store.readUpload("script.exe")).toBeNull(); // disallowed ext
  });
});
