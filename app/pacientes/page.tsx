import Link from "next/link";
import { prisma } from "@/src/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/src/lib/session";

export default async function PacientesPage() {
  await requireUser();
  const patients = await prisma.patient.findMany({
    orderBy: { nome: "asc" }
  });

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Pacientes</h1>
          <p className="text-sm text-slate-500">
            Cadastre pacientes e acompanhe suas avaliações de lesões.
          </p>
        </div>
        <Link
          href="/pacientes/novo"
          className="rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Novo paciente
        </Link>
      </div>

      <div className="mt-8 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-6 py-3">Nome</th>
              <th className="px-6 py-3">Telefone</th>
              <th className="px-6 py-3">Última avaliação</th>
              <th className="px-6 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {patients.map((patient) => (
              <tr key={patient.id}>
                <td className="px-6 py-4 font-medium text-slate-800">{patient.nome}</td>
                <td className="px-6 py-4 text-slate-600">{patient.telefone ?? "—"}</td>
                <td className="px-6 py-4 text-slate-600">
                  {patient.updatedAt.toLocaleDateString("pt-BR")}
                </td>
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/pacientes/${patient.id}/avaliacoes`}
                    className="text-brand-600 hover:text-brand-700"
                  >
                    Ver avaliações
                  </Link>
                </td>
              </tr>
            ))}
            {patients.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                  Nenhum paciente cadastrado ainda.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
