// Shrinks a photo in the browser before upload: phone photos are 3-10 MB, a menu thumbnail needs ~50-100 KB.

const MAX_SIZE_PX = 800

/**
 * Scales the image so its longest side is at most 800px and re-encodes it as WebP
 * (JPEG on browsers that cannot encode WebP). Throws an Error with a Vietnamese message on failure.
 */
export async function shrinkImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Vui lòng chọn một file ảnh')
  }
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('Không đọc được ảnh này. Hãy thử ảnh JPG hoặc PNG.')
  }

  const scale = Math.min(1, MAX_SIZE_PX / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const webp = await toBlob(canvas, 'image/webp', 0.82)
  // Browsers that cannot encode WebP silently return PNG instead.
  if (webp?.type === 'image/webp') return webp
  const jpeg = await toBlob(canvas, 'image/jpeg', 0.85)
  if (!jpeg) throw new Error('Không xử lý được ảnh')
  return jpeg
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}
