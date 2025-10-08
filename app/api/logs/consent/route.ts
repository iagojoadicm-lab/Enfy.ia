import { NextResponse } from "next/server";
import pino from "pino";
import { requireUser } from "@/src/lib/session";

const logger = pino({ name: "consent" });

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireUser();
  const body = await request.json();
  logger.info({ user: user.email, ...body }, "Consentimento de gravação confirmado");
  return NextResponse.json({ ok: true });
}
