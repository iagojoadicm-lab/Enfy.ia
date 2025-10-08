import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireUser } from "@/src/lib/session";

export const runtime = "nodejs";

interface Params {
  params: { id: string };
}

export async function GET(_request: Request, { params }: Params) {
  await requireUser();
  const evaluation = await prisma.evaluation.findUnique({ where: { id: params.id } });

  if (!evaluation) {
    return NextResponse.json({ error: "Avaliação não encontrada" }, { status: 404 });
  }

  return NextResponse.json(evaluation.jsonPayload);
}
