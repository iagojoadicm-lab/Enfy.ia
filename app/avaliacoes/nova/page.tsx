import Link from "next/link";
import { prisma } from "@/src/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/src/lib/session";
import AudioUploadForm from "@/components/AudioUploadForm";

interface Props {
  searchParams: { patientId?: string };
}

export default async function NewEvaluationPage({ searchParams }: Props) {
  await requireUser();
  const patient = searchParams.patientId
    ? await prisma.patient.findUnique({ where: { id: searchParams.patientId } })
    : null;

  const patients = await prisma.patient.findMany({ orderBy: { nome: "asc" } });

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Nova avaliação
          </h1>
          <p className="text-sm text-slate-500">
            Grave ou envie um áudio para iniciar a extração automática.
          </p>
        </div>
        <Link href="/pacientes" className="text-sm text-brand-600 hover:text-brand-700">
          Voltar para pacientes
        </Link>
      </div>

      <AudioUploadForm patients={patients} patientId={patient?.id ?? null} />
    </AppShell>
  );
}
