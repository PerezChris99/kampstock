import { PrismaClient } from '../src/generated/client/client';
import * as bcrypt from 'bcryptjs';

const dbUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';
let prisma: PrismaClient;

if (dbUrl.startsWith('file:')) {
  // SQLite adapter for local development
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
  const adapter = new PrismaBetterSqlite3({ url: dbUrl });
  prisma = new PrismaClient({ adapter } as any);
} else {
  // PostgreSQL via pg pool adapter (Prisma 7 requires explicit adapter for pg)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaPg } = require('@prisma/adapter-pg');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: dbUrl });
  prisma = new PrismaClient({ adapter: new PrismaPg(pool) } as any);
}

// Cosmetics & Beauty shop product catalog (suitable for a Kampala cosmetics shop)
const PRODUCT_CATALOG = [
  // --- FACE CARE ---
  {
    name: 'Nivea Face Cream (50ml)',
    sku: 'FC-001',
    cat: 'Face Care',
    brand: 'Nivea',
    buying: 8000,
    retail: 12000,
    wholesale: 10500,
    minWQty: 6,
    stock: 80,
    reorder: 20,
    unit: 'Jar',
  },
  {
    name: 'Clean & Clear Face Wash (100ml)',
    sku: 'FC-002',
    cat: 'Face Care',
    brand: 'Clean & Clear',
    buying: 9500,
    retail: 14000,
    wholesale: 12500,
    minWQty: 6,
    stock: 60,
    reorder: 15,
    unit: 'Bottle',
  },
  {
    name: 'Garnier Micellar Water (400ml)',
    sku: 'FC-003',
    cat: 'Face Care',
    brand: 'Garnier',
    buying: 18000,
    retail: 26000,
    wholesale: 23000,
    minWQty: 3,
    stock: 40,
    reorder: 10,
    unit: 'Bottle',
  },
  {
    name: 'Neutrogena Sunscreen SPF50 (88ml)',
    sku: 'FC-004',
    cat: 'Face Care',
    brand: 'Neutrogena',
    buying: 22000,
    retail: 34000,
    wholesale: 30000,
    minWQty: 3,
    stock: 30,
    reorder: 8,
    unit: 'Bottle',
  },
  {
    name: 'Olay Total Effects Moisturiser (50ml)',
    sku: 'FC-005',
    cat: 'Face Care',
    brand: 'Olay',
    buying: 25000,
    retail: 40000,
    wholesale: 35000,
    minWQty: 3,
    stock: 25,
    reorder: 6,
    unit: 'Jar',
  },
  {
    name: 'Vaseline Lip Therapy Original (20g)',
    sku: 'FC-006',
    cat: 'Face Care',
    brand: 'Vaseline',
    buying: 3500,
    retail: 5500,
    wholesale: 4800,
    minWQty: 12,
    stock: 120,
    reorder: 30,
    unit: 'Tin',
  },
  {
    name: 'Noxzema Classic Cream (200ml)',
    sku: 'FC-007',
    cat: 'Face Care',
    brand: 'Noxzema',
    buying: 7000,
    retail: 11000,
    wholesale: 9500,
    minWQty: 6,
    stock: 50,
    reorder: 12,
    unit: 'Jar',
  },
  {
    name: 'Simple Micellar Gel Wash (150ml)',
    sku: 'FC-008',
    cat: 'Face Care',
    brand: 'Simple',
    buying: 16000,
    retail: 24000,
    wholesale: 21000,
    minWQty: 3,
    stock: 35,
    reorder: 8,
    unit: 'Bottle',
  },
  {
    name: "Pond's Brightening Cream (50g)",
    sku: 'FC-009',
    cat: 'Face Care',
    brand: "Pond's",
    buying: 9000,
    retail: 14000,
    wholesale: 12500,
    minWQty: 6,
    stock: 70,
    reorder: 18,
    unit: 'Jar',
  },
  {
    name: 'Fair & White Exfoliating Gel (200ml)',
    sku: 'FC-010',
    cat: 'Face Care',
    brand: 'Fair & White',
    buying: 12000,
    retail: 19000,
    wholesale: 16500,
    minWQty: 3,
    stock: 45,
    reorder: 10,
    unit: 'Tube',
  },

  // --- HAIR CARE ---
  {
    name: 'Sunsilk Shampoo Black Shine (375ml)',
    sku: 'HC-001',
    cat: 'Hair Care',
    brand: 'Sunsilk',
    buying: 9000,
    retail: 13500,
    wholesale: 12000,
    minWQty: 6,
    stock: 90,
    reorder: 20,
    unit: 'Bottle',
  },
  {
    name: 'Pantene Conditioner Smooth (375ml)',
    sku: 'HC-002',
    cat: 'Hair Care',
    brand: 'Pantene',
    buying: 10000,
    retail: 15500,
    wholesale: 13500,
    minWQty: 6,
    stock: 70,
    reorder: 18,
    unit: 'Bottle',
  },
  {
    name: 'Dove Shampoo Damage Therapy (400ml)',
    sku: 'HC-003',
    cat: 'Hair Care',
    brand: 'Dove',
    buying: 11000,
    retail: 17000,
    wholesale: 15000,
    minWQty: 6,
    stock: 65,
    reorder: 15,
    unit: 'Bottle',
  },
  {
    name: 'Dark & Lovely Hair Relaxer Kit',
    sku: 'HC-004',
    cat: 'Hair Care',
    brand: 'Dark & Lovely',
    buying: 18000,
    retail: 29000,
    wholesale: 25000,
    minWQty: 3,
    stock: 40,
    reorder: 10,
    unit: 'Kit',
  },
  {
    name: 'African Pride Olive Oil Moisturiser (250ml)',
    sku: 'HC-005',
    cat: 'Hair Care',
    brand: 'African Pride',
    buying: 12000,
    retail: 19000,
    wholesale: 16500,
    minWQty: 3,
    stock: 35,
    reorder: 8,
    unit: 'Bottle',
  },
  {
    name: 'Head & Shoulders 2-in-1 (200ml)',
    sku: 'HC-006',
    cat: 'Hair Care',
    brand: 'Head & Shoulders',
    buying: 10500,
    retail: 16000,
    wholesale: 14000,
    minWQty: 6,
    stock: 55,
    reorder: 15,
    unit: 'Bottle',
  },
  {
    name: 'Jamaican Black Castor Oil (100ml)',
    sku: 'HC-007',
    cat: 'Hair Care',
    brand: 'Jamaican Mango',
    buying: 15000,
    retail: 24000,
    wholesale: 21000,
    minWQty: 3,
    stock: 30,
    reorder: 8,
    unit: 'Bottle',
  },
  {
    name: 'Coconut Oil Pure (200g)',
    sku: 'HC-008',
    cat: 'Hair Care',
    brand: 'Viva',
    buying: 8000,
    retail: 13000,
    wholesale: 11000,
    minWQty: 6,
    stock: 60,
    reorder: 15,
    unit: 'Jar',
  },
  {
    name: 'Garnier Fructis Shampoo (400ml)',
    sku: 'HC-009',
    cat: 'Hair Care',
    brand: 'Garnier',
    buying: 13000,
    retail: 20000,
    wholesale: 17500,
    minWQty: 6,
    stock: 50,
    reorder: 12,
    unit: 'Bottle',
  },
  {
    name: 'ORS Olive Oil Hair Lotion (251ml)',
    sku: 'HC-010',
    cat: 'Hair Care',
    brand: 'ORS',
    buying: 11000,
    retail: 17500,
    wholesale: 15500,
    minWQty: 6,
    stock: 45,
    reorder: 10,
    unit: 'Bottle',
  },

  // --- BODY CARE ---
  {
    name: 'Vaseline Intensive Care Lotion (400ml)',
    sku: 'BC-001',
    cat: 'Body Care',
    brand: 'Vaseline',
    buying: 9000,
    retail: 14000,
    wholesale: 12500,
    minWQty: 6,
    stock: 100,
    reorder: 25,
    unit: 'Bottle',
  },
  {
    name: "Palmer's Cocoa Butter Lotion (400ml)",
    sku: 'BC-002',
    cat: 'Body Care',
    brand: "Palmer's",
    buying: 12000,
    retail: 19000,
    wholesale: 16500,
    minWQty: 6,
    stock: 70,
    reorder: 18,
    unit: 'Bottle',
  },
  {
    name: 'Dove Body Lotion Deeply Nourishing (400ml)',
    sku: 'BC-003',
    cat: 'Body Care',
    brand: 'Dove',
    buying: 13000,
    retail: 20500,
    wholesale: 18000,
    minWQty: 6,
    stock: 60,
    reorder: 15,
    unit: 'Bottle',
  },
  {
    name: 'Nivea Body Lotion Q10 (250ml)',
    sku: 'BC-004',
    cat: 'Body Care',
    brand: 'Nivea',
    buying: 11000,
    retail: 17000,
    wholesale: 15000,
    minWQty: 6,
    stock: 55,
    reorder: 12,
    unit: 'Bottle',
  },
  {
    name: 'Dove Body Wash (250ml)',
    sku: 'BC-005',
    cat: 'Body Care',
    brand: 'Dove',
    buying: 10000,
    retail: 15500,
    wholesale: 13500,
    minWQty: 6,
    stock: 65,
    reorder: 15,
    unit: 'Bottle',
  },
  {
    name: 'Lux Body Wash (250ml)',
    sku: 'BC-006',
    cat: 'Body Care',
    brand: 'Lux',
    buying: 8500,
    retail: 13500,
    wholesale: 11800,
    minWQty: 6,
    stock: 80,
    reorder: 20,
    unit: 'Bottle',
  },
  {
    name: 'Jergens Original Scent Lotion (250ml)',
    sku: 'BC-007',
    cat: 'Body Care',
    brand: 'Jergens',
    buying: 10500,
    retail: 16500,
    wholesale: 14500,
    minWQty: 6,
    stock: 45,
    reorder: 12,
    unit: 'Bottle',
  },
  {
    name: 'Caress Body Wash (400ml)',
    sku: 'BC-008',
    cat: 'Body Care',
    brand: 'Caress',
    buying: 12000,
    retail: 19000,
    wholesale: 16500,
    minWQty: 6,
    stock: 40,
    reorder: 10,
    unit: 'Bottle',
  },
  {
    name: 'Lifebuoy Bar Soap (100g)',
    sku: 'BC-009',
    cat: 'Body Care',
    brand: 'Lifebuoy',
    buying: 1500,
    retail: 2500,
    wholesale: 2200,
    minWQty: 24,
    stock: 200,
    reorder: 50,
    unit: 'Bar',
  },
  {
    name: 'Dove Beauty Bar Soap (100g)',
    sku: 'BC-010',
    cat: 'Body Care',
    brand: 'Dove',
    buying: 2500,
    retail: 4000,
    wholesale: 3500,
    minWQty: 12,
    stock: 150,
    reorder: 36,
    unit: 'Bar',
  },

  // --- MAKEUP ---
  {
    name: 'Revlon ColorStay Lipstick',
    sku: 'MK-001',
    cat: 'Makeup',
    brand: 'Revlon',
    buying: 15000,
    retail: 26000,
    wholesale: 23000,
    minWQty: 3,
    stock: 50,
    reorder: 12,
    unit: 'Piece',
  },
  {
    name: 'Maybelline Fit Me Foundation',
    sku: 'MK-002',
    cat: 'Makeup',
    brand: 'Maybelline',
    buying: 20000,
    retail: 34000,
    wholesale: 29000,
    minWQty: 3,
    stock: 40,
    reorder: 10,
    unit: 'Bottle',
  },
  {
    name: 'Maybelline Lash Sensational Mascara',
    sku: 'MK-003',
    cat: 'Makeup',
    brand: 'Maybelline',
    buying: 18000,
    retail: 30000,
    wholesale: 26000,
    minWQty: 3,
    stock: 35,
    reorder: 8,
    unit: 'Piece',
  },
  {
    name: 'NYX Slim Lip Liner',
    sku: 'MK-004',
    cat: 'Makeup',
    brand: 'NYX',
    buying: 12000,
    retail: 21000,
    wholesale: 18500,
    minWQty: 3,
    stock: 45,
    reorder: 10,
    unit: 'Piece',
  },
  {
    name: 'Revlon Eye Shadow Quad Palette',
    sku: 'MK-005',
    cat: 'Makeup',
    brand: 'Revlon',
    buying: 22000,
    retail: 37000,
    wholesale: 32000,
    minWQty: 2,
    stock: 25,
    reorder: 6,
    unit: 'Palette',
  },
  {
    name: 'L.A. Girl Pro Conceal',
    sku: 'MK-006',
    cat: 'Makeup',
    brand: 'L.A. Girl',
    buying: 14000,
    retail: 23000,
    wholesale: 20000,
    minWQty: 3,
    stock: 40,
    reorder: 10,
    unit: 'Piece',
  },
  {
    name: 'Black Opal True Color Foundation',
    sku: 'MK-007',
    cat: 'Makeup',
    brand: 'Black Opal',
    buying: 18000,
    retail: 30000,
    wholesale: 26000,
    minWQty: 3,
    stock: 30,
    reorder: 8,
    unit: 'Bottle',
  },
  {
    name: 'Wet n Wild Eyebrow Kit',
    sku: 'MK-008',
    cat: 'Makeup',
    brand: 'Wet n Wild',
    buying: 10000,
    retail: 17000,
    wholesale: 15000,
    minWQty: 3,
    stock: 35,
    reorder: 8,
    unit: 'Kit',
  },
  {
    name: 'NYX Soft Matte Lip Cream',
    sku: 'MK-009',
    cat: 'Makeup',
    brand: 'NYX',
    buying: 14000,
    retail: 24000,
    wholesale: 21000,
    minWQty: 3,
    stock: 55,
    reorder: 12,
    unit: 'Piece',
  },
  {
    name: 'Maybelline Baby Lips Lip Balm',
    sku: 'MK-010',
    cat: 'Makeup',
    brand: 'Maybelline',
    buying: 8000,
    retail: 13500,
    wholesale: 12000,
    minWQty: 6,
    stock: 80,
    reorder: 20,
    unit: 'Piece',
  },

  // --- FRAGRANCES ---
  {
    name: 'Axe Dark Temptation Body Spray (150ml)',
    sku: 'FR-001',
    cat: 'Fragrances',
    brand: 'Axe',
    buying: 9000,
    retail: 14500,
    wholesale: 12800,
    minWQty: 6,
    stock: 80,
    reorder: 20,
    unit: 'Can',
  },
  {
    name: 'Rexona Men Body Spray (150ml)',
    sku: 'FR-002',
    cat: 'Fragrances',
    brand: 'Rexona',
    buying: 8500,
    retail: 13500,
    wholesale: 12000,
    minWQty: 6,
    stock: 90,
    reorder: 22,
    unit: 'Can',
  },
  {
    name: 'Dove Women Deodorant Roll-On (40ml)',
    sku: 'FR-003',
    cat: 'Fragrances',
    brand: 'Dove',
    buying: 7000,
    retail: 11500,
    wholesale: 10000,
    minWQty: 6,
    stock: 70,
    reorder: 18,
    unit: 'Bottle',
  },
  {
    name: 'Zara Night Pour Homme EDT (100ml)',
    sku: 'FR-004',
    cat: 'Fragrances',
    brand: 'Zara',
    buying: 45000,
    retail: 80000,
    wholesale: 70000,
    minWQty: 1,
    stock: 15,
    reorder: 4,
    unit: 'Bottle',
  },
  {
    name: 'Zara Femme Eau de Parfum (100ml)',
    sku: 'FR-005',
    cat: 'Fragrances',
    brand: 'Zara',
    buying: 45000,
    retail: 80000,
    wholesale: 70000,
    minWQty: 1,
    stock: 12,
    reorder: 4,
    unit: 'Bottle',
  },
  {
    name: 'Avon Attraction Perfume (50ml)',
    sku: 'FR-006',
    cat: 'Fragrances',
    brand: 'Avon',
    buying: 28000,
    retail: 47000,
    wholesale: 41000,
    minWQty: 2,
    stock: 20,
    reorder: 5,
    unit: 'Bottle',
  },
  {
    name: 'Sure Anti-Perspirant Spray (150ml)',
    sku: 'FR-007',
    cat: 'Fragrances',
    brand: 'Sure',
    buying: 8000,
    retail: 13000,
    wholesale: 11500,
    minWQty: 6,
    stock: 60,
    reorder: 15,
    unit: 'Can',
  },
  {
    name: "Victoria's Secret Body Mist (250ml)",
    sku: 'FR-008',
    cat: 'Fragrances',
    brand: "Victoria's Secret",
    buying: 32000,
    retail: 55000,
    wholesale: 48000,
    minWQty: 2,
    stock: 18,
    reorder: 5,
    unit: 'Bottle',
  },

  // --- NAIL CARE ---
  {
    name: 'OPI Nail Lacquer (15ml)',
    sku: 'NC-001',
    cat: 'Nail Care',
    brand: 'OPI',
    buying: 8000,
    retail: 15000,
    wholesale: 13000,
    minWQty: 3,
    stock: 60,
    reorder: 15,
    unit: 'Bottle',
  },
  {
    name: 'Revlon ColorStay Nail Polish (14.7ml)',
    sku: 'NC-002',
    cat: 'Nail Care',
    brand: 'Revlon',
    buying: 6000,
    retail: 11000,
    wholesale: 9500,
    minWQty: 6,
    stock: 80,
    reorder: 20,
    unit: 'Bottle',
  },
  {
    name: 'Acetone Nail Polish Remover (100ml)',
    sku: 'NC-003',
    cat: 'Nail Care',
    brand: 'Elegant Touch',
    buying: 4000,
    retail: 7000,
    wholesale: 6200,
    minWQty: 6,
    stock: 70,
    reorder: 18,
    unit: 'Bottle',
  },
  {
    name: 'Emery Board Nail Files (Pack 10)',
    sku: 'NC-004',
    cat: 'Nail Care',
    brand: 'Generic',
    buying: 2000,
    retail: 3800,
    wholesale: 3200,
    minWQty: 10,
    stock: 100,
    reorder: 25,
    unit: 'Pack',
  },
  {
    name: 'Sally Hansen Cuticle Oil (14ml)',
    sku: 'NC-005',
    cat: 'Nail Care',
    brand: 'Sally Hansen',
    buying: 5000,
    retail: 9000,
    wholesale: 7800,
    minWQty: 6,
    stock: 50,
    reorder: 12,
    unit: 'Bottle',
  },
  {
    name: 'Nailene Nail Glue (3g)',
    sku: 'NC-006',
    cat: 'Nail Care',
    brand: 'Nailene',
    buying: 3000,
    retail: 6000,
    wholesale: 5200,
    minWQty: 6,
    stock: 60,
    reorder: 15,
    unit: 'Tube',
  },
  {
    name: 'Essence Nail Polish (8ml)',
    sku: 'NC-007',
    cat: 'Nail Care',
    brand: 'Essence',
    buying: 4500,
    retail: 8000,
    wholesale: 7000,
    minWQty: 6,
    stock: 90,
    reorder: 20,
    unit: 'Bottle',
  },

  // --- BABY CARE ---
  {
    name: "Johnson's Baby Powder (500g)",
    sku: 'BB-001',
    cat: 'Baby Care',
    brand: "Johnson's",
    buying: 8000,
    retail: 13000,
    wholesale: 11500,
    minWQty: 6,
    stock: 50,
    reorder: 12,
    unit: 'Bottle',
  },
  {
    name: "Johnson's Baby Lotion (400ml)",
    sku: 'BB-002',
    cat: 'Baby Care',
    brand: "Johnson's",
    buying: 9000,
    retail: 14500,
    wholesale: 13000,
    minWQty: 6,
    stock: 45,
    reorder: 10,
    unit: 'Bottle',
  },
  {
    name: "Johnson's Baby Oil (300ml)",
    sku: 'BB-003',
    cat: 'Baby Care',
    brand: "Johnson's",
    buying: 8500,
    retail: 13500,
    wholesale: 12000,
    minWQty: 6,
    stock: 40,
    reorder: 10,
    unit: 'Bottle',
  },
  {
    name: 'Huggies Baby Wipes (72pcs)',
    sku: 'BB-004',
    cat: 'Baby Care',
    brand: 'Huggies',
    buying: 10000,
    retail: 15500,
    wholesale: 13800,
    minWQty: 6,
    stock: 60,
    reorder: 15,
    unit: 'Pack',
  },
  {
    name: 'Baby Dove Rich Moisture Body Wash (200ml)',
    sku: 'BB-005',
    cat: 'Baby Care',
    brand: 'Dove',
    buying: 9500,
    retail: 15000,
    wholesale: 13200,
    minWQty: 6,
    stock: 35,
    reorder: 8,
    unit: 'Bottle',
  },

  // --- ACCESSORIES ---
  {
    name: 'Elastic Hair Ties (Pack 20)',
    sku: 'AC-001',
    cat: 'Accessories',
    brand: 'Generic',
    buying: 1500,
    retail: 3000,
    wholesale: 2600,
    minWQty: 20,
    stock: 150,
    reorder: 40,
    unit: 'Pack',
  },
  {
    name: 'Paddle Hair Brush',
    sku: 'AC-002',
    cat: 'Accessories',
    brand: 'Tangle Teezer',
    buying: 8000,
    retail: 15000,
    wholesale: 13000,
    minWQty: 3,
    stock: 30,
    reorder: 8,
    unit: 'Piece',
  },
  {
    name: 'Bobby Pins Assorted (Pack 100)',
    sku: 'AC-003',
    cat: 'Accessories',
    brand: 'Generic',
    buying: 2000,
    retail: 4000,
    wholesale: 3400,
    minWQty: 12,
    stock: 100,
    reorder: 25,
    unit: 'Pack',
  },
  {
    name: 'Makeup Brush Set (7 pieces)',
    sku: 'AC-004',
    cat: 'Accessories',
    brand: 'BS-MALL',
    buying: 12000,
    retail: 22000,
    wholesale: 19000,
    minWQty: 3,
    stock: 25,
    reorder: 6,
    unit: 'Set',
  },
  {
    name: 'Cotton Pads Round (100 pieces)',
    sku: 'AC-005',
    cat: 'Accessories',
    brand: 'Swisspers',
    buying: 4000,
    retail: 7000,
    wholesale: 6200,
    minWQty: 6,
    stock: 80,
    reorder: 20,
    unit: 'Pack',
  },
  {
    name: 'Revlon Tweezers Stainless Steel',
    sku: 'AC-006',
    cat: 'Accessories',
    brand: 'Revlon',
    buying: 5000,
    retail: 9500,
    wholesale: 8200,
    minWQty: 6,
    stock: 40,
    reorder: 10,
    unit: 'Piece',
  },
  {
    name: 'Vanity Mirror Double-Sided',
    sku: 'AC-007',
    cat: 'Accessories',
    brand: 'Generic',
    buying: 8000,
    retail: 15000,
    wholesale: 13000,
    minWQty: 3,
    stock: 20,
    reorder: 5,
    unit: 'Piece',
  },
  {
    name: 'Eyelash Curler',
    sku: 'AC-008',
    cat: 'Accessories',
    brand: 'Shiseido',
    buying: 6000,
    retail: 11000,
    wholesale: 9500,
    minWQty: 3,
    stock: 30,
    reorder: 8,
    unit: 'Piece',
  },
];

// Cosmetics-focused suppliers for a Kampala beauty shop
const SUPPLIERS = [
  {
    name: 'BeautyPro Distributors Uganda',
    contact: 'Alice Namaganda',
    phone: '0701-234567',
    email: 'orders@beautypro.co.ug',
    address: 'Nakawa Industrial Area, Kampala',
  },
  {
    name: 'Unilever East Africa Ltd',
    contact: 'Sarah Mutesi',
    phone: '0772-456789',
    email: 'sales@unilever-ea.com',
    address: 'Namanve Industrial Area, Kampala',
  },
  {
    name: "L'Oreal Uganda Distributors",
    contact: 'Peter Ochieng',
    phone: '0782-567890',
    email: 'wholesale@loreal-ug.com',
    address: 'Industrial Area, Kampala',
  },
  {
    name: 'Revlon & Maybelline Importers',
    contact: 'Grace Nansubuga',
    phone: '0752-678901',
    email: 'supply@revlon-ug.co.ug',
    address: 'Kampala Road, Kampala',
  },
  {
    name: 'GlowMart Cosmetics Wholesale',
    contact: 'David Ssemakula',
    phone: '0712-789012',
    email: 'orders@glowmart.co.ug',
    address: 'Kikuubo, Kampala',
  },
  {
    name: 'Procter & Gamble Uganda',
    contact: 'Winnie Nakabuye',
    phone: '0793-890123',
    email: 'orders@pg-ug.com',
    address: 'Bugolobi, Kampala',
  },
  {
    name: 'African Beauty Supplies',
    contact: 'Moses Byarugaba',
    phone: '0763-901234',
    email: 'orders@africanbeauty.co.ug',
    address: 'Industrial Area, Kampala',
  },
  {
    name: 'Avon Uganda Direct',
    contact: 'Joyce Akello',
    phone: '0741-012345',
    email: 'sales@avon-ug.com',
    address: 'Ntinda, Kampala',
  },
];

// Beauty-shop wholesale customers
const CUSTOMERS = [
  {
    name: 'Glam Zone Salon & Spa',
    phone: '0772-111222',
    email: 'glamzone@gmail.com',
    address: 'Kololo Hill, Kampala',
    isWholesale: true,
    creditLimit: 3000000,
  },
  {
    name: 'Beauty Corner Shop Kisaasi',
    phone: '0702-333444',
    email: null,
    address: 'Kisaasi, Kampala',
    isWholesale: false,
    creditLimit: 500000,
  },
  {
    name: 'Nalya Ladies Fashion & Beauty',
    phone: '0782-555666',
    email: 'nalya.beauty@yahoo.com',
    address: 'Nalya, Kampala',
    isWholesale: true,
    creditLimit: 5000000,
  },
  {
    name: 'Queens Hair & Nails Ntinda',
    phone: '0752-777888',
    email: null,
    address: 'Ntinda, Kampala',
    isWholesale: false,
    creditLimit: 400000,
  },
  {
    name: 'Makerere Uni Salon',
    phone: '0712-999000',
    email: 'makuni.salon@gmail.com',
    address: 'Makerere, Kampala',
    isWholesale: true,
    creditLimit: 2000000,
  },
  {
    name: 'Wandegeya Market Beauty Stall',
    phone: '0793-112233',
    email: null,
    address: 'Wandegeya, Kampala',
    isWholesale: true,
    creditLimit: 1000000,
  },
  {
    name: 'Nasser Road Cosmetics Kiosk',
    phone: '0763-445566',
    email: 'nasser.cosm@gmail.com',
    address: 'Nasser Road, Kampala',
    isWholesale: false,
    creditLimit: 600000,
  },
  {
    name: 'Divine Beauty Parlour Mengo',
    phone: '0741-778899',
    email: null,
    address: 'Mengo, Kampala',
    isWholesale: false,
    creditLimit: 350000,
  },
  {
    name: 'Bwaise Glam Studio',
    phone: '0701-001122',
    email: null,
    address: 'Bwaise, Kampala',
    isWholesale: false,
    creditLimit: 200000,
  },
  {
    name: 'Entebbe Road Mini Pharmacy & Beauty',
    phone: '0772-334455',
    email: null,
    address: 'Entebbe Road, Kampala',
    isWholesale: false,
    creditLimit: 0,
  },
];

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log('[seed] Seeding KampStock with cosmetics shop data...');

  // Idempotency check — skip if already seeded
  const existingAdmin = await prisma.user.findUnique({
    where: { username_tenantId: { username: 'admin', tenantId: 1 } },
  });
  if (existingAdmin) {
    console.log(
      '[seed] Already seeded — skipping. Delete records manually to re-seed.',
    );
    return;
  }

  // --- TENANT (must be created first — all other records reference tenantId: 1) ---
  // In PostgreSQL, FK constraints are enforced: roles, users, products etc. all
  // have tenantId: 1 hardcoded. We upsert by subdomain (unique) so this is safe
  // to run multiple times. On a fresh database the auto-increment gives id=1.
  await prisma.tenant.upsert({
    where: { subdomain: 'kampstock' },
    update: {},
    create: {
      name: 'KampStock',
      subdomain: 'kampstock',
      plan: 'enterprise',
      isActive: true,
      businessType: 'retail',
      description: 'Default KampStock tenant',
    },
  });
  console.log('[ok] Default tenant ensured');

  // --- ROLES ---
  const adminRole = await prisma.role.upsert({
    where: { name_tenantId: { name: 'Admin', tenantId: 1 } },
    update: {},
    create: {
      name: 'Admin',
      permissions: JSON.stringify({ all: true }),
      tenantId: 1,
    },
  });
  const managerRole = await prisma.role.upsert({
    where: { name_tenantId: { name: 'Manager', tenantId: 1 } },
    update: {},
    create: {
      name: 'Manager',
      permissions: JSON.stringify({
        manage_products: true,
        manage_sales: true,
        view_reports: true,
        manage_stock: true,
      }),
      tenantId: 1,
    },
  });
  const cashierRole = await prisma.role.upsert({
    where: { name_tenantId: { name: 'Cashier', tenantId: 1 } },
    update: {},
    create: {
      name: 'Cashier',
      permissions: JSON.stringify({ create_sales: true }),
      tenantId: 1,
    },
  });
  const storekeeperRole = await prisma.role.upsert({
    where: { name_tenantId: { name: 'Storekeeper', tenantId: 1 } },
    update: {},
    create: {
      name: 'Storekeeper',
      permissions: JSON.stringify({ manage_stock: true }),
      tenantId: 1,
    },
  });

  // --- USERS ---
  // Demo/admin passwords are re-synced on every seed run (update clause)
  // so re-seeding always restores the documented demo credentials.
  const adminHash = await bcrypt.hash('K@mpSt0ck#Admin!2026', 12);
  const admin = await prisma.user.upsert({
    where: { username_tenantId: { username: 'admin', tenantId: 1 } },
    update: { passwordHash: adminHash, roleId: adminRole.id, isActive: true },
    create: {
      name: 'Nakiganda Christine',
      username: 'admin',
      passwordHash: adminHash,
      phone: '0772-100001',
      roleId: adminRole.id,
      tenantId: 1,
    },
  });
  const managerHash = await bcrypt.hash('manager123', 12);
  await prisma.user.upsert({
    where: { username_tenantId: { username: 'manager', tenantId: 1 } },
    update: { passwordHash: managerHash, roleId: managerRole.id, isActive: true },
    create: {
      name: 'Ssekandi Robert',
      username: 'manager',
      passwordHash: managerHash,
      phone: '0702-100002',
      roleId: managerRole.id,
      tenantId: 1,
    },
  });
  const cashierHash = await bcrypt.hash('cashier123', 12);
  const cashier = await prisma.user.upsert({
    where: { username_tenantId: { username: 'cashier', tenantId: 1 } },
    update: { passwordHash: cashierHash, roleId: cashierRole.id, isActive: true },
    create: {
      name: 'Namutebi Fiona',
      username: 'cashier',
      passwordHash: cashierHash,
      phone: '0782-100003',
      roleId: cashierRole.id,
      tenantId: 1,
    },
  });
  const storekeeperHash = await bcrypt.hash('store123', 12);
  await prisma.user.upsert({
    where: { username_tenantId: { username: 'storekeeper', tenantId: 1 } },
    update: {
      passwordHash: storekeeperHash,
      roleId: storekeeperRole.id,
      isActive: true,
    },
    create: {
      name: 'Okello Patrick',
      username: 'storekeeper',
      passwordHash: storekeeperHash,
      phone: '0752-100004',
      roleId: storekeeperRole.id,
      tenantId: 1,
    },
  });

  console.log('[ok] Users created');

  // --- LOCATIONS ---
  const mainStore = await prisma.stockLocation.upsert({
    where: { name_tenantId: { name: 'Main Warehouse', tenantId: 1 } },
    update: {},
    create: {
      name: 'Main Warehouse',
      description: 'Primary stock holding area',
      tenantId: 1,
    },
  });
  const frontCounter = await prisma.stockLocation.upsert({
    where: { name_tenantId: { name: 'Front Counter', tenantId: 1 } },
    update: {},
    create: {
      name: 'Front Counter',
      description: 'POS counter display stock',
      tenantId: 1,
    },
  });
  await prisma.stockLocation.upsert({
    where: { name_tenantId: { name: 'Cold Room', tenantId: 1 } },
    update: {},
    create: {
      name: 'Cold Room',
      description: 'Chilled/refrigerated items storage',
      tenantId: 1,
    },
  });

  console.log('[ok] Users created');

  // --- CATEGORIES ---
  const categoryMap: Record<string, number> = {};
  const catNames = [...new Set(PRODUCT_CATALOG.map((p) => p.cat))];
  for (const catName of catNames) {
    const cat = await prisma.category.upsert({
      where: { name_tenantId: { name: catName, tenantId: 1 } },
      update: {},
      create: { name: catName, tenantId: 1 },
    });
    categoryMap[catName] = cat.id;
  }
  console.log(`[ok] ${catNames.length} categories created`);

  // --- PRODUCTS ---
  const productMap: Record<
    string,
    { id: number; buying: number; retail: number }
  > = {};
  for (const p of PRODUCT_CATALOG) {
    const existing = await prisma.product.findUnique({
      where: { sku_tenantId: { sku: p.sku, tenantId: 1 } },
    });
    let productId: number;
    if (existing) {
      productId = existing.id;
    } else {
      const product = await prisma.product.create({
        data: {
          name: p.name,
          sku: p.sku,
          categoryId: categoryMap[p.cat],
          brand: p.brand,
          unitOfMeasure: p.unit,
          tenantId: 1,
          units: {
            create: [
              {
                unitName: p.unit,
                conversionFactor: 1,
                buyingPrice: p.buying,
                sellingPriceRetail: p.retail,
                sellingPriceWholesale: p.wholesale,
                minWholesaleQty: p.minWQty,
                isDefault: true,
              },
            ],
          },
        },
      });
      productId = product.id;
    }
    // Add stock to main warehouse
    const existingStock = await prisma.stockItem.findFirst({
      where: { productId, locationId: mainStore.id },
    });
    if (!existingStock) {
      await prisma.stockItem.create({
        data: {
          productId,
          locationId: mainStore.id,
          quantityOnHand: p.stock,
          lastCostPrice: p.buying,
        },
      });
    }
    productMap[p.sku] = { id: productId, buying: p.buying, retail: p.retail };
  }
  console.log(`[ok] ${PRODUCT_CATALOG.length} products created with stock`);

  // --- SUPPLIERS ---
  const supplierIds: number[] = [];
  for (const s of SUPPLIERS) {
    let sup = await prisma.supplier.findFirst({ where: { name: s.name } });
    if (!sup)
      sup = await prisma.supplier.create({
        data: {
          name: s.name,
          contactPerson: s.contact,
          phone: s.phone,
          email: s.email,
          address: s.address,
          tenantId: 1,
        },
      });
    supplierIds.push(sup.id);
  }
  console.log(`[ok] ${SUPPLIERS.length} suppliers created`);

  // --- CUSTOMERS ---
  const customerIds: number[] = [];
  for (const c of CUSTOMERS) {
    let cust = await prisma.customer.findFirst({ where: { name: c.name } });
    if (!cust)
      cust = await prisma.customer.create({
        data: {
          name: c.name,
          phone: c.phone,
          email: c.email,
          address: c.address,
          isWholesale: c.isWholesale,
          creditLimit: c.creditLimit,
          tenantId: 1,
        },
      });
    customerIds.push(cust.id);
  }
  console.log(`[ok] ${CUSTOMERS.length} customers created`);

  // --- PURCHASE ORDERS (last 90 days) ---
  const poProducts = PRODUCT_CATALOG.slice(0, 20);
  for (let i = 0; i < 15; i++) {
    const daysBack = randomBetween(5, 90);
    const supplierIdx = randomBetween(0, supplierIds.length - 1);
    const orderDate = daysAgo(daysBack);
    const poLines = Array.from({ length: randomBetween(3, 8) }, () => {
      const prod = randomChoice(poProducts);
      const qty = randomBetween(20, 100);
      return {
        productId: productMap[prod.sku].id,
        quantity: qty,
        unitPrice: prod.buying,
        lineTotal: qty * prod.buying,
      };
    });
    const grandTotal = poLines.reduce((s, l) => s + l.lineTotal, 0);
    const poNum = `PO${orderDate.getFullYear()}${String(orderDate.getMonth() + 1).padStart(2, '0')}${String(i + 1).padStart(5, '0')}`;
    const existingPO = await prisma.purchaseOrder.findUnique({
      where: { poNumber_tenantId: { poNumber: poNum, tenantId: 1 } },
    });
    if (!existingPO) {
      await prisma.purchaseOrder.create({
        data: {
          poNumber: poNum,
          supplierId: supplierIds[supplierIdx],
          status: i < 12 ? 'RECEIVED' : 'SENT',
          orderedDate: orderDate,
          grandTotal,
          notes: 'Regular stock replenishment',
          createdById: admin.id,
          tenantId: 1,
          lines: {
            create: poLines.map((l) => ({
              productId: l.productId,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              lineTotal: l.lineTotal,
            })),
          },
        },
      });
    }
  }
  console.log('[ok] Users created');

  // --- EXPENSES (last 90 days) ---
  const expenseCategories = [
    'Rent',
    'Utilities',
    'Wages',
    'Transport',
    'Maintenance',
    'Marketing',
    'Security',
    'Internet',
  ];
  const expenseDetails = [
    { category: 'Rent', amount: 450000, desc: 'Monthly shop rent - Nakasero' },
    {
      category: 'Wages',
      amount: 350000,
      desc: 'Cashier monthly salary - Namutebi',
    },
    {
      category: 'Wages',
      amount: 380000,
      desc: 'Storekeeper monthly salary - Okello',
    },
    { category: 'Utilities', amount: 85000, desc: 'UMEME electricity bill' },
    { category: 'Utilities', amount: 25000, desc: 'Water and sewerage' },
    { category: 'Transport', amount: 45000, desc: 'Delivery to front counter' },
    {
      category: 'Transport',
      amount: 35000,
      desc: 'Collection of goods from supplier',
    },
    { category: 'Maintenance', amount: 120000, desc: 'Refrigerator servicing' },
    {
      category: 'Marketing',
      amount: 80000,
      desc: 'WhatsApp and SMS promotion',
    },
    { category: 'Security', amount: 150000, desc: 'Night guard monthly fee' },
    { category: 'Internet', amount: 65000, desc: 'Monthly internet bundle' },
  ];
  for (let month = 0; month < 3; month++) {
    for (const exp of expenseDetails) {
      const paidAt = daysAgo(randomBetween(month * 30, (month + 1) * 30 - 1));
      await prisma.expense.create({
        data: {
          category: exp.category,
          description: exp.desc,
          amount: exp.amount + randomBetween(-5000, 5000),
          paidById: admin.id,
          paidAt,
          tenantId: 1,
        },
      });
    }
    // Random small expenses
    for (let j = 0; j < 5; j++) {
      await prisma.expense.create({
        data: {
          category: randomChoice(expenseCategories),
          description: 'Miscellaneous expense',
          amount: randomBetween(10000, 80000),
          paidById: admin.id,
          paidAt: daysAgo(randomBetween(month * 30, (month + 1) * 30 - 1)),
          tenantId: 1,
        },
      });
    }
  }
  console.log('[ok] Users created');

  // --- SALES (last 90 days) ---
  const posProducts = PRODUCT_CATALOG.slice(0, 35); // Most common products sold
  let saleCounter = 0;
  const saleNumbers: Set<string> = new Set();

  for (let daysBack = 89; daysBack >= 0; daysBack--) {
    const saleDate = daysAgo(daysBack);
    const dayOfWeek = saleDate.getDay(); // 0=Sun, 6=Sat
    // More sales on weekdays, fewer on Sundays
    const numSales =
      dayOfWeek === 0
        ? randomBetween(3, 8)
        : dayOfWeek === 6
          ? randomBetween(10, 20)
          : randomBetween(12, 25);

    for (let s = 0; s < numSales; s++) {
      saleCounter++;
      const saleNum = `KS${saleDate.getFullYear()}${String(saleDate.getMonth() + 1).padStart(2, '0')}${String(saleCounter).padStart(5, '0')}`;
      if (saleNumbers.has(saleNum)) continue;
      saleNumbers.add(saleNum);

      const isWholesale = Math.random() < 0.15;
      const customerId = Math.random() < 0.4 ? randomChoice(customerIds) : null;
      const numLines = randomBetween(1, isWholesale ? 8 : 4);
      const createdBy = Math.random() < 0.7 ? cashier.id : admin.id;
      const paymentMethod =
        Math.random() < 0.65
          ? 'CASH'
          : Math.random() < 0.7
            ? 'MOBILE_MONEY'
            : 'BANK';

      const lines: any[] = [];
      let total = 0;
      for (let l = 0; l < numLines; l++) {
        const prod = randomChoice(posProducts);
        const qty = isWholesale ? randomBetween(5, 30) : randomBetween(1, 5);
        const unitPrice = isWholesale ? prod.wholesale : prod.retail;
        const lineTotal = qty * unitPrice;
        total += lineTotal;
        lines.push({
          productId: productMap[prod.sku].id,
          quantity: qty,
          unitPrice,
          discount: 0,
          lineTotal,
          costPrice: prod.buying,
        });
      }

      const grandTotal = total;
      const saleType = isWholesale ? 'WHOLESALE' : 'RETAIL';

      // Set time to realistic business hours
      const hour = randomBetween(8, 20);
      const minute = randomBetween(0, 59);
      saleDate.setHours(hour, minute, 0, 0);

      try {
        await prisma.sale.create({
          data: {
            saleNumber: saleNum,
            customerId,
            saleType,
            status: 'COMPLETED',
            total: grandTotal,
            discountTotal: 0,
            taxTotal: 0,
            grandTotal,
            paidAmount: grandTotal,
            balance: 0,
            createdById: createdBy,
            createdAt: saleDate,
            updatedAt: saleDate,
            tenantId: 1,
            lines: { create: lines },
            payments: {
              create: [
                {
                  paymentMethod,
                  amount: grandTotal,
                  receivedById: createdBy,
                  receivedAt: saleDate,
                },
              ],
            },
          },
        });
      } catch {
        // Skip duplicate sale numbers
      }
    }
  }
  console.log(`[ok] ${saleCounter} sales created over last 90 days`);

  console.log('\n[ok] KampStock seed complete!');
  console.log('[ok] Users created');
  console.log('  Login credentials:');
  console.log(
    '  admin / K@mpSt0ck#Admin!2026  (full access — change on first login!)',
  );
  console.log('  manager / manager123 (manage products & sales)');
  console.log('  cashier / cashier123 (POS only)');
  console.log('[ok] Users created');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
