import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireUser } from "@/src/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireUser();
  const body = await request.json();

  const { patientId, transcript, transcriptId, audioUrl, sourceAudioId, extraction } = body;

  if (!patientId || !extraction) {
    return NextResponse.json({ error: "Dados insuficientes" }, { status: 400 });
  }

  const evaluation = await prisma.evaluation.create({
    data: {
      patientId,
      jsonPayload: extraction.jsonPayload,
      confidenceMean: extraction.confidenceMean,
      transcript,
      transcriptId,
      audioUrl,
      sourceAudioId,
      createdBy: user.email ?? user.name ?? "system",
      updatedBy: user.email ?? user.name ?? "system"
    }
  });

  await prisma.evaluationVersion.create({
    data: {
      evaluationId: evaluation.id,
      jsonPayload: extraction.jsonPayload,
      confidenceMean: extraction.confidenceMean,
      transcript,
      createdBy: user.email ?? user.name ?? "system"
    }
  });

  const lesions = Array.isArray(extraction.jsonPayload?.lesoes)
    ? extraction.jsonPayload.lesoes
    : [];

  if (lesions.length) {
    await Promise.all(
      lesions.slice(0, 6).map((lesion: any, index: number) =>
        prisma.lesion.create({
          data: {
            evaluationId: evaluation.id,
            rotulo: lesion.rotulo ?? `L${index + 1}`,
            jsonPayload: lesion
          }
        })
      )
    );
  }

  return NextResponse.json({ id: evaluation.id });
}
