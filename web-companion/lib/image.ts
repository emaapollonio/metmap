const MAX_WIDTH = 1200;
const JPEG_QUALITY = 0.7;

/**
 * Pred nalaganjem stisne sliko kot mobilna app: največ 1200 px širine (manjših ne povečuje),
 * JPEG s kakovostjo 70 %. Upošteva EXIF orientacijo (fotografije iz iPhone kamere).
 */
export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const scale = bitmap.width > MAX_WIDTH ? MAX_WIDTH / bitmap.width : 1;
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas ni na voljo.');
    ctx.drawImage(bitmap, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Stiskanje slike ni uspelo.'))), 'image/jpeg', JPEG_QUALITY),
    );
  } finally {
    bitmap.close();
  }
}
