import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireUser } from "@/src/lib/session";

export const runtime = "nodejs";

interface Params {
  params: { id: string };
}

export async function GET(_request: Request, { params }: Params) {
  await requireUser();
  const evaluation = await prisma.evaluation.findUnique({
    where: { id: params.id },
    include: { attachments: true, lesions: true }
  });

  if (!evaluation) {
    return NextResponse.json({ error: "Avaliação não encontrada" }, { status: 404 });
  }

  return NextResponse.json(evaluation);
}

export async function PUT(request: Request, { params }: Params) {
  const user = await requireUser();
  const data = await request.json();

  const previous = await prisma.evaluation.findUnique({
    where: { id: params.id }
  });

  if (!previous) {
    return NextResponse.json({ error: "Avaliação não encontrada" }, { status: 404 });
  }

  await prisma.evaluationVersion.create({
    data: {
      evaluationId: previous.id,
      jsonPayload: previous.jsonPayload,
      confidenceMean: previous.confidenceMean,
      transcript: previous.transcript,
      createdBy: user.email ?? user.name ?? "system"
    }
  });

  const evaluation = await prisma.evaluation.update({
    where: { id: params.id },
    data: {
      jsonPayload: data.jsonPayload,
      confidenceMean: data.confidenceMean,
      transcript: data.transcript,
      updatedBy: user.email ?? user.name ?? "system"
    }
  });

  await prisma.evaluationVersion.create({
    data: {
      evaluationId: evaluation.id,
      jsonPayload: evaluation.jsonPayload,
      confidenceMean: evaluation.confidenceMean,
      transcript: evaluation.transcript,
      createdBy: user.email ?? user.name ?? "system"
    }
  });

  return NextResponse.json(evaluation);
}
