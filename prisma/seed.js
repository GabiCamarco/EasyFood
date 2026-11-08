import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const restaurantes = [
  { name: 'Pizzaria Napoli', category: 'Pizza', rating: 4.5 },
  { name: 'Burger House', category: 'Burger', rating: 4.2 },
  { name: 'Sushi Express', category: 'Japonesa', rating: 4.8 }
];

async function main() {
  // Evita duplicar os restaurantes se o comando for executado mais de uma vez
  const existentes = await prisma.restaurant.count();
  if (existentes > 0) {
    console.log(`O banco já tem ${existentes} restaurante(s). Nada foi inserido.`);
    return;
  }

  await prisma.restaurant.createMany({ data: restaurantes });
  console.log(`${restaurantes.length} restaurantes de exemplo inseridos.`);
}

main()
  .catch((e) => {
    console.error('Erro ao popular o banco:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());