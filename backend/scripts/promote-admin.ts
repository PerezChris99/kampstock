import 'dotenv/config';
// @ts-ignore
import { PrismaPg } from '@prisma/adapter-pg';
// @ts-ignore
import { Pool } from 'pg';
// @ts-ignore
import { PrismaClient } from '../src/generated/client/client';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

(async () => {
  const user = await prisma.user.findFirst({
    where: { username: 'admin' },
  });
  if (!user) throw new Error('Admin user not found');
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { isSuperAdmin: true },
    select: { id: true, name: true, username: true, isSuperAdmin: true },
  });
  console.log('Promoted to super admin:', JSON.stringify(updated));
  await pool.end();
})();
