import { NextResponse } from "next/server";
import { uploadBuffer } from "@/src/services/storage";
import { requireUser } from "@/src/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  await requireUser();
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const result = await uploadBuffer(buffer, file.type || "audio/mpeg");

  return NextResponse.json({
    audioUrl: result.signedUrl,
    sourceAudioId: result.key,
    expiresAt: result.expiresAt
  });
}
