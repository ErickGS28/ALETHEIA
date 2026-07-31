import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function main() {
  // Sociedades
  const societies = ['ALETHEIA Corp', 'Filial Norte'];
  for (const name of societies) {
    await prisma.society.upsert({ where: { name }, update: {}, create: { name } });
  }

  // Áreas
  const areas = ['Compras', 'Legal', 'Recursos Humanos', 'TI'];
  for (const name of areas) {
    await prisma.area.upsert({ where: { name }, update: {}, create: { name } });
  }

  // Apoderados (Apoderado.name no es unique → usamos createMany con skipDuplicates idempotente
  // verificando existencia previa por name).
  const apoderados = [
    { name: 'Juan Pérez', legalPower: 'Poder general para actos de administración' },
    { name: 'María López', legalPower: 'Poder especial para suscripción de contratos' },
  ];
  for (const a of apoderados) {
    const existing = await prisma.apoderado.findFirst({ where: { name: a.name } });
    if (!existing) {
      await prisma.apoderado.create({ data: a });
    }
  }

  // Plantillas (Template.name no es unique → idempotencia por name).
  const templates = [
    {
      name: 'Contrato de Servicios',
      content: '<h1>Contrato de Prestación de Servicios</h1><p>Entre las partes se acuerda...</p>',
    },
    {
      name: 'Contrato de Compraventa',
      content: '<h1>Contrato de Compraventa</h1><p>El vendedor transfiere al comprador...</p>',
    },
  ];
  for (const t of templates) {
    const existing = await prisma.template.findFirst({ where: { name: t.name } });
    if (!existing) {
      await prisma.template.create({ data: t });
    }
  }

  console.log(
    '✅ Seed contracts: catálogos base sembrados (societies, areas, apoderados, templates)',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
