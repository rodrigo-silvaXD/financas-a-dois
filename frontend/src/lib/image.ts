/**
 * Redimensiona/comprime imagem no cliente antes do upload.
 * Reduz foto de celular (5-8MB) pra ~200-400KB, mantendo legibilidade
 * pra OCR / IA em recibos.
 */
export async function compressImage(
  file: File,
  { maxWidth = 1200, quality = 0.7, mimeType = "image/jpeg" }: {
    maxWidth?: number; quality?: number; mimeType?: string;
  } = {},
): Promise<Blob> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error("Falha ao ler imagem"));
    r.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("Imagem inválida"));
    i.src = dataUrl;
  });

  const scale = img.width > maxWidth ? maxWidth / img.width : 1;
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas não suportado");
  ctx.drawImage(img, 0, 0, w, h);

  return await new Promise<Blob>((res, rej) => {
    canvas.toBlob((b) => b ? res(b) : rej(new Error("Falha ao comprimir")), mimeType, quality);
  });
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1] ?? "");
    r.onerror = () => rej(new Error("Falha ao converter"));
    r.readAsDataURL(blob);
  });
}
