import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { slugify } from "@/lib/slug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_IMAGE_SIZE = 25 * 1024 * 1024;
const MAX_VIDEO_SIZE = 150 * 1024 * 1024;
const UPLOAD_ERROR = "No se pudo subir el archivo. Revisa formato o tamaño.";
const SIZE_ERROR = "El archivo supera el tamaño permitido.";

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

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const kind = formData.get("kind") === "video" ? "video" : "image";

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: UPLOAD_ERROR }, { status: 400 });
    }

    const extension = path.extname(file.name).toLowerCase();
    const allowedTypes = kind === "video" ? VIDEO_TYPES : IMAGE_TYPES;
    const allowedExtensions = kind === "video" ? VIDEO_EXTENSIONS : IMAGE_EXTENSIONS;
    const maxSize = kind === "video" ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

    if (file.size > maxSize) {
      return NextResponse.json({ error: SIZE_ERROR }, { status: 413 });
    }

    if (!allowedTypes.has(file.type) && !allowedExtensions.has(extension)) {
      return NextResponse.json({ error: UPLOAD_ERROR }, { status: 400 });
    }

    const safeExtension = extension || (kind === "video" ? ".mp4" : ".png");
    const safeBaseName = slugify(file.name.replace(safeExtension, "")) || "off-upload";
    const safeName = `${Date.now()}-${safeBaseName}${safeExtension}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, safeName), Buffer.from(await file.arrayBuffer()));

    return NextResponse.json({ url: `/uploads/${safeName}`, kind });
  } catch (error) {
    console.error("Upload OFF failed", error);
    return NextResponse.json({ error: UPLOAD_ERROR }, { status: 500 });
  }
}
