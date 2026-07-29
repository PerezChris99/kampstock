import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const mockPrisma = {
  supplier: { findFirst: jest.fn() },
  product: { count: jest.fn() },
  purchaseOrder: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
};

const mockAudit = { log: jest.fn().mockResolvedValue({}) };

describe('PurchaseOrdersService', () => {
  let service: PurchaseOrdersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseOrdersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();
    service = module.get(PurchaseOrdersService);
  });

  describe('create', () => {
    const dto = {
      supplierId: 1,
      lines: [
        { productId: 10, quantity: 5, unitPrice: 1000, discount: 500 },
        { productId: 11, quantity: 2, unitPrice: 250 },
      ],
    };

    beforeEach(() => {
      mockPrisma.supplier.findFirst.mockResolvedValue({ id: 1 });
      mockPrisma.product.count.mockResolvedValue(2);
      mockPrisma.purchaseOrder.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 99, ...data }),
      );
    });

    it('calculates lineTotal and grandTotal server-side', async () => {
      await service.create(dto as any, 1, 1);
      const createArgs = mockPrisma.purchaseOrder.create.mock.calls[0][0];
      const lines = createArgs.data.lines.create;
      // 5 * 1000 - 500 = 4500 ; 2 * 250 - 0 = 500
      expect(lines[0].lineTotal).toBe(4500);
      expect(lines[1].lineTotal).toBe(500);
      expect(createArgs.data.grandTotal).toBe(5000);
    });

    it('rejects discount exceeding line amount', async () => {
      const bad = {
        ...dto,
        lines: [{ productId: 10, quantity: 1, unitPrice: 100, discount: 200 }],
      };
      await expect(service.create(bad as any, 1, 1)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrisma.purchaseOrder.create).not.toHaveBeenCalled();
    });

    it('rejects supplier not in tenant', async () => {
      mockPrisma.supplier.findFirst.mockResolvedValue(null);
      await expect(service.create(dto as any, 1, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects products not in tenant', async () => {
      mockPrisma.product.count.mockResolvedValue(1); // only 1 of 2 found
      await expect(service.create(dto as any, 1, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('writes an audit log entry', async () => {
      await service.create(dto as any, 7, 3);
      expect(mockAudit.log).toHaveBeenCalledWith(
        7,
        'PO_CREATE',
        'PurchaseOrder',
        99,
        null,
        expect.objectContaining({ grandTotal: 5000 }),
        undefined,
        3,
      );
    });
  });

  describe('findOne', () => {
    it('scopes lookup by tenantId', async () => {
      mockPrisma.purchaseOrder.findFirst.mockResolvedValue({ id: 5 });
      await service.findOne(5, 2);
      expect(mockPrisma.purchaseOrder.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 5, tenantId: 2 }),
        }),
      );
    });

    it('throws NotFound when missing', async () => {
      mockPrisma.purchaseOrder.findFirst.mockResolvedValue(null);
      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    const poBase = { id: 1, tenantId: 1, status: 'DRAFT' };

    beforeEach(() => {
      mockPrisma.purchaseOrder.update.mockImplementation(({ data }: any) =>
        Promise.resolve({ ...poBase, ...data }),
      );
    });

    it('allows DRAFT → SENT', async () => {
      mockPrisma.purchaseOrder.findFirst.mockResolvedValue({ ...poBase });
      const result = await service.updateStatus(
        1,
        { status: 'SENT' } as any,
        1,
        1,
      );
      expect(result.status).toBe('SENT');
    });

    it('allows SENT → CANCELLED', async () => {
      mockPrisma.purchaseOrder.findFirst.mockResolvedValue({
        ...poBase,
        status: 'SENT',
      });
      const result = await service.updateStatus(
        1,
        { status: 'CANCELLED' } as any,
        1,
        1,
      );
      expect(result.status).toBe('CANCELLED');
    });

    it('rejects DRAFT → RECEIVED (must be SENT first)', async () => {
      mockPrisma.purchaseOrder.findFirst.mockResolvedValue({ ...poBase });
      await expect(
        service.updateStatus(1, { status: 'RECEIVED' } as any, 1, 1),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.purchaseOrder.update).not.toHaveBeenCalled();
    });

    it('rejects transitions out of terminal states', async () => {
      mockPrisma.purchaseOrder.findFirst.mockResolvedValue({
        ...poBase,
        status: 'CANCELLED',
      });
      await expect(
        service.updateStatus(1, { status: 'SENT' } as any, 1, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('is a no-op when status is unchanged', async () => {
      mockPrisma.purchaseOrder.findFirst.mockResolvedValue({ ...poBase });
      const result = await service.updateStatus(
        1,
        { status: 'DRAFT' } as any,
        1,
        1,
      );
      expect(result.status).toBe('DRAFT');
      expect(mockPrisma.purchaseOrder.update).not.toHaveBeenCalled();
    });

    it('audits the status change', async () => {
      mockPrisma.purchaseOrder.findFirst.mockResolvedValue({ ...poBase });
      await service.updateStatus(1, { status: 'SENT' } as any, 4, 1);
      expect(mockAudit.log).toHaveBeenCalledWith(
        4,
        'PO_STATUS_CHANGE',
        'PurchaseOrder',
        1,
        { status: 'DRAFT' },
        { status: 'SENT' },
        undefined,
        1,
      );
    });
  });
});
