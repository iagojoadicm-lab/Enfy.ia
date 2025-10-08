"use client";

import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      redirect: false,
      email,
      password
    });

    setLoading(false);

    if (result?.error) {
      setError("Credenciais inválidas");
      return;
    }

    const callbackUrl = searchParams?.get("callbackUrl") ?? "/pacientes";
    router.push(callbackUrl);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-6 rounded-lg bg-white p-8 shadow"
      >
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Entrar</h1>
          <p className="text-sm text-slate-500">
            Utilize suas credenciais para acessar o Enfy.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">E-mail</label>
          <input
            type="email"
            className="w-full rounded border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Senha</label>
          <input
            type="password"
            className="w-full rounded border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-brand-600 px-4 py-2 font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-75"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
