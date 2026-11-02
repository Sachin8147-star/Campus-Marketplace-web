export const VIDEO_EXT = /\.(mp4|webm|ogg|mov|m4v|3gp)(\?.*)?$/i;

export const isVideoUrl = (url: string): boolean => VIDEO_EXT.test(url);

const EXT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', ogg: 'video/ogg',
  mov: 'video/quicktime', '3gp': 'video/3gpp',
};

/** Some Android pickers hand over files with an empty MIME type; recover it from the extension. */
export function withMimeType(file: File): File {
  if (file.type) return file;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const type = EXT_TYPES[ext];
  return type ? new File([file], file.name, { type, lastModified: file.lastModified }) : file;
}

/** Shrinks big phone photos (often 4-12 MB) so uploads are quick on mobile data. */
export async function compressImage(file: File, maxSide = 1600, quality = 0.82): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1_500_000 && file.type === 'image/jpeg') {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file; // decoder not available (e.g. HEIC) - let the server decide
  }
}
