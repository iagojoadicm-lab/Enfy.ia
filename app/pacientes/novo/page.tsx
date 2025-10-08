import { redirect } from "next/navigation";
import { prisma } from "@/src/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/src/lib/session";

async function createPatient(formData: FormData) {
  "use server";
  await requireUser();
  const nome = formData.get("nome");
  const telefone = formData.get("telefone");

  if (typeof nome !== "string" || nome.trim().length === 0) {
    throw new Error("Nome é obrigatório");
  }

  const patient = await prisma.patient.create({
    data: {
      nome,
      telefone: typeof telefone === "string" ? telefone : null
    }
  });

  redirect(`/pacientes/${patient.id}/avaliacoes`);
}

export default async function NewPatientPage() {
  await requireUser();

  return (
    <AppShell>
      <div className="max-w-lg">
        <h1 className="text-2xl font-semibold text-slate-900">Novo paciente</h1>
        <p className="mt-2 text-sm text-slate-500">
          Cadastre um novo paciente para associar avaliações de feridas.
        </p>

        <form action={createPatient} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Nome</label>
            <input
              name="nome"
              required
              className="w-full rounded border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Telefone</label>
            <input
              name="telefone"
              className="w-full rounded border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Salvar paciente
          </button>
        </form>
      </div>
    </AppShell>
  );
}
