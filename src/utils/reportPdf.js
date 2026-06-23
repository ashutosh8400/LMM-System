import { formatMoney } from './date.js';

export function downloadLabourReportPdf(report) {
  downloadReportPdf(report, 'labour');
}

export function downloadStockReportPdf(report) {
  downloadReportPdf(report, 'stock');
}

function downloadReportPdf(report, type) {
  const reportWindow = window.open('', '_blank');
  if (!reportWindow) {
    window.alert('Please allow popup to download PDF report.');
    return;
  }

  reportWindow.document.write(buildReportHtml(report, type));
  reportWindow.document.close();
  reportWindow.focus();
  reportWindow.setTimeout(() => reportWindow.print(), 350);
}

function buildReportHtml(report, type) {
  const isLabour = type === 'labour';
  const title = `${isLabour ? 'Labour' : 'Stock'} Report - ${report.range.label}`;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { color: #122033; font-family: Arial, sans-serif; margin: 24px; }
    h1 { color: #1d4ed8; font-size: 24px; margin: 0 0 4px; }
    h2 { border-bottom: 2px solid #bfdbfe; color: #1e3a8a; font-size: 18px; margin-top: 24px; padding-bottom: 6px; }
    .paid { color: #15803d; }
    .muted { color: #64748b; font-size: 12px; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 16px 0; }
    .box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 10px; }
    .box span { color: #64748b; display: block; font-size: 11px; }
    .box strong { display: block; font-size: 16px; margin-top: 4px; }
    table { border-collapse: collapse; font-size: 11px; margin-top: 8px; width: 100%; }
    th { background: #1d4ed8; color: white; text-align: left; }
    th, td { border: 1px solid #cbd5e1; padding: 6px; vertical-align: top; }
    tr:nth-child(even) td { background: #f8fbff; }
    @media print {
      body { margin: 12mm; }
      button { display: none; }
      h2 { break-after: avoid; }
      tr { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="muted">Date range: ${escapeHtml(report.range.from)} to ${escapeHtml(report.range.to)}</p>
  <p class="muted">Generated: ${escapeHtml(new Date().toLocaleString('en-IN'))}</p>

  <h2>Summary</h2>
  <div class="summary">
    ${isLabour
      ? `${summaryBox('Labour Earned', formatMoney(report.labour.earned))}
         ${summaryBox('Labour Paid', formatMoney(report.labour.paid), true)}
         ${summaryBox('Present', report.labour.present)}
         ${summaryBox('Half Day', report.labour.halfDay)}`
      : `${summaryBox('Stock In', report.stock.stockIn)}
         ${summaryBox('Stock Out', report.stock.stockOut)}
         ${summaryBox('Purchase Value', formatMoney(report.stock.purchaseValue))}
         ${summaryBox('Stock Paid', formatMoney(report.stock.paid), true)}`}
  </div>

  ${isLabour ? labourTables(report) : stockTables(report)}
</body>
</html>`;
}

function labourTables(report) {
  return `
    <h2>Labour Attendance</h2>
    ${table(
      ['Date', 'Name', 'Mobile', 'Work Type', 'Status', 'Wage', 'Overtime', 'Remark'],
      report.labourAttendance.map((row) => [
        row.date,
        row.name,
        row.mobile,
        row.work_type,
        row.status,
        formatMoney(row.wage_amount),
        formatMoney(row.overtime_amount),
        row.remark || '',
      ]),
    )}

    <h2>Labour Payments</h2>
    ${table(
      ['Date', 'Name', 'Mobile', 'Amount', 'Mode', 'Note'],
      report.labourPayments.map((row) => [
        row.date,
        row.name,
        row.mobile,
        `<span class="paid">${escapeHtml(formatMoney(row.amount))}</span>`,
        row.mode,
        row.note || '',
      ]),
      true,
    )}`;
}

function stockTables(report) {
  return `
    <h2>Stock History</h2>
    ${table(
      ['Date', 'Item', 'Type', 'Quantity', 'Price', 'Supplier', 'Note'],
      report.stockTransactions.map((row) => [
        row.date,
        row.item_name,
        row.type === 'IN' ? 'Stock In' : 'Stock Out',
        `${row.quantity} ${row.unit || 'Qty'}`,
        formatMoney(row.unit_price),
        row.supplier_name || '',
        row.note || '',
      ]),
    )}
    <h2>Stock Payments</h2>
    ${table(
      ['Date', 'Item', 'Supplier', 'Amount', 'Mode', 'Note'],
      report.stockPayments.map((row) => [
        row.date,
        row.item_name,
        row.supplier_name || '',
        `<span class="paid">${escapeHtml(formatMoney(row.amount))}</span>`,
        row.mode,
        row.note || '',
      ]),
      true,
    )}`;
}

function summaryBox(label, value, paid = false) {
  return `<div class="box"><span>${escapeHtml(label)}</span><strong class="${paid ? 'paid' : ''}">${escapeHtml(value)}</strong></div>`;
}

function table(headers, rows, allowHtml = false) {
  if (rows.length === 0) {
    return '<p class="muted">No records found.</p>';
  }

  return `<table>
    <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
    <tbody>
      ${rows.map((row) => `<tr>${row.map((cell) => `<td>${renderCell(cell, allowHtml)}</td>`).join('')}</tr>`).join('')}
    </tbody>
  </table>`;
}

function renderCell(cell, allowHtml) {
  if (allowHtml && String(cell).startsWith('<span')) {
    return cell;
  }

  return escapeHtml(cell);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
