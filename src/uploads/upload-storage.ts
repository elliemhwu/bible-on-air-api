import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID as uuid } from "crypto";

/** Directory where uploaded images are stored and served from `/uploads`. */
export const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

/** Store an image buffer and return its public URL (e.g. `/uploads/abc.png`). */
export async function saveImage(data: Buffer, mimeType: string): Promise<string> {
  const filename = `${uuid()}${MIME_TO_EXT[mimeType] ?? ".jpg"}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(join(UPLOAD_DIR, filename), data);
  return `/uploads/${filename}`;
}
