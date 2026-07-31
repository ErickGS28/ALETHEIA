import { PrismaClient, Role } from '../generated/prisma';

const prisma = new PrismaClient();

// 4 etapas del flujo (orden, nombre, rol responsable, SLA en horas).
const STAGES = [
  { order: 1, name: 'Revisión Administrador', roleRequired: Role.ADMINISTRADOR, slaHours: 48 },
  { order: 2, name: 'Revisión Abogado', roleRequired: Role.ABOGADO, slaHours: 48 },
  { order: 3, name: 'Aprobación', roleRequired: Role.APROBADOR, slaHours: 24 },
  { order: 4, name: 'Firma', roleRequired: Role.FIRMANTE, slaHours: 24 },
];

async function main() {
  // Upsert idempotente por 'order' (no hay unique en el schema): si existe una etapa
  // con ese orden, se actualiza; si no, se crea.
  for (const stage of STAGES) {
    const existing = await prisma.workflowStage.findFirst({ where: { order: stage.order } });
    if (existing) {
      await prisma.workflowStage.update({
        where: { id: existing.id },
        data: {
          name: stage.name,
          roleRequired: stage.roleRequired,
          slaHours: stage.slaHours,
        },
      });
    } else {
      await prisma.workflowStage.create({ data: stage });
    }
  }

  console.log('✅ Seed workflow: 4 etapas (Administrador, Abogado, Aprobación, Firma)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
