import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { slugify } from "@/lib/slug";

const MAX_UPLOAD_SIZE = 100 * 1024 * 1024;
const UPLOAD_ERROR = "No se pudo subir el archivo. Revisa formato o tamaño.";
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/tiff",
  "image/x-tiff",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
  "video/x-matroska",
  "video/x-ms-wmv",
  "application/octet-stream",
]);
const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".tif",
  ".tiff",
  ".svg",
  ".mp4",
  ".webm",
  ".mov",
  ".m4v",
  ".mkv",
  ".wmv",
]);

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: UPLOAD_ERROR }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json({ error: UPLOAD_ERROR }, { status: 413 });
    }

    const extension = path.extname(file.name).toLowerCase();

    if (!ALLOWED_TYPES.has(file.type) && !ALLOWED_EXTENSIONS.has(extension)) {
      return NextResponse.json({ error: UPLOAD_ERROR }, { status: 400 });
    }

    const safeExtension = extension || ".png";
    const safeBaseName = slugify(file.name.replace(safeExtension, "")) || "off-upload";
    const safeName = `${Date.now()}-${safeBaseName}${safeExtension}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, safeName), Buffer.from(await file.arrayBuffer()));

    return NextResponse.json({ url: `/uploads/${safeName}` });
  } catch (error) {
    console.error("Upload OFF failed", error);
    return NextResponse.json({ error: UPLOAD_ERROR }, { status: 500 });
  }
}
