import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { slugify } from "@/lib/slug";

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No se recibio archivo." }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json({ error: "La imagen supera 5 MB." }, { status: 413 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Solo se permiten imagenes." }, { status: 400 });
    }

    const extension = path.extname(file.name) || ".png";
    const safeName = `${Date.now()}-${slugify(file.name.replace(extension, ""))}${extension}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, safeName), Buffer.from(await file.arrayBuffer()));

    return NextResponse.json({ url: `/uploads/${safeName}` });
  } catch (error) {
    console.error("Upload OFF failed", error);
    return NextResponse.json({ error: "No se pudo subir la imagen. Intenta con otro archivo." }, { status: 500 });
  }
}
