import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { prisma } from "@/src/lib/prisma";
import { requireUser } from "@/src/lib/session";
import { EvaluationReviewClient } from "./EvaluationReviewClient";

interface Props {
  params: { id: string };
}

export default async function EvaluationPage({ params }: Props) {
  await requireUser();
  const evaluation = await prisma.evaluation.findUnique({
    where: { id: params.id },
    include: {
      versions: {
        orderBy: { createdAt: "desc" },
        take: 10
      }
    }
  });

  if (!evaluation) {
    notFound();
  }

  return (
    <AppShell>
      <EvaluationReviewClient
        evaluationId={evaluation.id}
        patientId={evaluation.patientId}
        transcript={evaluation.transcript}
        jsonPayload={evaluation.jsonPayload}
        confidenceMean={evaluation.confidenceMean}
        evidences={(evaluation.jsonPayload as any)?.metadados_extracao?.evidencias ?? {}}
        confidences={(evaluation.jsonPayload as any)?.metadados_extracao?.confidence_por_campo ?? {}}
        versions={evaluation.versions.map((version) => ({
          id: version.id,
          createdAt: version.createdAt.toISOString(),
          createdBy: version.createdBy,
          jsonPayload: version.jsonPayload,
          transcript: version.transcript,
          confidenceMean: version.confidenceMean
        }))}
      />
    </AppShell>
  );
}
