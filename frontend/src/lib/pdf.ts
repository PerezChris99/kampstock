import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const BRAND_COLOR: [number, number, number] = [99, 102, 241]; // indigo-500

function addHeader(doc: jsPDF, title: string, subtitle?: string) {
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, 210, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('KampStock', 14, 10);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Business Management System', 14, 16);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 32);
  if (subtitle) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(subtitle, 14, 38);
  }
  doc.setTextColor(0, 0, 0);
}

function addFooter(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated: ${new Date().toLocaleString('en-UG')}`, 14, 290);
    doc.text(`Page ${i} of ${pages}`, 196, 290, { align: 'right' });
  }
}

export function generateReceipt(sale: {
  saleNumber: string;
  createdAt: string;
  customer?: { name: string } | null;
  saleType: string;
  lines: Array<{ product?: { name: string }; quantity: number; unitPrice: number; lineTotal: number }>;
  payments: Array<{ paymentMethod: string; amount: number }>;
  grandTotal: number;
  discountTotal?: number;
  createdBy?: { name: string };
}) {
  const doc = new jsPDF({ unit: 'mm', format: [80, 200], orientation: 'portrait' });

  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, 80, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('KampStock', 40, 8, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Sales Receipt', 40, 14, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  let y = 23;
  doc.setFontSize(8);
  doc.text(`Receipt #: ${sale.saleNumber}`, 4, y); y += 5;
  doc.text(`Date: ${new Date(sale.createdAt).toLocaleString('en-UG')}`, 4, y); y += 5;
  if (sale.customer) { doc.text(`Customer: ${sale.customer.name}`, 4, y); y += 5; }
  doc.text(`Type: ${sale.saleType}`, 4, y); y += 5;
  doc.setLineWidth(0.2); doc.line(4, y, 76, y); y += 3;

  // Items
  for (const line of sale.lines) {
    const name = (line.product?.name ?? 'Item').slice(0, 22);
    const total = `UGX ${Number(line.lineTotal).toLocaleString()}`;
    doc.text(`${line.quantity}x ${name}`, 4, y);
    doc.text(total, 76, y, { align: 'right' });
    y += 5;
  }

  doc.line(4, y, 76, y); y += 4;
  if ((sale.discountTotal ?? 0) > 0) {
    doc.text('Discount:', 4, y);
    doc.text(`-UGX ${Number(sale.discountTotal).toLocaleString()}`, 76, y, { align: 'right' });
    y += 5;
  }
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', 4, y);
  doc.text(`UGX ${Number(sale.grandTotal).toLocaleString()}`, 76, y, { align: 'right' });
  y += 5;
  doc.setFont('helvetica', 'normal');

  for (const p of sale.payments) {
    doc.text(`${p.paymentMethod.replace('_', ' ')}:`, 4, y);
    doc.text(`UGX ${Number(p.amount).toLocaleString()}`, 76, y, { align: 'right' });
    y += 5;
  }

  doc.line(4, y, 76, y); y += 5;
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  if (sale.createdBy) { doc.text(`Served by: ${sale.createdBy.name}`, 40, y, { align: 'center' }); y += 5; }
  doc.text('Thank you for your business!', 40, y, { align: 'center' }); y += 4;
  doc.text('KampStock — Kampala, Uganda', 40, y, { align: 'center' });

  doc.save(`receipt-${sale.saleNumber}.pdf`);
}

export function generateStockReport(items: Array<{
  productName: string; sku: string; location: string;
  quantityOnHand: number; lastCostPrice: number; value: number;
}>, totalValue: number) {
  const doc = new jsPDF();
  addHeader(doc, 'Stock Valuation Report', `As of ${new Date().toLocaleDateString('en-UG')}`);

  autoTable(doc, {
    startY: 44,
    head: [['Product', 'SKU', 'Location', 'Qty', 'Unit Cost (UGX)', 'Value (UGX)']],
    body: items.map(i => [
      i.productName, i.sku, i.location,
      i.quantityOnHand.toLocaleString(),
      Number(i.lastCostPrice).toLocaleString(),
      Number(i.value).toLocaleString(),
    ]),
    foot: [['', '', '', '', 'TOTAL', `UGX ${totalValue.toLocaleString()}`]],
    headStyles: { fillColor: BRAND_COLOR, fontSize: 8 },
    footStyles: { fillColor: [240, 240, 250], textColor: [50, 50, 100], fontStyle: 'bold' },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  addFooter(doc);
  doc.save(`stock-valuation-${new Date().toISOString().split('T')[0]}.pdf`);
}

export function generatePLReport(data: {
  period: string; revenue: number; cogs: number;
  grossProfit: number; totalExpenses: number; netProfit: number; salesCount: number;
}) {
  const doc = new jsPDF();
  addHeader(doc, 'Profit & Loss Report', `Period: ${data.period}`);

  const rows = [
    ['Revenue (Sales)', `UGX ${Number(data.revenue).toLocaleString()}`, ''],
    ['Cost of Goods Sold (COGS)', `UGX ${Number(data.cogs).toLocaleString()}`, ''],
    ['Gross Profit', `UGX ${Number(data.grossProfit).toLocaleString()}`,
      `${data.revenue > 0 ? ((data.grossProfit / data.revenue) * 100).toFixed(1) : 0}% margin`],
    ['Operating Expenses', `UGX ${Number(data.totalExpenses).toLocaleString()}`, ''],
    ['Net Profit / (Loss)', `UGX ${Number(data.netProfit).toLocaleString()}`,
      data.netProfit >= 0 ? 'PROFIT' : 'LOSS'],
    ['Total Transactions', data.salesCount.toLocaleString(), ''],
  ];

  autoTable(doc, {
    startY: 44,
    head: [['Metric', 'Amount', 'Note']],
    body: rows,
    headStyles: { fillColor: BRAND_COLOR, fontSize: 9 },
    bodyStyles: { fontSize: 10 },
    columnStyles: { 2: { fontStyle: 'bold' } },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  addFooter(doc);
  doc.save(`pl-report-${data.period}.pdf`);
}

export function generateSlowMoversReport(items: Array<{ name: string; sku: string; soldLast30Days: number }>) {
  const doc = new jsPDF();
  addHeader(doc, 'Slow-Moving Stock Report', 'Products with low sales in last 30 days');

  autoTable(doc, {
    startY: 44,
    head: [['Product Name', 'SKU', 'Units Sold (30 days)', 'Status']],
    body: items.map(i => [
      i.name, i.sku, i.soldLast30Days,
      i.soldLast30Days === 0 ? 'NO MOVEMENT' : i.soldLast30Days < 5 ? 'VERY SLOW' : 'SLOW',
    ]),
    headStyles: { fillColor: BRAND_COLOR, fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didParseCell: (data) => {
      if (data.column.index === 3 && data.cell.raw === 'NO MOVEMENT') {
        data.cell.styles.textColor = [200, 0, 0];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  addFooter(doc);
  doc.save(`slow-movers-${new Date().toISOString().split('T')[0]}.pdf`);
}
