import { BadRequestException } from '@nestjs/common';
import { ContractsRepository } from './contracts.repository';
import { ContractsService } from './contracts.service';

describe('ContractsService', () => {
  function buildRepoMock() {
    return {
      findExpiring: jest.fn(),
      countByStatusInRange: jest.fn(),
    } as unknown as jest.Mocked<ContractsRepository>;
  }

  describe('getExpiring', () => {
    it('throws BadRequestException when startDate is after endDate', async () => {
      const repo = buildRepoMock();
      const service = new ContractsService(repo);

      await expect(service.getExpiring('2026-07-10', '2026-07-01')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('returns count 0 and masUrgente null when there are no expiring contracts', async () => {
      const repo = buildRepoMock();
      repo.findExpiring.mockResolvedValue([]);
      const service = new ContractsService(repo);

      const result = await service.getExpiring('2026-07-01', '2026-07-31');

      expect(result).toEqual({ count: 0, contratos: [], masUrgente: null });
    });

    it('maps contracts and picks the first (soonest) as masUrgente', async () => {
      const repo = buildRepoMock();
      repo.findExpiring.mockResolvedValue([
        {
          id: 1,
          title: 'Renovación licencias',
          vendorName: 'Acme S.A.',
          status: 'SIGNED',
          expiresAt: new Date('2026-07-20T00:00:00.000Z'),
        } as any,
      ]);
      const service = new ContractsService(repo);

      const result = await service.getExpiring('2026-07-01', '2026-07-31');

      expect(result.count).toBe(1);
      expect(result.masUrgente).toEqual({
        id: 1,
        title: 'Renovación licencias',
        vendorName: 'Acme S.A.',
        status: 'SIGNED',
        expiresAt: '2026-07-20',
      });
    });
  });

  describe('getMetrics', () => {
    it('throws BadRequestException when startDate is after endDate', async () => {
      const repo = buildRepoMock();
      const service = new ContractsService(repo);

      await expect(
        service.getMetrics('REJECTED' as any, '2026-07-10', '2026-07-01'),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns the count from the repository', async () => {
      const repo = buildRepoMock();
      repo.countByStatusInRange.mockResolvedValue(4);
      const service = new ContractsService(repo);

      const result = await service.getMetrics('REJECTED' as any, '2026-06-01', '2026-06-30');

      expect(result).toEqual({
        status: 'REJECTED',
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        count: 4,
      });
    });
  });
});
