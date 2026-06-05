import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from '../auth/dto/auth.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(dto: CreateUserDto, actorId: number, tenantId: number) {
    const exists = await this.prisma.user.findUnique({
      where: { username_tenantId: { username: dto.username, tenantId } },
    });
    if (exists) throw new ConflictException('Username already taken');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        username: dto.username,
        passwordHash,
        phone: dto.phone,
        roleId: dto.roleId,
        tenantId,
      },
      include: { role: true },
    });
    await this.audit.log(actorId, 'CREATE', 'User', user.id, null, {
      name: user.name,
      username: user.username,
    });
    const { passwordHash: _, ...result } = user;
    return result;
  }

  async findAll(tenantId?: number, limit = 100, offset = 0) {
    const where = { ...(tenantId && { tenantId }) };
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          username: true,
          phone: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
          role: true,
        },
        orderBy: { name: 'asc' },
        take: Math.min(limit, 500),
        skip: offset,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data, total, limit, offset };
  }

  async findOne(id: number, tenantId?: number) {
    const user = await this.prisma.user.findFirst({
      where: { id, ...(tenantId && { tenantId }) },
      select: {
        id: true,
        name: true,
        username: true,
        phone: true,
        isActive: true,
        createdAt: true,
        role: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async toggleActive(id: number, actorId: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
    });
    await this.audit.log(
      actorId,
      'UPDATE',
      'User',
      id,
      { isActive: user.isActive },
      { isActive: updated.isActive },
    );
    return { id: updated.id, isActive: updated.isActive };
  }
}
