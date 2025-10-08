import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { prisma } from "@/src/lib/prisma";
import { requireUser } from "@/src/lib/session";
import { createEmptyEvaluationPayload } from "@/src/lib/json-schema";

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
        take: 5
      }
    }
  });

  if (!evaluation) {
    notFound();
  }

  const payload = evaluation.jsonPayload as ReturnType<typeof createEmptyEvaluationPayload>;
  const confidences = payload.metadados_extracao?.confidence_por_campo ?? {};
  const evidences = payload.metadados_extracao?.evidencias ?? {};
  const showLowConfidenceBanner =
    typeof evaluation.confidenceMean === "number" && evaluation.confidenceMean < 0.7;

  return (
    <AppShell>
      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Transcrição</h2>
            <p className="text-sm text-slate-500">
              Resultado bruto da transcrição do áudio enviado.
            </p>
          </div>
          <div className="h-[600px] overflow-y-auto rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <pre className="whitespace-pre-wrap text-sm text-slate-700">
              {evaluation.transcript ?? "Nenhuma transcrição disponível."}
            </pre>
          </div>
        </section>

        <section className="space-y-6">
          {showLowConfidenceBanner ? (
            <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
              Confiança média da extração abaixo do ideal. Revise os campos com atenção.
            </div>
          ) : null}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                Ficha estruturada
              </h2>
              <p className="text-sm text-slate-500">
                Revise os campos extraídos automaticamente.
              </p>
            </div>
            <div className="space-x-2">
              <form action={`/api/export/${evaluation.id}.json`} method="get" className="inline">
                <button className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  Exportar JSON
                </button>
              </form>
              <form action={`/api/export/${evaluation.id}.pdf`} method="get" className="inline">
                <button className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  Exportar PDF
                </button>
              </form>
            </div>
          </div>

          <div className="space-y-4">
            <ConfidenceField
              label="Paciente"
              value={payload.patient.nome}
              confidence={confidences["patient.nome"]}
              evidence={evidences["patient.nome"]}
            />
            <ConfidenceField
              label="Pressão arterial"
              value={payload.exame_fisico.pa_mmhg ?? "—"}
              confidence={confidences["exame_fisico.pa_mmhg"]}
              evidence={evidences["exame_fisico.pa_mmhg"]}
            />
            <ConfidenceField
              label="Temperatura"
              value={payload.exame_fisico.temperatura_c?.toString() ?? "—"}
              confidence={confidences["exame_fisico.temperatura_c"]}
              evidence={evidences["exame_fisico.temperatura_c"]}
            />
            <ConfidenceField
              label="Observações"
              value={payload.observacoes_importantes ?? "—"}
              confidence={confidences["observacoes_importantes"]}
              evidence={evidences["observacoes_importantes"]}
            />
          </div>

          {evaluation.versions.length ? (
            <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-700">Histórico de versões</h3>
              <ul className="space-y-1 text-xs text-slate-500">
                {evaluation.versions.map((version) => (
                  <li key={version.id}>
                    {new Date(version.createdAt).toLocaleString("pt-BR")} · Confiança {version.confidenceMean?.toFixed(2) ?? "N/A"}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}

interface ConfidenceFieldProps {
  label: string;
  value: string | number | null;
  confidence?: number;
  evidence?: string;
}

function ConfidenceField({ label, value, confidence, evidence }: ConfidenceFieldProps) {
  const highlight = confidence !== undefined && confidence < 0.75;

  return (
    <div
      className={`rounded-lg border p-4 ${highlight ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}
    >
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        {confidence !== undefined ? (
          <span className="font-mono text-xs text-slate-500">
            {(confidence * 100).toFixed(0)}%
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-slate-700">{value ?? "—"}</p>
      {confidence !== undefined ? (
        <div className="mt-3 h-2 rounded-full bg-slate-200">
          <div
            className={`h-2 rounded-full ${highlight ? "bg-amber-400" : "bg-brand-500"}`}
            style={{ width: `${Math.min(100, Math.max(0, confidence * 100))}%` }}
            title={evidence}
          />
        </div>
      ) : null}
    </div>
  );
}
