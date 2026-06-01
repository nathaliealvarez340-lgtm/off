import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { slugify } from "@/lib/slug";

const MAX_UPLOAD_SIZE = 25 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
  "video/x-msvideo",
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
      return NextResponse.json({ error: "No se pudo subir el archivo. Revisa formato o tamaño." }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json({ error: "No se pudo subir el archivo. Revisa formato o tamaño." }, { status: 413 });
    }

    const extension = path.extname(file.name).toLowerCase();
    const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".mp4", ".webm", ".mov", ".m4v", ".avi"]);

    if (!ALLOWED_TYPES.has(file.type) && !allowedExtensions.has(extension)) {
      return NextResponse.json({ error: "No se pudo subir el archivo. Revisa formato o tamaño." }, { status: 400 });
    }

    const safeExtension = extension || ".png";
    const safeName = `${Date.now()}-${slugify(file.name.replace(safeExtension, ""))}${safeExtension}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, safeName), Buffer.from(await file.arrayBuffer()));

    return NextResponse.json({ url: `/uploads/${safeName}` });
  } catch (error) {
    console.error("Upload OFF failed", error);
    return NextResponse.json({ error: "No se pudo subir el archivo. Revisa formato o tamaño." }, { status: 500 });
  }
}
