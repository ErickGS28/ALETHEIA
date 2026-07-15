import { ReportsRepository } from './reports.repository';

describe('ReportsRepository', () => {
  function buildPrismaMock() {
    return {
      contract: { count: jest.fn() },
      contractWorkflow: { findMany: jest.fn() },
    };
  }

  it('countActiveContracts excludes the given statuses', async () => {
    const prisma = buildPrismaMock();
    prisma.contract.count.mockResolvedValue(7);
    const repo = new ReportsRepository(prisma as any);

    const result = await repo.countActiveContracts(['SIGNED', 'REJECTED', 'CANCELLED'] as any);

    expect(result).toBe(7);
    expect(prisma.contract.count).toHaveBeenCalledWith({
      where: { status: { notIn: ['SIGNED', 'REJECTED', 'CANCELLED'] } },
    });
  });

  it('findActiveWorkflowsWithStage flattens the joined stage fields', async () => {
    const prisma = buildPrismaMock();
    const enteredAt = new Date('2026-07-10T00:00:00.000Z');
    prisma.contractWorkflow.findMany.mockResolvedValue([
      {
        id: 1,
        contractId: 1,
        stageId: 2,
        enteredAt,
        comment: null,
        stage: { id: 2, name: 'Revisión Legal', order: 2, slaHours: 24, roleRequired: 'ABOGADO' },
      },
    ]);
    const repo = new ReportsRepository(prisma as any);

    const result = await repo.findActiveWorkflowsWithStage();

    expect(result).toEqual([{ stageId: 2, stageName: 'Revisión Legal', slaHours: 24, enteredAt }]);
  });
});
