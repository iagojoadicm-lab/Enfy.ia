import { prisma } from "../src/lib/prisma";
import { hash } from "bcryptjs";

async function main() {
  const passwordHash = await hash("admin123", 10);

  await prisma.user.upsert({
    where: { email: "admin@enfy.local" },
    update: {},
    create: {
      email: "admin@enfy.local",
      name: "Administrador",
      passwordHash
    }
  });

  await prisma.patient.upsert({
    where: { id: "seed-patient" },
    update: {},
    create: {
      id: "seed-patient",
      nome: "Maria da Silva",
      telefone: "11999999999"
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
