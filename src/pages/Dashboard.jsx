import { Link } from 'react-router-dom';
import { useAsyncData } from '../hooks/useAsyncData.js';
import { getFullReport } from '../services/reportService.js';
import { formatMoney } from '../utils/date.js';

export default function Dashboard() {
  return (
    <div className="space-y-4">
      <TodayReport />
    </div>
  );
}

function TodayReport() {
  const { data, loading, error } = useAsyncData(async () => {
    const report = await getFullReport('today');
    return [report];
  }, []);
  const report = data[0];

  return (
    <section className="rounded-lg bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-brand">Today Report</p>
          <h2 className="text-2xl font-bold">Today Summary</h2>
          <p className="mt-1 text-sm text-ink/60">Attendance, payments, and stock use at a glance.</p>
        </div>
        <Link to="/reports" className="rounded-md bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-900">
          Full Report
        </Link>
      </div>

      {loading ? <p className="mt-3 text-sm text-ink/65">Loading today report...</p> : null}
      {error ? <p className="mt-3 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
      {report ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Metric label="Present" value={report.labour.present || 0} />
          <Metric label="Labour Paid" value={formatMoney(report.labour.paid)} paid />
          <Metric label="Stock Used" value={report.stock.stockOut || 0} />
          <Metric label="Stock Paid" value={formatMoney(report.stock.paid)} paid />
        </div>
      ) : null}
    </section>
  );
}

function Metric({ label, value, paid = false }) {
  return (
    <div className={`rounded-md p-3 ${paid ? 'bg-green-50' : 'bg-blue-50'}`}>
      <p className={`text-xs ${paid ? 'text-green-700' : 'text-blue-700'}`}>{label}</p>
      <p className={`mt-1 text-lg font-bold ${paid ? 'text-green-700' : ''}`}>{value}</p>
    </div>
  );
}
