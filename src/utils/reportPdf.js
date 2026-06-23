import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { formatMoney } from './date.js';

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 40;
const LINE_HEIGHT = 16;
const BODY_SIZE = 10;
const TITLE_SIZE = 18;
const SECTION_SIZE = 13;

export async function downloadLabourReportPdf(report) {
  try {
    await downloadReportPdf(report, 'labour');
  } catch (error) {
    window.alert(error.message || 'PDF save failed');
  }
}

export async function downloadStockReportPdf(report) {
  try {
    await downloadReportPdf(report, 'stock');
  } catch (error) {
    window.alert(error.message || 'PDF save failed');
  }
}

async function downloadReportPdf(report, type) {
  const pdf = buildPdf(report, type);
  const fileName = buildFileName(report, type);

  if (Capacitor.isNativePlatform()) {
    await saveNativePdf(pdf, fileName);
    return;
  }

  const url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function saveNativePdf(pdf, fileName) {
  await Filesystem.writeFile({
    path: fileName,
    data: stringToBase64(pdf),
    directory: Directory.Documents,
  });

  window.alert(`PDF saved in Documents: ${fileName}`);
}

function buildPdf(report, type) {
  const isLabour = type === 'labour';
  const title = `${isLabour ? 'Labour' : 'Stock'} Report - ${report.range.label}`;
  const pages = paginate(buildReportLines(report, isLabour, title));
  return writePdf(pages);
}

function buildReportLines(report, isLabour, title) {
  const lines = [
    { text: title, size: TITLE_SIZE, gap: 8 },
    { text: `Date range: ${report.range.from} to ${report.range.to}` },
    { text: `Generated: ${new Date().toLocaleString('en-IN')}`, gap: 12 },
    { text: 'Summary', size: SECTION_SIZE, gap: 6 },
    ...summaryLines(report, isLabour),
  ];

  if (isLabour) {
    lines.push(
      section('Present Labour'),
      ...labourRows(report.labourAttendance.filter((row) => row.status === 'Present')),
      section('Absent Labour'),
      ...labourRows(report.labourAttendance.filter((row) => row.status === 'Absent')),
      section('Half Day Labour'),
      ...labourRows(report.labourAttendance.filter((row) => row.status === 'Half Day')),
      section('Labour Payments'),
      ...rows(
        report.labourPayments,
        (row) => `${row.date}  ${row.name}  Mobile: ${row.mobile}  Paid: ${formatMoney(row.amount)}  Mode: ${row.mode}${row.note ? `  Note: ${row.note}` : ''}`,
      ),
    );
    return lines;
  }

  lines.push(
    section('Stock In / Material Aaya'),
    ...stockRows(report.stockTransactions.filter((row) => row.type === 'IN')),
    section('Stock Out / Material Use Hua'),
    ...stockRows(report.stockTransactions.filter((row) => row.type === 'OUT')),
    section('Stock Payments'),
    ...rows(
      report.stockPayments,
      (row) =>
        `${row.date}  ${row.item_name}  Supplier: ${row.supplier_name || 'No supplier'}  Paid: ${formatMoney(row.amount)}  Mode: ${row.mode}${row.note ? `  Note: ${row.note}` : ''}`,
    ),
  );

  return lines;
}

function labourRows(items) {
  return rows(
    items,
    (row) =>
      `${row.date}  Name: ${row.name}  Mobile: ${row.mobile}  Work: ${row.work_type}  Status: ${row.status}  Wage: ${formatMoney(row.wage_amount)}  Overtime: ${formatMoney(row.overtime_amount)}${row.remark ? `  Remark: ${row.remark}` : ''}`,
  );
}

function stockRows(items) {
  return rows(
    items,
    (row) =>
      `${row.date}  Item: ${row.item_name}  Qty: ${row.quantity} ${row.unit || 'Qty'}  Supplier: ${row.supplier_name || 'No supplier'}  Price: ${formatMoney(row.unit_price)}${row.note ? `  Note: ${row.note}` : ''}`,
  );
}

function summaryLines(report, isLabour) {
  if (isLabour) {
    return [
      { text: `Labour Earned: ${formatMoney(report.labour.earned)}` },
      { text: `Labour Paid: ${formatMoney(report.labour.paid)}` },
      { text: `Present: ${report.labour.present || 0}` },
      { text: `Half Day: ${report.labour.halfDay || 0}`, gap: 12 },
    ];
  }

  return [
    { text: `Stock In: ${report.stock.stockIn || 0}` },
    { text: `Stock Out: ${report.stock.stockOut || 0}` },
    { text: `Purchase Value: ${formatMoney(report.stock.purchaseValue)}` },
    { text: `Stock Paid: ${formatMoney(report.stock.paid)}`, gap: 12 },
  ];
}

function section(text) {
  return { text, size: SECTION_SIZE, gap: 6 };
}

function rows(items, render) {
  if (!items.length) {
    return [{ text: 'No records found.', gap: 10 }];
  }

  return items.flatMap((item, index) => wrapLine(`${index + 1}. ${render(item)}`, 92));
}

function wrapLine(text, maxLength) {
  const words = sanitizeText(text).split(/\s+/);
  const lines = [];
  let current = '';

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push({ text: current });
      current = word;
    } else {
      current = next;
    }
  });

  if (current) lines.push({ text: current, gap: 4 });
  return lines;
}

function paginate(lines) {
  const pages = [[]];
  let y = PAGE_HEIGHT - MARGIN;

  lines.forEach((line) => {
    const gap = line.gap || 0;
    if (y - LINE_HEIGHT - gap < MARGIN) {
      pages.push([]);
      y = PAGE_HEIGHT - MARGIN;
    }

    pages[pages.length - 1].push(line);
    y -= LINE_HEIGHT + gap;
  });

  return pages;
}

function writePdf(pages) {
  const objects = [];
  const fontObjectId = 3 + pages.length * 2;

  objects[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
  objects[2] = `<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`;

  pages.forEach((page, index) => {
    const pageObjectId = 3 + index * 2;
    const contentObjectId = pageObjectId + 1;
    objects[pageObjectId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontObjectId} 0 R >> >> /Contents ${contentObjectId} 0 R >>`;
    objects[contentObjectId] = streamObject(writePageContent(page));
  });

  objects[fontObjectId] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  for (let objectId = 1; objectId < objects.length; objectId += 1) {
    if (!objects[objectId]) continue;
    offsets[objectId] = pdf.length;
    pdf += `${objectId} 0 obj\n${objects[objectId]}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;

  for (let objectId = 1; objectId < objects.length; objectId += 1) {
    pdf += `${String(offsets[objectId] || 0).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

function writePageContent(lines) {
  let y = PAGE_HEIGHT - MARGIN;
  const content = [];

  lines.forEach((line) => {
    const size = line.size || BODY_SIZE;
    const text = escapePdfText(sanitizeText(line.text));
    content.push(`BT /F1 ${size} Tf 1 0 0 1 ${MARGIN} ${y} Tm (${text}) Tj ET`);
    y -= LINE_HEIGHT + (line.gap || 0);
  });

  return content.join('\n');
}

function streamObject(content) {
  return `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
}

function buildFileName(report, type) {
  return `${type}-report-${report.range.from}-to-${report.range.to}.pdf`;
}

function sanitizeText(value) {
  return String(value ?? '').replace(/[^\x20-\x7E]/g, ' ');
}

function escapePdfText(value) {
  return value.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
}

function stringToBase64(value) {
  return btoa(value);
}
