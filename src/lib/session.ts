import { auth } from "./auth";

export async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Usuário não autenticado");
  }
  return session.user;
}
