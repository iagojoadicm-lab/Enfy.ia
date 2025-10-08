import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/src/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/src/lib/session";

interface Props {
  params: { id: string };
}

export default async function PatientEvaluationsPage({ params }: Props) {
  await requireUser();

  const patient = await prisma.patient.findUnique({
    where: { id: params.id },
    include: {
      evaluations: {
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!patient) {
    notFound();
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {patient.nome}
          </h1>
          <p className="text-sm text-slate-500">
            Histórico de avaliações de lesões.
          </p>
        </div>
        <Link
          href={`/avaliacoes/nova?patientId=${patient.id}`}
          className="rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Nova avaliação
        </Link>
      </div>

      <div className="mt-8 space-y-4">
        {patient.evaluations.map((evaluation) => (
          <div
            key={evaluation.id}
            className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  {new Date(evaluation.createdAt).toLocaleString("pt-BR")}
                </p>
                <p className="text-lg font-semibold text-slate-800">
                  Confiança média {evaluation.confidenceMean?.toFixed(2) ?? "N/A"}
                </p>
              </div>
              <Link
                href={`/avaliacoes/${evaluation.id}`}
                className="text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                Abrir avaliação
              </Link>
            </div>
          </div>
        ))}
        {patient.evaluations.length === 0 ? (
          <p className="rounded border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            Nenhuma avaliação registrada para este paciente.
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}
