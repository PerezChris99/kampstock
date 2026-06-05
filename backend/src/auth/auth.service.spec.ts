import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

// Mock bcryptjs to avoid slow real hashing in unit tests
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('$2a$12$hashedpassword'),
}));

import * as bcrypt from 'bcryptjs';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn().mockResolvedValue(null), // needed by persistLock
    update: jest.fn().mockResolvedValue({}),
  },
  accountLock: {
    create: jest.fn().mockResolvedValue({}),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
  },
};

const mockJwt = {
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
  verify: jest.fn(),
};

const mockConfig = {
  get: jest.fn((key: string) => {
    const map: Record<string, string> = {
      JWT_SECRET: 'test-secret-256-bit-key-for-unit-testing',
      JWT_REFRESH_SECRET: 'test-refresh-secret-256-bit-key',
      JWT_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
    };
    return map[key] ?? null;
  }),
};

const mockAudit = { log: jest.fn().mockResolvedValue({}) };

const activeUser = {
  id: 1,
  username: 'alice',
  name: 'Alice',
  passwordHash: '$2a$12$hashedpassword',
  isActive: true,
  tenantId: 1,
  isSuperAdmin: false,
  roleId: 1,
  role: { id: 1, name: 'Admin', permissions: JSON.stringify({ all: true }), tenantId: 1 },
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    // Clear in-memory attempt map between tests
    (service as any).attempts.clear();
    // Default: MAX_ATTEMPTS = 5 for testing
    (service as any).MAX_ATTEMPTS = 5;
  });

  // ─── login ─────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('should return accessToken, refreshToken, and user on valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(activeUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({ username: 'alice', password: 'Password1!' }, '127.0.0.1');

      expect(result.accessToken).toBe('mock.jwt.token');
      expect(result.refreshToken).toBe('mock.jwt.token');
      expect(result.user.username).toBe('alice');
      expect(result.user.id).toBe(1);
    });

    it('should NOT return passwordHash in the user object', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(activeUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({ username: 'alice', password: 'Password1!' }, '127.0.0.1');

      expect((result.user as any).passwordHash).toBeUndefined();
    });

    it('should return normalized role name and permissions in user object', async () => {
      // Test with legacy role name format Admin_1
      const legacyUser = { ...activeUser, role: { id: 1, name: 'Admin_1', permissions: JSON.stringify({ all: true }), tenantId: 1 } };
      mockPrisma.user.findUnique.mockResolvedValue(legacyUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({ username: 'alice', password: 'Password1!' }, '127.0.0.1');

      expect(result.user.role).toBe('Admin'); // normalized — no _1 suffix
      expect((result.user as any).permissions).toEqual({ all: true });
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(activeUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ username: 'alice', password: 'WrongPassword1' }, '127.0.0.1'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ username: 'nobody', password: 'Password1!' }, '127.0.0.1'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...activeUser, isActive: false });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.login({ username: 'alice', password: 'Password1!' }, '127.0.0.1'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user belongs to wrong tenant', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...activeUser, tenantId: 2 });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.login({ username: 'alice', password: 'Password1!' }, '127.0.0.1', 99),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should use a generic error message regardless of user existence (prevents enumeration)', async () => {
      // User not found
      mockPrisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      let err1: UnauthorizedException;
      try { await service.login({ username: 'nobody', password: 'pass' }, '127.0.0.1'); } catch (e) { err1 = e; }

      // Wrong password
      mockPrisma.user.findUnique.mockResolvedValue(activeUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      let err2: UnauthorizedException;
      try { await service.login({ username: 'alice', password: 'wrong' }, '127.0.0.1'); } catch (e) { err2 = e; }

      expect(err1!.message).toBe(err2!.message);
    });

    it('should clear lockout after successful login', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(activeUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Fail twice
      for (let i = 0; i < 2; i++) {
        await expect(service.login({ username: 'alice', password: 'wrong' }, '127.0.0.1')).rejects.toThrow();
      }

      // Succeed — should clear attempt counter
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      await expect(service.login({ username: 'alice', password: 'Password1!' }, '127.0.0.1')).resolves.toBeDefined();

      // Another failure should NOT be locked (counter reset)
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      const err = await service.login({ username: 'alice', password: 'wrong' }, '127.0.0.1').catch((e) => e);
      expect(err.message).toBe('Invalid credentials'); // not a lockout message
    });

    it('should lock account after MAX_ATTEMPTS consecutive failures', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(activeUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      for (let i = 0; i < 5; i++) {
        await expect(service.login({ username: 'alice', password: 'wrong' }, '127.0.0.1')).rejects.toThrow(UnauthorizedException);
      }

      // 6th attempt — should be locked, even with correct password
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      await expect(
        service.login({ username: 'alice', password: 'Password1!' }, '127.0.0.1'),
      ).rejects.toThrow(/temporarily limited|too many failed attempts/i);
    });
  });

  // ─── audit logging ─────────────────────────────────────────────────────────

  describe('audit logging', () => {
    it('should call audit.log with LOGIN_SUCCESS on valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(activeUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.login({ username: 'alice', password: 'Password1!' }, '10.0.0.1');
      await new Promise((r) => setTimeout(r, 10)); // flush fire-and-forget

      expect(mockAudit.log).toHaveBeenCalledWith(
        1,
        'LOGIN_SUCCESS',
        'User',
        1,
        null,
        expect.objectContaining({ ip: '10.0.0.1' }),
        '10.0.0.1',
        1,
      );
    });

    it('should call audit.log with LOGIN_FAIL on wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(activeUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await service.login({ username: 'alice', password: 'wrong' }, '10.0.0.2').catch(() => {});
      await new Promise((r) => setTimeout(r, 10));

      expect(mockAudit.log).toHaveBeenCalledWith(
        null,
        'LOGIN_FAIL',
        'User',
        null,
        null,
        expect.objectContaining({ username: 'alice', ip: '10.0.0.2' }),
        '10.0.0.2',
      );
    });

    it('should call audit.log with LOGIN_FAIL when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await service.login({ username: 'ghost', password: 'anything' }, '10.0.0.3').catch(() => {});
      await new Promise((r) => setTimeout(r, 10));

      expect(mockAudit.log).toHaveBeenCalledWith(
        null,
        'LOGIN_FAIL',
        'User',
        null,
        null,
        expect.objectContaining({ username: 'ghost' }),
        '10.0.0.3',
      );
    });
  });

  // ─── refresh ───────────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('should return new tokens for valid refresh token', async () => {
      mockJwt.verify.mockReturnValue({ sub: 1 });
      mockPrisma.user.findUnique.mockResolvedValue(activeUser);

      const result = await service.refresh('valid.refresh.token');
      expect(result.accessToken).toBeDefined();
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockJwt.verify.mockImplementation(() => { throw new Error('jwt expired'); });

      await expect(service.refresh('bad.token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is inactive on refresh', async () => {
      mockJwt.verify.mockReturnValue({ sub: 1 });
      mockPrisma.user.findUnique.mockResolvedValue({ ...activeUser, isActive: false });

      await expect(service.refresh('valid.token')).rejects.toThrow(UnauthorizedException);
    });
  });
});
