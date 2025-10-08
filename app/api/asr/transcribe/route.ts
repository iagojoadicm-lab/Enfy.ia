import { NextResponse } from "next/server";
import { transcribeAudio } from "@/src/services/asr";
import { requireUser } from "@/src/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  await requireUser();
  const { audioUrl } = await request.json();

  if (!audioUrl) {
    return NextResponse.json({ error: "audioUrl é obrigatório" }, { status: 400 });
  }

  const result = await transcribeAudio(audioUrl);
  return NextResponse.json(result);
}
