import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import { uploadMediaFromFormData } from "@/lib/upload-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  if (!await consumeRateLimit("community-upload", user.id, 4, 10 * 60_000)) return NextResponse.json({ success: false, error: "Espera antes de subir otra imagen." }, { status: 429 });
  try {
    const formData = await request.formData();
    formData.set("kind", "image");
    const result = await uploadMediaFromFormData(formData);
    const { status, ...body } = result;
    return NextResponse.json(body, { status });
  } catch (error) {
    console.error("Community image upload failed", error);
    return NextResponse.json({ success: false, error: "No se pudo subir la imagen." }, { status: 500 });
  }
}
