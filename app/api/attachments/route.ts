import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { uploadBuffer } from "@/src/services/storage";
import { requireUser } from "@/src/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  await requireUser();
  const formData = await request.formData();
  const evaluationId = formData.get("evaluationId");
  const file = formData.get("file");

  if (typeof evaluationId !== "string" || !(file instanceof File)) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const result = await uploadBuffer(buffer, file.type || "application/octet-stream");

  const attachment = await prisma.attachment.create({
    data: {
      evaluationId,
      tipo: file.type || "desconhecido",
      url: result.url,
      filename: file.name
    }
  });

  return NextResponse.json(attachment);
}
