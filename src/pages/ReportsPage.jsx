import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button.jsx';
import { getFullReport } from '../services/reportService.js';
import { formatMoney } from '../utils/date.js';
import { downloadLabourReportPdf, downloadStockReportPdf } from '../utils/reportPdf.js';

export default function ReportsPage() {
  const [period, setPeriod] = useState('today');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getFullReport(period)
      .then(setReport)
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Button variant={period === 'today' ? 'primary' : 'secondary'} onClick={() => setPeriod('today')}>
          Today
        </Button>
        <Button variant={period === 'month' ? 'primary' : 'secondary'} onClick={() => setPeriod('month')}>
          This Month
        </Button>
      </div>

      {loading ? <p className="text-sm">Loading report...</p> : null}
      {!loading && report ? (
        <>
          <section className="rounded-lg bg-white p-4 shadow-soft">
            <p className="text-sm font-semibold text-ink/60">{report.range.from} to {report.range.to}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button onClick={() => downloadLabourReportPdf(report)}>
                <DownloadIcon />
                Labour PDF
              </Button>
              <Button variant="secondary" onClick={() => downloadStockReportPdf(report)}>
                <DownloadIcon />
                Stock PDF
              </Button>
            </div>
          </section>

          <div className="grid gap-3 sm:grid-cols-2">
            <ReportBox
              to={`/reports/labour-attendance?period=${period}`}
              title="Labour Attendance"
              count={report.labourAttendance.length}
              primary={`Present ${report.labour.present || 0}`}
              secondary={`Absent ${report.labour.absent || 0} | Half ${report.labour.halfDay || 0}`}
            />
            <ReportBox
              to={`/reports/labour-payments?period=${period}`}
              title="Labour Payments"
              count={report.labourPayments.length}
              primary={formatMoney(report.labour.paid)}
              secondary="Paid amount"
              paid
            />
            <ReportBox
              to={`/reports/stock-history?period=${period}`}
              title="Stock History"
              count={report.stockTransactions.length}
              primary={`In ${report.stock.stockIn || 0}`}
              secondary={`Used ${report.stock.stockOut || 0}`}
            />
            <ReportBox
              to={`/reports/stock-payments?period=${period}`}
              title="Stock Payments"
              count={report.stockPayments.length}
              primary={formatMoney(report.stock.paid)}
              secondary="Supplier paid"
              paid
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
      <path d="M12 3v11m0 0 4-4m-4 4-4-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M5 17v2h14v-2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function ReportBox({ to, title, count, primary, secondary, paid = false }) {
  return (
    <Link to={to} className="rounded-lg bg-white p-4 shadow-soft active:bg-blue-50">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="mt-1 text-sm text-ink/60">{count} record</p>
        </div>
        <span className="rounded-md bg-blue-100 px-3 py-1 text-sm font-bold text-blue-800">Open</span>
      </div>
      <p className={`mt-5 text-2xl font-bold ${paid ? 'text-green-700' : 'text-blue-700'}`}>{primary}</p>
      <p className="mt-1 text-sm text-ink/65">{secondary}</p>
    </Link>
  );
}
