// clm-system/apps/backend/prisma/seed.ts
import { ContractStatus, PrismaClient, ProviderType, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ALL_PRIVILEGES = [
  'CONTRACT_CREATE', 'CONTRACT_EDIT', 'CONTRACT_SUBMIT', 'CONTRACT_CANCEL', 'CONTRACT_RECOVER',
  'CONTRACT_REVIEW_ADMIN', 'CONTRACT_REVIEW_LAWYER', 'CONTRACT_APPROVE', 'CONTRACT_SIGN',
  'CONTRACT_VIEW_ALL', 'CONTRACT_VIEW_AREA', 'DOCUMENT_UPLOAD', 'DOCUMENT_VERSION',
  'WORKFLOW_CONFIG', 'USERS_MANAGE', 'AREAS_MANAGE', 'APODERADOS_MANAGE', 'TEMPLATES_MANAGE',
  'REPORTS_VIEW',
];

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function main() {
  const area = await prisma.area.upsert({
    where: { name: 'Legal' },
    update: {},
    create: { name: 'Legal' },
  });

  const society = await prisma.society.upsert({
    where: { name: 'ALETHEIA Holdings' },
    update: {},
    create: { name: 'ALETHEIA Holdings' },
  });

  const systemPassword = await bcrypt.hash('AlexaSystem#2026', 10);
  const systemUser = await prisma.user.upsert({
    where: { email: 'alexa-system@aletheia-clm.com' },
    update: {},
    create: {
      email: 'alexa-system@aletheia-clm.com',
      name: 'Alexa',
      lastName: 'Sistema',
      password: systemPassword,
      roles: [Role.ADMINISTRADOR],
      privileges: ALL_PRIVILEGES,
      areaId: area.id,
    },
  });

  console.log(`Usuario de sistema listo: ${systemUser.email}`);

  const stageDefs = [
    { name: 'Revisión Administrativa', order: 1, slaHours: 48, roleRequired: Role.ADMINISTRADOR },
    { name: 'Revisión Legal', order: 2, slaHours: 24, roleRequired: Role.ABOGADO },
    { name: 'Aprobación Final', order: 3, slaHours: 24, roleRequired: Role.APROBADOR },
  ];

  const stagesByName = new Map<string, { id: number }>();
  for (const def of stageDefs) {
    const stage = await prisma.workflowStage.upsert({
      where: { name: def.name },
      update: {},
      create: def,
    });
    stagesByName.set(def.name, stage);
  }

  const existingContracts = await prisma.contract.count();
  if (existingContracts > 0) {
    console.log(`Ya existen ${existingContracts} contratos, se omite el seed de datos de demo.`);
    return;
  }

  const contractsData = [
    {
      title: 'Servicio de limpieza anual',
      vendorName: 'CleanCorp SA',
      providerType: ProviderType.MORAL,
      status: ContractStatus.SIGNED,
      expiresAt: daysFromNow(10),
      updatedAt: new Date(),
    },
    {
      title: 'Licencias software contable',
      vendorName: 'SoftBooks',
      providerType: ProviderType.MORAL,
      status: ContractStatus.SIGNED,
      expiresAt: daysFromNow(25),
      updatedAt: daysAgo(5),
    },
    {
      title: 'Consultoría fiscal',
      vendorName: 'Fiscal Partners',
      providerType: ProviderType.FISICA,
      status: ContractStatus.REJECTED,
      expiresAt: null,
      updatedAt: new Date(),
    },
    {
      title: 'Renta de oficina',
      vendorName: 'Inmobiliaria Sol',
      providerType: ProviderType.MORAL,
      status: ContractStatus.REJECTED,
      expiresAt: null,
      updatedAt: daysAgo(20),
    },
    {
      title: 'Seguro de responsabilidad civil',
      vendorName: 'Seguros Confianza',
      providerType: ProviderType.MORAL,
      status: ContractStatus.SUBMITTED,
      expiresAt: null,
      updatedAt: new Date(),
    },
    {
      title: 'Contrato de arrendamiento bodega',
      vendorName: 'Logística Norte',
      providerType: ProviderType.MORAL,
      status: ContractStatus.DRAFT,
      expiresAt: null,
      updatedAt: new Date(),
    },
  ];

  const workflowContractsData = [
    {
      title: 'Mantenimiento de flotilla',
      vendorName: 'AutoFix',
      providerType: ProviderType.MORAL,
      status: ContractStatus.ADMIN_REVIEW,
      stageName: 'Revisión Administrativa',
      enteredAt: hoursAgo(72), // sla 48h -> vencido
    },
    {
      title: 'Publicidad digital Q3',
      vendorName: 'AdWave',
      providerType: ProviderType.MORAL,
      status: ContractStatus.LAWYER_REVIEW,
      stageName: 'Revisión Legal',
      enteredAt: hoursAgo(30), // sla 24h -> vencido
    },
    {
      title: 'Auditoría anual',
      vendorName: 'AuditPro',
      providerType: ProviderType.MORAL,
      status: ContractStatus.LAWYER_REVIEW,
      stageName: 'Revisión Legal',
      enteredAt: hoursAgo(40), // sla 24h -> vencido
    },
    {
      title: 'Compra de mobiliario',
      vendorName: 'Muebles del Centro',
      providerType: ProviderType.MORAL,
      status: ContractStatus.APPROVAL_PENDING,
      stageName: 'Aprobación Final',
      enteredAt: hoursAgo(2), // sla 24h -> dentro de tiempo
    },
  ];

  for (const data of contractsData) {
    await prisma.contract.create({
      data: {
        title: data.title,
        vendorName: data.vendorName,
        providerType: data.providerType,
        status: data.status,
        expiresAt: data.expiresAt,
        updatedAt: data.updatedAt,
        areaId: area.id,
        societyId: society.id,
        createdById: systemUser.id,
      },
    });
  }

  for (const data of workflowContractsData) {
    const stage = stagesByName.get(data.stageName);
    if (!stage) throw new Error(`Etapa no encontrada: ${data.stageName}`);

    const contract = await prisma.contract.create({
      data: {
        title: data.title,
        vendorName: data.vendorName,
        providerType: data.providerType,
        status: data.status,
        areaId: area.id,
        societyId: society.id,
        createdById: systemUser.id,
      },
    });

    await prisma.contractWorkflow.create({
      data: {
        contractId: contract.id,
        stageId: stage.id,
        enteredAt: data.enteredAt,
      },
    });
  }

  console.log(
    `Seed de demo completo: ${contractsData.length + workflowContractsData.length} contratos creados.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
