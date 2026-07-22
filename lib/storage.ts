import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import path from "path";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const MAX_ID_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB

export function isAllowedIdPhotoType(mimeType: string) {
  return mimeType in ALLOWED_TYPES;
}

function contentTypeForFilename(filename: string): string | null {
  const ext = path.extname(filename).slice(1).toLowerCase();
  return ext === "jpg" || ext === "jpeg"
    ? "image/jpeg"
    : ext === "png"
      ? "image/png"
      : ext === "webp"
        ? "image/webp"
        : null;
}

function createPhotoStore(dirName: string) {
  const storageRoot = path.join(process.cwd(), "storage", dirName);

  return {
    async save(userId: string, file: File): Promise<string> {
      const ext = ALLOWED_TYPES[file.type];
      if (!ext) {
        throw new Error("Unsupported file type");
      }
      await mkdir(storageRoot, { recursive: true });

      const filename = `${userId}-${Date.now()}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(path.join(storageRoot, filename), buffer);

      return filename;
    },

    async read(filename: string): Promise<{ buffer: Buffer; contentType: string } | null> {
      const safeName = path.basename(filename);
      const contentType = contentTypeForFilename(safeName);
      if (!contentType) return null;

      try {
        const buffer = await readFile(path.join(storageRoot, safeName));
        return { buffer, contentType };
      } catch {
        return null;
      }
    },

    async delete(filename: string) {
      const safeName = path.basename(filename);
      try {
        await unlink(path.join(storageRoot, safeName));
      } catch {
        // best-effort cleanup
      }
    },
  };
}

const idPhotoStore = createPhotoStore("id-photos");
const profilePhotoStore = createPhotoStore("profile-photos");

export const saveIdPhoto = idPhotoStore.save;
export const readIdPhoto = idPhotoStore.read;
export const deleteIdPhoto = idPhotoStore.delete;

export const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB
export const isAllowedProfilePhotoType = isAllowedIdPhotoType;
export const saveProfilePhoto = profilePhotoStore.save;
export const readProfilePhoto = profilePhotoStore.read;
export const deleteProfilePhoto = profilePhotoStore.delete;
