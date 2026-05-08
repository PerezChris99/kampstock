import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding KampStock database...');

  // Roles
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { name: 'Admin' },
      update: {},
      create: { name: 'Admin', permissions: JSON.stringify({ all: true }) },
    }),
    prisma.role.upsert({
      where: { name: 'Manager' },
      update: {},
      create: { name: 'Manager', permissions: JSON.stringify({ manage_products: true, manage_sales: true, view_reports: true }) },
    }),
    prisma.role.upsert({
      where: { name: 'Cashier' },
      update: {},
      create: { name: 'Cashier', permissions: JSON.stringify({ create_sales: true }) },
    }),
    prisma.role.upsert({
      where: { name: 'Storekeeper' },
      update: {},
      create: { name: 'Storekeeper', permissions: JSON.stringify({ manage_stock: true }) },
    }),
  ]);

  const adminRole = roles[0];

  // Admin user
  const passwordHash = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      name: 'System Admin',
      username: 'admin',
      passwordHash,
      roleId: adminRole.id,
    },
  });
  console.log('Admin user created:', admin.username);

  // Default stock location
  const mainLocation = await prisma.stockLocation.upsert({
    where: { name: 'Main Store' },
    update: {},
    create: { name: 'Main Store', description: 'Main stock location' },
  });

  await prisma.stockLocation.upsert({
    where: { name: 'Front Counter' },
    update: {},
    create: { name: 'Front Counter', description: 'POS counter stock' },
  });

  // Sample categories
  const categories = await Promise.all([
    prisma.category.upsert({ where: { name: 'Food Staples' }, update: {}, create: { name: 'Food Staples' } }),
    prisma.category.upsert({ where: { name: 'Drinks & Snacks' }, update: {}, create: { name: 'Drinks & Snacks' } }),
    prisma.category.upsert({ where: { name: 'Household Items' }, update: {}, create: { name: 'Household Items' } }),
    prisma.category.upsert({ where: { name: 'Personal Care' }, update: {}, create: { name: 'Personal Care' } }),
    prisma.category.upsert({ where: { name: 'Electronics & Accessories' }, update: {}, create: { name: 'Electronics & Accessories' } }),
    prisma.category.upsert({ where: { name: 'Stationery' }, update: {}, create: { name: 'Stationery' } }),
    prisma.category.upsert({ where: { name: 'Airtime & Mobile' }, update: {}, create: { name: 'Airtime & Mobile' } }),
  ]);

  console.log('Categories created:', categories.length);

  // Sample products
  const sampleProducts = [
    { name: 'Sugar (1kg)', sku: 'SUG-001', categoryId: categories[0].id, units: [{ unitName: 'Kg', conversionFactor: 1, buyingPrice: 3500, sellingPriceRetail: 4000, sellingPriceWholesale: 3700, minWholesaleQty: 10 }, { unitName: 'Bag 50kg', conversionFactor: 50, buyingPrice: 160000, sellingPriceRetail: 175000, sellingPriceWholesale: 168000, minWholesaleQty: 2 }] },
    { name: 'Cooking Oil (1L)', sku: 'OIL-001', categoryId: categories[0].id, units: [{ unitName: 'Bottle', conversionFactor: 1, buyingPrice: 6500, sellingPriceRetail: 7500, sellingPriceWholesale: 7000, minWholesaleQty: 12 }] },
    { name: 'Maize Flour (2kg)', sku: 'FLR-001', categoryId: categories[0].id, units: [{ unitName: 'Packet', conversionFactor: 1, buyingPrice: 5000, sellingPriceRetail: 6000, sellingPriceWholesale: 5500, minWholesaleQty: 10 }] },
    { name: 'Coca-Cola (300ml)', sku: 'CCL-001', categoryId: categories[1].id, units: [{ unitName: 'Bottle', conversionFactor: 1, buyingPrice: 1200, sellingPriceRetail: 1500, sellingPriceWholesale: 1300, minWholesaleQty: 24 }, { unitName: 'Crate 24', conversionFactor: 24, buyingPrice: 28000, sellingPriceRetail: 32000, sellingPriceWholesale: 30000, minWholesaleQty: 1 }] },
    { name: 'Bar Soap (800g)', sku: 'SOP-001', categoryId: categories[2].id, units: [{ unitName: 'Bar', conversionFactor: 1, buyingPrice: 3000, sellingPriceRetail: 3500, sellingPriceWholesale: 3200, minWholesaleQty: 20 }] },
    { name: 'Detergent (500g)', sku: 'DET-001', categoryId: categories[2].id, units: [{ unitName: 'Pack', conversionFactor: 1, buyingPrice: 2500, sellingPriceRetail: 3000, sellingPriceWholesale: 2700, minWholesaleQty: 12 }] },
  ];

  for (const p of sampleProducts) {
    const { units, ...productData } = p;
    const existing = await prisma.product.findUnique({ where: { sku: p.sku } });
    if (!existing) {
      const product = await prisma.product.create({
        data: { ...productData, units: { create: units } },
      });
      // Add initial stock
      await prisma.stockItem.create({
        data: { productId: product.id, locationId: mainLocation.id, quantityOnHand: 50, lastCostPrice: units[0].buyingPrice },
      });
    }
  }

  console.log('Sample products seeded');
  console.log('✅ KampStock seed complete');
  console.log('  Login: username=admin, password=admin123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
