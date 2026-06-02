import { put } from "@vercel/blob";
import { slugify } from "@/lib/slug";

export const MAX_IMAGE_SIZE = 25 * 1024 * 1024;
export const MAX_VIDEO_SIZE = 150 * 1024 * 1024;
export const UPLOAD_ERROR = "No se pudo subir el archivo. Revisa formato o tamaño.";
export const SIZE_ERROR = "El archivo supera el tamaño permitido.";

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/tiff",
  "image/x-tiff",
  "image/svg+xml",
]);
const VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
  "video/x-matroska",
  "video/x-ms-wmv",
  "application/octet-stream",
]);
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".tif", ".tiff", ".svg"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov", ".m4v", ".mkv", ".wmv"]);

type UploadKind = "image" | "video";

function extensionFor(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : "";
}

function inferKind(file: File, requestedKind?: FormDataEntryValue | null): UploadKind {
  if (requestedKind === "video") return "video";
  if (requestedKind === "image") return "image";

  const extension = extensionFor(file.name);
  if (file.type.startsWith("video/") || VIDEO_EXTENSIONS.has(extension)) return "video";
  return "image";
}

function validateFile(file: File, kind: UploadKind) {
  const extension = extensionFor(file.name);
  const allowedTypes = kind === "video" ? VIDEO_TYPES : IMAGE_TYPES;
  const allowedExtensions = kind === "video" ? VIDEO_EXTENSIONS : IMAGE_EXTENSIONS;
  const maxSize = kind === "video" ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  const hasValidType = allowedTypes.has(file.type);
  const hasValidExtension = allowedExtensions.has(extension);
  const videoOctetFallback = kind === "video" && file.type === "application/octet-stream" && hasValidExtension;

  if (file.size > maxSize) {
    return SIZE_ERROR;
  }

  if (!hasValidExtension || (!hasValidType && !videoOctetFallback)) {
    return UPLOAD_ERROR;
  }

  return null;
}

export async function uploadMediaFromFormData(formData: FormData) {
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: UPLOAD_ERROR, status: 400 };
  }

  const kind = inferKind(file, formData.get("kind"));
  const validationError = validateFile(file, kind);
  if (validationError) {
    return { success: false, error: validationError, status: validationError === SIZE_ERROR ? 413 : 400 };
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return {
      success: false,
      error: "Falta BLOB_READ_WRITE_TOKEN para subir archivos en producción.",
      status: 500,
    };
  }

  const extension = extensionFor(file.name) || (kind === "video" ? ".mp4" : ".png");
  const baseName = slugify(file.name.slice(0, file.name.length - extension.length)) || "off-upload";
  const pathname = `off/${kind}s/${Date.now()}-${baseName}${extension}`;
  const blob = await put(pathname, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type || undefined,
    multipart: kind === "video" || file.size > 10 * 1024 * 1024,
  });

  return {
    success: true,
    url: blob.url,
    pathname: blob.pathname,
    kind,
    status: 200,
  };
}
