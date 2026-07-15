import { ContractStatus } from '@prisma/client';
import { ReportsRepository } from './reports.repository';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  function buildRepoMock() {
    return {
      countActiveContracts: jest.fn(),
      countByStatusUpdatedInRange: jest.fn(),
      findActiveWorkflowsWithStage: jest.fn(),
    } as unknown as jest.Mocked<ReportsRepository>;
  }

  describe('getDailySummary', () => {
    it('combines pendientes, firmados and rechazados for today', async () => {
      const repo = buildRepoMock();
      repo.countActiveContracts.mockResolvedValue(12);
      repo.countByStatusUpdatedInRange
        .mockResolvedValueOnce(3) // firmados
        .mockResolvedValueOnce(1); // rechazados
      const service = new ReportsService(repo);

      const result = await service.getDailySummary();

      expect(result.pendientes).toBe(12);
      expect(result.firmados).toBe(3);
      expect(result.rechazados).toBe(1);
      expect(result.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(repo.countActiveContracts).toHaveBeenCalledWith([
        ContractStatus.SIGNED,
        ContractStatus.REJECTED,
        ContractStatus.CANCELLED,
      ]);
    });
  });

  describe('getBottlenecks', () => {
    it('returns etapas vacías y peor null cuando nada está vencido', async () => {
      const repo = buildRepoMock();
      repo.findActiveWorkflowsWithStage.mockResolvedValue([
        { stageId: 1, stageName: 'Revisión Administrativa', slaHours: 48, enteredAt: new Date() },
      ]);
      const service = new ReportsService(repo);

      const result = await service.getBottlenecks();

      expect(result).toEqual({ etapas: [], peor: null });
    });

    it('agrupa por etapa y ordena descendente por cantidad vencida', async () => {
      const repo = buildRepoMock();
      const longAgo = new Date(Date.now() - 100 * 60 * 60 * 1000); // 100h atrás
      repo.findActiveWorkflowsWithStage.mockResolvedValue([
        { stageId: 1, stageName: 'Revisión Administrativa', slaHours: 48, enteredAt: longAgo },
        { stageId: 2, stageName: 'Revisión Legal', slaHours: 24, enteredAt: longAgo },
        { stageId: 2, stageName: 'Revisión Legal', slaHours: 24, enteredAt: longAgo },
      ]);
      const service = new ReportsService(repo);

      const result = await service.getBottlenecks();

      expect(result.etapas).toEqual([
        { stageId: 2, stageName: 'Revisión Legal', cantidadVencidos: 2 },
        { stageId: 1, stageName: 'Revisión Administrativa', cantidadVencidos: 1 },
      ]);
      expect(result.peor).toEqual({
        stageId: 2,
        stageName: 'Revisión Legal',
        cantidadVencidos: 2,
      });
    });
  });
});
