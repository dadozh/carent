/**
 * Blob storage abstraction.
 *
 * Current provider: LocalProvider (FileReader → data URL, kept in JS memory)
 * To swap in production, implement StorageProvider and replace `storage` below.
 *
 * Vercel Blob example:
 *   import { put, del } from "@vercel/blob";
 *   class VercelBlobProvider implements StorageProvider {
 *     async upload(file: File, path: string) {
 *       const blob = await put(path, file, { access: "public" });
 *       return blob.url;
 *     }
 *     async remove(url: string) { await del(url); }
 *   }
 *
 * AWS S3 / Azure Blob: same interface, different SDK calls.
 */

export interface StorageProvider {
  /** Upload a file and return its public URL. */
  upload(file: File, path: string): Promise<string>;
  /** Remove a previously uploaded file by its URL. */
  remove(url: string): Promise<void>;
}

class LocalProvider implements StorageProvider {
  async upload(file: File, _path: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  async remove(_url: string): Promise<void> {
    // data URLs are self-contained — nothing to delete server-side
  }
}

export const storage: StorageProvider = new LocalProvider();

/** Helper: upload multiple files and return their URLs */
export async function uploadFiles(files: File[], prefix = "vehicles"): Promise<string[]> {
  return Promise.all(
    files.map((f, i) =>
      storage.upload(f, `${prefix}/${Date.now()}-${i}-${f.name}`)
    )
  );
}
