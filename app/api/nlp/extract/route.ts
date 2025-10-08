import { NextResponse } from "next/server";
import { extractStructuredData } from "@/src/services/nlp";
import { requireUser } from "@/src/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  await requireUser();
  const { transcript } = await request.json();

  if (!transcript) {
    return NextResponse.json({ error: "transcript é obrigatório" }, { status: 400 });
  }

  const extraction = await extractStructuredData(transcript);
  return NextResponse.json(extraction);
}
