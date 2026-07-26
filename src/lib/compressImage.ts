// src/lib/compressImage.ts

/**
 * Client-side image compression for mobile uploads.
 * Resizes to max edge, outputs JPEG ~0.82 quality.
 * Falls back to original file if canvas fails.
 */
export async function compressImage(
  file: File,
  options: { maxEdge?: number; quality?: number } = {}
): Promise<File> {
  const maxEdge = options.maxEdge ?? 1600;
  const quality = options.quality ?? 0.82;

  if (!file.type.startsWith('image/') || file.type.includes('gif')) {
    return file;
  }

  // Skip tiny files
  if (file.size < 200_000) return file;

  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;

    if (width <= maxEdge && height <= maxEdge && file.size < 900_000) {
      bitmap.close();
      return file;
    }

    const scale = Math.min(1, maxEdge / Math.max(width, height));
    width = Math.round(width * scale);
    height = Math.round(height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', quality)
    );

    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file;
  }
}

export async function compressImages(files: File[]): Promise<File[]> {
  return Promise.all(files.map((f) => compressImage(f)));
}
