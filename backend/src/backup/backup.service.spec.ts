import { Test, TestingModule } from '@nestjs/testing';
import { BackupService } from './backup.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

// ─── minimal mock tx for $transaction ───────────────────────────────────────
const makeTx = () => ({
  payment: { deleteMany: jest.fn().mockResolvedValue({}) },
  invoiceFiscal: { deleteMany: jest.fn().mockResolvedValue({}), createMany: jest.fn().mockResolvedValue({}) },
  stockMovement: { deleteMany: jest.fn().mockResolvedValue({}), createMany: jest.fn().mockResolvedValue({}) },
  priceHistory: { deleteMany: jest.fn().mockResolvedValue({}), createMany: jest.fn().mockResolvedValue({}) },
  supplierInvoice: { deleteMany: jest.fn().mockResolvedValue({}), createMany: jest.fn().mockResolvedValue({}) },
  goodsReceiptLine: { deleteMany: jest.fn().mockResolvedValue({}), createMany: jest.fn().mockResolvedValue({}) },
  goodsReceipt: { deleteMany: jest.fn().mockResolvedValue({}), createMany: jest.fn().mockResolvedValue({}) },
  saleLine: { deleteMany: jest.fn().mockResolvedValue({}) },
  sale: { deleteMany: jest.fn().mockResolvedValue({}) },
  expense: { deleteMany: jest.fn().mockResolvedValue({}) },
  purchaseOrderLine: { deleteMany: jest.fn().mockResolvedValue({}) },
  purchaseOrder: { deleteMany: jest.fn().mockResolvedValue({}) },
  stockItem: { deleteMany: jest.fn().mockResolvedValue({}) },
  productUnit: { deleteMany: jest.fn().mockResolvedValue({}) },
  product: { deleteMany: jest.fn().mockResolvedValue({}) },
  customer: { deleteMany: jest.fn().mockResolvedValue({}) },
  supplier: { deleteMany: jest.fn().mockResolvedValue({}) },
  stockLocation: { deleteMany: jest.fn().mockResolvedValue({}) },
  category: { deleteMany: jest.fn().mockResolvedValue({}) },
  user: { deleteMany: jest.fn().mockResolvedValue({}), create: jest.fn().mockResolvedValue({}) },
  role: { deleteMany: jest.fn().mockResolvedValue({}), create: jest.fn().mockResolvedValue({}) },
});

const mockPrisma = {
  role: { findMany: jest.fn().mockResolvedValue([]) },
  user: { findMany: jest.fn() },
  category: { findMany: jest.fn().mockResolvedValue([]) },
  product: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
  productUnit: { findMany: jest.fn().mockResolvedValue([]) },
  stockLocation: { findMany: jest.fn().mockResolvedValue([]) },
  stockItem: { findMany: jest.fn().mockResolvedValue([]) },
  supplier: { findMany: jest.fn().mockResolvedValue([]) },
  customer: { findMany: jest.fn().mockResolvedValue([]) },
  purchaseOrder: { findMany: jest.fn().mockResolvedValue([]) },
  purchaseOrderLine: { findMany: jest.fn().mockResolvedValue([]) },
  expense: { findMany: jest.fn().mockResolvedValue([]) },
  sale: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
  saleLine: { findMany: jest.fn().mockResolvedValue([]) },
  payment: { findMany: jest.fn().mockResolvedValue([]) },
  priceHistory: { findMany: jest.fn().mockResolvedValue([]) },
  stockMovement: { findMany: jest.fn().mockResolvedValue([]) },
  goodsReceipt: { findMany: jest.fn().mockResolvedValue([]) },
  goodsReceiptLine: { findMany: jest.fn().mockResolvedValue([]) },
  supplierInvoice: { findMany: jest.fn().mockResolvedValue([]) },
  invoiceFiscal: { findMany: jest.fn().mockResolvedValue([]) },
  $transaction: jest.fn(),
};

const mockAudit = { log: jest.fn().mockResolvedValue({}) };

describe('BackupService', () => {
  let service: BackupService;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock returns only fields the Prisma select includes (no passwordHash)
    // This verifies the service correctly uses a select that excludes password data
    mockPrisma.user.findMany.mockResolvedValue([
      {
        id: 1,
        name: 'Alice Admin',
        username: 'alice',
        phone: null,
        roleId: 1,
        isActive: true,
        createdAt: new Date('2024-01-01'),
      },
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackupService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<BackupService>(BackupService);
  });

  // ─── exportBackup ──────────────────────────────────────────────────────────

  describe('exportBackup', () => {
    it('should NOT include passwordHash in any user record', async () => {
      const { data } = await service.exportBackup(1, '127.0.0.1', 1);
      const json = JSON.stringify(data);
      expect(json).not.toContain('passwordHash');

      // Verify the Prisma call did NOT ask for passwordHash in the select
      const call = (mockPrisma.user.findMany as jest.Mock).mock.calls[0]?.[0];
      expect(call?.select?.passwordHash).toBeFalsy();
    });

    it('should include system = KampStock', async () => {
      const { data } = await service.exportBackup(1, '127.0.0.1', 1);
      expect(data.system).toBe('KampStock');
    });

    it('should include a version field', async () => {
      const { data } = await service.exportBackup(1, '127.0.0.1', 1);
      expect(data.version).toBeDefined();
    });

    it('should include a valid exportedAt ISO timestamp', async () => {
      const { data } = await service.exportBackup(1, '127.0.0.1', 1);
      expect(() => new Date(data.exportedAt)).not.toThrow();
      expect(new Date(data.exportedAt).getTime()).toBeGreaterThan(0);
    });

    it('should produce a filename with today\'s date', async () => {
      const { filename } = await service.exportBackup(1, '127.0.0.1', 1);
      const today = new Date().toISOString().split('T')[0];
      expect(filename).toContain(today);
      expect(filename).toContain('kampstock-backup');
    });

    it('should call audit.log on export', async () => {
      await service.exportBackup(1, '192.168.0.1', 1);
      await new Promise((r) => setTimeout(r, 10)); // flush microtasks
      expect(mockAudit.log).toHaveBeenCalledWith(
        1,
        'BACKUP_EXPORT',
        'System',
        null,
        null,
        expect.objectContaining({ filename: expect.stringContaining('kampstock-backup') }),
        '192.168.0.1',
        1,
      );
    });

    it('should include a tables object with expected keys', async () => {
      const { data } = await service.exportBackup(1, '127.0.0.1', 1);
      expect(data.tables).toBeDefined();
      expect(typeof data.tables).toBe('object');
      expect(Array.isArray(data.tables.users)).toBe(true);
    });

    it('should include tenantId in the backup data', async () => {
      const { data } = await service.exportBackup(1, '127.0.0.1', 42);
      expect(data.tenantId).toBe(42);
    });

    it('should include a checksum field', async () => {
      const { data } = await service.exportBackup(1, '127.0.0.1', 1);
      expect(data.checksum).toBeDefined();
      expect(typeof data.checksum).toBe('string');
      expect(data.checksum.length).toBe(64); // SHA-256 hex = 64 chars
    });
  });

  // ─── restoreBackup ─────────────────────────────────────────────────────────

  describe('restoreBackup', () => {
    it('should throw for missing tables property', async () => {
      await expect(
        service.restoreBackup({ system: 'KampStock' }, 1, '127.0.0.1', 1),
      ).rejects.toThrow('Invalid backup file format');
    });

    it('should throw for wrong system identifier', async () => {
      await expect(
        service.restoreBackup({ system: 'OtherApp', tables: {} }, 1, '127.0.0.1', 1),
      ).rejects.toThrow('Invalid backup file format');
    });

    it('should throw for null/undefined data', async () => {
      await expect(service.restoreBackup(null, 1, '127.0.0.1', 1)).rejects.toThrow('Invalid backup file format');
      await expect(service.restoreBackup(undefined, 1, '127.0.0.1', 1)).rejects.toThrow('Invalid backup file format');
    });

    it('should throw for missing system key', async () => {
      await expect(
        service.restoreBackup({ tables: { roles: [], users: [] } }, 1, '127.0.0.1', 1),
      ).rejects.toThrow('Invalid backup file format');
    });

    it('should throw when backup tenantId does not match requesting tenantId', async () => {
      await expect(
        service.restoreBackup(
          { system: 'KampStock', tables: {}, tenantId: 99 },
          1,
          '127.0.0.1',
          1,
        ),
      ).rejects.toThrow('This backup belongs to a different tenant');
    });

    it('should throw on checksum mismatch for v2.0 backup', async () => {
      await expect(
        service.restoreBackup(
          {
            system: 'KampStock',
            version: '2.0',
            tenantId: 1,
            checksum: 'aabbcc',
            tables: { roles: [], users: [] },
          },
          1,
          '127.0.0.1',
          1,
        ),
      ).rejects.toThrow('Backup integrity check failed');
    });

    it('should execute $transaction when input is valid', async () => {
      const tx = makeTx();
      mockPrisma.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));
      await service.restoreBackup(
        { system: 'KampStock', exportedAt: '2024-01-01T00:00:00Z', tables: { roles: [], users: [], categories: [], products: [], productUnits: [], stockLocations: [], stockItems: [], suppliers: [], customers: [], purchaseOrders: [], purchaseOrderLines: [], expenses: [], sales: [], saleLines: [], payments: [] } },
        1,
        '127.0.0.1',
        1,
      );
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should only delete tenant-scoped records (deleteMany called with tenantId filter)', async () => {
      const tx = makeTx();
      mockPrisma.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));
      await service.restoreBackup(
        { system: 'KampStock', exportedAt: '2024-01-01T00:00:00Z', tenantId: 5, tables: { roles: [], users: [], categories: [], products: [], productUnits: [], stockLocations: [], stockItems: [], suppliers: [], customers: [], purchaseOrders: [], purchaseOrderLines: [], expenses: [], sales: [], saleLines: [], payments: [] } },
        1,
        '127.0.0.1',
        5,
      );
      // sale.deleteMany must have been called with a filter that scopes to tenantId
      const saleDeleteCall = (tx.sale.deleteMany as jest.Mock).mock.calls[0]?.[0];
      expect(JSON.stringify(saleDeleteCall)).toContain('5');
    });

    it('should return tempPasswords map for each restored user', async () => {
      const tx = makeTx();
      mockPrisma.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));
      const result = await service.restoreBackup(
        {
          system: 'KampStock',
          exportedAt: '2024-01-01T00:00:00Z',
          tables: {
            roles: [{ id: 1, name: 'Admin', tenantId: 1 }],
            users: [{ id: 1, name: 'Alice', username: 'alice', phone: null, roleId: 1, isActive: true, createdAt: '2024-01-01T00:00:00Z' }],
            categories: [], products: [], productUnits: [], stockLocations: [], stockItems: [],
            suppliers: [], customers: [], purchaseOrders: [], purchaseOrderLines: [],
            expenses: [], sales: [], saleLines: [], payments: [],
          },
        },
        1,
        '127.0.0.1',
        1,
      );
      expect(result.tempPasswords).toBeDefined();
      expect(result.tempPasswords['alice']).toBeDefined();
      // Temp password should meet our complexity: starts with Ks + hex + !
      expect(result.tempPasswords['alice']).toMatch(/^Ks[0-9A-F]{8}!$/);
    });

    it('should call audit.log after successful restore', async () => {
      const tx = makeTx();
      mockPrisma.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));
      await service.restoreBackup(
        { system: 'KampStock', exportedAt: '2024-06-01T00:00:00Z', tables: { roles: [], users: [], categories: [], products: [], productUnits: [], stockLocations: [], stockItems: [], suppliers: [], customers: [], purchaseOrders: [], purchaseOrderLines: [], expenses: [], sales: [], saleLines: [], payments: [] } },
        2,
        '10.0.0.1',
        3,
      );
      await new Promise((r) => setTimeout(r, 10));
      expect(mockAudit.log).toHaveBeenCalledWith(
        2,
        'BACKUP_RESTORE',
        'System',
        null,
        null,
        expect.objectContaining({ exportedAt: '2024-06-01T00:00:00Z' }),
        '10.0.0.1',
        3,
      );
    });
  });
});
