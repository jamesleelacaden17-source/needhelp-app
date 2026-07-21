import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import path from "path";

const STORAGE_ROOT = path.join(process.cwd(), "storage", "id-photos");

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const MAX_ID_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB

export function isAllowedIdPhotoType(mimeType: string) {
  return mimeType in ALLOWED_TYPES;
}

export async function saveIdPhoto(userId: string, file: File): Promise<string> {
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    throw new Error("Unsupported file type");
  }
  await mkdir(STORAGE_ROOT, { recursive: true });

  const filename = `${userId}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(STORAGE_ROOT, filename), buffer);

  return filename;
}

export async function readIdPhoto(
  filename: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const safeName = path.basename(filename);
  const ext = path.extname(safeName).slice(1).toLowerCase();
  const contentType =
    ext === "jpg" || ext === "jpeg"
      ? "image/jpeg"
      : ext === "png"
        ? "image/png"
        : ext === "webp"
          ? "image/webp"
          : null;
  if (!contentType) return null;

  try {
    const buffer = await readFile(path.join(STORAGE_ROOT, safeName));
    return { buffer, contentType };
  } catch {
    return null;
  }
}

export async function deleteIdPhoto(filename: string) {
  const safeName = path.basename(filename);
  try {
    await unlink(path.join(STORAGE_ROOT, safeName));
  } catch {
    // best-effort cleanup
  }
}
