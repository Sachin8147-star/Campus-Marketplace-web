import { getApiBaseUrl, getAuthToken } from './api-config';
import { compressImage, withMimeType } from './media';

export const MAX_MEDIA_BYTES = 50 * 1024 * 1024;

export class UploadError extends Error {}

/** Uploads one photo/video to /api/uploads and reports progress (0-100). */
export async function uploadMedia(original: File, onProgress?: (pct: number) => void): Promise<string> {
  let file = withMimeType(original);
  if (file.type.startsWith('image/')) file = await compressImage(file);
  if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
    throw new UploadError(`“${original.name}” isn’t a photo or video.`);
  }
  if (file.size > MAX_MEDIA_BYTES) {
    throw new UploadError(`“${original.name}” is larger than 50 MB. Pick a shorter clip or a smaller file.`);
  }

  const base = getApiBaseUrl();
  const token = base ? await getAuthToken() : null;
  const body = new FormData();
  body.append('file', file, file.name);

  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${base}/api/uploads`);
    xhr.timeout = 180_000;
    xhr.withCredentials = !base; // cookies only for same-origin web
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = e => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onerror = () => reject(new UploadError(`Couldn’t reach the server${base ? ` (${base})` : ''}. Check your internet and the Server settings.`));
    xhr.ontimeout = () => reject(new UploadError('The upload took too long. Try a smaller file or a better connection.'));
    xhr.onload = () => {
      let data: any = null;
      try { data = JSON.parse(xhr.responseText); } catch { /* not json */ }
      if (xhr.status >= 200 && xhr.status < 300 && data?.imageUrl) { onProgress?.(100); resolve(data.imageUrl); return; }
      if (xhr.status === 401) return reject(new UploadError('Your session expired. Please sign in again and retry.'));
      if (xhr.status === 413) return reject(new UploadError('That file is too large for the server.'));
      const serverMessage = typeof data?.error === 'string' ? data.error : '';
      if (xhr.status === 503) return reject(new UploadError(serverMessage || 'Photo storage isn’t configured on the server yet.'));
      reject(new UploadError(serverMessage || `Upload failed (HTTP ${xhr.status}).`));
    };
    xhr.send(body);
  });
}
