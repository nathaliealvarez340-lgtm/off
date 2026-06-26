import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { uploadMediaFromFormData } from "@/lib/upload-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
    }

    const formData = await request.formData();
    const result = await uploadMediaFromFormData(formData);
    const { status, ...body } = result;

    return NextResponse.json(body, { status });
  } catch (error) {
    console.error("Upload OFF failed", error);
    return NextResponse.json(
      { success: false, error: "No se pudo subir el archivo. Revisa formato o tamaño." },
      { status: 500 },
    );
  }
}
