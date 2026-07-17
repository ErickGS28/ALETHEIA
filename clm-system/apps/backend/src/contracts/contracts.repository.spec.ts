import { ContractsRepository } from './contracts.repository';

describe('ContractsRepository', () => {
  function buildPrismaMock() {
    return {
      contract: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };
  }

  it('findExpiring queries by expiresAt range ordered ascending', async () => {
    const prisma = buildPrismaMock();
    const repo = new ContractsRepository(prisma as any);
    const start = new Date('2026-06-01T00:00:00.000Z');
    const end = new Date('2026-06-30T23:59:59.999Z');
    prisma.contract.findMany.mockResolvedValue([]);

    await repo.findExpiring(start, end);

    expect(prisma.contract.findMany).toHaveBeenCalledWith({
      where: { expiresAt: { gte: start, lte: end } },
      orderBy: { expiresAt: 'asc' },
    });
  });

  it('countByStatusInRange filters by status and updatedAt range', async () => {
    const prisma = buildPrismaMock();
    const repo = new ContractsRepository(prisma as any);
    const start = new Date('2026-06-01T00:00:00.000Z');
    const end = new Date('2026-06-30T23:59:59.999Z');
    prisma.contract.count.mockResolvedValue(4);

    const result = await repo.countByStatusInRange('REJECTED' as any, start, end);

    expect(result).toBe(4);
    expect(prisma.contract.count).toHaveBeenCalledWith({
      where: { status: 'REJECTED', updatedAt: { gte: start, lte: end } },
    });
  });
});
