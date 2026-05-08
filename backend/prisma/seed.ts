import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Realistic Kampala wholesale/retail product catalog
const PRODUCT_CATALOG = [
  // â”€â”€â”€ FOOD STAPLES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { name: 'Sugar (1kg)', sku: 'SUG-001', cat: 'Food Staples', brand: 'Kakira', buying: 3500, retail: 4000, wholesale: 3700, minWQty: 10, stock: 280, reorder: 50, unit: 'Kg' },
  { name: 'Sugar (2kg)', sku: 'SUG-002', cat: 'Food Staples', brand: 'Kakira', buying: 6800, retail: 7500, wholesale: 7200, minWQty: 6, stock: 150, reorder: 30, unit: 'Packet' },
  { name: 'Sugar (50kg Bag)', sku: 'SUG-050', cat: 'Food Staples', brand: 'Kakira', buying: 155000, retail: 170000, wholesale: 163000, minWQty: 1, stock: 12, reorder: 4, unit: 'Bag' },
  { name: 'Cooking Oil Kimbo (1L)', sku: 'OIL-001', cat: 'Food Staples', brand: 'Kimbo', buying: 6200, retail: 7000, wholesale: 6600, minWQty: 12, stock: 95, reorder: 20, unit: 'Bottle' },
  { name: 'Cooking Oil Ufuta (2L)', sku: 'OIL-002', cat: 'Food Staples', brand: 'Ufuta', buying: 11000, retail: 12500, wholesale: 11800, minWQty: 6, stock: 60, reorder: 15, unit: 'Bottle' },
  { name: 'Cooking Oil Mukwano (5L)', sku: 'OIL-005', cat: 'Food Staples', brand: 'Mukwano', buying: 27000, retail: 30000, wholesale: 28500, minWQty: 3, stock: 30, reorder: 8, unit: 'Jerrican' },
  { name: 'Maize Flour Rolex (2kg)', sku: 'FLR-001', cat: 'Food Staples', brand: 'Rolex', buying: 4800, retail: 5500, wholesale: 5200, minWQty: 10, stock: 120, reorder: 25, unit: 'Packet' },
  { name: 'Maize Flour Maisha (5kg)', sku: 'FLR-002', cat: 'Food Staples', brand: 'Maisha Bora', buying: 11000, retail: 13000, wholesale: 12000, minWQty: 5, stock: 80, reorder: 15, unit: 'Packet' },
  { name: 'Posho Mill Flour (10kg)', sku: 'FLR-003', cat: 'Food Staples', brand: 'Local', buying: 18000, retail: 22000, wholesale: 20000, minWQty: 3, stock: 40, reorder: 10, unit: 'Bag' },
  { name: 'Ugali Flour (1kg)', sku: 'FLR-004', cat: 'Food Staples', brand: 'Dola', buying: 2800, retail: 3200, wholesale: 3000, minWQty: 12, stock: 90, reorder: 20, unit: 'Packet' },
  { name: 'Rice Premium (1kg)', sku: 'RIC-001', cat: 'Food Staples', brand: 'Kaiso', buying: 3800, retail: 4500, wholesale: 4200, minWQty: 10, stock: 110, reorder: 20, unit: 'Kg' },
  { name: 'Rice (5kg Bag)', sku: 'RIC-005', cat: 'Food Staples', brand: 'Kaiso', buying: 18000, retail: 21000, wholesale: 19500, minWQty: 2, stock: 35, reorder: 8, unit: 'Bag' },
  { name: 'Dry Beans (1kg)', sku: 'BNS-001', cat: 'Food Staples', brand: 'Local', buying: 3200, retail: 4000, wholesale: 3600, minWQty: 10, stock: 75, reorder: 15, unit: 'Kg' },
  { name: 'Dry Beans (5kg)', sku: 'BNS-005', cat: 'Food Staples', brand: 'Local', buying: 15000, retail: 18500, wholesale: 17000, minWQty: 2, stock: 25, reorder: 6, unit: 'Bag' },
  { name: 'Salt (500g)', sku: 'SLT-001', cat: 'Food Staples', brand: 'Kensalt', buying: 900, retail: 1200, wholesale: 1050, minWQty: 20, stock: 200, reorder: 50, unit: 'Pack' },
  { name: 'Salt (1kg)', sku: 'SLT-002', cat: 'Food Staples', brand: 'Kensalt', buying: 1700, retail: 2200, wholesale: 2000, minWQty: 12, stock: 130, reorder: 30, unit: 'Pack' },
  { name: 'Spaghetti Pembe (400g)', sku: 'SPG-001', cat: 'Food Staples', brand: 'Pembe', buying: 3200, retail: 3800, wholesale: 3500, minWQty: 12, stock: 65, reorder: 15, unit: 'Pack' },
  { name: 'Noodles Indomie (70g)', sku: 'NDL-001', cat: 'Food Staples', brand: 'Indomie', buying: 650, retail: 800, wholesale: 720, minWQty: 40, stock: 300, reorder: 80, unit: 'Pack' },
  { name: 'Tomato Paste (70g)', sku: 'TMP-001', cat: 'Food Staples', brand: 'Kenmei', buying: 800, retail: 1000, wholesale: 900, minWQty: 24, stock: 180, reorder: 50, unit: 'Tin' },
  { name: 'Tomato Paste (400g)', sku: 'TMP-002', cat: 'Food Staples', brand: 'Kenmei', buying: 2800, retail: 3500, wholesale: 3200, minWQty: 12, stock: 90, reorder: 20, unit: 'Tin' },
  { name: 'Margarine Blue Band (250g)', sku: 'MRG-001', cat: 'Food Staples', brand: 'Blue Band', buying: 4500, retail: 5200, wholesale: 4900, minWQty: 12, stock: 55, reorder: 12, unit: 'Tub' },
  { name: 'Milk Dairy Farm UHT (500ml)', sku: 'MLK-001', cat: 'Food Staples', brand: 'Dairy Farm', buying: 1800, retail: 2200, wholesale: 2000, minWQty: 24, stock: 120, reorder: 30, unit: 'Carton' },
  { name: 'Eggs (Tray 30pcs)', sku: 'EGG-030', cat: 'Food Staples', brand: 'Fresh Farm', buying: 12000, retail: 14000, wholesale: 13200, minWQty: 2, stock: 18, reorder: 5, unit: 'Tray' },

  // â”€â”€â”€ BEVERAGES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { name: 'Coca-Cola (300ml)', sku: 'CCL-300', cat: 'Beverages', brand: 'Coca-Cola', buying: 1100, retail: 1500, wholesale: 1300, minWQty: 24, stock: 240, reorder: 48, unit: 'Bottle' },
  { name: 'Coca-Cola (500ml)', sku: 'CCL-500', cat: 'Beverages', brand: 'Coca-Cola', buying: 1500, retail: 2000, wholesale: 1800, minWQty: 24, stock: 180, reorder: 40, unit: 'Bottle' },
  { name: 'Pepsi (300ml)', sku: 'PEP-300', cat: 'Beverages', brand: 'Pepsi', buying: 1000, retail: 1400, wholesale: 1200, minWQty: 24, stock: 200, reorder: 48, unit: 'Bottle' },
  { name: 'Sprite (300ml)', sku: 'SPR-300', cat: 'Beverages', brand: 'Sprite', buying: 1100, retail: 1500, wholesale: 1300, minWQty: 24, stock: 160, reorder: 40, unit: 'Bottle' },
  { name: 'Fanta Orange (300ml)', sku: 'FNT-300', cat: 'Beverages', brand: 'Fanta', buying: 1100, retail: 1500, wholesale: 1300, minWQty: 24, stock: 170, reorder: 40, unit: 'Bottle' },
  { name: 'Water Rwenzori (500ml)', sku: 'WTR-500', cat: 'Beverages', brand: 'Rwenzori', buying: 600, retail: 1000, wholesale: 800, minWQty: 24, stock: 300, reorder: 60, unit: 'Bottle' },
  { name: 'Water Rwenzori (1.5L)', sku: 'WTR-1500', cat: 'Beverages', brand: 'Rwenzori', buying: 1200, retail: 1800, wholesale: 1500, minWQty: 12, stock: 150, reorder: 30, unit: 'Bottle' },
  { name: 'Juice Splash (300ml)', sku: 'JCE-300', cat: 'Beverages', brand: 'Splash', buying: 1000, retail: 1400, wholesale: 1200, minWQty: 24, stock: 130, reorder: 30, unit: 'Bottle' },
  { name: 'Riham Cola (300ml)', sku: 'RHM-300', cat: 'Beverages', brand: 'Riham', buying: 700, retail: 1000, wholesale: 850, minWQty: 24, stock: 220, reorder: 48, unit: 'Bottle' },
  { name: 'Bell Beer 500ml', sku: 'BEL-500', cat: 'Beverages', brand: 'Bell', buying: 2800, retail: 3500, wholesale: 3200, minWQty: 24, stock: 144, reorder: 30, unit: 'Bottle' },
  { name: 'Club Beer 500ml', sku: 'CLB-500', cat: 'Beverages', brand: 'Club', buying: 2900, retail: 3600, wholesale: 3300, minWQty: 24, stock: 120, reorder: 30, unit: 'Bottle' },
  { name: 'Tea Leaves Lipton (100g)', sku: 'TEA-001', cat: 'Beverages', brand: 'Lipton', buying: 2500, retail: 3000, wholesale: 2800, minWQty: 12, stock: 80, reorder: 20, unit: 'Pack' },
  { name: 'Coffee Nescafe Sachet', sku: 'COF-001', cat: 'Beverages', brand: 'Nescafe', buying: 350, retail: 500, wholesale: 430, minWQty: 48, stock: 250, reorder: 60, unit: 'Sachet' },

  // â”€â”€â”€ PERSONAL CARE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { name: 'Bar Soap Geisha (175g)', sku: 'SOP-001', cat: 'Personal Care', brand: 'Geisha', buying: 1400, retail: 1800, wholesale: 1600, minWQty: 24, stock: 160, reorder: 40, unit: 'Bar' },
  { name: 'Bar Soap Key (800g)', sku: 'SOP-002', cat: 'Personal Care', brand: 'Key', buying: 3000, retail: 3500, wholesale: 3200, minWQty: 20, stock: 100, reorder: 25, unit: 'Bar' },
  { name: 'Shampoo Sunsilk (200ml)', sku: 'SHP-001', cat: 'Personal Care', brand: 'Sunsilk', buying: 5500, retail: 6500, wholesale: 6000, minWQty: 12, stock: 45, reorder: 10, unit: 'Bottle' },
  { name: 'Toothpaste Colgate (75ml)', sku: 'TTP-001', cat: 'Personal Care', brand: 'Colgate', buying: 2800, retail: 3500, wholesale: 3200, minWQty: 12, stock: 70, reorder: 15, unit: 'Tube' },
  { name: 'Toothbrush Oral-B', sku: 'TTB-001', cat: 'Personal Care', brand: 'Oral-B', buying: 1800, retail: 2500, wholesale: 2200, minWQty: 12, stock: 55, reorder: 12, unit: 'Piece' },
  { name: 'Petroleum Jelly Vaseline (100ml)', sku: 'VSL-001', cat: 'Personal Care', brand: 'Vaseline', buying: 2500, retail: 3200, wholesale: 2900, minWQty: 12, stock: 60, reorder: 15, unit: 'Jar' },
  { name: 'Lotion Cocoa Butter (400ml)', sku: 'LTN-001', cat: 'Personal Care', brand: 'Palmer\'s', buying: 8000, retail: 9500, wholesale: 8800, minWQty: 6, stock: 30, reorder: 8, unit: 'Bottle' },
  { name: 'Deodorant Rexona (150ml)', sku: 'DEO-001', cat: 'Personal Care', brand: 'Rexona', buying: 5500, retail: 7000, wholesale: 6500, minWQty: 12, stock: 40, reorder: 10, unit: 'Can' },
  { name: 'Sanitary Pads Always (8pcs)', sku: 'SAN-001', cat: 'Personal Care', brand: 'Always', buying: 3500, retail: 4200, wholesale: 3900, minWQty: 12, stock: 65, reorder: 15, unit: 'Pack' },
  { name: 'Razor Blade Gillette', sku: 'RZR-001', cat: 'Personal Care', brand: 'Gillette', buying: 800, retail: 1200, wholesale: 1000, minWQty: 24, stock: 100, reorder: 30, unit: 'Pack' },

  // â”€â”€â”€ HOUSEHOLD ITEMS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { name: 'Detergent Omo (500g)', sku: 'DET-001', cat: 'Household', brand: 'Omo', buying: 3000, retail: 3800, wholesale: 3500, minWQty: 12, stock: 80, reorder: 20, unit: 'Pack' },
  { name: 'Detergent Ariel (1kg)', sku: 'DET-002', cat: 'Household', brand: 'Ariel', buying: 6500, retail: 7800, wholesale: 7200, minWQty: 6, stock: 50, reorder: 12, unit: 'Pack' },
  { name: 'Fabric Softener Comfort (1L)', sku: 'FAB-001', cat: 'Household', brand: 'Comfort', buying: 7000, retail: 8500, wholesale: 7800, minWQty: 6, stock: 30, reorder: 8, unit: 'Bottle' },
  { name: 'Dishwash Liquid Fairy (500ml)', sku: 'DSH-001', cat: 'Household', brand: 'Fairy', buying: 5500, retail: 6500, wholesale: 6000, minWQty: 6, stock: 40, reorder: 10, unit: 'Bottle' },
  { name: 'Matches Uganda (Box)', sku: 'MCH-001', cat: 'Household', brand: 'Mukwano', buying: 300, retail: 500, wholesale: 400, minWQty: 50, stock: 350, reorder: 100, unit: 'Box' },
  { name: 'Toilet Paper Kasese (4roll)', sku: 'TTP-002', cat: 'Household', brand: 'Kasese', buying: 3500, retail: 4500, wholesale: 4000, minWQty: 12, stock: 90, reorder: 24, unit: 'Pack' },
  { name: 'Candles (Box 10pcs)', sku: 'CDL-001', cat: 'Household', brand: 'Beacon', buying: 2000, retail: 2800, wholesale: 2500, minWQty: 12, stock: 60, reorder: 15, unit: 'Box' },
  { name: 'Mosquito Coil Doom (10pcs)', sku: 'MSQ-001', cat: 'Household', brand: 'Doom', buying: 2500, retail: 3200, wholesale: 2900, minWQty: 12, stock: 45, reorder: 12, unit: 'Pack' },
  { name: 'Insecticide Mortein (300ml)', sku: 'INS-001', cat: 'Household', brand: 'Mortein', buying: 5500, retail: 6800, wholesale: 6200, minWQty: 6, stock: 35, reorder: 10, unit: 'Can' },
  { name: 'Air Freshener Glade (300ml)', sku: 'AFR-001', cat: 'Household', brand: 'Glade', buying: 6000, retail: 7500, wholesale: 6800, minWQty: 6, stock: 25, reorder: 8, unit: 'Can' },
  { name: 'Broom (Local)', sku: 'BRM-001', cat: 'Household', brand: 'Local', buying: 3500, retail: 5000, wholesale: 4500, minWQty: 5, stock: 20, reorder: 5, unit: 'Piece' },
  { name: 'Plastic Bucket 20L', sku: 'BCK-001', cat: 'Household', brand: 'Nile Plastics', buying: 8000, retail: 12000, wholesale: 10500, minWQty: 3, stock: 15, reorder: 4, unit: 'Piece' },

  // â”€â”€â”€ SNACKS & CONFECTIONERY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { name: 'Biscuits Digestive (200g)', sku: 'BSC-001', cat: 'Snacks', brand: 'Nice', buying: 2500, retail: 3000, wholesale: 2800, minWQty: 12, stock: 80, reorder: 20, unit: 'Pack' },
  { name: 'Crisps Pringles (165g)', sku: 'CRP-001', cat: 'Snacks', brand: 'Pringles', buying: 4500, retail: 5500, wholesale: 5000, minWQty: 6, stock: 40, reorder: 10, unit: 'Can' },
  { name: 'Groundnuts Roasted (250g)', sku: 'GNT-001', cat: 'Snacks', brand: 'Local', buying: 2000, retail: 2800, wholesale: 2500, minWQty: 20, stock: 100, reorder: 25, unit: 'Pack' },
  { name: 'Candy Sugus Assorted (100g)', sku: 'CDY-001', cat: 'Snacks', brand: 'Sugus', buying: 1500, retail: 2000, wholesale: 1800, minWQty: 24, stock: 120, reorder: 30, unit: 'Pack' },
  { name: 'Chocolate Cadbury (50g)', sku: 'CHC-001', cat: 'Snacks', brand: 'Cadbury', buying: 1800, retail: 2500, wholesale: 2200, minWQty: 24, stock: 90, reorder: 20, unit: 'Bar' },
  { name: 'Chewing Gum Orbit (14stk)', sku: 'GUM-001', cat: 'Snacks', brand: 'Orbit', buying: 800, retail: 1200, wholesale: 1000, minWQty: 30, stock: 150, reorder: 40, unit: 'Pack' },

  // â”€â”€â”€ STATIONERY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { name: 'Exercise Book 32pg', sku: 'EXB-032', cat: 'Stationery', brand: 'Superior', buying: 500, retail: 700, wholesale: 600, minWQty: 50, stock: 250, reorder: 60, unit: 'Piece' },
  { name: 'Exercise Book 96pg', sku: 'EXB-096', cat: 'Stationery', brand: 'Superior', buying: 1200, retail: 1500, wholesale: 1350, minWQty: 20, stock: 150, reorder: 40, unit: 'Piece' },
  { name: 'Pen Biro Blue', sku: 'PEN-001', cat: 'Stationery', brand: 'Bic', buying: 300, retail: 500, wholesale: 400, minWQty: 50, stock: 300, reorder: 80, unit: 'Piece' },
  { name: 'Pencil HB (Box 12pcs)', sku: 'PCL-001', cat: 'Stationery', brand: 'Staedtler', buying: 2500, retail: 3500, wholesale: 3000, minWQty: 10, stock: 60, reorder: 15, unit: 'Box' },
  { name: 'Ruler 30cm', sku: 'RUL-001', cat: 'Stationery', brand: 'Maped', buying: 500, retail: 800, wholesale: 650, minWQty: 24, stock: 80, reorder: 20, unit: 'Piece' },
  { name: 'Eraser Staedtler', sku: 'ERS-001', cat: 'Stationery', brand: 'Staedtler', buying: 300, retail: 500, wholesale: 400, minWQty: 30, stock: 120, reorder: 30, unit: 'Piece' },
  { name: 'Manila Paper A4 (80gsm 500sht)', sku: 'PAP-001', cat: 'Stationery', brand: 'Double A', buying: 18000, retail: 22000, wholesale: 20000, minWQty: 2, stock: 25, reorder: 5, unit: 'Ream' },

  // â”€â”€â”€ AIRTIME & MOBILE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { name: 'MTN Airtime UGX 1,000', sku: 'ATN-MTN-1K', cat: 'Airtime & Mobile', brand: 'MTN', buying: 950, retail: 1000, wholesale: 980, minWQty: 100, stock: 500, reorder: 100, unit: 'Card' },
  { name: 'MTN Airtime UGX 2,000', sku: 'ATN-MTN-2K', cat: 'Airtime & Mobile', brand: 'MTN', buying: 1900, retail: 2000, wholesale: 1960, minWQty: 50, stock: 300, reorder: 60, unit: 'Card' },
  { name: 'Airtel Airtime UGX 1,000', sku: 'ATN-ART-1K', cat: 'Airtime & Mobile', brand: 'Airtel', buying: 950, retail: 1000, wholesale: 980, minWQty: 100, stock: 450, reorder: 100, unit: 'Card' },
  { name: 'Airtel Airtime UGX 2,000', sku: 'ATN-ART-2K', cat: 'Airtime & Mobile', brand: 'Airtel', buying: 1900, retail: 2000, wholesale: 1960, minWQty: 50, stock: 280, reorder: 60, unit: 'Card' },
  { name: 'Phone Charging Cable USB-C', sku: 'CBL-001', cat: 'Airtime & Mobile', brand: 'Generic', buying: 3500, retail: 6000, wholesale: 5000, minWQty: 5, stock: 30, reorder: 8, unit: 'Piece' },
  { name: 'Earphones Basic 3.5mm', sku: 'EAR-001', cat: 'Airtime & Mobile', brand: 'Generic', buying: 4000, retail: 7000, wholesale: 6000, minWQty: 5, stock: 20, reorder: 5, unit: 'Piece' },

  // â”€â”€â”€ AGRO & SPECIAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { name: 'Charcoal (Bag 5kg)', sku: 'CHR-005', cat: 'Fuel & Energy', brand: 'Local', buying: 8000, retail: 12000, wholesale: 10500, minWQty: 3, stock: 20, reorder: 6, unit: 'Bag' },
  { name: 'Kerosene (1L)', sku: 'KER-001', cat: 'Fuel & Energy', brand: 'Shell', buying: 4000, retail: 5500, wholesale: 5000, minWQty: 5, stock: 25, reorder: 8, unit: 'Litre' },
];

// Realistic Kampala business names for suppliers/customers
const SUPPLIERS = [
  { name: 'Uchumi Distributors Ltd', contact: 'James Kamau', phone: '0701-234567', email: 'orders@uchumi-dist.co.ug', address: 'Nakawa Industrial Area, Kampala' },
  { name: 'Kakira Sugar Works Ltd', contact: 'Sarah Mutesi', phone: '0772-456789', email: 'sales@kakirasugar.com', address: 'Industrial Area, Kampala' },
  { name: 'Mukwano Industries Uganda', contact: 'Peter Ochieng', phone: '0782-567890', email: 'wholesale@mukwano.com', address: 'Nalukolongo, Kampala' },
  { name: 'Crown Beverages Ltd', contact: 'Grace Nansubuga', phone: '0752-678901', email: 'supply@crownbev.co.ug', address: 'Port Bell, Kampala' },
  { name: 'Nice House of Plastics', contact: 'David Ssemakula', phone: '0712-789012', email: 'orders@nicehouse.co.ug', address: 'Kampala Road, Kampala' },
  { name: 'Total Energies Uganda', contact: 'Winnie Nakabuye', phone: '0793-890123', email: 'fuel@total.co.ug', address: 'Bugolobi, Kampala' },
  { name: 'Procter & Gamble Uganda', contact: 'Moses Byarugaba', phone: '0763-901234', email: 'orders@pg.co.ug', address: 'Industrial Area, Kampala' },
  { name: 'Unilever East Africa', contact: 'Joyce Akello', phone: '0741-012345', email: 'sales@unilever-ea.com', address: 'Namanve, Kampala' },
];

const CUSTOMERS = [
  { name: 'Mama Grace Supermarket', phone: '0772-111222', email: 'mamgrace@gmail.com', address: 'Kalerwe Market, Kampala', isWholesale: true, creditLimit: 2000000 },
  { name: 'Kisaasi Corner Shop', phone: '0702-333444', email: null, address: 'Kisaasi, Kampala', isWholesale: false, creditLimit: 500000 },
  { name: 'Bulamu Traders', phone: '0782-555666', email: 'bulamu@yahoo.com', address: 'Nalya, Kampala', isWholesale: true, creditLimit: 5000000 },
  { name: 'St. Kizito School Canteen', phone: '0752-777888', email: null, address: 'Kireka, Kampala', isWholesale: false, creditLimit: 300000 },
  { name: 'Ntinda View Hotel', phone: '0712-999000', email: 'ntindaview@gmail.com', address: 'Ntinda, Kampala', isWholesale: true, creditLimit: 3000000 },
  { name: 'Wandegeya Fresh Market', phone: '0793-112233', email: null, address: 'Wandegeya, Kampala', isWholesale: true, creditLimit: 1500000 },
  { name: 'Nasser Road Mini Mart', phone: '0763-445566', email: 'nasser.mart@gmail.com', address: 'Nasser Road, Kampala', isWholesale: false, creditLimit: 800000 },
  { name: 'Mengo Parish Retailer', phone: '0741-778899', email: null, address: 'Mengo, Kampala', isWholesale: false, creditLimit: 400000 },
  { name: 'Bwaise Community Store', phone: '0701-001122', email: null, address: 'Bwaise, Kampala', isWholesale: false, creditLimit: 200000 },
  { name: 'Entebbe Road Kiosk', phone: '0772-334455', email: null, address: 'Entebbe Road, Kampala', isWholesale: false, creditLimit: 0 },
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
  console.log('ðŸŒ± Seeding KampStock with realistic Kampala shop data...');

  // â”€â”€ ROLES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const adminRole = await prisma.role.upsert({ where: { name: 'Admin' }, update: {}, create: { name: 'Admin', permissions: JSON.stringify({ all: true }) } });
  const managerRole = await prisma.role.upsert({ where: { name: 'Manager' }, update: {}, create: { name: 'Manager', permissions: JSON.stringify({ manage_products: true, manage_sales: true, view_reports: true, manage_stock: true }) } });
  const cashierRole = await prisma.role.upsert({ where: { name: 'Cashier' }, update: {}, create: { name: 'Cashier', permissions: JSON.stringify({ create_sales: true }) } });
  const storekeeperRole = await prisma.role.upsert({ where: { name: 'Storekeeper' }, update: {}, create: { name: 'Storekeeper', permissions: JSON.stringify({ manage_stock: true }) } });

  // â”€â”€ USERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const adminHash = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({ where: { username: 'admin' }, update: {}, create: { name: 'Nakiganda Christine', username: 'admin', passwordHash: adminHash, phone: '0772-100001', roleId: adminRole.id } });
  const managerHash = await bcrypt.hash('manager123', 12);
  await prisma.user.upsert({ where: { username: 'manager' }, update: {}, create: { name: 'Ssekandi Robert', username: 'manager', passwordHash: managerHash, phone: '0702-100002', roleId: managerRole.id } });
  const cashierHash = await bcrypt.hash('cashier123', 12);
  const cashier = await prisma.user.upsert({ where: { username: 'cashier' }, update: {}, create: { name: 'Namutebi Fiona', username: 'cashier', passwordHash: cashierHash, phone: '0782-100003', roleId: cashierRole.id } });
  await prisma.user.upsert({ where: { username: 'storekeeper' }, update: {}, create: { name: 'Okello Patrick', username: 'storekeeper', passwordHash: await bcrypt.hash('store123', 12), phone: '0752-100004', roleId: storekeeperRole.id } });

  console.log('âœ“ Users created (admin/admin123, manager/manager123, cashier/cashier123)');

  // â”€â”€ LOCATIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const mainStore = await prisma.stockLocation.upsert({ where: { name: 'Main Warehouse' }, update: {}, create: { name: 'Main Warehouse', description: 'Primary stock holding area' } });
  const frontCounter = await prisma.stockLocation.upsert({ where: { name: 'Front Counter' }, update: {}, create: { name: 'Front Counter', description: 'POS counter display stock' } });
  await prisma.stockLocation.upsert({ where: { name: 'Cold Room' }, update: {}, create: { name: 'Cold Room', description: 'Chilled/refrigerated items storage' } });

  console.log('âœ“ Stock locations created');

  // â”€â”€ CATEGORIES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const categoryMap: Record<string, number> = {};
  const catNames = [...new Set(PRODUCT_CATALOG.map(p => p.cat))];
  for (const catName of catNames) {
    const cat = await prisma.category.upsert({ where: { name: catName }, update: {}, create: { name: catName } });
    categoryMap[catName] = cat.id;
  }
  console.log(`âœ“ ${catNames.length} categories created`);

  // â”€â”€ PRODUCTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const productMap: Record<string, { id: number; buying: number; retail: number }> = {};
  for (const p of PRODUCT_CATALOG) {
    const existing = await prisma.product.findUnique({ where: { sku: p.sku } });
    let productId: number;
    if (existing) {
      productId = existing.id;
    } else {
      const product = await prisma.product.create({
        data: {
          name: p.name, sku: p.sku, categoryId: categoryMap[p.cat], brand: p.brand,
          unitOfMeasure: p.unit,
          units: {
            create: [{ unitName: p.unit, conversionFactor: 1, buyingPrice: p.buying, sellingPriceRetail: p.retail, sellingPriceWholesale: p.wholesale, minWholesaleQty: p.minWQty, isDefault: true }],
          },
        },
      });
      productId = product.id;
    }
    // Add stock to main warehouse
    const existingStock = await prisma.stockItem.findFirst({ where: { productId, locationId: mainStore.id } });
    if (!existingStock) {
      await prisma.stockItem.create({ data: { productId, locationId: mainStore.id, quantityOnHand: p.stock, lastCostPrice: p.buying } });
    }
    productMap[p.sku] = { id: productId, buying: p.buying, retail: p.retail };
  }
  console.log(`âœ“ ${PRODUCT_CATALOG.length} products created with stock`);

  // â”€â”€ SUPPLIERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const supplierIds: number[] = [];
  for (const s of SUPPLIERS) {
    let sup = await prisma.supplier.findFirst({ where: { name: s.name } });
    if (!sup) sup = await prisma.supplier.create({ data: { name: s.name, contactPerson: s.contact, phone: s.phone, email: s.email, address: s.address } });
    supplierIds.push(sup.id);
  }
  console.log(`âœ“ ${SUPPLIERS.length} suppliers created`);

  // â”€â”€ CUSTOMERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const customerIds: number[] = [];
  for (const c of CUSTOMERS) {
    let cust = await prisma.customer.findFirst({ where: { name: c.name } });
    if (!cust) cust = await prisma.customer.create({ data: { name: c.name, phone: c.phone, email: c.email, address: c.address, isWholesale: c.isWholesale, creditLimit: c.creditLimit } });
    customerIds.push(cust.id);
  }
  console.log(`âœ“ ${CUSTOMERS.length} customers created`);

  // â”€â”€ PURCHASE ORDERS (last 90 days) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const poProducts = PRODUCT_CATALOG.slice(0, 20);
  for (let i = 0; i < 15; i++) {
    const daysBack = randomBetween(5, 90);
    const supplierIdx = randomBetween(0, supplierIds.length - 1);
    const orderDate = daysAgo(daysBack);
    const poLines = Array.from({ length: randomBetween(3, 8) }, () => {
      const prod = randomChoice(poProducts);
      const qty = randomBetween(20, 100);
      return { productId: productMap[prod.sku].id, quantity: qty, unitPrice: prod.buying, lineTotal: qty * prod.buying };
    });
    const grandTotal = poLines.reduce((s, l) => s + l.lineTotal, 0);
    const poNum = `PO${orderDate.getFullYear()}${String(orderDate.getMonth() + 1).padStart(2, '0')}${String(i + 1).padStart(5, '0')}`;
    const existingPO = await prisma.purchaseOrder.findUnique({ where: { poNumber: poNum } });
    if (!existingPO) {
      await prisma.purchaseOrder.create({
        data: {
          poNumber: poNum, supplierId: supplierIds[supplierIdx], status: i < 12 ? 'RECEIVED' : 'SENT',
          orderedDate: orderDate, grandTotal, notes: 'Regular stock replenishment', createdById: admin.id,
          lines: { create: poLines.map(l => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice, lineTotal: l.lineTotal })) },
        },
      });
    }
  }
  console.log('âœ“ Purchase orders created');

  // â”€â”€ EXPENSES (last 90 days) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const expenseCategories = ['Rent', 'Utilities', 'Wages', 'Transport', 'Maintenance', 'Marketing', 'Security', 'Internet'];
  const expenseDetails = [
    { category: 'Rent', amount: 450000, desc: 'Monthly shop rent - Nakasero' },
    { category: 'Wages', amount: 350000, desc: 'Cashier monthly salary - Namutebi' },
    { category: 'Wages', amount: 380000, desc: 'Storekeeper monthly salary - Okello' },
    { category: 'Utilities', amount: 85000, desc: 'UMEME electricity bill' },
    { category: 'Utilities', amount: 25000, desc: 'Water and sewerage' },
    { category: 'Transport', amount: 45000, desc: 'Delivery to front counter' },
    { category: 'Transport', amount: 35000, desc: 'Collection of goods from supplier' },
    { category: 'Maintenance', amount: 120000, desc: 'Refrigerator servicing' },
    { category: 'Marketing', amount: 80000, desc: 'WhatsApp and SMS promotion' },
    { category: 'Security', amount: 150000, desc: 'Night guard monthly fee' },
    { category: 'Internet', amount: 65000, desc: 'Monthly internet bundle' },
  ];
  for (let month = 0; month < 3; month++) {
    for (const exp of expenseDetails) {
      const paidAt = daysAgo(randomBetween(month * 30, (month + 1) * 30 - 1));
      await prisma.expense.create({ data: { category: exp.category, description: exp.desc, amount: exp.amount + randomBetween(-5000, 5000), paidById: admin.id, paidAt } });
    }
    // Random small expenses
    for (let j = 0; j < 5; j++) {
      await prisma.expense.create({ data: { category: randomChoice(expenseCategories), description: 'Miscellaneous expense', amount: randomBetween(10000, 80000), paidById: admin.id, paidAt: daysAgo(randomBetween(month * 30, (month + 1) * 30 - 1)) } });
    }
  }
  console.log('âœ“ Expenses created (3 months)');

  // â”€â”€ SALES (last 90 days, realistic daily patterns) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const posProducts = PRODUCT_CATALOG.slice(0, 35); // Most common products sold
  let saleCounter = 0;
  const saleNumbers: Set<string> = new Set();

  for (let daysBack = 89; daysBack >= 0; daysBack--) {
    const saleDate = daysAgo(daysBack);
    const dayOfWeek = saleDate.getDay(); // 0=Sun, 6=Sat
    // More sales on weekdays, fewer on Sundays
    const numSales = dayOfWeek === 0 ? randomBetween(3, 8) : dayOfWeek === 6 ? randomBetween(10, 20) : randomBetween(12, 25);

    for (let s = 0; s < numSales; s++) {
      saleCounter++;
      const saleNum = `KS${saleDate.getFullYear()}${String(saleDate.getMonth() + 1).padStart(2, '0')}${String(saleCounter).padStart(5, '0')}`;
      if (saleNumbers.has(saleNum)) continue;
      saleNumbers.add(saleNum);

      const isWholesale = Math.random() < 0.15;
      const customerId = Math.random() < 0.4 ? randomChoice(customerIds) : null;
      const numLines = randomBetween(1, isWholesale ? 8 : 4);
      const createdBy = Math.random() < 0.7 ? cashier.id : admin.id;
      const paymentMethod = Math.random() < 0.65 ? 'CASH' : Math.random() < 0.7 ? 'MOBILE_MONEY' : 'BANK';

      const lines: any[] = [];
      let total = 0;
      for (let l = 0; l < numLines; l++) {
        const prod = randomChoice(posProducts);
        const qty = isWholesale ? randomBetween(5, 30) : randomBetween(1, 5);
        const unitPrice = isWholesale ? prod.wholesale : prod.retail;
        const lineTotal = qty * unitPrice;
        total += lineTotal;
        lines.push({ productId: productMap[prod.sku].id, quantity: qty, unitPrice, discount: 0, lineTotal, costPrice: prod.buying });
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
            saleNumber: saleNum, customerId, saleType, status: 'COMPLETED',
            total: grandTotal, discountTotal: 0, taxTotal: 0, grandTotal, paidAmount: grandTotal, balance: 0,
            createdById: createdBy, createdAt: saleDate, updatedAt: saleDate,
            lines: { create: lines },
            payments: { create: [{ paymentMethod, amount: grandTotal, receivedById: createdBy, receivedAt: saleDate }] },
          },
        });
      } catch {
        // Skip duplicate sale numbers
      }
    }
  }
  console.log(`âœ“ ${saleCounter} sales created over last 90 days`);

  console.log('\nâœ… KampStock seed complete!');
  console.log('â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”');
  console.log('  Login credentials:');
  console.log('  admin / admin123     (full access)');
  console.log('  manager / manager123 (manage products & sales)');
  console.log('  cashier / cashier123 (POS only)');
  console.log('â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”');
}

main()
  .catch((e) => { console.error('Seed error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());


